# Fluxo de Checkout — SintoniaMed

Este documento descreve como está implementado o fluxo de checkout no site, incluindo **cartão de crédito** e **PIX**, usando **Mercado Pago** e **checkout transparente** (Payment Brick).

---

## Visão geral

- **Gateway:** Mercado Pago  
- **Modelo:** Checkout transparente (pagamento na própria página, sem redirecionamento para o site do MP)  
- **UI de pagamento:** Payment Brick do SDK `@mercadopago/sdk-react` (cartão + PIX)  
- **Backend:** Next.js API Routes + Firestore para preferências, pagamentos e assinaturas  
- **Autenticação:** Firebase (cookie `firebase-token`)

---

## Pontos de entrada do checkout

O checkout pode ser aberto em dois lugares:

1. **Página de perfil** (`app/profile/page.tsx`) — usuário já logado que escolhe plano/cupom e clica em “Assinar”.
2. **Modal de boas-vindas aos planos** (`components/plans-welcome-dialog.tsx`) — fluxo de upgrade a partir da landing/planos.

Em ambos os casos o fluxo é o mesmo: chamada à API para criar preferência, abertura de um **Dialog** com o **Payment Brick** e, no caso do PIX, exibição do **PixPaymentQr** após a criação do pagamento.

---

## 1. Criação da preferência e registro inicial

**Endpoint:** `POST /api/payment/create-preference`

**Arquivo:** `app/api/payment/create-preference/route.ts`

### O que acontece

1. **Autenticação**  
   - Lê o cookie `firebase-token` e valida com `verifyFirebaseToken`.  
   - Se não houver token ou usuário inválido → `401`.

2. **Payload**  
   - Body: `{ planId, couponCode? }`  
   - `planId`: `"monthly"` ou `"semester"`.

3. **Validações**  
   - Busca usuário no Firestore (`users`).  
   - Valida cupom em `coupons` (ativo, período, plano aplicável).  
   - Busca preço do plano em `plans` e aplica desconto.  
   - Se preço final ≤ 0 (cupom 100%): **não chama Mercado Pago**.  
     - Atualiza `users` (plan, planExpiresAt).  
     - Cria documento em `subscriptions` e em `payments` (status `approved`, `isFreeAccess: true`).  
     - Opcionalmente registra uso em `coupon_uses`.  
     - Responde `{ success: true, freeAccess: true, amount: 0 }`.  
     - O front trata e não abre o checkout.

4. **Preferência no Mercado Pago**  
   - Cria preferência com `Preference` do SDK (itens, payer, `back_urls`, `external_reference`, `notification_url`, `metadata` com userId, planId, cupom, desconto, expiresAt).

5. **Registro no Firestore**  
   - Coleção `payments`:  
     - `userId`, `planId`, `preferenceId` (id da preferência), `status: 'pending'`, `amount`, `originalAmount`, `couponCode`, `discount`, `createdAt`, `expiresAt`.  
   - Se houve cupom aplicado, também grava em `coupon_uses`.

6. **Resposta**  
   - `{ success: true, preferenceId, amount }` (e opcionalmente `initPoint` / `sandboxInitPoint` para compatibilidade).

O front usa `preferenceId` e `amount` para inicializar o **Payment Brick**.

---

## 2. Interface de pagamento (Payment Brick)

**Componente:** `components/payment-brick.tsx`

### Configuração

- **SDK:** `@mercadopago/sdk-react` — `initMercadoPago(publicKey, { locale: 'pt-BR' })`.
- **Componente:** `<Payment />` com:
  - `initialization={{ amount }}`
  - `customization.paymentMethods`: cartão (crédito/débito), ticket e bankTransfer PIX.
  - `locale="pt-BR"`, tema dark.

### Fluxo no Brick

1. Usuário preenche dados (cartão ou escolhe PIX).
2. Ao enviar, o Brick chama `onSubmit` com `formData` (dados do formulário).
3. O componente envia **POST** para `/api/payment/process` com:
   - `formData` (inclui `payment_method_id`, token do cartão, payer, etc.).
   - `preferenceId`.

4. **Resposta da API:**
   - **Cartão aprovado:** `success: true`, `status: 'approved'` → `onPaymentSuccess(paymentId, status)` → front redireciona para `/payment/success?status=approved&payment_id=...`.
   - **PIX:** `success: true`, `status: 'pending'` (ou `in_process`/`authorized`) e objeto `pix` (QR) → `onPaymentPending(info)` → front guarda `pixData` e troca a UI para o componente **PixPaymentQr** (QR Code + copia e cola).
   - **Erro/rejeição:** `onPaymentError` → mensagem amigável e redirecionamento para `/payment/failure` com `status` e `message`.

Ou seja: **cartão** segue direto para sucesso/falha; **PIX** segue para tela de QR e depois sucesso/falha conforme confirmação.

---

## 3. Processamento do pagamento no backend

**Endpoint:** `POST /api/payment/process`

**Arquivo:** `app/api/payment/process/route.ts`

### Autenticação e dados

- Autenticação via cookie `firebase-token` (igual ao create-preference).
- Body: `{ formData, preferenceId }`.
- Busca no Firestore um documento em `payments` com `preferenceId` e `userId` do usuário autenticado. Se não existir → `404`.

### Montagem do pagamento (Mercado Pago)

- `payment_method_id` vem do `formData` (ex.: `"pix"`, `"visa"`, `"master"`).
- **Se for PIX:**  
  - Body contém apenas campos comuns (valor, descrição, payer, metadata, etc.).  
  - **Não** envia `token`, `installments`, `issuer_id` (não se aplicam ao PIX).
- **Se for cartão:**  
  - Inclui `token` (gerado pelo Brick), `installments`, `issuer_id`, `cardholder` (nome, identificação).  
  - Se não houver token → `400` com mensagem “Token do cartão não recebido”.

- Em todos os casos: `transaction_amount`, `description`, `external_reference` (userId), `metadata` (userId, planId, couponCode, discount, expiresAt), `payer` (email, identification, nome).

### Chamada ao Mercado Pago

- `Payment.create` com o body montado e `idempotencyKey` por requisição.
- Resposta: `id` (paymentId), `status`, `status_detail` e, para PIX, `point_of_interaction.transaction_data` (qr_code, qr_code_base64, ticket_url).

### Atualização do Firestore

- No documento de `payments` encontrado: atualiza `paymentId`, `status`, `statusDetail`, `updatedAt`.
- **Somente se `status === 'approved'`:**
  - Atualiza `users` (plan, planExpiresAt).
  - Cria documento em `subscriptions` (userId, plan, status active, expiresAt, paymentId, cupom, etc.).
  - Se houve cupom, cria/atualiza em `coupon_uses`.

### Resposta ao front

- **approved:** `{ success: true, paymentId, status, paymentMethodId, pix? }`.
- **pending / in_process / authorized:** mesmo formato, com `pix` quando for PIX (para o front exibir QR).
- **rejected / cancelled / etc.:** `success: false` e status correspondente (front trata como erro e leva para `/payment/failure`).

---

## 4. Fluxo PIX: QR Code e confirmação

**Componente:** `components/pix-payment-qr.tsx`

### Exibição

- Recebe `PixQrData`: `paymentId`, `qrCode`, `qrCodeBase64`, `ticketUrl`.
- Mostra imagem do QR a partir de `qrCodeBase64` (data URL PNG).
- Campo somente leitura com o código PIX “copia e cola” e botão “Copiar”.
- Link opcional para “Abrir ticket do Mercado Pago” (`ticketUrl`).

### Verificação do status

- **Polling:** ao montar, chama uma vez e depois a cada **5 segundos** a API `GET /api/payment/status?payment_id=...`.
- Botão “Já paguei (verificar)” chama a mesma API manualmente.

### Comportamento conforme status

- **approved:** toast de sucesso, `onConfirmed(paymentId)` → o dialog fecha e o front redireciona para `/payment/success?status=approved&payment_id=...`.
- **rejected / cancelled / refunded / charged_back:** toast de erro e redirecionamento para `/payment/failure?status=...&message=...`.

Ou seja: no PIX, a confirmação pode vir pelo **polling** (usuário na tela de QR) ou pelo **webhook** (próxima seção). O `/api/payment/status` também ativa a assinatura se ainda não estiver ativa (fallback do webhook).

---

## 5. Consulta de status (polling PIX e fallback)

**Endpoint:** `GET /api/payment/status?payment_id=...`

**Arquivo:** `app/api/payment/status/route.ts`

### O que faz

1. Autenticação via `firebase-token`.
2. Consulta o pagamento no Mercado Pago por `payment_id`.
3. **Ownership:** confere se o pagamento pertence ao usuário (Firestore `payments` por `paymentId` ou `metadata`/`external_reference` do MP).
4. Atualiza o documento em `payments` com o `status` e `statusDetail` atuais.
5. **Se `status === 'approved'`:**
   - Atualiza `users` (plan, planExpiresAt).
   - Cria documento em `subscriptions` apenas se ainda não existir um com esse `paymentId` (evita duplicar).
6. Responde `{ success: true, paymentId, status, statusDetail }`.

Assim, quando o usuário está na tela do PIX e o pagamento é aprovado (no app do banco), o próximo poll ou o clique em “Já paguei” traz `approved` e a assinatura é ativada mesmo que o webhook atrase ou falhe.

---

## 6. Webhook do Mercado Pago

**Endpoint:** `POST /api/payment/webhook`

**Arquivo:** `app/api/payment/webhook/route.ts`

### Quando é chamado

- O Mercado Pago envia notificações quando o status do pagamento muda (ex.: PIX pago, cartão aprovado em fluxo assíncrono).
- A `notification_url` configurada na preferência aponta para essa rota.

### Processamento

1. Body: `{ type, data }`. Só trata `type === 'payment'`; `data.id` é o `paymentId`.
2. Busca o pagamento no Mercado Pago com `Payment.get({ id: paymentId })`.
3. Identifica o usuário por `metadata.userId`, `external_reference` ou documento em `payments` com esse `paymentId`.
4. Atualiza ou cria documento em `payments` (status, paymentId quando for o caso).
5. **Se `paymentStatus === 'approved'`:**
   - Atualiza `users` (plan, planExpiresAt).
   - Cria em `subscriptions` somente se ainda não existir registro com esse `paymentId`.
   - Se houver cupom, atualiza ou cria em `coupon_uses`.
6. Sempre responde `{ received: true }` (200) para o MP não reenviar.

Assim, tanto o **cartão** quanto o **PIX** podem ser confirmados via webhook; no PIX, o polling na tela de QR e o webhook são complementares.

---

## 7. Páginas de resultado

### Sucesso

**Rota:** `/payment/success`  
**Arquivo:** `app/payment/success/page.tsx`

- Query: `payment_id`, `status`, `free_access` (opcional).
- Se `status=approved`: mostra “Pagamento Aprovado!” (ou “Cupom Aplicado com Sucesso!” quando `free_access=true`).
- Aguarda um tempo e chama `refreshUserProfile()` para atualizar o plano no contexto.
- Links para dashboard e perfil.

### Falha

**Rota:** `/payment/failure`  
**Arquivo:** `app/payment/failure/page.tsx`

- Query: `status`, `message`.
- Títulos amigáveis por status (`rejected`, `cancelled`, `pending`).
- Descrição a partir de `message` ou texto padrão.
- Links para “Escolher Plano Novamente” e “Ir para Dashboard”.

### Pendente

**Rota:** `/payment/pending`  
**Arquivo:** `app/payment/pending/page.tsx`

- Usada quando o fluxo identifica um pagamento pendente que **não** é PIX (por exemplo, boleto ou outro método que não mostra QR na mesma tela).
- Mensagem de “Pagamento Pendente” e links para dashboard e perfil.

---

## 8. Resumo dos fluxos

### Cartão de crédito/débito

1. Usuário escolhe plano (e opcionalmente cupom) e abre o checkout.
2. `POST /api/payment/create-preference` → `preferenceId` + registro em `payments` (pending).
3. Payment Brick exibe formulário de cartão; usuário preenche e envia.
4. Brick chama `POST /api/payment/process` com `formData` (token, installments, etc.) e `preferenceId`.
5. Backend chama Mercado Pago; se aprovado, atualiza `payments`, `users`, `subscriptions` (e `coupon_uses` se houver cupom).
6. Front recebe `approved` → `onPaymentSuccess` → redireciona para `/payment/success`.
7. Se rejeitado → `onPaymentError` → redireciona para `/payment/failure`.
8. O webhook pode atualizar o mesmo pagamento em caso de confirmação assíncrona (ex.: autorização posterior).

### PIX

1. Até o passo 4 igual ao cartão; usuário escolhe PIX no Brick e “paga”.
2. `POST /api/payment/process` com `payment_method_id: 'pix'` (sem token). Mercado Pago devolve status `pending` e dados do PIX (QR, copia e cola, ticket_url).
3. Front recebe `onPaymentPending` com `pix` → troca para o componente **PixPaymentQr** (QR + copia e cola).
4. Usuário paga no app do banco. A confirmação pode chegar por:
   - **Polling:** `GET /api/payment/status?payment_id=...` a cada 5s (e botão “Já paguei”).
   - **Webhook:** `POST /api/payment/webhook` quando o MP notifica aprovação.
5. Quando o status vira `approved` (via status ou webhook), o backend ativa a assinatura (users, subscriptions, coupon_uses).
6. Na tela de PIX, ao receber `approved` no polling, o front chama `onConfirmed` → fecha o dialog e redireciona para `/payment/success`.
7. Se o usuário fechar a tela antes de pagar, o webhook ainda pode aprovar depois e ativar a assinatura; ao acessar de novo, o perfil já estará atualizado.

---

## 9. Variáveis de ambiente

- **`MERCADOPAGO_ACCESS_TOKEN`** — token de acesso do Mercado Pago (backend: create-preference, process, webhook, status).
- **`NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`** — chave pública para o Payment Brick no front.
- **`NEXT_PUBLIC_BASE_URL`** — URL base do site (usada em `back_urls` e `notification_url` da preferência).

---

## 10. Coleções Firestore envolvidas

| Coleção         | Uso principal                                                                 |
|-----------------|-------------------------------------------------------------------------------|
| `users`         | plan, planExpiresAt (atualizados na aprovação)                               |
| `payments`      | preferência, paymentId do MP, status, valor, cupom, expiresAt                 |
| `subscriptions` | registro de assinatura ativa (userId, plan, paymentId, expiresAt, cupom)      |
| `coupon_uses`   | uso de cupom por pagamento (preferenceId/paymentId, desconto aplicado)        |
| `plans`         | preços dos planos (monthly, semester)                                        |
| `coupons`       | cupons (desconto, validade, planos aplicáveis)                                |

Este documento reflete o estado do código na data em que foi escrito e serve como referência para manutenção e onboarding.

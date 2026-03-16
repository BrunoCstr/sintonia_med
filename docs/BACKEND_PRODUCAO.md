# Backend — Checklist para Produção (SintoniaMed)

Este documento lista o que falta implementar ou configurar no **backend** para enviar o app para produção. Front-end, autenticação e checkout já estão finalizados.

---

## 1. Segurança do Webhook (Mercado Pago) — **OBRIGATÓRIO**

O endpoint `POST /api/payment/webhook` atualmente **não valida** a assinatura das notificações. Em produção, qualquer pessoa pode chamar essa URL e simular aprovações de pagamento.

**O que fazer:**

- Implementar validação do header **`x-signature`** conforme [documentação do Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks):
  1. Extrair do header `x-signature` os valores `ts` (timestamp) e `v1` (assinatura).
  2. Usar o header **`x-request-id`**.
  3. Montar o manifesto: `id:{data.id};request-id:{x-request-id};ts:{ts};`
  4. Calcular HMAC-SHA256 desse manifesto usando o **webhook secret** da aplicação no painel do Mercado Pago.
  5. Comparar com `v1` usando comparação em tempo constante (evitar timing attacks).
- Se a assinatura for inválida, responder **401** e **não** processar a notificação.
- Configurar a variável de ambiente **`MERCADOPAGO_WEBHOOK_SECRET`** (ou nome equivalente) com o secret gerado em **Suas integrações** > Webhooks.

---

## 2. Variáveis de Ambiente — **OBRIGATÓRIO**

Garantir que todas estejam definidas no ambiente de produção (ex.: Vercel, Railway, etc.):

| Variável | Uso |
|----------|-----|
| **Firebase** | |
| `FIREBASE_PROJECT_ID` | Admin SDK (ou arquivo service account) |
| `FIREBASE_CLIENT_EMAIL` | Admin SDK |
| `FIREBASE_PRIVATE_KEY` | Admin SDK (com `\n` reais para quebras de linha) |
| `NEXT_PUBLIC_FIREBASE_*` | Cliente (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId) |
| `FIREBASE_STORAGE_BUCKET` ou `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Upload de imagens/avatar |
| **Mercado Pago** | |
| `MERCADOPAGO_ACCESS_TOKEN` | Token de **produção** (create-preference, process, status, webhook) |
| `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` | Chave pública para o Payment Brick no front |
| `MERCADOPAGO_WEBHOOK_SECRET` | Validação da assinatura do webhook (após implementar item 1) |
| **URLs** | |
| `NEXT_PUBLIC_BASE_URL` | URL base do site em produção (ex.: `https://seudominio.com`). Usada em `back_urls` e `notification_url`. |
| **E-mail** | |
| `EMAIL_USER` | E-mail para Nodemailer (ex.: Gmail) |
| `EMAIL_PASSWORD` | Senha de aplicativo do Gmail (não a senha normal da conta) |

**Observação:** Se usar arquivo de service account do Firebase, coloque-o na raiz (ou path configurado) e garanta que o nome esteja em `FIREBASE_SERVICE_ACCOUNT_FILE` se o código usar essa variável. Em plataformas como Vercel, o uso de variáveis `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` é mais comum.

---

## 3. Dados iniciais no Firestore — **OBRIGATÓRIO**

- **Coleção `plans`**  
  O checkout e o painel admin esperam documentos com IDs **`monthly`** e **`semester`** e pelo menos o campo **`price`** (número). A API pública de planos usa `orderBy('durationMonths', 'asc')`, então inclua **`durationMonths`** (1 para mensal, 6 para semestral) para evitar erro. Exemplo mínimo:
  - `plans/monthly`: `{ price: 99.90, durationMonths: 1, createdAt, updatedAt }` (e outros campos que o admin use).
  - `plans/semester`: `{ price: 499.90, durationMonths: 6, createdAt, updatedAt }`.

- **Índices compostos**  
  Se ao subir para produção o Firestore reclamar de índices faltando, o console do Firebase indicará o link para criá-los. Queries que costumam precisar de índice:
  - `payments`: `userId` + `planId` + `status` + `orderBy('createdAt', 'desc')` (webhook).
  - Outras que usem `where` em mais de um campo e/ou `orderBy` em campo diferente.

Criar os documentos iniciais de `plans` (e, se necessário, os índices) evita 404/500 no primeiro checkout.

---

## 4. URL do Webhook em Produção

- No painel do **Mercado Pago** (Suas integrações), configurar a URL de notificação de **produção** como:
  `https://SEU_DOMINIO/api/payment/webhook`
- Garantir que `NEXT_PUBLIC_BASE_URL` seja exatamente o domínio usado (com HTTPS e sem barra final), pois a `notification_url` da preferência é montada com essa variável.

---

## 5. Firestore Rules — **Verificação**

- As coleções **`payments`**, **`subscriptions`** e **`coupon_uses`** estão com `create`/`update` apenas pelo backend (Admin SDK). Isso está correto.
- A coleção **`plans`** não aparece nas regras atuais; como os planos são lidos apenas pelas API Routes (Admin SDK), não é obrigatório expor `plans` ao cliente. Se no futuro o front ler `plans` direto do Firestore, será preciso adicionar regra de leitura.
- Se houver uso da coleção **`plan_price_changes`** (auditoria de preços) apenas no backend, não é necessário regra para o cliente.

---

## 6. Resumo do que implementar

| Item | Prioridade | Ação |
|------|------------|------|
| Validação do `x-signature` no webhook MP | Alta | Implementar em `app/api/payment/webhook/route.ts` e configurar `MERCADOPAGO_WEBHOOK_SECRET` |
| Variáveis de ambiente | Alta | Preencher todas em produção (Firebase, MP, BASE_URL, e-mail) |
| Documentos `plans` no Firestore | Alta | Criar `monthly` e `semester` com `price` e `durationMonths` |
| URL do webhook no painel MP | Alta | Apontar para `https://SEU_DOMINIO/api/payment/webhook` |
| Índices Firestore | Média | Criar conforme erros no console ao usar as queries em produção |
| TypeScript | Baixa | Considerar remover `ignoreBuildErrors: true` do `next.config.mjs` antes de produção |

---

## 7. Opcional / Melhorias

- **Idempotência em `POST /api/payment/process`**  
  Garantir que, em caso de retry do front, não seja criado pagamento duplicado (ex.: usar chave idempotente por `preferenceId` + `userId` ou recurso equivalente do SDK do MP).

- **Cron / job para expiração de planos**  
  Hoje a expiração é tratada quando o usuário chama `POST /api/user/check-expired-plan` ou quando o backend lê o usuário. Para relatórios ou consistência em massa, um job agendado que limpe `plan`/`planExpiresAt` para usuários expirados pode ser útil.

- **Arquivo `.env.example`**  
  Criar um `.env.example` na raiz listando todas as variáveis (sem valores) para facilitar o deploy e onboarding.

Com o webhook validado, as variáveis e os dados iniciais configurados, o backend está em condições de ir para produção do ponto de vista de pagamentos, autenticação e dados.

# Integração com Mercado Pago

Este documento descreve a integração com Mercado Pago para processamento de pagamentos de assinaturas.

## Configuração

### Variáveis de Ambiente

Adicione as seguintes variáveis ao seu arquivo `.env.local`:

```env
# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=seu_access_token_aqui
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=sua_public_key_aqui

# URL Base da Aplicação (para webhooks e redirects)
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # Em desenvolvimento
# NEXT_PUBLIC_BASE_URL=https://seu-dominio.com  # Em produção
```

### Como Obter a Public Key do Mercado Pago

1. Acesse o [Painel do Mercado Pago](https://www.mercadopago.com.br/developers/panel)
2. Crie uma aplicação ou selecione uma existente
3. Vá em "Credenciais"
4. Copie a **Public Key** (use a chave de teste para desenvolvimento, produção para produção)

### Como Obter o Access Token do Mercado Pago

1. Acesse o [Painel do Mercado Pago](https://www.mercadopago.com.br/developers/panel)
2. Crie uma aplicação ou selecione uma existente
3. Vá em "Credenciais"
4. Copie o **Access Token** (use o token de teste para desenvolvimento, produção para produção)

## Fluxo de Pagamento (Checkout Transparente/Bricks)

### 1. Criação da Preferência de Pagamento

Quando o usuário seleciona um plano na página `/plans` ou `/profile`:

1. O frontend chama `/api/payment/create-preference`
2. A API cria uma preferência de pagamento no Mercado Pago
3. Retorna `preferenceId` e `amount`
4. Um diálogo modal abre com o **Payment Brick** (checkout transparente)
5. O usuário preenche os dados de pagamento diretamente na aplicação
6. Ao submeter, o frontend chama `/api/payment/process` para processar o pagamento
7. Se aprovado, a assinatura é ativada automaticamente

### 2. Processamento do Pagamento (Checkout Transparente)

Com o Payment Brick:

1. Usuário preenche dados de pagamento no componente Payment Brick
2. Ao submeter, o Brick retorna `formData` com dados do pagamento
3. Frontend chama `/api/payment/process` com os dados
4. API processa o pagamento no Mercado Pago
5. Se aprovado:
   - Ativa a assinatura imediatamente
   - Atualiza perfil do usuário
   - Cria registro na coleção `subscriptions`
   - Redireciona para `/payment/success`

### 3. Webhook (Backup)

O Mercado Pago também envia webhooks para `/api/payment/webhook`:

- Garante que pagamentos sejam processados mesmo se houver falha no frontend
- Atualiza status de pagamentos pendentes
- Sincroniza dados entre Mercado Pago e Firestore

## Estrutura de Dados

### Coleção: `payments`

Registra todos os pagamentos processados:

```typescript
{
  userId: string
  planId: 'monthly' | 'semester'
  preferenceId: string  // ID da preferência do Mercado Pago
  paymentId?: string     // ID do pagamento (após confirmação)
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  amount: number
  couponCode?: string
  discount: number       // Percentual de desconto (0-100)
  createdAt: Date
  expiresAt: Date
  updatedAt?: Date
}
```

### Coleção: `subscriptions`

Registra assinaturas ativas:

```typescript
{
  userId: string
  plan: 'monthly' | 'semester'
  status: 'active' | 'expired' | 'cancelled'
  startDate: Date
  expiresAt: Date
  paymentId: string
  couponCode?: string
  discount: number       // Percentual de desconto (0-1)
  createdAt: Date
}
```

## Webhooks

### Configuração do Webhook no Mercado Pago

1. Acesse o [Painel do Mercado Pago](https://www.mercadopago.com.br/developers/panel)
2. Vá em "Webhooks"
3. Adicione a URL: `https://seu-dominio.com/api/payment/webhook`
4. Selecione os eventos: `payment`

### Segurança

O webhook valida:
- Metadata do pagamento (userId, planId)
- Status do pagamento
- Informações do pagamento no Mercado Pago

## Cupons de Desconto

Cupons disponíveis (mock - pode ser movido para banco de dados):

- `MEDICINA20` - 20% de desconto
- `ESTUDANTE15` - 15% de desconto
- `SINTONIZA10` - 10% de desconto

## Testes

### Cartões de Teste

Use os seguintes cartões para testar no ambiente sandbox:

**Cartão Aprovado:**
- Número: `5031 7557 3453 0604`
- CVV: `123`
- Validade: `11/25`
- Nome: `APRO`

**Cartão Pendente:**
- Número: `5031 4332 1540 6351`
- CVV: `123`
- Validade: `11/25`
- Nome: `CONT`

**Cartão Rejeitado:**
- Número: `5031 4332 1540 6351`
- CVV: `123`
- Validade: `11/25`
- Nome: `OTHE`

Mais informações: [Cartões de Teste do Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs/checkout-api/integration-test/test-cards)

## Troubleshooting

### Webhook não está sendo recebido

1. Verifique se a URL do webhook está correta no painel do Mercado Pago
2. Certifique-se de que a URL é acessível publicamente (não localhost)
3. Use um serviço como ngrok para testar localmente

### Pagamento aprovado mas assinatura não ativada

1. Verifique os logs do servidor para erros no webhook
2. Verifique se o `userId` está correto no metadata do pagamento
3. Verifique as regras de segurança do Firestore

### Erro ao criar preferência

1. Verifique se o `MERCADOPAGO_ACCESS_TOKEN` está configurado
2. Verifique se o token é válido e tem as permissões necessárias
3. Verifique os logs do servidor para mais detalhes


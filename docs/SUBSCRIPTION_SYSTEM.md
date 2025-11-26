# Sistema de Assinaturas

## Como Funciona

### 1. Processamento de Pagamento

O sistema usa **Checkout Transparente (Bricks)** do Mercado Pago, que processa o pagamento diretamente na aplicação sem redirecionamento.

**Fluxo:**
1. Usuário seleciona um plano
2. Sistema cria uma preferência de pagamento no Mercado Pago
3. Usuário preenche dados de pagamento no checkout transparente
4. Pagamento é processado via `/api/payment/process`
5. Se aprovado, a assinatura é ativada imediatamente

### 2. Webhook (Backup)

O webhook (`/api/payment/webhook`) está configurado como **backup** para garantir que pagamentos sejam processados mesmo se houver falha no frontend. Ele recebe notificações do Mercado Pago sobre mudanças de status de pagamento.

**Quando o webhook é usado:**
- Pagamentos processados fora do checkout transparente
- Atualizações de status de pagamentos pendentes
- Sincronização de dados entre Mercado Pago e Firestore

### 3. Cobrança Recorrente

**NÃO há cobrança recorrente automática implementada.**

- **Plano Mensal**: Cobra uma vez por 1 mês de acesso. Após expirar, o usuário precisa renovar manualmente.
- **Plano Semestral**: Cobra uma vez por 6 meses de acesso. Após expirar, o usuário precisa renovar manualmente.

Cada pagamento é **único e não recorrente**. O usuário precisa fazer um novo pagamento quando o plano expirar.

### 4. Verificação de Expiração

O sistema verifica a expiração do plano em tempo real:

- **Frontend**: Hook `usePremium()` verifica se `planExpiresAt > now`
- **Backend**: Verificações em rotas protegidas comparam a data de expiração

**Inativação Automática:**
- Quando `planExpiresAt` passa da data atual, o usuário perde acesso premium automaticamente
- Não há necessidade de processamento adicional - a verificação é feita em tempo real
- O plano não é "desativado" no banco, apenas não é considerado válido após a data de expiração

### 5. Formato de Datas

O `planExpiresAt` é armazenado no Firestore como **Timestamp** e convertido para ISO string no frontend para exibição.

**Conversão:**
- Firestore → Frontend: `timestamp.toDate().toISOString()`
- Frontend → Exibição: `new Date(isoString).toLocaleDateString()`


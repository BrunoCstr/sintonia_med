# Sistema de Cupons de Desconto

## Como Funciona Atualmente

### Estado Atual (Mock)
Os cupons estão **hardcoded** em vários lugares do código:

1. **Frontend** (`app/plans/page.tsx` e `app/profile/page.tsx`):
   ```typescript
   const mockCoupons: Record<string, number> = {
     'MEDICINA20': 0.20,   // 20% de desconto
     'ESTUDANTE15': 0.15,  // 15% de desconto
     'SINTONIZA10': 0.10,  // 10% de desconto
   }
   ```

2. **Backend** (`app/api/payment/create-preference/route.ts` e `app/api/user/subscribe/route.ts`):
   - Mesma lista de cupons hardcoded
   - Validação feita no servidor

### Problemas da Implementação Atual
- ❌ Cupons não podem ser criados/editados sem alterar código
- ❌ Não há controle de uso (quantas vezes pode ser usado)
- ❌ Não há data de expiração
- ❌ Não há limite de uso por usuário
- ❌ Código duplicado em vários lugares

## Solução Proposta

### Estrutura no Firestore

**Coleção: `coupons`**

```typescript
{
  code: string                    // Código único do cupom (ex: "MEDICINA20")
  discount: number                // Percentual de desconto (0-100)
  description?: string            // Descrição do cupom
  active: boolean                 // Se o cupom está ativo
  maxUses?: number                // Máximo de usos totais (opcional)
  maxUsesPerUser?: number         // Máximo de usos por usuário (opcional)
  validFrom: Date                 // Data de início da validade
  validUntil: Date                // Data de expiração
  applicablePlans?: string[]      // Planos aplicáveis (["monthly", "semester"] ou null para todos)
  createdAt: Date
  updatedAt: Date
  createdBy: string               // UID do admin que criou
}
```

### Quem Define os Cupons?

**Admin Master** pode:
- ✅ Criar novos cupons
- ✅ Editar cupons existentes
- ✅ Ativar/desativar cupons
- ✅ Definir limites de uso
- ✅ Definir datas de validade
- ✅ Definir planos aplicáveis

### Fluxo de Validação

1. **Usuário digita código** → Frontend valida formato básico
2. **Envia para API** → `/api/coupons/validate`
3. **API valida**:
   - Cupom existe e está ativo
   - Data atual está dentro do período de validade
   - Não excedeu limite de usos totais (se houver)
   - Usuário não excedeu limite de usos pessoais (se houver)
   - Plano selecionado é aplicável (se houver restrição)
4. **Retorna desconto** → Frontend aplica ao preço

### Rastreamento de Uso

**Coleção: `coupon_uses`**

```typescript
{
  couponCode: string
  userId: string
  planId: string
  discountApplied: number
  originalPrice: number
  finalPrice: number
  paymentId?: string              // ID do pagamento (se aplicado)
  usedAt: Date
}
```

## Implementação

### 1. API de Validação de Cupom

**GET `/api/coupons/validate?code=MEDICINA20&planId=monthly`**

Retorna:
```json
{
  "valid": true,
  "discount": 20,
  "message": "Cupom válido"
}
```

### 2. API de Gestão de Cupons (Admin)

**GET `/api/admin/coupons`** - Listar todos os cupons
**POST `/api/admin/coupons`** - Criar novo cupom
**PUT `/api/admin/coupons/[code]`** - Editar cupom
**DELETE `/api/admin/coupons/[code]`** - Desativar cupom

### 3. Interface Admin

Página `/admin/coupons` para:
- Listar cupons
- Criar/editar cupons
- Ver estatísticas de uso
- Ativar/desativar cupons

## Benefícios

✅ **Controle Total**: Admin pode criar/editar cupons sem alterar código
✅ **Flexibilidade**: Cupons com datas, limites e restrições
✅ **Rastreamento**: Histórico de uso de cada cupom
✅ **Segurança**: Validação no servidor
✅ **Analytics**: Estatísticas de uso de cupons


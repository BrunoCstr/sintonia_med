# Firebase Admin API - Documentação

Este documento descreve como usar as APIs do Firebase Admin SDK implementadas no projeto.

## Configuração

O Firebase Admin SDK está configurado para usar o arquivo de service account que você colocou na raiz do projeto:
- `sintoniamed-72585-firebase-adminsdk-fbsvc-71c354bf54.json`

Este arquivo já está no `.gitignore` para não ser commitado.

## Funções Disponíveis

### `lib/firebase-admin.ts`

#### `verifyAdmin(uid: string): Promise<boolean>`
Verifica se um usuário é `admin_master`.

#### `verifyRole(uid: string, requiredRole: UserRole): Promise<boolean>`
Verifica se um usuário tem uma role específica.

#### `verifyAnyRole(uid: string, allowedRoles: UserRole[]): Promise<boolean>`
Verifica se um usuário tem uma das roles permitidas.

#### `setUserRole(uid: string, role: UserRole): Promise<void>`
Define a role de um usuário (atualiza Custom Claims e Firestore).

#### `getUserByEmail(email: string)`
Busca usuário por email.

#### `getUserByUid(uid: string)`
Busca usuário por UID.

#### `getUserWithClaims(uid: string)`
Obtém informações completas do usuário incluindo custom claims.

## Rotas de API

### POST `/api/admin/set-role`

Define a role de um usuário.

**Requisição:**
```json
{
  "uid": "user-uid-here",
  "role": "admin_master",
  "requesterUid": "admin-uid-here"
}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Role 'admin_master' definido para usuário user-uid-here"
}
```

**Resposta de Erro (403):**
```json
{
  "error": "Acesso negado. Apenas admin_master pode definir roles."
}
```

**Exemplo de uso no frontend:**
```typescript
const response = await fetch('/api/admin/set-role', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    uid: 'user-uid-to-update',
    role: 'admin_questoes',
    requesterUid: currentUser.uid, // UID do admin que está fazendo a requisição
  }),
})

const data = await response.json()
if (data.success) {
  console.log('Role definido com sucesso!')
}
```

### GET `/api/admin/user/[uid]`

Obtém informações de um usuário incluindo role.

**Query Parameters:**
- `requesterUid`: UID do usuário que está fazendo a requisição (deve ser admin_master)

**Exemplo:**
```
GET /api/admin/user/user-uid-here?requesterUid=admin-uid-here
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "user": {
    "uid": "user-uid-here",
    "email": "user@example.com",
    "displayName": "Nome do Usuário",
    "photoURL": null,
    "emailVerified": true,
    "role": "aluno",
    "customClaims": {
      "role": "aluno"
    },
    "metadata": {
      "creationTime": "2024-01-01T00:00:00.000Z",
      "lastSignInTime": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

## Segurança

⚠️ **IMPORTANTE**: 

1. Todas as rotas de API verificam se o `requesterUid` é `admin_master`
2. Apenas admins podem definir roles de outros usuários
3. O Firebase Admin SDK só funciona no servidor (API routes), nunca no cliente
4. Sempre valide permissões antes de chamar essas APIs

## Exemplo de Integração no Painel Admin

```typescript
'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'

export function UserRoleManager({ targetUid }: { targetUid: string }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const updateRole = async (newRole: 'aluno' | 'admin_master' | 'admin_questoes') => {
    if (!user) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/set-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: targetUid,
          role: newRole,
          requesterUid: user.uid,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar role')
      }

      // Sucesso! O usuário precisa fazer logout/login para ver as mudanças
      alert('Role atualizado! O usuário precisa fazer logout e login novamente.')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={() => updateRole('admin_master')} disabled={loading}>
        Tornar Admin Master
      </button>
      <button onClick={() => updateRole('admin_questoes')} disabled={loading}>
        Tornar Admin Questões
      </button>
      <button onClick={() => updateRole('aluno')} disabled={loading}>
        Tornar Aluno
      </button>
      {error && <p className="text-red-500">{error}</p>}
    </div>
  )
}
```

## Notas Importantes

1. **Token Refresh**: Após alterar a role de um usuário, ele precisa fazer logout e login novamente para que as mudanças tenham efeito, pois os Custom Claims são incluídos no token JWT.

2. **Firestore Sync**: A função `setUserRole` atualiza tanto os Custom Claims quanto o documento no Firestore automaticamente.

3. **Validação**: Todas as roles são validadas antes de serem definidas. Apenas `'aluno'`, `'admin_master'` e `'admin_questoes'` são permitidas.


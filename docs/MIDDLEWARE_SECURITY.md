# Middleware de Segurança - Documentação

Este documento descreve o sistema de segurança implementado no middleware do Next.js.

## Visão Geral

O middleware implementa segurança em nível de servidor para:
- ✅ Verificar autenticação do usuário
- ✅ Validar roles via Firebase Custom Claims (source of truth)
- ✅ Bloquear acesso a rotas não autorizadas
- ✅ Sincronizar roles do Firestore com Custom Claims
- ✅ Redirecionar usuários não autenticados ou sem permissão

## Rotas Públicas

Estas rotas **não requerem** autenticação:
- `/` - Página inicial
- `/auth/*` - Rotas de autenticação (login, register, forgot-password)
- `/plans` - Página de planos (checkout público)

## Rotas Privadas por Role

### Rotas Padrão (Todos os usuários autenticados)

Acessíveis por **todos** os usuários autenticados (aluno, admin_questoes, admin_master):
- `/dashboard`
- `/generator`
- `/quiz`
- `/results`
- `/history`
- `/profile`
- `/settings`
- `/generate`

### Rotas Admin - Questões

Acessíveis por **admin_master** e **admin_questoes**:
- `/admin` - Dashboard administrativo
- `/admin/questions` - Lista de questões
- `/admin/questions/new` - Criar nova questão
- `/admin/questions/[id]/edit` - Editar questão

### Rotas Admin - Master

Acessíveis **apenas** por **admin_master**:
- `/admin/users` - Gestão de usuários
- `/admin/reports` - Gestão de reports

## Fluxo de Autenticação

1. **Cliente faz login** → Firebase Auth gera token
2. **Token é sincronizado** → Cliente chama `/api/auth/sync-token` que armazena token em cookie HTTP-only
3. **Middleware intercepta request** → Extrai token do cookie
4. **Token é validado** → Firebase Admin SDK verifica e decodifica token
5. **Role é extraída** → Dos Custom Claims (source of truth)
6. **Permissão é verificada** → Verifica se role tem acesso à rota
7. **Sincronização** → Se role do Firestore ≠ Custom Claims, sincroniza Firestore

## Sincronização de Roles

O middleware garante que a role no Firestore está sempre sincronizada com os Custom Claims:

- **Source of Truth**: Firebase Custom Claims
- **Sincronização Automática**: Se Firestore ≠ Claims, atualiza Firestore
- **Não bloqueia**: Erros de sincronização não impedem acesso

## Redirecionamentos

### Usuário Não Autenticado
- **Rota**: Qualquer rota privada
- **Ação**: Redireciona para `/auth/login?redirect={rota-original}`

### Usuário Sem Permissão
- **Rota**: Rota sem permissão adequada
- **Ação**: 
  - Todos os usuários → `/dashboard`
  - Query param: `?error=access_denied`

## Headers Adicionados

O middleware adiciona headers úteis para server components:

- `x-user-id`: UID do usuário
- `x-user-role`: Role do usuário
- `x-user-email`: Email do usuário

## API Routes

### POST `/api/auth/sync-token`

Sincroniza o token Firebase do cliente com o servidor.

**Body:**
```json
{
  "token": "firebase-id-token"
}
```

**Resposta:**
```json
{
  "success": true,
  "user": {
    "uid": "user-uid",
    "email": "user@example.com",
    "role": "aluno"
  }
}
```

**Cookie criado:**
- Nome: `firebase-token`
- Tipo: HTTP-only
- Validade: 1 hora
- Secure: true (em produção)

### DELETE `/api/auth/sync-token`

Remove o token do cookie (logout).

## Segurança

### Validação de Token
- ✅ Token é validado via Firebase Admin SDK
- ✅ Token expirado → Redireciona para login
- ✅ Token inválido → Redireciona para login

### Verificação de Role
- ✅ Role vem dos Custom Claims (não pode ser manipulado)
- ✅ Firestore é apenas para visualização
- ✅ Sincronização automática garante consistência

### Proteção de Rotas
- ✅ Middleware roda antes de qualquer página
- ✅ Verificação server-side (não pode ser bypassado)
- ✅ Redirecionamento automático para rotas apropriadas

## Exemplo de Fluxo

### 1. Usuário Aluno tenta acessar `/admin/users`

```
Request → Middleware
  ↓
Token encontrado? ✅
  ↓
Token válido? ✅
  ↓
Role: "aluno"
  ↓
Tem permissão? ❌
  ↓
Redireciona para /dashboard?error=access_denied
```

### 2. Usuário Admin tenta acessar `/admin/questions`

```
Request → Middleware
  ↓
Token encontrado? ✅
  ↓
Token válido? ✅
  ↓
Role: "admin_questoes"
  ↓
Tem permissão? ✅
  ↓
Permite acesso
```

### 3. Usuário não autenticado tenta acessar `/dashboard`

```
Request → Middleware
  ↓
Token encontrado? ❌
  ↓
Redireciona para /auth/login?redirect=/dashboard
```

## Troubleshooting

### Token não está sendo encontrado

**Problema**: Middleware sempre redireciona para login mesmo após login.

**Solução**: 
1. Verificar se `/api/auth/sync-token` está sendo chamado após login
2. Verificar se cookies estão habilitados no navegador
3. Verificar console do navegador para erros

### Role não está sincronizada

**Problema**: Role no Firestore diferente dos Custom Claims.

**Solução**: 
- O middleware sincroniza automaticamente
- Verificar logs do servidor para mensagens de sincronização
- Se persistir, verificar se `syncRoleWithFirestore` está sendo chamada

### Acesso negado mesmo com role correta

**Problema**: Usuário tem role mas ainda recebe acesso negado.

**Solução**:
1. Verificar se o token foi atualizado após mudança de role
2. Usuário precisa fazer logout e login novamente após mudança de role
3. Verificar se a rota está na lista correta de permissões

## Notas Importantes

⚠️ **Após mudança de role**: O usuário precisa fazer logout e login novamente para que o novo token com a role atualizada seja gerado.

⚠️ **Custom Claims são source of truth**: A role no Firestore é apenas para visualização. A verificação real sempre usa Custom Claims.

⚠️ **Sincronização automática**: O middleware sincroniza Firestore com Claims automaticamente, mas não bloqueia o acesso se houver erro.


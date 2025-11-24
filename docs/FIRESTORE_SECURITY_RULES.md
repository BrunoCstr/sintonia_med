# Regras de Segurança do Firestore

Este documento descreve as regras de segurança implementadas para o Firestore.

## Visão Geral

As regras de segurança garantem que:
- ✅ Usuários só podem acessar seus próprios dados
- ✅ Admins têm permissões apropriadas baseadas em suas roles
- ✅ Campos sensíveis (como `role`) são protegidos
- ✅ Validação de dados na criação e atualização
- ✅ Proteção contra acesso não autorizado

## Como Aplicar as Regras

### Opção 1: Firebase Console (Recomendado)

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto
3. Vá em **Firestore Database** > **Rules**
4. Cole o conteúdo do arquivo `firestore.rules`
5. Clique em **Publish**

### Opção 2: Firebase CLI

```bash
# Se ainda não tiver o Firebase CLI instalado
npm install -g firebase-tools

# Login no Firebase
firebase login

# Inicializar Firebase (se ainda não fez)
firebase init firestore

# Deploy das regras
firebase deploy --only firestore:rules
```

## Estrutura das Regras

### Helper Functions

Funções auxiliares para simplificar as regras:

- `isAuthenticated()` - Verifica se o usuário está autenticado
- `isOwner(userId)` - Verifica se o usuário é o dono do documento
- `getUserRole()` - Obtém a role do usuário dos Custom Claims
- `isAdmin()` - Verifica se é admin_master ou admin_questoes
- `isAdminMaster()` - Verifica se é admin_master
- `isValidRole(role)` - Valida se a role é válida

### Collection: `users`

**Leitura:**
- ✅ Usuário pode ler seu próprio perfil
- ✅ Admins podem ler todos os perfis

**Criação:**
- ✅ Usuário pode criar apenas seu próprio perfil durante registro
- ✅ Deve ter role padrão 'aluno' (não pode definir outra role)
- ✅ Campos obrigatórios: email, name, createdAt

**Atualização:**
- ✅ Usuário pode atualizar seus próprios dados (exceto `role` e `email`)
- ✅ Apenas `admin_master` pode alterar `role` de outros usuários
- ✅ Email não pode ser alterado

**Exclusão:**
- ✅ Apenas `admin_master` pode excluir usuários

### Collection: `questions`

**Leitura:**
- ✅ Todos os usuários autenticados podem ler questões **ativas** (`ativo == true`)
- ✅ Admins podem ler todas as questões (ativas e inativas)

**Criação:**
- ✅ Apenas admins (`admin_master` ou `admin_questoes`) podem criar questões
- ✅ Campos obrigatórios validados

**Atualização:**
- ✅ Apenas admins podem atualizar questões
- ✅ Campos obrigatórios não podem ser removidos

**Exclusão:**
- ✅ Apenas `admin_master` pode excluir questões

### Collection: `reports`

**Leitura:**
- ✅ Usuário pode ler apenas seus próprios reports
- ✅ Admins podem ler todos os reports

**Criação:**
- ✅ Qualquer usuário autenticado pode criar um report
- ✅ Deve criar report para si mesmo (`userId == auth.uid`)
- ✅ Status inicial deve ser 'pendente'

**Atualização:**
- ✅ Usuário pode atualizar apenas seus próprios reports pendentes
- ✅ Apenas `admin_master` pode resolver reports (mudar status para 'resolvido')

**Exclusão:**
- ✅ Apenas `admin_master` pode excluir reports

### Collection: `history`

**Todas as operações:**
- ✅ Usuário pode ler/escrever/excluir apenas seu próprio histórico
- ✅ Admins não têm acesso especial (privacidade do usuário)

### Collection: `results`

**Todas as operações:**
- ✅ Usuário pode ler/escrever/excluir apenas seus próprios resultados
- ✅ Admins não têm acesso especial (privacidade do usuário)

### Collection: `subscriptions`

**Leitura:**
- ✅ Usuário pode ler apenas sua própria assinatura
- ✅ Admins podem ler todas as assinaturas

**Criação/Atualização/Exclusão:**
- ✅ Apenas `admin_master` pode gerenciar assinaturas

## Proteções Implementadas

### 1. Proteção de Role

- ❌ Usuários não podem alterar sua própria `role`
- ✅ Apenas `admin_master` pode alterar `role` via Custom Claims (via Admin SDK)
- ✅ Firestore sincroniza automaticamente com Custom Claims

### 2. Proteção de Email

- ❌ Email não pode ser alterado após criação
- ✅ Previne mudanças não autorizadas de identidade

### 3. Validação de Dados

- ✅ Campos obrigatórios são validados na criação
- ✅ Campos críticos não podem ser removidos na atualização
- ✅ Tipos de dados são validados implicitamente

### 4. Isolamento de Dados

- ✅ Usuários só veem seus próprios dados pessoais
- ✅ Histórico e resultados são privados
- ✅ Admins têm acesso apenas onde necessário

## Exemplos de Uso

### Usuário criando seu perfil

```javascript
// ✅ Permitido
await setDoc(doc(db, 'users', user.uid), {
  name: 'João Silva',
  email: 'joao@example.com',
  role: 'aluno', // ou omitir (padrão)
  createdAt: new Date(),
})

// ❌ Negado - tentando criar perfil de outro usuário
await setDoc(doc(db, 'users', 'other-user-id'), { ... })

// ❌ Negado - tentando criar com role admin
await setDoc(doc(db, 'users', user.uid), {
  role: 'admin_master', // Negado!
  ...
})
```

### Usuário atualizando seu perfil

```javascript
// ✅ Permitido
await updateDoc(doc(db, 'users', user.uid), {
  name: 'João Silva Santos',
  period: '3º Período',
})

// ❌ Negado - tentando alterar role
await updateDoc(doc(db, 'users', user.uid), {
  role: 'admin_master', // Negado!
})

// ❌ Negado - tentando alterar email
await updateDoc(doc(db, 'users', user.uid), {
  email: 'novo@email.com', // Negado!
})
```

### Admin criando questão

```javascript
// ✅ Permitido (se for admin)
await setDoc(doc(db, 'questions', questionId), {
  enunciado: 'Qual é a capital do Brasil?',
  alternativaA: 'São Paulo',
  alternativaB: 'Rio de Janeiro',
  alternativaC: 'Brasília',
  alternativaD: 'Belo Horizonte',
  alternativaE: 'Salvador',
  alternativaCorreta: 'C',
  area: 'Geografia',
  dificuldade: 'facil',
  tipo: 'múltipla escolha',
  ativo: true,
  createdAt: new Date(),
  updatedAt: new Date(),
})
```

### Usuário criando report

```javascript
// ✅ Permitido
await setDoc(doc(db, 'reports', reportId), {
  questionId: 'question-123',
  userId: user.uid, // Deve ser o próprio usuário
  userName: 'João Silva',
  userEmail: 'joao@example.com',
  texto: 'Esta questão tem um erro...',
  status: 'pendente',
  createdAt: new Date(),
})
```

## Testando as Regras

### Firebase Console

1. Vá em **Firestore Database** > **Rules**
2. Clique em **Rules Playground**
3. Configure cenários de teste:
   - Autenticação: Sim/Não
   - Role: aluno/admin_master/admin_questoes
   - Operação: read/write/delete
   - Documento: path do documento

### Firebase CLI

```bash
# Testar regras localmente
firebase emulators:start --only firestore

# As regras serão carregadas automaticamente
```

## Troubleshooting

### Erro: "Missing or insufficient permissions"

**Causas comuns:**
1. Usuário não está autenticado
2. Tentando acessar documento de outro usuário
3. Tentando alterar campo protegido (role, email)
4. Role não está nos Custom Claims

**Soluções:**
1. Verificar se o usuário está logado
2. Verificar se está acessando documento próprio
3. Verificar Custom Claims do usuário
4. Verificar logs do Firebase Console

### Erro: "Field validation failed"

**Causa:** Campos obrigatórios faltando ou inválidos

**Solução:** Verificar se todos os campos obrigatórios estão presentes e com tipos corretos

## Notas Importantes

⚠️ **Custom Claims são source of truth**: A role no Firestore é apenas para visualização. A verificação real sempre usa Custom Claims.

⚠️ **Sincronização**: O middleware sincroniza automaticamente a role do Firestore com os Custom Claims.

⚠️ **Admin SDK**: Apenas operações via Admin SDK (API routes) podem alterar Custom Claims e roles.

⚠️ **Teste em produção**: Sempre teste as regras no ambiente de produção antes de depender delas.

## Atualizações Futuras

Se adicionar novas collections, lembre-se de:
1. Adicionar regras para a nova collection
2. Testar as regras no Rules Playground
3. Atualizar esta documentação
4. Fazer deploy das regras atualizadas


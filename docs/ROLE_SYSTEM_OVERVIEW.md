# Sistema de Roles - Visão Geral

Este documento descreve o sistema de roles implementado no SintoniaMed.

## Tipos de Roles

### 1. Aluno (Default)
- **Acesso**: Módulos do aplicativo (Dashboard, Gerador de Questões, Histórico, Perfil)
- **Restrições**: Precisa de assinatura ativa para utilizar o sistema
- **Redirecionamento**: Usuários alunos vão para `/dashboard` após login

### 2. Admin de Questões
- **Acesso**: Painel administrativo com acesso APENAS à gestão de questões
- **Permissões**:
  - Criar, editar, visualizar e arquivar questões
  - Ver dashboard administrativo (stats básicas)
- **Sem acesso a**:
  - Gestão de usuários
  - Gestão de reports
- **Redirecionamento**: Admins de questões vão para `/admin` após login

### 3. Admin Master
- **Acesso**: Painel administrativo completo
- **Permissões**:
  - Todas as funcionalidades de Admin de Questões
  - Gestão de usuários (ver, editar, liberar assinaturas, alterar roles)
  - Gestão de reports (ver, resolver)
  - Acesso a todas as estatísticas e analytics
- **Restrições**: Não precisa de assinatura
- **Redirecionamento**: Admin master vai para `/admin` após login

## Implementação Técnica

### Armazenamento de Roles

1. **Firestore Document** (`users` collection):
\`\`\`typescript
{
  name: string
  email: string
  period: string
  role: 'aluno' | 'admin_master' | 'admin_questoes'
  plan: 'monthly' | 'semester' | null
  planExpiresAt: Date | null
  createdAt: Date
}
\`\`\`

2. **Firebase Auth Custom Claims**:
\`\`\`typescript
{
  role: 'aluno' | 'admin_master' | 'admin_questoes'
}
\`\`\`

### Fluxo de Autenticação

1. Usuário faz login
2. Sistema carrega o documento do Firestore
3. Sistema lê os Custom Claims do token JWT
4. Role é definida a partir dos Custom Claims (source of truth)
5. Usuário é redirecionado baseado em sua role

### Proteção de Rotas

#### Client-Side
- `RoleGuard` component: Protege páginas inteiras
- `useRole` hook: Verifica permissões em componentes
- Redirecionamentos automáticos em `useEffect`

#### Server-Side
- Middleware básico preparado para expansão futura
- Por enquanto, proteção é feita no client-side

### Hooks e Utilities

\`\`\`typescript
// useRole hook
const {
  userRole,
  isAluno,
  isAdminMaster,
  isAdminQuestoes,
  isAnyAdmin,
  hasAccessToQuestions,
  hasAccessToUsers,
  hasAccessToReports,
  hasAccessToAdminPanel,
} = useRole()
\`\`\`

## Alterando Roles

### Como Definir o Primeiro Admin Master

1. Criar uma Cloud Function ou script de setup
2. Usar Firebase Admin SDK
3. Definir Custom Claim e atualizar Firestore:

\`\`\`typescript
// Cloud Function
await admin.auth().setCustomUserClaims(uid, { role: 'admin_master' })
await admin.firestore().collection('users').doc(uid).update({ 
  role: 'admin_master' 
})
\`\`\`

### Como Alterar Role de Usuário

1. Admin Master acessa `/admin/users`
2. Clica em "Role" no usuário desejado
3. Seleciona nova role
4. Sistema chama Cloud Function `setUserRole`
5. Usuário precisa fazer logout/login para aplicar mudanças

## Segurança

### Validações Implementadas

1. **Custom Claims são read-only no client**: Apenas Cloud Functions podem alterar
2. **Role verificada a cada request**: Token JWT validado pelo Firebase
3. **Proteção em múltiplas camadas**: Client + (futuro) Server-side
4. **Apenas Admin Master pode alterar roles**: Validado na Cloud Function

### Próximos Passos de Segurança

- [ ] Implementar Firestore Security Rules baseadas em Custom Claims
- [ ] Adicionar validação server-side em API routes
- [ ] Implementar rate limiting para alteração de roles
- [ ] Adicionar logs de auditoria para mudanças de roles

## Fluxos Principais

### Novo Usuário
1. Registra-se no sistema
2. Role 'aluno' definida automaticamente (Firestore + Custom Claims)
3. Redirecionado para escolher plano

### Admin Criando Questão
1. Login com role 'admin_questoes' ou 'admin_master'
2. Acessa `/admin/questions`
3. Clica em "Nova Questão"
4. Preenche formulário
5. Salva no Firestore

### Admin Master Liberando Acesso
1. Login com role 'admin_master'
2. Acessa `/admin/users`
3. Seleciona usuário
4. Clica em "Liberar Acesso"
5. Escolhe plano e confirma
6. Sistema atualiza Firestore com nova data de expiração

# Scripts de Administração

## Script: set-user-role.ts

Script para definir roles de usuários manualmente usando Firebase Admin SDK.

### Pré-requisitos

1. **Instalar dependências:**
   ```bash
   pnpm install
   ```

2. **Configurar Firebase Admin SDK:**

   Você precisa configurar o Firebase Admin SDK de uma das seguintes formas:

   **Opção 1: Service Account Key (Recomendado)**
   
   - Acesse o [Firebase Console](https://console.firebase.google.com/)
   - Vá em Project Settings > Service Accounts
   - Clique em "Generate new private key"
   - Salve o arquivo JSON como `firebase-service-account.json` na raiz do projeto
   - ⚠️ **IMPORTANTE**: Adicione este arquivo ao `.gitignore` para não commitar credenciais!

   **Opção 2: Variáveis de Ambiente**
   
   Defina as seguintes variáveis de ambiente:
   ```bash
   export FIREBASE_PROJECT_ID="seu-project-id"
   export FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@seu-projeto.iam.gserviceaccount.com"
   export FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

### Uso

```bash
pnpm set-role <email> <role>
```

### Exemplos

Definir usuário como admin_master:
```bash
pnpm set-role contato@brunocastrodev.com.br admin_master
```

Definir usuário como admin_questoes:
```bash
pnpm set-role usuario@example.com admin_questoes
```

Definir usuário como aluno:
```bash
pnpm set-role usuario@example.com aluno
```

### Roles Válidos

- `aluno` - Usuário padrão (estudante)
- `admin_master` - Administrador com acesso total
- `admin_questoes` - Administrador com acesso apenas a questões

### O que o script faz?

1. ✅ Busca o usuário pelo email no Firebase Auth
2. ✅ Define o Custom Claim com a role especificada
3. ✅ Atualiza ou cria o documento no Firestore (`users` collection)
4. ✅ Adiciona timestamp de atualização da role

### Importante

⚠️ **Após executar o script, o usuário precisa fazer logout e login novamente** para que as mudanças de role tenham efeito, pois os Custom Claims são incluídos no token JWT que precisa ser renovado.

### Troubleshooting

**Erro: "Firebase Admin não configurado"**
- Verifique se você criou o arquivo `firebase-service-account.json` ou definiu as variáveis de ambiente

**Erro: "Usuário não encontrado"**
- Verifique se o email está correto e se o usuário já foi criado no Firebase Auth

**Erro: "Role inválido"**
- Use apenas: `aluno`, `admin_master` ou `admin_questoes`


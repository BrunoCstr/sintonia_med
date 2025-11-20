# Exemplo de Uso - Definir Admin Master

## Passo a Passo

### 1. Instalar dependências
```bash
pnpm install
```

### 2. Configurar Firebase Admin SDK

**Opção A: Usar Service Account Key (Recomendado)**

1. Acesse: https://console.firebase.google.com/
2. Selecione seu projeto
3. Vá em ⚙️ **Project Settings** > **Service Accounts**
4. Clique em **"Generate new private key"**
5. Salve o arquivo JSON como `firebase-service-account.json` na **raiz do projeto**
6. ⚠️ O arquivo já está no `.gitignore` para não ser commitado

**Opção B: Usar Variáveis de Ambiente**

```bash
export FIREBASE_PROJECT_ID="seu-project-id"
export FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@seu-projeto.iam.gserviceaccount.com"
export FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 3. Executar o script

Para definir `contato@brunocastrodev.com.br` como `admin_master`:

```bash
pnpm set-role contato@brunocastrodev.com.br admin_master
```

### 4. Verificar resultado

O script vai mostrar:
- ✅ Se o usuário foi encontrado
- ✅ Se o custom claim foi definido
- ✅ Se o Firestore foi atualizado
- ⚠️ Lembrete para o usuário fazer logout/login

### 5. Usuário precisa fazer logout/login

⚠️ **IMPORTANTE**: O usuário `contato@brunocastrodev.com.br` precisa fazer logout e login novamente para que a role `admin_master` tenha efeito.

## Outros Exemplos

Definir outro usuário como admin de questões:
```bash
pnpm set-role outro@email.com admin_questoes
```

Reverter para aluno:
```bash
pnpm set-role usuario@email.com aluno
```


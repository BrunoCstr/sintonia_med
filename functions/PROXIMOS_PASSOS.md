# 🚀 Configuração do Backup - Firebase Storage + Email

## ✅ O que o sistema faz:

1. **Cria um arquivo Excel** com todas as questões do Firestore
2. **Salva no Firebase Storage** (pasta `backups/`)
3. **Envia um email** para o cliente com o link de download

O backup é executado **automaticamente toda segunda-feira às 00:00** (horário de Brasília).

---

## 📋 Configuração Necessária:

### Passo 1: Criar uma Senha de App no Gmail

Para enviar emails pelo Gmail, você precisa criar uma **Senha de App** (não use a senha normal da conta).

1. Acesse: https://myaccount.google.com/apppasswords
2. Se pedir, faça login com sua conta Google
3. Em "Nome do app", digite: `Sintonia Med Backup`
4. Clique em **"Criar"**
5. **Copie a senha de 16 caracteres** que aparecer (ex: `abcd efgh ijkl mnop`)
6. **Guarde essa senha** - você vai usar no próximo passo

> ⚠️ **Importante**: Para criar uma Senha de App, você precisa ter a **Verificação em 2 etapas** ativada na sua conta Google.

---

### Passo 2: Configurar Secrets no Firebase (via Terminal)

Use o terminal para criar os **secrets** do Firebase. Os secrets são a forma segura de armazenar informações sensíveis como senhas.

**No terminal, na pasta do projeto:**

```bash
# Criar secret para EMAIL_USER
firebase functions:secrets:set EMAIL_USER

# Quando pedir, digite seu email Gmail (ex: seuemail@gmail.com)
# Pressione Enter após digitar
```

```bash
# Criar secret para EMAIL_PASSWORD
firebase functions:secrets:set EMAIL_PASSWORD

# Quando pedir, digite a Senha de App de 16 caracteres (sem espaços)
# Exemplo: abcdefghijklmnop
# Pressione Enter após digitar
```

```bash
# Criar secret para CLIENT_EMAIL
firebase functions:secrets:set CLIENT_EMAIL

# Quando pedir, digite o email do cliente que vai receber o backup
# Exemplo: cliente@email.com
# Pressione Enter após digitar
```

> 💡 **Dica**: Se você já fez login no Firebase CLI (`firebase login`), os secrets serão criados automaticamente. Se não, você precisará fazer login primeiro.

---

### Passo 3: Fazer Deploy

No terminal, na pasta `functions`:

```bash
pnpm run build
pnpm run deploy
```

Ou da raiz do projeto:

```bash
firebase deploy --only functions
```

---

### Passo 4: Testar o Backup

Após o deploy, teste chamando a função manual:

**PowerShell:**
```powershell
Invoke-WebRequest -Method POST -Uri "https://backupquestionsmanual-mluidk43ra-uc.a.run.app"
```

**Curl:**
```bash
curl -X POST https://backupquestionsmanual-mluidk43ra-uc.a.run.app
```

**Resposta esperada:**
```json
{
  "success": true,
  "message": "Backup concluído com sucesso!",
  "questionsCount": 123,
  "fileName": "backup-questoes-2025-12-23.xlsx",
  "downloadUrl": "https://storage.googleapis.com/...",
  "emailSent": true,
  "emailRecipient": "cliente@email.com",
  "timestamp": "2025-12-23T15:00:00.000Z"
}
```

---

## ✅ Checklist Final

- [ ] Criei uma Senha de App no Gmail
- [ ] Criei o secret `EMAIL_USER` via terminal (`firebase functions:secrets:set EMAIL_USER`)
- [ ] Criei o secret `EMAIL_PASSWORD` via terminal (`firebase functions:secrets:set EMAIL_PASSWORD`)
- [ ] Criei o secret `CLIENT_EMAIL` via terminal (`firebase functions:secrets:set CLIENT_EMAIL`)
- [ ] Fiz o deploy (`pnpm run deploy`)
- [ ] Testei a função manual
- [ ] Verifiquei se o email chegou

---

## 🆘 Problemas Comuns

### Erro: "Email não enviado" ou "Secrets não configurados"
- Verifique se os 3 secrets foram criados (`firebase functions:secrets:access EMAIL_USER` para verificar)
- Certifique-se de que usou a **Senha de App**, não a senha normal
- Verifique se a Verificação em 2 etapas está ativada na conta Google
- Após criar os secrets, é necessário fazer um novo deploy

### Erro: "Invalid login"
- A Senha de App pode ter expirado ou sido revogada
- Crie uma nova Senha de App e atualize o secret: `firebase functions:secrets:set EMAIL_PASSWORD`

### Como verificar se os secrets estão configurados:
```bash
# Verificar EMAIL_USER
firebase functions:secrets:access EMAIL_USER

# Verificar EMAIL_PASSWORD
firebase functions:secrets:access EMAIL_PASSWORD

# Verificar CLIENT_EMAIL
firebase functions:secrets:access CLIENT_EMAIL
```

### Email cai na pasta de Spam
- Peça para o cliente marcar o email como "Não é spam"
- Adicione o remetente aos contatos

### Link de download expirou
- Os links do Firebase Storage expiram em **7 dias**
- O cliente deve baixar o arquivo dentro desse prazo

---

## 🎉 Quando Estiver Funcionando

1. ✅ O backup automático vai executar **toda segunda-feira às 00:00** (horário de Brasília)
2. ✅ O arquivo é salvo no Firebase Storage (pasta `backups/`)
3. ✅ O cliente recebe um **email bonito** com o link de download
4. ✅ O link de download é válido por **7 dias**
5. ✅ Você pode executar backup manual a qualquer momento

---

## 📧 Exemplo do Email

O cliente vai receber um email assim:

```
📊 Backup Semanal das Questões - 23/12/2025

Olá!

O backup semanal das questões foi realizado com sucesso.

📊 123 Questões
📅 23/12/2025

📁 Arquivo: backup-questoes-2025-12-23.xlsx

[⬇️ Baixar Backup]

⚠️ Importante: Este link expira em 7 dias.
```

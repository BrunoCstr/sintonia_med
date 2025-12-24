# Configuração de E-mail com Nodemailer

Este projeto utiliza Nodemailer para enviar e-mails de validação de conta com um template personalizado.

## Variáveis de Ambiente Necessárias

Para que o envio de e-mails funcione, você precisa configurar as seguintes variáveis de ambiente:

### Desenvolvimento Local (.env.local)

```env
EMAIL_USER=seu-email@gmail.com
EMAIL_PASSWORD=sua-senha-de-aplicativo
```

### Produção (Vercel/outros)

Configure as variáveis de ambiente no painel do seu provedor de hospedagem:
- `EMAIL_USER`: Seu e-mail do Gmail
- `EMAIL_PASSWORD`: Senha de aplicativo do Gmail (não a senha normal)

## Configuração do Gmail

### 1. Ativar Verificação em Duas Etapas

1. Acesse: https://myaccount.google.com/security
2. Ative a "Verificação em duas etapas"

### 2. Gerar Senha de Aplicativo

1. Acesse: https://myaccount.google.com/apppasswords
2. Selecione "Email" como aplicativo
3. Selecione "Outro (nome personalizado)" como dispositivo
4. Digite um nome (ex: "SintoniaMed")
5. Clique em "Gerar"
6. **Copie os 16 caracteres EXATAMENTE** (sem espaços, sem hífens)

### 3. Configurar Variáveis de Ambiente

**Desenvolvimento:**
```bash
# Crie um arquivo .env.local na raiz do projeto
echo "EMAIL_USER=seu-email@gmail.com" >> .env.local
echo "EMAIL_PASSWORD=abcdefghijklmnop" >> .env.local
```

**Produção (Vercel):**
1. Acesse o painel da Vercel
2. Vá em Settings > Environment Variables
3. Adicione `EMAIL_USER` e `EMAIL_PASSWORD`

## Template de E-mail

O template de e-mail está localizado em `lib/email.ts` e pode ser personalizado conforme necessário.

## Funcionalidades

- ✅ Envio automático de e-mail de validação ao criar conta
- ✅ Reenvio de e-mail de validação
- ✅ Template HTML responsivo e personalizado
- ✅ Link de validação válido por 24 horas

## Troubleshooting

### Erro: "Credenciais de e-mail inválidas"

- Verifique se está usando uma **senha de aplicativo** (16 caracteres), não a senha normal do Gmail
- Certifique-se de que copiou todos os 16 caracteres sem espaços
- Verifique se a verificação em duas etapas está ativada

### E-mail não está sendo enviado

- Verifique se as variáveis de ambiente estão configuradas corretamente
- Verifique os logs do servidor para mais detalhes
- Em desenvolvimento, verifique o console do navegador

### Link de validação expira muito rápido

O link de validação do Firebase expira em 24 horas por padrão. Isso é uma configuração de segurança do Firebase e não pode ser alterado facilmente.



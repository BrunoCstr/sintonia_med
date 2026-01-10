import nodemailer from 'nodemailer'

/**
 * Template HTML para e-mail de validação
 */
function getVerificationEmailTemplate(verificationLink: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Validação de E-mail - SintoniaMed</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);">
    <table role="presentation" style="width: 100%; border-collapse: collapse; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table role="presentation" style="max-width: 560px; width: 100%; background-color: #FFFFF3; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.15); overflow: hidden;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #CF0300 0%, #90091C 100%); padding: 40px 30px; text-align: center;">
                            <img src="https://sintoniamed.com.br/public/logo-template-email.png" alt="SintoniaMed Logo" width="260" style="max-width: 100%; height: auto; display: block; margin: 0 auto; border: 0;">
                        </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            
                            <h1 style="margin: 0 0 20px 0; color: #90091C; font-size: 30px; font-weight: 700; text-align: center; letter-spacing: -0.5px;">
                                Valide seu E-mail
                            </h1>
                            
                            <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.7; text-align: center;">
                                Olá! 👋
                            </p>
                            
                            <p style="margin: 0 0 20px 0; color: #555; font-size: 16px; line-height: 1.7; text-align: center;">
                                Seja bem-vindo(a) ao <strong style="color: #90091C;">SintoniaMed</strong>! Estamos muito felizes em tê-lo(a) conosco.
                            </p>
                            
                            <p style="margin: 0 0 30px 0; color: #555; font-size: 16px; line-height: 1.7; text-align: center;">
                                Para começar a usar sua conta, precisamos confirmar seu endereço de e-mail. Clique no botão abaixo para validar:
                            </p>
                            
                            <!-- Button -->
                            <table role="presentation" style="margin: 0 auto 30px auto; width: 100%;">
                                <tr>
                                    <td align="center">
                                        <a href="${verificationLink}" style="display: inline-block; padding: 16px 44px; background: linear-gradient(135deg, #CF0300 0%, #90091C 100%); color: #FFFFF3; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 12px; box-shadow: 0 8px 20px rgba(207, 3, 0, 0.3); letter-spacing: 0.5px;">
                                            ✅ Validar Meu E-mail
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Divider -->
                            <div style="border-top: 2px solid #f0f0f0; margin: 30px 0; position: relative;">
                                <span style="position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background-color: #FFFFF3; padding: 0 15px; color: #999; font-size: 13px; font-weight: 600;">
                                    OU
                                </span>
                            </div>
                            
                            <p style="margin: 0 0 15px 0; color: #666; font-size: 14px; text-align: center;">
                                Copie e cole o link abaixo no seu navegador:
                            </p>
                            
                            <div style="background: linear-gradient(135deg, #f8f8f8 0%, #f0f0f0 100%); padding: 16px 18px; border-radius: 10px; margin-bottom: 30px; border-left: 4px solid #CF0300;">
                                <p style="margin: 0; color: #555; font-size: 13px; word-break: break-all; font-family: 'Courier New', monospace;">
                                    <a href="${verificationLink}" style="color: #CF0300; text-decoration: none;">${verificationLink}</a>
                                </p>
                            </div>
                            
                            <!-- Alert -->
                            <div style="background: linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%); border-left: 4px solid #CF0300; padding: 18px; border-radius: 10px; margin: 30px 0;">
                                <table role="presentation" style="width: 100%;">
                                    <tr>
                                        <td style="width: 36px; vertical-align: top;">
                                            <div style="width: 32px; height: 32px; background-color: #CF0300; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="#FFFFF3"/>
                                                </svg>
                                            </div>
                                        </td>
                                        <td style="padding-left: 12px;">
                                            <p style="margin: 0; color: #90091C; font-size: 14px; font-weight: 600;">
                                                ⏰ Este link expira em 24 horas
                                            </p>
                                            <p style="margin: 5px 0 0 0; color: #666; font-size: 13px;">
                                                Após a validação, você terá acesso completo à plataforma.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- Benefits Section -->
                            <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 10px; padding: 20px; margin: 30px 0;">
                                <p style="margin: 0 0 15px 0; color: #90091C; font-size: 16px; font-weight: 700; text-align: center;">
                                    🎯 O que você terá acesso:
                                </p>
                                <table role="presentation" style="width: 100%;">
                                    <tr>
                                        <td style="padding: 8px 0;">
                                            <span style="color: #CF0300; font-size: 18px; margin-right: 8px;">📚</span>
                                            <span style="color: #555; font-size: 14px;">Biblioteca completa de questões</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0;">
                                            <span style="color: #CF0300; font-size: 18px; margin-right: 8px;">📝</span>
                                            <span style="color: #555; font-size: 14px;">Simulados personalizados</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0;">
                                            <span style="color: #CF0300; font-size: 18px; margin-right: 8px;">📊</span>
                                            <span style="color: #555; font-size: 14px;">Relatórios de desempenho detalhados</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0;">
                                            <span style="color: #CF0300; font-size: 18px; margin-right: 8px;">🎓</span>
                                            <span style="color: #555; font-size: 14px;">Conteúdo atualizado para residência médica</span>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            
                            <div style="text-align: center; margin-top: 35px; padding-top: 25px; border-top: 2px solid #f0f0f0;">
                                <p style="margin: 0 0 5px 0; color: #333; font-size: 15px;">
                                    Atenciosamente,
                                </p>
                                <p style="margin: 0; color: #90091C; font-size: 17px; font-weight: 700;">
                                    Equipe SintoniaMed
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background: linear-gradient(180deg, #f8f8f8 0%, #f0f0f0 100%); padding: 30px; text-align: center;">
                            <p style="margin: 0 0 15px 0; color: #666; font-size: 14px; line-height: 1.6;">
                                Se você não criou esta conta, pode ignorar este e-mail com segurança.<br>
                                <a href="#" style="color: #CF0300; text-decoration: none; font-weight: 600;">Entre em contato conosco</a> se tiver dúvidas.
                            </p>
                            
                            <div style="margin: 25px 0;">
                                <a href="#" style="margin: 0 8px; color: #999; text-decoration: none; font-size: 13px;">Ajuda</a>
                                <span style="color: #ccc;">•</span>
                                <a href="#" style="margin: 0 8px; color: #999; text-decoration: none; font-size: 13px;">Privacidade</a>
                                <span style="color: #ccc;">•</span>
                                <a href="#" style="margin: 0 8px; color: #999; text-decoration: none; font-size: 13px;">Termos</a>
                            </div>
                            
                            <p style="margin: 20px 0 0 0; color: #999; font-size: 12px;">
                                © 2026 SintoniaMed - Sistema de Questionários e Simulados de Medicina<br>
                                Todos os direitos reservados.
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`
}

/**
 * Transporter cacheado para evitar criação repetida
 */
let cachedTransporter: any = null

/**
 * Cria e retorna um transporter do Nodemailer configurado (com cache)
 */
function getTransporter() {
  if (cachedTransporter) {
    return cachedTransporter
  }

  const emailUser = process.env.EMAIL_USER
  const emailPassword = process.env.EMAIL_PASSWORD

  if (!emailUser || !emailPassword) {
    throw new Error(
      'Credenciais de e-mail não configuradas. Configure as variáveis de ambiente EMAIL_USER e EMAIL_PASSWORD.'
    )
  }

  // Limpar espaços e caracteres invisíveis
  const cleanEmailUser = emailUser.trim()
  const cleanEmailPassword = emailPassword.trim().replace(/\s/g, '')

  cachedTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: cleanEmailUser,
      pass: cleanEmailPassword,
    },
    // Configurações de pool para melhor performance
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  })

  return cachedTransporter
}

/**
 * Envia e-mail de validação usando Nodemailer
 * @param to - E-mail do destinatário
 * @param verificationLink - Link de verificação gerado pelo Firebase
 */
export async function sendVerificationEmail(
  to: string,
  verificationLink: string
): Promise<void> {
  try {
    const transporter = getTransporter()

    // REMOVIDO: transporter.verify() - adiciona 2-5s de latência desnecessária
    // A verificação só é útil em desenvolvimento/testes, não em produção

    const emailUser = process.env.EMAIL_USER!
    const emailHtml = getVerificationEmailTemplate(verificationLink)

    const mailOptions = {
      from: `"SintoniaMed" <${emailUser}>`,
      to: to,
      subject: 'Valide seu E-mail - SintoniaMed',
      html: emailHtml,
      // Prioridade alta para e-mails de verificação
      priority: 'high',
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('✅ E-mail de validação enviado com sucesso:', info.messageId)
  } catch (error: any) {
    console.error('❌ Erro ao enviar e-mail de validação:', error)
    
    // Mensagens de erro mais amigáveis
    if (error.message?.includes('BadCredentials') || 
        error.message?.includes('Username and Password not accepted')) {
      throw new Error(
        'Credenciais de e-mail inválidas. Verifique se EMAIL_USER e EMAIL_PASSWORD estão corretos. ' +
        'Para Gmail, use uma senha de aplicativo (não a senha normal). ' +
        'Gere em: https://myaccount.google.com/apppasswords'
      )
    }
    
    if (error.message?.includes('Application-specific password required')) {
      throw new Error(
        'Gmail requer senha de aplicativo. Ative a verificação em duas etapas e gere uma senha de aplicativo em ' +
        'https://myaccount.google.com/apppasswords'
      )
    }

    throw error
  }
}



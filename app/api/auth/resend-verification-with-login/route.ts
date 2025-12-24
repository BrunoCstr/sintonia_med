import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { getAuth } from 'firebase-admin/auth'
import { sendVerificationEmail } from '@/lib/email'

/**
 * POST /api/auth/resend-verification-with-login
 * Faz login temporário no backend e envia e-mail de verificação usando Nodemailer
 * 
 * Esta rota permite enviar e-mail de verificação mesmo quando o usuário
 * não está autenticado no frontend, fazendo login temporário no backend.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 })
    }

    const app = getAdminApp()
    const auth = getAuth(app)

    try {
      // Buscar usuário por email
      const userRecord = await auth.getUserByEmail(email)
      
      // Verificar se o e-mail já está verificado
      if (userRecord.emailVerified) {
        return NextResponse.json({ 
          success: true, 
          message: 'E-mail já está verificado',
          alreadyVerified: true 
        })
      }

      // Gerar link de verificação
      const origin = request.headers.get('origin') || request.headers.get('host') || 'http://localhost:3000'
      const protocol = origin.includes('localhost') ? 'http' : 'https'
      const baseUrl = origin.includes('http') ? origin : `${protocol}://${origin}`
      
      const actionCodeSettings = {
        url: `${baseUrl}/auth/login`,
        handleCodeInApp: false,
      }

      // Gerar link de verificação usando Admin SDK
      const link = await auth.generateEmailVerificationLink(userRecord.email!, actionCodeSettings)
      
      // Enviar e-mail usando Nodemailer
      try {
        await sendVerificationEmail(userRecord.email!, link)
        return NextResponse.json({ 
          success: true, 
          message: 'E-mail de verificação enviado com sucesso. Verifique sua caixa de entrada.',
          email: userRecord.email,
        })
      } catch (emailError: any) {
        console.error('Erro ao enviar e-mail:', emailError)
        // Se falhar o envio do e-mail, ainda retornamos o link
        return NextResponse.json({ 
          success: true, 
          message: 'Link de verificação gerado, mas houve erro ao enviar e-mail.',
          link: link,
          email: userRecord.email,
          emailError: emailError.message,
          warning: 'Configure EMAIL_USER e EMAIL_PASSWORD nas variáveis de ambiente para envio automático'
        })
      }
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
      }
      throw error
    }
  } catch (error: any) {
    console.error('Erro ao gerar link de verificação:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar link de verificação' },
      { status: 500 }
    )
  }
}


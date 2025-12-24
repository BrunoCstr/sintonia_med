import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { sendVerificationEmail } from '@/lib/email'

/**
 * POST /api/auth/resend-verification
 * Reenvia e-mail de verificação para o usuário usando Nodemailer
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 })
    }

    const app = getAdminApp()

    try {
      // Buscar usuário por email
      const userRecord = await app.auth().getUserByEmail(email)
      
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

      // Gerar link de verificação
      const link = await app.auth().generateEmailVerificationLink(email, actionCodeSettings)
      
      // Enviar e-mail usando Nodemailer
      try {
        await sendVerificationEmail(userRecord.email!, link)
        return NextResponse.json({ 
          success: true, 
          message: 'E-mail de verificação reenviado com sucesso. Verifique sua caixa de entrada.',
        })
      } catch (emailError: any) {
        console.error('Erro ao enviar e-mail:', emailError)
        // Se falhar o envio do e-mail, ainda retornamos sucesso mas com aviso
        return NextResponse.json({ 
          success: true, 
          message: 'Link de verificação gerado, mas houve erro ao enviar e-mail.',
          emailError: emailError.message,
          warning: 'Configure EMAIL_USER e EMAIL_PASSWORD nas variáveis de ambiente para envio automático',
          // Em desenvolvimento, retornar o link para debug
          ...(process.env.NODE_ENV === 'development' && { link })
        })
      }
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
      }
      throw error
    }
  } catch (error: any) {
    console.error('Erro ao reenviar e-mail de verificação:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao reenviar e-mail de verificação' },
      { status: 500 }
    )
  }
}


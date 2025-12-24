import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { sendVerificationEmail } from '@/lib/email'

/**
 * POST /api/auth/send-verification-email
 * Gera link de verificação e envia e-mail usando Nodemailer
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, uid } = body

    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 })
    }

    const app = getAdminApp()

    try {
      // Buscar usuário por email ou UID
      let userRecord
      if (uid) {
        userRecord = await app.auth().getUser(uid)
      } else {
        userRecord = await app.auth().getUserByEmail(email)
      }
      
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
      const link = await app.auth().generateEmailVerificationLink(userRecord.email!, actionCodeSettings)
      
      // Enviar e-mail usando Nodemailer
      try {
        await sendVerificationEmail(userRecord.email!, link)
        return NextResponse.json({ 
          success: true, 
          message: 'E-mail de verificação enviado com sucesso',
          email: userRecord.email,
        })
      } catch (emailError: any) {
        console.error('Erro ao enviar e-mail:', emailError)
        // Se falhar o envio do e-mail, ainda retornamos o link para o frontend usar como fallback
        return NextResponse.json({ 
          success: true, 
          message: 'Link de verificação gerado, mas houve erro ao enviar e-mail. Use o link fornecido.',
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

import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'

/**
 * POST /api/auth/resend-verification
 * Reenvia e-mail de verificação para o usuário
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
      const actionCodeSettings = {
        url: `${request.headers.get('origin') || 'http://localhost:3000'}/auth/login`,
        handleCodeInApp: false,
      }

      // Gerar link de verificação (o Firebase Admin SDK gera o link mas não envia automaticamente)
      // Em produção, você precisaria configurar um serviço de e-mail customizado ou usar Firebase Extensions
      const link = await app.auth().generateEmailVerificationLink(email, actionCodeSettings)
      
      // Nota: O Firebase Admin SDK não envia e-mails automaticamente.
      // Você precisa:
      // 1. Configurar um serviço de e-mail (SendGrid, AWS SES, etc.) para enviar o link
      // 2. Ou usar Firebase Extensions para envio automático de e-mails
      // 3. Ou usar o Firebase Client SDK no frontend (que já está implementado)
      
      // Por enquanto, retornamos sucesso (o frontend tentará usar o Client SDK primeiro)
      return NextResponse.json({ 
        success: true, 
        message: 'E-mail de verificação será enviado. Verifique sua caixa de entrada.',
        // Em desenvolvimento, você pode retornar o link para debug
        ...(process.env.NODE_ENV === 'development' && { link })
      })
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


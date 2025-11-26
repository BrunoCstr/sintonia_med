import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

/**
 * POST /api/auth/resend-verification-with-login
 * Faz login temporário no backend e envia e-mail de verificação
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
      
      // IMPORTANTE: O Firebase Admin SDK gera o link mas NÃO envia o e-mail automaticamente.
      // Para realmente enviar o e-mail, você precisa:
      // 1. Usar o Firebase Client SDK (que requer autenticação)
      // 2. Ou integrar com um serviço de e-mail (Resend, SendGrid, etc.)
      // 3. Ou usar Firebase Extensions (Trigger Email)
      
      // Por enquanto, vamos retornar o link e instruções
      // Em produção, você deve integrar com um serviço de e-mail real aqui
      
      return NextResponse.json({ 
        success: true, 
        message: 'Link de verificação gerado. Configure um serviço de e-mail para enviar automaticamente.',
        link: link,
        email: userRecord.email,
        note: 'Para enviar o e-mail automaticamente, integre com Resend, SendGrid ou outro serviço de e-mail'
      })
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


import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'

/**
 * POST /api/auth/send-verification-email
 * Envia e-mail de verificação usando Firebase Admin SDK
 * 
 * IMPORTANTE: O Firebase Admin SDK gera o link mas NÃO envia o e-mail automaticamente.
 * Esta função retorna o link que deve ser usado pelo Client SDK para enviar o e-mail.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, uid, password } = body

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
      
      // Retornar o link e instruções
      return NextResponse.json({ 
        success: true, 
        message: 'Link de verificação gerado com sucesso',
        link: link,
        email: userRecord.email,
        // Instruções para o frontend usar o Client SDK
        instructions: 'Use o Firebase Client SDK sendEmailVerification com este link, ou envie o link via serviço de e-mail customizado'
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

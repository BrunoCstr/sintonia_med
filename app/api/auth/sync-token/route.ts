import { NextRequest, NextResponse } from 'next/server'
import { verifyFirebaseToken, syncRoleWithFirestore } from '@/lib/middleware-auth'

/**
 * POST /api/auth/sync-token
 * Sincroniza o token Firebase do cliente com o servidor
 * Armazena o token em um cookie HTTP-only para uso no middleware
 * 
 * Body:
 * {
 *   token: string (Firebase ID Token)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar e validar o token
    const authUser = await verifyFirebaseToken(token)

    if (!authUser) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 401 }
      )
    }

    // Sincronizar role do Firestore com Custom Claims
    await syncRoleWithFirestore(authUser.uid, authUser.role)

    // Criar resposta com cookie HTTP-only
    const response = NextResponse.json({
      success: true,
      user: {
        uid: authUser.uid,
        email: authUser.email,
        role: authUser.role,
      },
    })

    // Armazenar token em cookie HTTP-only (válido por 1 hora)
    // O cookie será usado pelo middleware para verificar autenticação
    response.cookies.set('firebase-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60, // 1 hora
      path: '/',
    })

    return response
  } catch (error: any) {
    console.error('Erro ao sincronizar token:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao sincronizar token' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/auth/sync-token
 * Remove o token do cookie (logout)
 */
export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ success: true })
  response.cookies.delete('firebase-token')
  return response
}





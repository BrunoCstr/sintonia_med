import { NextRequest, NextResponse } from 'next/server'
import { verifyFirebaseToken, syncRoleWithFirestore } from '@/lib/middleware-auth'

/**
 * POST /api/auth/verify
 * Verifica e valida o token Firebase
 * Usado pelo middleware para validar tokens
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

    // Sincronizar role do Firestore com Custom Claims (em background)
    syncRoleWithFirestore(authUser.uid, authUser.role).catch(console.error)

    return NextResponse.json({
      success: true,
      user: {
        uid: authUser.uid,
        email: authUser.email,
        role: authUser.role,
      },
    })
  } catch (error: any) {
    console.error('Erro ao verificar token:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao verificar token' },
      { status: 500 }
    )
  }
}






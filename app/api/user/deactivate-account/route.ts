import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'

/**
 * POST /api/user/deactivate-account
 * Inativa a conta do usuário no Firebase Auth
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('firebase-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const authUser = await verifyFirebaseToken(token)
    if (!authUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const app = getAdminApp()
    const auth = app.auth()
    const db = app.firestore()

    // Desabilitar conta no Firebase Auth
    await auth.updateUser(authUser.uid, {
      disabled: true,
    })

    // Marcar conta como inativa no Firestore
    await db.collection('users').doc(authUser.uid).update({
      active: false,
      deactivatedAt: new Date(),
      updatedAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      message: 'Conta inativada com sucesso!',
    })
  } catch (error: any) {
    console.error('Erro ao inativar conta:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao inativar conta' },
      { status: 500 }
    )
  }
}


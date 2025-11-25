import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'

/**
 * PUT /api/user/profile
 * Atualiza o perfil do usuário (nome e período)
 */
export async function PUT(request: NextRequest) {
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

    const body = await request.json()
    const { name, period } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
        { status: 400 }
      )
    }

    if (!period || typeof period !== 'string' || period.trim().length === 0) {
      return NextResponse.json(
        { error: 'Período é obrigatório' },
        { status: 400 }
      )
    }

    const app = getAdminApp()
    const db = app.firestore()

    // Atualizar perfil do usuário
    const userRef = db.collection('users').doc(authUser.uid)
    await userRef.update({
      name: name.trim(),
      period: period.trim(),
      updatedAt: new Date(),
    })

    // Buscar dados atualizados
    const updatedDoc = await userRef.get()
    const updatedData = updatedDoc.data()!

    return NextResponse.json({
      success: true,
      profile: {
        name: updatedData.name,
        email: updatedData.email,
        period: updatedData.period,
        institution: updatedData.institution,
        photoURL: updatedData.photoURL || null,
        plan: updatedData.plan || null,
        planExpiresAt: updatedData.planExpiresAt
          ? updatedData.planExpiresAt.toDate().toISOString()
          : null,
        role: updatedData.role || 'aluno',
      },
    })
  } catch (error: any) {
    console.error('Erro ao atualizar perfil:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar perfil' },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'

/**
 * POST /api/user/check-expired-plan
 * Verifica se o plano do usuário expirou e atualiza no banco se necessário
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
    const db = app.firestore()

    // Buscar dados do usuário
    const userRef = db.collection('users').doc(authUser.uid)
    const userDoc = await userRef.get()

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const userData = userDoc.data()
    const plan = userData?.plan
    const planExpiresAt = userData?.planExpiresAt

    // Se não tem plano, retornar
    if (!plan) {
      return NextResponse.json({
        expired: false,
        plan: null,
        planExpiresAt: null,
      })
    }

    // Plano vitalício nunca expira
    if (plan === 'lifetime') {
      return NextResponse.json({
        expired: false,
        plan: 'lifetime',
        planExpiresAt: null,
        daysRemaining: null,
        isLifetime: true,
      })
    }

    // Se não tem data de expiração (mas tem plano), considerar ativo
    if (!planExpiresAt) {
      return NextResponse.json({
        expired: false,
        plan,
        planExpiresAt: null,
      })
    }

    // Converter data de expiração
    let expiresDate: Date
    if (planExpiresAt?.toDate && typeof planExpiresAt.toDate === 'function') {
      expiresDate = planExpiresAt.toDate()
    } else if (planExpiresAt instanceof Date) {
      expiresDate = planExpiresAt
    } else {
      expiresDate = new Date(planExpiresAt)
    }

    const now = new Date()
    const isExpired = expiresDate <= now

    // Se expirou, atualizar no banco
    if (isExpired) {
      await userRef.update({
        plan: null,
        planExpiresAt: null,
        updatedAt: new Date(),
      })

      console.log(`[Expired Plan] Plano expirado removido para usuário ${authUser.uid}`)

      return NextResponse.json({
        expired: true,
        plan: null,
        planExpiresAt: null,
        message: 'Plano expirado e removido',
      })
    }

    // Calcular dias restantes
    const diffTime = expiresDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return NextResponse.json({
      expired: false,
      plan,
      planExpiresAt: expiresDate.toISOString(),
      daysRemaining: diffDays,
    })
  } catch (error: any) {
    console.error('Erro ao verificar plano expirado:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao verificar plano expirado' },
      { status: 500 }
    )
  }
}


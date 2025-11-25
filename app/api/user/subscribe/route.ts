import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'

/**
 * POST /api/user/subscribe
 * Cria uma assinatura para o usuário
 * Nota: Em produção, isso deveria integrar com Mercado Pago ou outro gateway de pagamento
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

    const body = await request.json()
    const { planId, couponCode } = body

    if (!planId || (planId !== 'monthly' && planId !== 'semester')) {
      return NextResponse.json(
        { error: 'Plano inválido. Deve ser "monthly" ou "semester"' },
        { status: 400 }
      )
    }

    const app = getAdminApp()
    const db = app.firestore()

    // Validar cupom (mock - em produção deveria buscar do banco)
    const mockCoupons: Record<string, number> = {
      MEDICINA20: 0.2,
      ESTUDANTE15: 0.15,
      SINTONIZA10: 0.1,
    }
    const discount = couponCode
      ? mockCoupons[couponCode.toUpperCase()] || 0
      : 0

    // Calcular datas
    const now = new Date()
    const expiresAt = new Date()
    if (planId === 'monthly') {
      expiresAt.setMonth(expiresAt.getMonth() + 1)
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 6)
    }

    // Atualizar perfil do usuário com o plano
    const userRef = db.collection('users').doc(authUser.uid)
    await userRef.update({
      plan: planId,
      planExpiresAt: expiresAt,
      updatedAt: now,
    })

    // Criar registro de assinatura (opcional, para histórico)
    await db.collection('subscriptions').add({
      userId: authUser.uid,
      plan: planId,
      status: 'active',
      startDate: now,
      expiresAt: expiresAt,
      manuallyGranted: false,
      couponCode: couponCode || null,
      discount: discount,
      createdAt: now,
    })

    // Buscar dados atualizados
    const updatedDoc = await userRef.get()
    const updatedData = updatedDoc.data()!

    return NextResponse.json({
      success: true,
      message: 'Assinatura ativada com sucesso!',
      subscription: {
        plan: planId,
        expiresAt: expiresAt.toISOString(),
        discount: discount * 100,
      },
      profile: {
        plan: updatedData.plan,
        planExpiresAt: updatedData.planExpiresAt
          ? updatedData.planExpiresAt.toDate().toISOString()
          : null,
      },
    })
  } catch (error: any) {
    console.error('Erro ao criar assinatura:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar assinatura' },
      { status: 500 }
    )
  }
}


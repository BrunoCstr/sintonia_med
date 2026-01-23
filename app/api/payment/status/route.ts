import { NextRequest, NextResponse } from 'next/server'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { verifyFirebaseToken } from '@/lib/middleware-auth'
import { getAdminApp } from '@/lib/firebase-admin'

export const maxDuration = 60

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
  options: {
    timeout: 30000,
  },
})

const mpPayment = new Payment(mpClient)

/**
 * GET /api/payment/status?payment_id=123
 * Consulta o status do pagamento no Mercado Pago e, se estiver aprovado,
 * ativa a assinatura do usuário no Firestore (fallback do webhook).
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('firebase-token')?.value
    if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const authUser = await verifyFirebaseToken(token)
    if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const paymentId = request.nextUrl.searchParams.get('payment_id')
    if (!paymentId) {
      return NextResponse.json({ error: 'payment_id é obrigatório' }, { status: 400 })
    }

    if (!process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN.trim() === '') {
      return NextResponse.json({ error: 'Configuração do Mercado Pago não encontrada' }, { status: 500 })
    }

    const paymentData: any = await mpPayment.get({ id: paymentId })

    const status = paymentData?.status || 'pending'
    const statusDetail = paymentData?.status_detail || null

    const app = getAdminApp()
    const db = app.firestore()

    // 1) Ownership por Firestore (fonte de verdade do app)
    const paymentsByIdSnap = await db
      .collection('payments')
      .where('paymentId', '==', paymentId)
      .limit(1)
      .get()

    const paymentRecord = paymentsByIdSnap.empty ? null : paymentsByIdSnap.docs[0].data()
    const paymentRecordUserId = paymentRecord?.userId as string | undefined

    // 2) Ownership por Mercado Pago (fallback)
    const metadata = paymentData?.metadata || {}
    const userIdFromMetadata =
      (metadata.userId as string | undefined) ||
      ((metadata as any).user_id as string | undefined) ||
      ((metadata as any).uid as string | undefined)
    const externalReference = paymentData?.external_reference as string | undefined

    const belongsToUser =
      (paymentRecordUserId && paymentRecordUserId === authUser.uid) ||
      (userIdFromMetadata && userIdFromMetadata === authUser.uid) ||
      (externalReference && externalReference === authUser.uid)

    if (!belongsToUser) {
      // Se o pagamento existe no Firestore, mas pertence a outro user, negar explicitamente
      if (paymentRecordUserId && paymentRecordUserId !== authUser.uid) {
        return NextResponse.json({ error: 'Pagamento não pertence ao usuário' }, { status: 403 })
      }
      // Se nem Firestore nem MP batem, negar
      return NextResponse.json({ error: 'Pagamento não pertence ao usuário' }, { status: 403 })
    }

    // Dados para ativação (preferir metadata do MP; cair para Firestore se faltar)
    const planId =
      (metadata.planId as string | undefined) ||
      ((metadata as any).plan_id as string | undefined) ||
      (paymentRecord?.planId as string | undefined)
    const discount = ((metadata.discount as number) || 0) ?? 0
    const couponCode = ((metadata.couponCode as string) || null) ?? (paymentRecord?.couponCode as string | null) ?? null
    const expiresAtStr =
      (metadata.expiresAt as string | undefined) ||
      ((metadata as any).expires_at as string | undefined)

    const expiresAt =
      expiresAtStr
        ? new Date(expiresAtStr)
        : paymentRecord?.expiresAt?.toDate
          ? paymentRecord.expiresAt.toDate()
          : paymentRecord?.expiresAt
            ? new Date(paymentRecord.expiresAt)
            : null

    // Atualizar/normalizar registro de payments
    const paymentsSnapshot = await db
      .collection('payments')
      .where('userId', '==', authUser.uid)
      .where('paymentId', '==', paymentId)
      .limit(1)
      .get()

    if (!paymentsSnapshot.empty) {
      await paymentsSnapshot.docs[0].ref.update({
        status,
        statusDetail,
        updatedAt: new Date(),
      })
    }

    // Se aprovado, ativar assinatura (fallback do webhook)
    if (status === 'approved') {
      if (!planId || !expiresAt) {
        return NextResponse.json(
          { error: 'Metadata incompleta para ativar assinatura', status, statusDetail },
          { status: 500 }
        )
      }

      const userRef = db.collection('users').doc(authUser.uid)
      await userRef.update({
        plan: planId,
        planExpiresAt: expiresAt,
        updatedAt: new Date(),
      })

      // Evitar duplicar subscriptions: só cria se não existir uma ativa com esse paymentId
      const subsSnap = await db
        .collection('subscriptions')
        .where('userId', '==', authUser.uid)
        .where('paymentId', '==', paymentId)
        .limit(1)
        .get()

      if (subsSnap.empty) {
        await db.collection('subscriptions').add({
          userId: authUser.uid,
          plan: planId,
          status: 'active',
          startDate: new Date(),
          expiresAt,
          paymentId,
          couponCode,
          discount: discount / 100,
          createdAt: new Date(),
        })
      }
    }

    return NextResponse.json({
      success: true,
      paymentId,
      status,
      statusDetail,
    })
  } catch (error: any) {
    console.error('Erro ao consultar status do pagamento:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao consultar status do pagamento' },
      { status: 500 }
    )
  }
}


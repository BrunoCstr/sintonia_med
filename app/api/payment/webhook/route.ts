import { NextRequest, NextResponse } from 'next/server'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { getAdminApp } from '@/lib/firebase-admin'

// Configurar timeout máximo para esta rota (60 segundos)
export const maxDuration = 60

// Inicializar cliente do Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
  options: {
    timeout: 30000, // 30 segundos - tempo adequado para APIs externas
    idempotencyKey: 'abc',
  },
})

const payment = new Payment(client)

/**
 * POST /api/payment/webhook
 * Recebe notificações do Mercado Pago sobre status de pagamentos
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data } = body

    // Verificar se é uma notificação de pagamento
    if (type === 'payment') {
      const paymentId = data.id

      // Buscar informações do pagamento no Mercado Pago
      const paymentData = await payment.get({ id: paymentId })

      const app = getAdminApp()
      const db = app.firestore()

      const metadata: any = paymentData?.metadata || {}

      // Tentar identificar usuário de forma robusta:
      // - metadata.userId (padrão do app)
      // - metadata.user_id (variante)
      // - external_reference (fallback)
      // - Firestore payments por paymentId (último recurso)
      let userId: string | null =
        (typeof metadata.userId === 'string' && metadata.userId) ||
        (typeof metadata.user_id === 'string' && metadata.user_id) ||
        (typeof paymentData?.external_reference === 'string' && paymentData.external_reference) ||
        null

      // Buscar registro de pagamento existente (por paymentId) para fallback de dados
      const paymentByIdSnap = await db
        .collection('payments')
        .where('paymentId', '==', paymentId)
        .limit(1)
        .get()

      const existingPaymentDoc = paymentByIdSnap.empty ? null : paymentByIdSnap.docs[0]
      const existingPaymentData = existingPaymentDoc?.data()

      if (!userId && existingPaymentData?.userId) {
        userId = existingPaymentData.userId as string
      }

      if (!userId) {
        console.error('Não foi possível identificar userId do pagamento:', paymentId)
        return NextResponse.json({ received: true })
      }

      const planId: string | undefined =
        (typeof metadata.planId === 'string' && metadata.planId) ||
        (typeof metadata.plan_id === 'string' && metadata.plan_id) ||
        (existingPaymentData?.planId as string | undefined)

      const couponCode: string | null =
        (metadata.couponCode as string | null) ??
        (existingPaymentData?.couponCode as string | null) ??
        null

      const discount: number =
        (typeof metadata.discount === 'number' ? metadata.discount : 0) ||
        (typeof existingPaymentData?.discount === 'number' ? existingPaymentData.discount : 0) ||
        0

      const expiresAtStr: string | undefined =
        (typeof metadata.expiresAt === 'string' && metadata.expiresAt) ||
        (typeof metadata.expires_at === 'string' && metadata.expires_at) ||
        undefined

      // Verificar status do pagamento
      const paymentStatus = paymentData.status
      const expiresAt =
        expiresAtStr
          ? new Date(expiresAtStr)
          : existingPaymentData?.expiresAt?.toDate
            ? existingPaymentData.expiresAt.toDate()
            : existingPaymentData?.expiresAt
              ? new Date(existingPaymentData.expiresAt)
              : null

      // Buscar registro de pagamento existente
      // Primeiro tenta buscar por paymentId (caso já tenha sido processado antes)
      let paymentsSnapshot = await db
        .collection('payments')
        .where('userId', '==', userId)
        .where('paymentId', '==', paymentId)
        .limit(1)
        .get()

      let paymentRef
      
      if (!paymentsSnapshot.empty) {
        // Encontrou registro existente com este paymentId
        paymentRef = paymentsSnapshot.docs[0].ref
        await paymentRef.update({
          status: paymentStatus,
          updatedAt: new Date(),
        })
      } else {
        // Buscar pagamentos pendentes do usuário para este plano (criados antes do pagamento)
        paymentsSnapshot = await db
          .collection('payments')
          .where('userId', '==', userId)
          .where('planId', '==', planId)
          .where('status', '==', 'pending')
          .orderBy('createdAt', 'desc')
          .limit(1)
          .get()

        if (!paymentsSnapshot.empty) {
          // Atualizar registro pendente existente
          paymentRef = paymentsSnapshot.docs[0].ref
          await paymentRef.update({
            paymentId,
            status: paymentStatus,
            updatedAt: new Date(),
          })
        } else {
          // Criar novo registro se não existir (caso o registro não tenha sido criado antes)
          paymentRef = await db.collection('payments').add({
            userId,
            planId: planId || null,
            preferenceId: null, // Não temos acesso ao preferenceId aqui
            paymentId,
            status: paymentStatus,
            amount: paymentData.transaction_amount || 0,
            couponCode,
            discount,
            createdAt: new Date(),
            expiresAt: expiresAt || null,
          })
        }
      }

      // Se o pagamento foi aprovado, ativar a assinatura
      if (paymentStatus === 'approved') {
        if (!planId || !expiresAt) {
          console.error('Webhook: dados insuficientes para ativar assinatura', {
            paymentId,
            userId,
            planId,
            expiresAt,
          })
          return NextResponse.json({ received: true })
        }

        const userRef = db.collection('users').doc(userId)
        await userRef.update({
          plan: planId,
          planExpiresAt: expiresAt,
          updatedAt: new Date(),
        })

        // Evitar duplicar subscriptions (webhook pode ser reenviado)
        const subsSnap = await db
          .collection('subscriptions')
          .where('userId', '==', userId)
          .where('paymentId', '==', paymentId)
          .limit(1)
          .get()

        if (subsSnap.empty) {
          await db.collection('subscriptions').add({
            userId,
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

        // Registrar uso do cupom se aplicado
        if (couponCode && discount > 0) {
          // Buscar registro de uso existente pela preferência
          const paymentDoc = await paymentRef.get()
          const paymentDataDoc = paymentDoc.data()
          const preferenceId = paymentDataDoc?.preferenceId

          if (preferenceId) {
            const couponUsesSnapshot = await db
              .collection('coupon_uses')
              .where('couponCode', '==', couponCode.toUpperCase())
              .where('preferenceId', '==', preferenceId)
              .limit(1)
              .get()

            if (!couponUsesSnapshot.empty) {
              // Atualizar registro existente com paymentId
              await couponUsesSnapshot.docs[0].ref.update({
                paymentId,
              })
            } else {
              // Buscar preço do plano no Firestore
              const planDoc = await db.collection('plans').doc(planId).get()
              if (planDoc.exists) {
                const planData = planDoc.data()!
                const basePrice = planData.price || 0
                const finalPrice = basePrice * (1 - discount / 100)
                
                await db.collection('coupon_uses').add({
                  couponCode: couponCode.toUpperCase(),
                  userId,
                  planId,
                  discountApplied: basePrice - finalPrice,
                  originalPrice: basePrice,
                  finalPrice,
                  paymentId,
                  preferenceId,
                  usedAt: new Date(),
                })
              }
            }
          }
        }
      } else if (paymentStatus === 'rejected' || paymentStatus === 'cancelled') {
        // Atualizar status do pagamento como rejeitado/cancelado
      }

      return NextResponse.json({ received: true })
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Erro ao processar webhook do Mercado Pago:', error)
    // Retornar 200 para evitar retentativas desnecessárias
    return NextResponse.json({ received: true, error: error.message })
  }
}


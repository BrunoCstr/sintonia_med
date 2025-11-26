import { NextRequest, NextResponse } from 'next/server'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { getAdminApp } from '@/lib/firebase-admin'

// Inicializar cliente do Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
  options: {
    timeout: 5000,
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

      if (!paymentData.metadata || !paymentData.metadata.userId) {
        console.error('Metadata não encontrada no pagamento:', paymentId)
        return NextResponse.json({ received: true })
      }

      const userId = paymentData.metadata.userId as string
      const planId = paymentData.metadata.planId as string
      const couponCode = paymentData.metadata.couponCode as string | null
      const discount = (paymentData.metadata.discount as number) || 0
      const expiresAtStr = paymentData.metadata.expiresAt as string

      const app = getAdminApp()
      const db = app.firestore()

      // Verificar status do pagamento
      const paymentStatus = paymentData.status
      const expiresAt = new Date(expiresAtStr)

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
            planId,
            preferenceId: null, // Não temos acesso ao preferenceId aqui
            paymentId,
            status: paymentStatus,
            amount: paymentData.transaction_amount || 0,
            couponCode,
            discount,
            createdAt: new Date(),
            expiresAt,
          })
        }
      }

      // Se o pagamento foi aprovado, ativar a assinatura
      if (paymentStatus === 'approved') {
        const userRef = db.collection('users').doc(userId)
        await userRef.update({
          plan: planId,
          planExpiresAt: expiresAt,
          updatedAt: new Date(),
        })

        // Criar registro de assinatura
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

        // Registrar uso do cupom se aplicado
        if (couponCode && discount > 0) {
          // Buscar registro de uso existente pela preferência
          const paymentDoc = await paymentRef.get()
          const paymentData = paymentDoc.data()
          const preferenceId = paymentData?.preferenceId

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
              // Criar novo registro se não existir
              const planPrices: Record<string, number> = {
                monthly: 29.90,
                semester: 143.00,
              }
              const basePrice = planPrices[planId]
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

        console.log(`Assinatura ativada para usuário ${userId}, plano ${planId}`)
      } else if (paymentStatus === 'rejected' || paymentStatus === 'cancelled') {
        // Atualizar status do pagamento como rejeitado/cancelado
        console.log(`Pagamento ${paymentStatus} para usuário ${userId}`)
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


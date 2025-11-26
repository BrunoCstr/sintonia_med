import { NextRequest, NextResponse } from 'next/server'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { verifyFirebaseToken } from '@/lib/middleware-auth'
import { getAdminApp } from '@/lib/firebase-admin'

// Configurar timeout máximo para esta rota (60 segundos)
export const maxDuration = 60

// Inicializar cliente base do Mercado Pago (sem idempotency fixo)
const baseClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
  options: {
    timeout: 30000, // 30 segundos - tempo adequado para APIs externas
  },
})

/**
 * POST /api/payment/process
 * Processa um pagamento criado pelo Payment Brick
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
    const { formData, preferenceId } = body

    console.log('Dados recebidos do Payment Brick:', JSON.stringify({ formData, preferenceId }, null, 2))

    if (!formData || !preferenceId) {
      return NextResponse.json(
        { error: 'Dados de pagamento inválidos' },
        { status: 400 }
      )
    }

    const app = getAdminApp()
    const db = app.firestore()

    // Buscar dados da preferência para obter metadata
    const paymentsSnapshot = await db
      .collection('payments')
      .where('preferenceId', '==', preferenceId)
      .where('userId', '==', authUser.uid)
      .limit(1)
      .get()

    if (paymentsSnapshot.empty) {
      return NextResponse.json(
        { error: 'Preferência de pagamento não encontrada' },
        { status: 404 }
      )
    }

    const paymentDoc = paymentsSnapshot.docs[0]
    const paymentData = paymentDoc.data()

    // Criar pagamento no Mercado Pago usando os dados do form
    // O Payment Brick já inclui todas as informações do cartão no token, incluindo o nome do titular
    // O nome do titular é usado pelo Mercado Pago para determinar o status em testes (APRO=aprovado, OTHE=rejeitado, etc)
    // Arredondar valor para 2 casas decimais para evitar problemas de precisão de ponto flutuante
    const transactionAmount = Math.round((paymentData.amount || 0) * 100) / 100
    
    const paymentBody = {
      transaction_amount: Number(transactionAmount.toFixed(2)), // Garantir exatamente 2 casas decimais
      token: formData.token,
      description: `Assinatura ${paymentData.planId === 'monthly' ? 'Mensal' : 'Semestral'} - SintoniaMed`,
      installments: formData.installments || 1,
      payment_method_id: formData.payment_method_id,
      issuer_id: formData.issuer_id,
      payer: {
        email: formData.payer?.email || authUser.email,
        identification: formData.payer?.identification,
        // Incluir nome do titular se disponível (importante para testes)
        first_name: formData.payer?.first_name || formData.cardholder?.name || null,
        last_name: formData.payer?.last_name || null,
      },
      // Incluir informações do cardholder se disponíveis
      ...(formData.cardholder && {
        cardholder: {
          name: formData.cardholder.name,
          identification: formData.cardholder.identification,
        },
      }),
      metadata: {
        userId: authUser.uid,
        planId: paymentData.planId,
        couponCode: paymentData.couponCode || null,
        discount: paymentData.discount,
        expiresAt: paymentData.expiresAt?.toDate ? paymentData.expiresAt.toDate().toISOString() : paymentData.expiresAt,
      },
    }

    console.log('Dados enviados para Mercado Pago:', JSON.stringify(paymentBody, null, 2))

    // Criar instância de pagamento com chave de idempotência única por requisição
    const paymentClient = new Payment(baseClient)
    const paymentResponse = await paymentClient.create({
      body: paymentBody,
      requestOptions: {
        idempotencyKey: `${authUser.uid}-${Date.now()}-${preferenceId}`,
      },
    })

    const paymentId = paymentResponse.id?.toString() || ''
    // O status pode ser: 'approved', 'pending', 'authorized', 'in_process', 'in_mediation', 'rejected', 'cancelled', 'refunded', 'charged_back'
    const paymentStatus = paymentResponse.status || 'pending'
    const paymentStatusDetail = paymentResponse.status_detail || null

    console.log('Status do pagamento:', paymentStatus)
    console.log('Detalhes do status:', paymentStatusDetail)
    console.log('Resposta completa do pagamento:', JSON.stringify(paymentResponse, null, 2))

    // Atualizar registro de pagamento
    await paymentDoc.ref.update({
      paymentId,
      status: paymentStatus,
      statusDetail: paymentStatusDetail,
      updatedAt: new Date(),
    })

    // Apenas ativar assinatura se o status for explicitamente 'approved'
    // Outros status como 'pending', 'in_process', 'authorized' não devem ativar
    if (paymentStatus === 'approved') {
      const expiresAt = paymentData.expiresAt?.toDate 
        ? paymentData.expiresAt.toDate() 
        : new Date(paymentData.expiresAt)

      const userRef = db.collection('users').doc(authUser.uid)
      await userRef.update({
        plan: paymentData.planId,
        planExpiresAt: expiresAt,
        updatedAt: new Date(),
      })

      // Criar registro de assinatura
      await db.collection('subscriptions').add({
        userId: authUser.uid,
        plan: paymentData.planId,
        status: 'active',
        startDate: new Date(),
        expiresAt,
        paymentId,
        couponCode: paymentData.couponCode,
        discount: paymentData.discount / 100,
        createdAt: new Date(),
      })

      // Registrar uso do cupom se aplicado
      if (paymentData.couponCode && paymentData.discount > 0) {
        await db.collection('coupon_uses').add({
          couponCode: paymentData.couponCode,
          userId: authUser.uid,
          planId: paymentData.planId,
          discountApplied: paymentData.originalAmount - paymentData.amount,
          originalPrice: paymentData.originalAmount,
          finalPrice: paymentData.amount,
          paymentId,
          preferenceId,
          usedAt: new Date(),
        })
      }
    }

    // Retornar resposta baseada no status
    if (paymentStatus === 'approved') {
      return NextResponse.json({
        success: true,
        paymentId,
        status: paymentStatus,
      })
    } else if (paymentStatus === 'pending' || paymentStatus === 'in_process' || paymentStatus === 'authorized') {
      // Pagamento pendente ou em processamento
      return NextResponse.json({
        success: false,
        paymentId,
        status: paymentStatus,
        message: 'Pagamento pendente de confirmação',
      })
    } else {
      // Pagamento rejeitado, cancelado ou outro status negativo
      return NextResponse.json({
        success: false,
        paymentId,
        status: paymentStatus,
        message: `Pagamento ${paymentStatus}. Status: ${paymentStatusDetail || 'N/A'}`,
      }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Erro ao processar pagamento:', error)
    console.error('Detalhes do erro:', error.response?.data || error.message)
    
    // Se o erro contém informações do Mercado Pago, extrair detalhes
    const errorMessage = error.response?.data?.message || error.message || 'Erro ao processar pagamento'
    const errorStatus = error.response?.status || 500
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error.response?.data || null,
      },
      { status: errorStatus }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { MercadoPagoConfig, Preference } from 'mercadopago'
import { verifyFirebaseToken } from '@/lib/middleware-auth'
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

const preference = new Preference(client)

/**
 * POST /api/payment/create-preference
 * Cria uma preferência de pagamento no Mercado Pago
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar se o token do Mercado Pago está configurado
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN.trim() === '') {
      console.error('MERCADOPAGO_ACCESS_TOKEN não configurado')
      return NextResponse.json(
        { error: 'Configuração do Mercado Pago não encontrada. Entre em contato com o suporte.' },
        { status: 500 }
      )
    }

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

    // Buscar dados do usuário
    const app = getAdminApp()
    const db = app.firestore()
    const userDoc = await db.collection('users').doc(authUser.uid).get()
    
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const userData = userDoc.data()!
    const userEmail = userData.email || authUser.email || ''
    const userName = userData.name || 'Usuário'

    // Validar cupom no Firestore
    let discount = 0
    if (couponCode) {
      try {
        const couponDoc = await db.collection('coupons').doc(couponCode.toUpperCase()).get()
        
        if (couponDoc.exists) {
          const couponData = couponDoc.data()!
          
          // Validar se está ativo e dentro do período de validade
          const now = new Date()
          const validFrom = couponData.validFrom?.toDate ? couponData.validFrom.toDate() : new Date(couponData.validFrom)
          const validUntil = couponData.validUntil?.toDate ? couponData.validUntil.toDate() : new Date(couponData.validUntil)
          
          // Considerar que o cupom é válido desde o início do dia de validFrom
          const startOfValidFrom = new Date(Date.UTC(
            validFrom.getUTCFullYear(),
            validFrom.getUTCMonth(),
            validFrom.getUTCDate(),
            0, 0, 0, 0
          ))
          
          // Considerar que o cupom é válido até o final do dia de validUntil (23:59:59.999)
          const endOfValidUntil = new Date(Date.UTC(
            validUntil.getUTCFullYear(),
            validUntil.getUTCMonth(),
            validUntil.getUTCDate(),
            23, 59, 59, 999
          ))
          
          if (couponData.active && now >= startOfValidFrom && now <= endOfValidUntil) {
            // Validar plano aplicável
            if (!couponData.applicablePlans || 
                couponData.applicablePlans.length === 0 || 
                couponData.applicablePlans.includes(planId)) {
              discount = couponData.discount / 100 // Converter de percentual para decimal
            }
          }
        }
      } catch (error) {
        console.error('Erro ao validar cupom:', error)
        // Continua sem desconto se houver erro
      }
    }

    // Buscar preço do plano do Firestore
    const planDoc = await db.collection('plans').doc(planId).get()
    
    if (!planDoc.exists) {
      return NextResponse.json(
        { error: 'Plano não encontrado. Os planos devem ser cadastrados no Firestore primeiro.' },
        { status: 404 }
      )
    }
    
    const planData = planDoc.data()!
    const basePrice = planData.price
    
    if (!basePrice || typeof basePrice !== 'number') {
      return NextResponse.json(
        { error: 'Preço do plano inválido' },
        { status: 400 }
      )
    }
    // Arredondar para 2 casas decimais para evitar problemas de precisão de ponto flutuante
    const finalPrice = Math.round((basePrice * (1 - discount)) * 100) / 100

    // Calcular datas de expiração
    const now = new Date()
    const expiresAt = new Date()
    if (planId === 'monthly') {
      expiresAt.setMonth(expiresAt.getMonth() + 1)
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 6)
    }

    // Se o preço final for 0 (cupom de 100%), conceder acesso diretamente sem Mercado Pago
    if (finalPrice <= 0) {
      // Ativar assinatura diretamente
      const userRef = db.collection('users').doc(authUser.uid)
      await userRef.update({
        plan: planId,
        planExpiresAt: expiresAt,
        updatedAt: now,
      })

      // Criar registro de assinatura
      await db.collection('subscriptions').add({
        userId: authUser.uid,
        plan: planId,
        status: 'active',
        startDate: now,
        expiresAt,
        paymentId: `FREE_COUPON_${couponCode?.toUpperCase()}_${Date.now()}`,
        couponCode: couponCode?.toUpperCase() || null,
        discount: discount,
        createdAt: now,
      })

      // Registrar uso do cupom
      if (couponCode && discount > 0) {
        await db.collection('coupon_uses').add({
          couponCode: couponCode.toUpperCase(),
          userId: authUser.uid,
          planId,
          discountApplied: basePrice,
          originalPrice: basePrice,
          finalPrice: 0,
          paymentId: null,
          preferenceId: null,
          usedAt: now,
        })
      }

      // Salvar registro do pagamento gratuito
      await db.collection('payments').add({
        userId: authUser.uid,
        planId,
        preferenceId: null,
        paymentId: `FREE_COUPON_${couponCode?.toUpperCase()}_${Date.now()}`,
        status: 'approved',
        amount: 0,
        originalAmount: basePrice,
        couponCode: couponCode?.toUpperCase() || null,
        discount: discount * 100,
        createdAt: now,
        expiresAt: expiresAt,
        isFreeAccess: true,
      })

      return NextResponse.json({
        success: true,
        freeAccess: true, // Indicador de que foi acesso gratuito
        amount: 0,
        message: 'Acesso concedido gratuitamente com cupom de 100% de desconto',
      })
    }

    // Criar preferência de pagamento
    const preferenceData = {
      items: [
        {
          id: planId,
          title: planId === 'monthly' ? 'Plano Mensal - SintoniaMed' : 'Plano Semestral - SintoniaMed',
          description: planId === 'monthly' 
            ? 'Acesso completo por 1 mês' 
            : 'Acesso completo por 6 meses',
          quantity: 1,
          unit_price: Number(finalPrice.toFixed(2)), // Garantir exatamente 2 casas decimais
          currency_id: 'BRL',
        },
      ],
      payer: {
        name: userName,
        email: userEmail,
      },
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payment/success`,
        failure: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payment/failure`,
        pending: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payment/pending`,
      },
      // auto_return: removido temporariamente - pode causar erro se URL não for acessível publicamente
      // O redirecionamento será feito manualmente após o pagamento
      external_reference: authUser.uid,
      notification_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/payment/webhook`,
      metadata: {
        userId: authUser.uid,
        planId,
        couponCode: couponCode || null,
        discount: discount * 100,
        expiresAt: expiresAt.toISOString(),
      },
    }

    const response = await preference.create({ body: preferenceData })

    // Salvar referência do pagamento no Firestore para rastreamento
    await db.collection('payments').add({
      userId: authUser.uid,
      planId,
      preferenceId: response.id,
      status: 'pending',
      amount: Number(finalPrice.toFixed(2)), // Garantir exatamente 2 casas decimais ao salvar
      originalAmount: basePrice,
      couponCode: couponCode || null,
      discount: discount * 100,
      createdAt: now,
      expiresAt: expiresAt,
    })

    // Registrar uso do cupom (se aplicado)
    if (couponCode && discount > 0) {
      await db.collection('coupon_uses').add({
        couponCode: couponCode.toUpperCase(),
        userId: authUser.uid,
        planId,
        discountApplied: Number((basePrice - finalPrice).toFixed(2)), // Garantir 2 casas decimais
        originalPrice: basePrice,
        finalPrice: Number(finalPrice.toFixed(2)), // Garantir 2 casas decimais
        preferenceId: response.id,
        usedAt: now,
      })
    }

    return NextResponse.json({
      success: true,
      preferenceId: response.id,
      amount: Number(finalPrice.toFixed(2)), // Garantir exatamente 2 casas decimais na resposta
      // Manter URLs antigas para compatibilidade, mas não serão usadas com checkout transparente
      initPoint: response.init_point,
      sandboxInitPoint: response.sandbox_init_point,
    })
  } catch (error: any) {
    console.error('Erro ao criar preferência de pagamento:', error)
    
    // Tratamento específico para erros de timeout
    if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT')) {
      return NextResponse.json(
        { 
          error: 'Timeout ao conectar com o Mercado Pago. Por favor, tente novamente em alguns instantes.',
          details: 'A requisição demorou mais que o esperado. Isso pode ocorrer devido a problemas temporários de rede ou alta demanda no serviço.'
        },
        { status: 504 }
      )
    }
    
    // Tratamento para erros de autenticação
    if (error.status === 401 || error.message?.includes('Unauthorized')) {
      return NextResponse.json(
        { 
          error: 'Erro de autenticação com o Mercado Pago. Verifique as credenciais configuradas.',
          details: 'O token de acesso do Mercado Pago pode estar inválido ou expirado.'
        },
        { status: 401 }
      )
    }
    
    // Tratamento genérico
    return NextResponse.json(
      { 
        error: error.message || 'Erro ao criar preferência de pagamento',
        details: error.cause || null
      },
      { status: error.status || 500 }
    )
  }
}


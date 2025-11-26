import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'

/**
 * GET /api/admin/coupons/[code]/stats
 * Retorna estatísticas de uso de um cupom (apenas admin_master)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('firebase-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const authUser = await verifyFirebaseToken(token)
    if (!authUser || authUser.role !== 'admin_master') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { code } = await params
    const app = getAdminApp()
    const db = app.firestore()

    const codeUpper = code.toUpperCase()

    // Buscar todos os usos deste cupom
    const usesSnapshot = await db
      .collection('coupon_uses')
      .where('couponCode', '==', codeUpper)
      .get()

    let totalUses = 0
    let totalUsesApproved = 0
    let uniqueUsers = new Set<string>()
    let uniqueUsersApproved = new Set<string>()
    let totalDiscount = 0
    let totalDiscountApproved = 0

    // Buscar todos os paymentIds e preferenceIds para verificar status
    const paymentIds: string[] = []
    const preferenceIds: string[] = []
    
    usesSnapshot.forEach((doc) => {
      const data = doc.data()
      if (data.paymentId) {
        paymentIds.push(data.paymentId)
      } else if (data.preferenceId) {
        preferenceIds.push(data.preferenceId)
      }
    })

    // Buscar status dos pagamentos por paymentId
    const paymentStatusMap = new Map<string, string>()
    if (paymentIds.length > 0) {
      // Remover duplicatas
      const uniquePaymentIds = [...new Set(paymentIds)]
      // Buscar pagamentos em lotes (limite do Firestore é 10 por query)
      const batchSize = 10
      for (let i = 0; i < uniquePaymentIds.length; i += batchSize) {
        const batch = uniquePaymentIds.slice(i, i + batchSize)
        const paymentsSnapshot = await db
          .collection('payments')
          .where('paymentId', 'in', batch)
          .get()
        
        paymentsSnapshot.forEach((doc) => {
          const paymentData = doc.data()
          if (paymentData.paymentId) {
            paymentStatusMap.set(paymentData.paymentId, paymentData.status || 'pending')
          }
        })
      }
    }

    // Buscar status dos pagamentos por preferenceId (para casos onde paymentId ainda não foi definido)
    const preferenceToPaymentMap = new Map<string, string>() // Map de preferenceId -> paymentId
    if (preferenceIds.length > 0) {
      const uniquePreferenceIds = [...new Set(preferenceIds)]
      const batchSize = 10
      for (let i = 0; i < uniquePreferenceIds.length; i += batchSize) {
        const batch = uniquePreferenceIds.slice(i, i + batchSize)
        const paymentsSnapshot = await db
          .collection('payments')
          .where('preferenceId', 'in', batch)
          .get()
        
        paymentsSnapshot.forEach((doc) => {
          const paymentData = doc.data()
          if (paymentData.preferenceId && paymentData.paymentId) {
            preferenceToPaymentMap.set(paymentData.preferenceId, paymentData.paymentId)
            // Também adicionar ao status map se ainda não estiver
            if (!paymentStatusMap.has(paymentData.paymentId)) {
              paymentStatusMap.set(paymentData.paymentId, paymentData.status || 'pending')
            }
          }
        })
      }
    }

    // Processar usos e calcular estatísticas
    usesSnapshot.forEach((doc) => {
      const data = doc.data()
      let paymentId = data.paymentId
      
      // Se não tem paymentId mas tem preferenceId, tentar buscar pelo preferenceId
      if (!paymentId && data.preferenceId) {
        paymentId = preferenceToPaymentMap.get(data.preferenceId) || null
      }
      
      const isApproved = paymentId && paymentStatusMap.get(paymentId) === 'approved'
      
      totalUses++
      if (data.userId) {
        uniqueUsers.add(data.userId)
      }
      if (data.discountApplied) {
        totalDiscount += data.discountApplied
      }
      
      // Contar apenas os aprovados
      if (isApproved) {
        totalUsesApproved++
        if (data.userId) {
          uniqueUsersApproved.add(data.userId)
        }
        if (data.discountApplied) {
          totalDiscountApproved += data.discountApplied
        }
      }
    })

    return NextResponse.json({
      success: true,
      stats: {
        totalUses,
        totalUsesApproved,
        uniqueUsers: uniqueUsers.size,
        uniqueUsersApproved: uniqueUsersApproved.size,
        totalDiscount,
        totalDiscountApproved,
      },
    })
  } catch (error: any) {
    console.error('Erro ao buscar estatísticas:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar estatísticas' },
      { status: 500 }
    )
  }
}


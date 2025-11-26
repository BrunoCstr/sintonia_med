import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'

/**
 * GET /api/coupons/validate
 * Valida um cupom de desconto
 * 
 * Query params:
 * - code: Código do cupom
 * - planId: ID do plano (opcional, para validar se cupom é aplicável)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const planId = searchParams.get('planId')

    if (!code) {
      return NextResponse.json(
        { valid: false, error: 'Código do cupom é obrigatório' },
        { status: 400 }
      )
    }

    const app = getAdminApp()
    const db = app.firestore()

    // Buscar cupom no Firestore
    const couponDoc = await db.collection('coupons').doc(code.toUpperCase()).get()

    if (!couponDoc.exists) {
      return NextResponse.json({
        valid: false,
        error: 'Cupom não encontrado',
      })
    }

    const couponData = couponDoc.data()!

    // Validar se está ativo
    if (!couponData.active) {
      return NextResponse.json({
        valid: false,
        error: 'Cupom não está ativo',
      })
    }

    // Validar data de validade
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

    if (now < startOfValidFrom) {
      return NextResponse.json({
        valid: false,
        error: `Cupom ainda não está válido. Válido a partir de ${validFrom.toLocaleDateString('pt-BR')}`,
      })
    }

    if (now > endOfValidUntil) {
      return NextResponse.json({
        valid: false,
        error: 'Cupom expirado',
      })
    }

    // Validar plano aplicável (se houver restrição)
    if (couponData.applicablePlans && Array.isArray(couponData.applicablePlans) && couponData.applicablePlans.length > 0) {
      if (planId && !couponData.applicablePlans.includes(planId)) {
        return NextResponse.json({
          valid: false,
          error: 'Cupom não é válido para este plano',
        })
      }
    }

    // Validar limite de usos totais
    if (couponData.maxUses) {
      const usesSnapshot = await db
        .collection('coupon_uses')
        .where('couponCode', '==', code.toUpperCase())
        .get()

      if (usesSnapshot.size >= couponData.maxUses) {
        return NextResponse.json({
          valid: false,
          error: 'Cupom atingiu o limite de usos',
        })
      }
    }

    // Se usuário autenticado, validar limite por usuário
    const token = request.cookies.get('firebase-token')?.value
    if (token && couponData.maxUsesPerUser) {
      try {
        const authUser = await verifyFirebaseToken(token)
        if (authUser) {
          const userUsesSnapshot = await db
            .collection('coupon_uses')
            .where('couponCode', '==', code.toUpperCase())
            .where('userId', '==', authUser.uid)
            .get()

          if (userUsesSnapshot.size >= couponData.maxUsesPerUser) {
            return NextResponse.json({
              valid: false,
              error: 'Você já utilizou este cupom o máximo de vezes permitido',
            })
          }
        }
      } catch (error) {
        // Se não conseguir autenticar, continua sem validar limite por usuário
      }
    }

    return NextResponse.json({
      valid: true,
      discount: couponData.discount,
      code: code.toUpperCase(),
      description: couponData.description || null,
    })
  } catch (error: any) {
    console.error('Erro ao validar cupom:', error)
    return NextResponse.json(
      { valid: false, error: error.message || 'Erro ao validar cupom' },
      { status: 500 }
    )
  }
}


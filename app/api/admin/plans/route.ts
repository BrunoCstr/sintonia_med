import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp, verifyAdmin } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'

/**
 * GET /api/admin/plans
 * Retorna todos os planos para o painel administrativo
 */
export async function GET(request: NextRequest) {
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

    // Verificar se é admin master
    const isAdmin = await verifyAdmin(authUser.uid)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const app = getAdminApp()
    const db = app.firestore()

    // Buscar planos do Firestore
    const plansSnapshot = await db.collection('plans').orderBy('durationMonths', 'asc').get()

    // Se não houver planos, retornar array vazio (não criar automaticamente)
    if (plansSnapshot.empty) {
      return NextResponse.json({
        success: true,
        plans: [],
        message: 'Nenhum plano cadastrado. Crie os planos no Firestore primeiro.',
      })
    }

    const plans = plansSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
    }))

    return NextResponse.json({
      success: true,
      plans,
    })
  } catch (error: any) {
    console.error('Erro ao buscar planos:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar planos', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/plans
 * Atualiza o preço de um plano (apenas admin_master)
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

    // Verificar se é admin master
    const isAdmin = await verifyAdmin(authUser.uid)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Acesso negado. Apenas Admin Master pode alterar preços.' }, { status: 403 })
    }

    const body = await request.json()
    const { planId, price, originalPrice } = body

    // Validações
    if (!planId) {
      return NextResponse.json({ error: 'ID do plano é obrigatório' }, { status: 400 })
    }

    if (planId !== 'monthly' && planId !== 'semester') {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })
    }

    if (typeof price !== 'number' || price <= 0) {
      return NextResponse.json({ error: 'Preço deve ser um número positivo' }, { status: 400 })
    }

    // Validação de segurança: preço máximo razoável (R$ 10.000)
    if (price > 10000) {
      return NextResponse.json({ error: 'Preço muito alto. Valor máximo permitido: R$ 10.000,00' }, { status: 400 })
    }

    // Validação de segurança: preço mínimo razoável (R$ 1,00)
    if (price < 1) {
      return NextResponse.json({ error: 'Preço muito baixo. Valor mínimo permitido: R$ 1,00' }, { status: 400 })
    }

    // Validar originalPrice apenas se não for null/undefined
    if (originalPrice !== null && originalPrice !== undefined) {
      if (typeof originalPrice !== 'number' || originalPrice <= 0) {
        return NextResponse.json({ error: 'Preço original deve ser um número positivo ou null' }, { status: 400 })
      }
      
      // Validação: preço original deve ser maior que o preço atual para mostrar desconto
      if (originalPrice <= price) {
        return NextResponse.json({ error: 'Preço original deve ser maior que o preço atual para mostrar desconto' }, { status: 400 })
      }

      // Validação de segurança: preço original máximo razoável
      if (originalPrice > 10000) {
        return NextResponse.json({ error: 'Preço original muito alto. Valor máximo permitido: R$ 10.000,00' }, { status: 400 })
      }
    }

    const app = getAdminApp()
    const db = app.firestore()

    // Verificar se o plano existe
    const planRef = db.collection('plans').doc(planId)
    const planDoc = await planRef.get()

    if (!planDoc.exists) {
      return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 })
    }

    // Registrar alteração no histórico (auditoria)
    await db.collection('plan_price_changes').add({
      planId,
      oldPrice: planDoc.data()?.price || 0,
      newPrice: Number(price.toFixed(2)),
      oldOriginalPrice: planDoc.data()?.originalPrice || null,
      newOriginalPrice: originalPrice === undefined ? planDoc.data()?.originalPrice || null : (originalPrice === null ? null : Number(originalPrice.toFixed(2))),
      changedBy: authUser.uid,
      changedAt: new Date(),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    })

    // Atualizar apenas o preço e preço original (não pode alterar outros campos)
    const updateData: Record<string, any> = {
      price: Number(price.toFixed(2)),
      updatedAt: new Date(),
      updatedBy: authUser.uid,
    }

    // Sempre atualizar originalPrice (pode ser null para remover)
    if (originalPrice === null || originalPrice === undefined) {
      updateData.originalPrice = null
    } else {
      updateData.originalPrice = Number(originalPrice.toFixed(2))
    }

    await planRef.update(updateData)

    // Buscar o plano atualizado
    const updatedPlanDoc = await planRef.get()
    const updatedPlan = {
      id: updatedPlanDoc.id,
      ...updatedPlanDoc.data(),
      createdAt: updatedPlanDoc.data()?.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: updatedPlanDoc.data()?.updatedAt?.toDate?.()?.toISOString() || null,
    }

    return NextResponse.json({
      success: true,
      message: 'Preço atualizado com sucesso',
      plan: updatedPlan,
    })
  } catch (error: any) {
    console.error('Erro ao atualizar plano:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar plano', details: error.message },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'

/**
 * GET /api/admin/coupons
 * Lista todos os cupons (apenas admin_master)
 * Query params:
 * - archived: 'true' para listar apenas arquivados, 'false' ou omitido para listar apenas não arquivados
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const showArchived = searchParams.get('archived') === 'true'

    const app = getAdminApp()
    const db = app.firestore()

    // Buscar todos os cupons
    const couponsSnapshot = await db.collection('coupons').orderBy('createdAt', 'desc').get()

    const coupons = couponsSnapshot.docs
      .filter((doc) => {
        const data = doc.data()
        const isArchived = data.archived === true
        return showArchived === isArchived
      })
      .map((doc) => {
        const data = doc.data()
        return {
          code: doc.id,
          discount: data.discount,
          description: data.description || null,
          active: data.active,
          archived: data.archived === true,
          maxUses: data.maxUses || null,
          maxUsesPerUser: data.maxUsesPerUser || null,
          validFrom: data.validFrom?.toDate ? data.validFrom.toDate().toISOString() : new Date(data.validFrom).toISOString(),
          validUntil: data.validUntil?.toDate ? data.validUntil.toDate().toISOString() : new Date(data.validUntil).toISOString(),
          applicablePlans: data.applicablePlans || null,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date(data.createdAt).toISOString(),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : new Date(data.updatedAt).toISOString(),
          createdBy: data.createdBy,
        }
      })

    return NextResponse.json({ success: true, coupons })
  } catch (error: any) {
    console.error('Erro ao listar cupons:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao listar cupons' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/coupons
 * Cria um novo cupom (apenas admin_master)
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const {
      code,
      discount,
      description,
      active = true,
      maxUses,
      maxUsesPerUser,
      validFrom,
      validUntil,
      applicablePlans,
    } = body

    // Validações
    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Código do cupom é obrigatório' },
        { status: 400 }
      )
    }

    if (discount === undefined || discount < 0 || discount > 100) {
      return NextResponse.json(
        { error: 'Desconto deve ser um número entre 0 e 100' },
        { status: 400 }
      )
    }

    if (!validFrom || !validUntil) {
      return NextResponse.json(
        { error: 'Datas de validade são obrigatórias' },
        { status: 400 }
      )
    }

    const app = getAdminApp()
    const db = app.firestore()

    const codeUpper = code.toUpperCase()

    // Verificar se cupom já existe
    const existingDoc = await db.collection('coupons').doc(codeUpper).get()
    if (existingDoc.exists) {
      return NextResponse.json(
        { error: 'Cupom com este código já existe' },
        { status: 400 }
      )
    }

    // Criar cupom
    const now = new Date()
    await db.collection('coupons').doc(codeUpper).set({
      code: codeUpper,
      discount: Number(discount),
      description: description || null,
      active: active === true,
      maxUses: maxUses ? Number(maxUses) : null,
      maxUsesPerUser: maxUsesPerUser ? Number(maxUsesPerUser) : null,
      validFrom: new Date(validFrom),
      validUntil: new Date(validUntil),
      applicablePlans: applicablePlans && Array.isArray(applicablePlans) ? applicablePlans : null,
      createdAt: now,
      updatedAt: now,
      createdBy: authUser.uid,
    })

    return NextResponse.json({
      success: true,
      message: 'Cupom criado com sucesso',
      coupon: {
        code: codeUpper,
        discount: Number(discount),
      },
    })
  } catch (error: any) {
    console.error('Erro ao criar cupom:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar cupom' },
      { status: 500 }
    )
  }
}


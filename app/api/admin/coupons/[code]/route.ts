import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'

/**
 * PUT /api/admin/coupons/[code]
 * Atualiza um cupom existente (apenas admin_master)
 */
export async function PUT(
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
    const body = await request.json()
    const {
      discount,
      description,
      active,
      maxUses,
      maxUsesPerUser,
      validFrom,
      validUntil,
      applicablePlans,
    } = body

    // Validações
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
    const couponRef = db.collection('coupons').doc(codeUpper)

    // Verificar se cupom existe
    const couponDoc = await couponRef.get()
    if (!couponDoc.exists) {
      return NextResponse.json(
        { error: 'Cupom não encontrado' },
        { status: 404 }
      )
    }

    // Atualizar cupom
    await couponRef.update({
      discount: Number(discount),
      description: description || null,
      active: active === true,
      maxUses: maxUses ? Number(maxUses) : null,
      maxUsesPerUser: maxUsesPerUser ? Number(maxUsesPerUser) : null,
      validFrom: new Date(validFrom),
      validUntil: new Date(validUntil),
      applicablePlans: applicablePlans && Array.isArray(applicablePlans) ? applicablePlans : null,
      updatedAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      message: 'Cupom atualizado com sucesso',
    })
  } catch (error: any) {
    console.error('Erro ao atualizar cupom:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar cupom' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/coupons/[code]
 * Desativa um cupom (apenas admin_master)
 */
export async function DELETE(
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
    const couponRef = db.collection('coupons').doc(codeUpper)

    // Verificar se cupom existe
    const couponDoc = await couponRef.get()
    if (!couponDoc.exists) {
      return NextResponse.json(
        { error: 'Cupom não encontrado' },
        { status: 404 }
      )
    }

    // Desativar cupom (não deletar para manter histórico)
    await couponRef.update({
      active: false,
      updatedAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      message: 'Cupom desativado com sucesso',
    })
  } catch (error: any) {
    console.error('Erro ao desativar cupom:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao desativar cupom' },
      { status: 500 }
    )
  }
}


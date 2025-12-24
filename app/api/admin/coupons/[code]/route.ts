import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'

/**
 * PUT /api/admin/coupons/[code]
 * Atualiza um cupom existente (apenas admin_master)
 * Body pode conter campos de atualização ou { archived: boolean } para arquivar/desarquivar
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
      archived,
      maxUses,
      maxUsesPerUser,
      validFrom,
      validUntil,
      applicablePlans,
    } = body

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

    // Se é apenas uma atualização de arquivamento
    if (typeof archived === 'boolean' && discount === undefined) {
      await couponRef.update({
        archived,
        archivedAt: archived ? new Date() : null,
        updatedAt: new Date(),
      })

      return NextResponse.json({
        success: true,
        message: archived ? 'Cupom arquivado com sucesso' : 'Cupom desarquivado com sucesso',
      })
    }

    // Validações para atualização completa
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
 * Exclui permanentemente um cupom arquivado (apenas admin_master)
 * Query param: permanent=true para exclusão permanente
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
    const { searchParams } = new URL(request.url)
    const isPermanent = searchParams.get('permanent') === 'true'

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

    const couponData = couponDoc.data()!

    // Se for exclusão permanente
    if (isPermanent) {
      // Só permitir excluir cupons arquivados
      if (couponData.archived !== true) {
        return NextResponse.json(
          { error: 'Apenas cupons arquivados podem ser excluídos permanentemente' },
          { status: 400 }
        )
      }

      await couponRef.delete()

      return NextResponse.json({
        success: true,
        message: 'Cupom excluído permanentemente',
      })
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
    console.error('Erro ao processar cupom:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao processar cupom' },
      { status: 500 }
    )
  }
}


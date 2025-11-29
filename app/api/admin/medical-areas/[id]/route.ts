import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'
import type { Sistema, MedicalArea } from '@/lib/types'

/**
 * PUT /api/admin/medical-areas/[id]
 * Atualiza um sistema (apenas admins)
 * Mantido o endpoint para compatibilidade, mas agora usa a coleção 'sistemas'
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('firebase-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const authUser = await verifyFirebaseToken(token)
    if (!authUser || (authUser.role !== 'admin_master' && authUser.role !== 'admin_questoes')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { nome, descricao, periodo, ativo } = body

    const app = getAdminApp()
    const db = app.firestore()

    // Verificar se o sistema existe (APENAS em 'sistemas')
    const areaRef = db.collection('sistemas').doc(id)
    const areaDoc = await areaRef.get()

    if (!areaDoc.exists) {
      return NextResponse.json(
        { error: 'Sistema não encontrado' },
        { status: 404 }
      )
    }

    // Validação
    if (nome !== undefined) {
      if (!nome || typeof nome !== 'string' || !nome.trim()) {
        return NextResponse.json(
          { error: 'O nome do sistema é obrigatório' },
          { status: 400 }
        )
      }

      // Verificar se já existe outro sistema com o mesmo nome (APENAS em 'sistemas')
      const existingArea = await db
        .collection('sistemas')
        .where('nome', '==', nome.trim())
        .limit(1)
        .get()

      if (!existingArea.empty && existingArea.docs[0].id !== id) {
        return NextResponse.json(
          { error: 'Já existe um sistema com este nome' },
          { status: 400 }
        )
      }
    }

    if (periodo !== undefined) {
      if (!periodo || typeof periodo !== 'string' || !periodo.trim()) {
        return NextResponse.json(
          { error: 'O período do sistema é obrigatório' },
          { status: 400 }
        )
      }
    }

    // Preparar dados para atualização
    const updateData: any = {
      updatedAt: new Date(),
    }

    if (nome !== undefined) {
      updateData.nome = nome.trim()
    }
    if (descricao !== undefined) {
      updateData.descricao = descricao?.trim() || null
    }
    if (periodo !== undefined) {
      updateData.periodo = periodo.trim()
    }
    if (ativo !== undefined) {
      updateData.ativo = ativo
    }

    // Atualizar sistema
    await areaRef.update(updateData)

    // Buscar sistema atualizado
    const updatedDoc = await areaRef.get()
    const updatedData = updatedDoc.data()!

    return NextResponse.json({
      success: true,
      area: {
        id: updatedDoc.id,
        ...updatedData,
        createdAt: updatedData.createdAt?.toDate() || new Date(),
        updatedAt: updatedData.updatedAt?.toDate() || new Date(),
      } as Sistema,
    })
  } catch (error: any) {
    console.error('Erro ao atualizar sistema:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar sistema' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/medical-areas/[id]
 * Deleta um sistema (apenas admins)
 * Mantido o endpoint para compatibilidade, mas agora usa a coleção 'sistemas'
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('firebase-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const authUser = await verifyFirebaseToken(token)
    if (!authUser || (authUser.role !== 'admin_master' && authUser.role !== 'admin_questoes')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { id } = await params

    const app = getAdminApp()
    const db = app.firestore()

    // Verificar se o sistema existe (APENAS em 'sistemas')
    const areaRef = db.collection('sistemas').doc(id)
    const areaDoc = await areaRef.get()

    if (!areaDoc.exists) {
      return NextResponse.json(
        { error: 'Sistema não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se há questões usando este sistema
    const questionsSnapshot = await db
      .collection('questions')
      .where('area', '==', areaDoc.data()!.nome)
      .limit(1)
      .get()

    if (!questionsSnapshot.empty) {
      return NextResponse.json(
        { error: 'Não é possível excluir este sistema pois existem questões associadas a ele' },
        { status: 400 }
      )
    }

    // Deletar sistema
    await areaRef.delete()

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao deletar sistema:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao deletar sistema' },
      { status: 500 }
    )
  }
}




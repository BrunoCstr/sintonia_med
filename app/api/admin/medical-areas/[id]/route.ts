import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'
import type { MedicalArea } from '@/lib/types'

/**
 * PUT /api/admin/medical-areas/[id]
 * Atualiza uma área médica (apenas admins)
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
    const { nome, descricao, ativo } = body

    const app = getAdminApp()
    const db = app.firestore()

    // Verificar se a área existe
    const areaRef = db.collection('medical_areas').doc(id)
    const areaDoc = await areaRef.get()

    if (!areaDoc.exists) {
      return NextResponse.json(
        { error: 'Área médica não encontrada' },
        { status: 404 }
      )
    }

    // Validação
    if (nome !== undefined) {
      if (!nome || typeof nome !== 'string' || !nome.trim()) {
        return NextResponse.json(
          { error: 'O nome da área é obrigatório' },
          { status: 400 }
        )
      }

      // Verificar se já existe outra área com o mesmo nome
      const existingArea = await db
        .collection('medical_areas')
        .where('nome', '==', nome.trim())
        .limit(1)
        .get()

      if (!existingArea.empty && existingArea.docs[0].id !== id) {
        return NextResponse.json(
          { error: 'Já existe uma área médica com este nome' },
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
    if (ativo !== undefined) {
      updateData.ativo = ativo
    }

    // Atualizar área médica
    await areaRef.update(updateData)

    // Buscar área atualizada
    const updatedDoc = await areaRef.get()
    const updatedData = updatedDoc.data()!

    return NextResponse.json({
      success: true,
      area: {
        id: updatedDoc.id,
        ...updatedData,
        createdAt: updatedData.createdAt?.toDate() || new Date(),
        updatedAt: updatedData.updatedAt?.toDate() || new Date(),
      } as MedicalArea,
    })
  } catch (error: any) {
    console.error('Erro ao atualizar área médica:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar área médica' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/medical-areas/[id]
 * Deleta uma área médica (apenas admins)
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

    // Verificar se a área existe
    const areaRef = db.collection('medical_areas').doc(id)
    const areaDoc = await areaRef.get()

    if (!areaDoc.exists) {
      return NextResponse.json(
        { error: 'Área médica não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se há questões usando esta área
    const questionsSnapshot = await db
      .collection('questions')
      .where('area', '==', areaDoc.data()!.nome)
      .limit(1)
      .get()

    if (!questionsSnapshot.empty) {
      return NextResponse.json(
        { error: 'Não é possível excluir esta área pois existem questões associadas a ela' },
        { status: 400 }
      )
    }

    // Deletar área médica
    await areaRef.delete()

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao deletar área médica:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao deletar área médica' },
      { status: 500 }
    )
  }
}


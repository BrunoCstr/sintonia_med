import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'
import type { Materia } from '@/lib/types'

/**
 * PUT /api/admin/materias/[id]
 * Atualiza uma matéria (apenas admins)
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
    const { nome, ativo } = body

    const app = getAdminApp()
    const db = app.firestore()

    // Verificar se a matéria existe
    const materiaRef = db.collection('materias').doc(id)
    const materiaDoc = await materiaRef.get()

    if (!materiaDoc.exists) {
      return NextResponse.json(
        { error: 'Matéria não encontrada' },
        { status: 404 }
      )
    }

    const materiaData = materiaDoc.data()!

    // Validação
    if (nome !== undefined) {
      if (!nome || typeof nome !== 'string' || !nome.trim()) {
        return NextResponse.json(
          { error: 'O nome da matéria é obrigatório' },
          { status: 400 }
        )
      }

      // Verificar se já existe outra matéria com o mesmo nome no mesmo sistema
      const existingMateria = await db
        .collection('materias')
        .where('sistemaId', '==', materiaData.sistemaId)
        .where('nome', '==', nome.trim())
        .limit(1)
        .get()

      if (!existingMateria.empty && existingMateria.docs[0].id !== id) {
        return NextResponse.json(
          { error: 'Já existe uma matéria com este nome neste sistema' },
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
    if (ativo !== undefined) {
      updateData.ativo = ativo
    }

    // Atualizar matéria
    await materiaRef.update(updateData)

    // Buscar matéria atualizada
    const updatedDoc = await materiaRef.get()
    const updatedData = updatedDoc.data()!

    return NextResponse.json({
      success: true,
      materia: {
        id: updatedDoc.id,
        ...updatedData,
        createdAt: updatedData.createdAt?.toDate() || new Date(),
        updatedAt: updatedData.updatedAt?.toDate() || new Date(),
      } as Materia,
    })
  } catch (error: any) {
    console.error('Erro ao atualizar matéria:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar matéria' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/materias/[id]
 * Deleta uma matéria (apenas admins)
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

    // Verificar se a matéria existe
    const materiaRef = db.collection('materias').doc(id)
    const materiaDoc = await materiaRef.get()

    if (!materiaDoc.exists) {
      return NextResponse.json(
        { error: 'Matéria não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se há questões usando esta matéria
    const questionsSnapshot = await db
      .collection('questions')
      .where('subarea', '==', materiaDoc.data()!.nome)
      .limit(1)
      .get()

    if (!questionsSnapshot.empty) {
      return NextResponse.json(
        { error: 'Não é possível excluir esta matéria pois existem questões associadas a ela' },
        { status: 400 }
      )
    }

    // Deletar matéria
    await materiaRef.delete()

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao deletar matéria:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao deletar matéria' },
      { status: 500 }
    )
  }
}


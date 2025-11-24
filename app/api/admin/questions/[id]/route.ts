import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'
import type { Question } from '@/lib/types'

/**
 * GET /api/admin/questions/[id]
 * Busca uma questão específica (apenas admins)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Verificar autenticação
    const token = request.cookies.get('firebase-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const authUser = await verifyFirebaseToken(token)
    if (!authUser || (authUser.role !== 'admin_master' && authUser.role !== 'admin_questoes')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const app = getAdminApp()
    const db = app.firestore()

    const doc = await db.collection('questions').doc(id).get()

    if (!doc.exists) {
      return NextResponse.json({ error: 'Questão não encontrada' }, { status: 404 })
    }

    const data = doc.data()!
    const question = {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Question

    return NextResponse.json({ question })
  } catch (error: any) {
    console.error('Erro ao buscar questão:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar questão' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/questions/[id]
 * Atualiza uma questão (apenas admins)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Verificar autenticação
    const token = request.cookies.get('firebase-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const authUser = await verifyFirebaseToken(token)
    if (!authUser || (authUser.role !== 'admin_master' && authUser.role !== 'admin_questoes')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const {
      enunciado,
      imagemUrl,
      alternativaA,
      alternativaB,
      alternativaC,
      alternativaD,
      alternativaE,
      alternativaCorreta,
      comentarioGabarito,
      area,
      subarea,
      dificuldade,
      tipo,
      ativo,
    } = body

    const app = getAdminApp()
    const db = app.firestore()

    // Verificar se a questão existe
    const docRef = db.collection('questions').doc(id)
    const doc = await docRef.get()

    if (!doc.exists) {
      return NextResponse.json({ error: 'Questão não encontrada' }, { status: 404 })
    }

    // Preparar dados de atualização com validações
    const updateData: any = {
      updatedAt: new Date(),
    }

    // Validar e atualizar enunciado
    if (enunciado !== undefined) {
      if (!enunciado || typeof enunciado !== 'string' || !enunciado.trim()) {
        return NextResponse.json(
          { error: 'O enunciado é obrigatório' },
          { status: 400 }
        )
      }
      updateData.enunciado = enunciado.trim()
    }

    // Validar e atualizar imagem (opcional)
    if (imagemUrl !== undefined) {
      updateData.imagemUrl = imagemUrl && imagemUrl.trim() ? imagemUrl.trim() : null
    }

    // Validar e atualizar alternativas
    const alternativas = [
      { key: 'alternativaA', value: alternativaA, letter: 'A' },
      { key: 'alternativaB', value: alternativaB, letter: 'B' },
      { key: 'alternativaC', value: alternativaC, letter: 'C' },
      { key: 'alternativaD', value: alternativaD, letter: 'D' },
      { key: 'alternativaE', value: alternativaE, letter: 'E' },
    ]

    for (const alt of alternativas) {
      if (alt.value !== undefined) {
        if (!alt.value || typeof alt.value !== 'string' || !alt.value.trim()) {
          return NextResponse.json(
            { error: `A alternativa ${alt.letter} é obrigatória` },
            { status: 400 }
          )
        }
        updateData[alt.key] = alt.value.trim()
      }
    }

    // Validar e atualizar alternativa correta
    if (alternativaCorreta !== undefined) {
      if (!alternativaCorreta || !['A', 'B', 'C', 'D', 'E'].includes(alternativaCorreta)) {
        return NextResponse.json(
          { error: 'Selecione a alternativa correta' },
          { status: 400 }
        )
      }
      updateData.alternativaCorreta = alternativaCorreta
    }

    // Validar e atualizar comentário do gabarito
    if (comentarioGabarito !== undefined) {
      if (!comentarioGabarito || typeof comentarioGabarito !== 'string' || !comentarioGabarito.trim()) {
        return NextResponse.json(
          { error: 'O comentário do gabarito é obrigatório' },
          { status: 400 }
        )
      }
      updateData.comentarioGabarito = comentarioGabarito.trim()
    }

    // Validar e atualizar área
    if (area !== undefined) {
      if (!area || typeof area !== 'string' || !area.trim()) {
        return NextResponse.json(
          { error: 'A área é obrigatória' },
          { status: 400 }
        )
      }
      updateData.area = area.trim()
    }

    // Validar e atualizar subárea
    if (subarea !== undefined) {
      if (!subarea || typeof subarea !== 'string' || !subarea.trim()) {
        return NextResponse.json(
          { error: 'A subárea é obrigatória' },
          { status: 400 }
        )
      }
      updateData.subarea = subarea.trim()
    }

    // Validar e atualizar dificuldade
    if (dificuldade !== undefined) {
      if (!dificuldade || !['facil', 'medio', 'dificil'].includes(dificuldade)) {
        return NextResponse.json(
          { error: 'A dificuldade é obrigatória' },
          { status: 400 }
        )
      }
      updateData.dificuldade = dificuldade
    }

    // Validar e atualizar tipo
    if (tipo !== undefined) {
      if (!tipo || typeof tipo !== 'string' || !tipo.trim()) {
        return NextResponse.json(
          { error: 'O tipo de prova é obrigatório' },
          { status: 400 }
        )
      }
      updateData.tipo = tipo.trim()
    }

    // Atualizar status (ativo)
    if (ativo !== undefined) {
      updateData.ativo = Boolean(ativo)
    }

    await docRef.update(updateData)

    // Buscar questão atualizada
    const updatedDoc = await docRef.get()
    const data = updatedDoc.data()!
    const question = {
      id: updatedDoc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Question

    return NextResponse.json({
      success: true,
      question,
    })
  } catch (error: any) {
    console.error('Erro ao atualizar questão:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar questão' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/questions/[id]
 * Deleta uma questão (apenas admins)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Verificar autenticação
    const token = request.cookies.get('firebase-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const authUser = await verifyFirebaseToken(token)
    if (!authUser || (authUser.role !== 'admin_master' && authUser.role !== 'admin_questoes')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const app = getAdminApp()
    const db = app.firestore()

    const docRef = db.collection('questions').doc(id)
    const doc = await docRef.get()

    if (!doc.exists) {
      return NextResponse.json({ error: 'Questão não encontrada' }, { status: 404 })
    }

    await docRef.delete()

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao deletar questão:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao deletar questão' },
      { status: 500 }
    )
  }
}


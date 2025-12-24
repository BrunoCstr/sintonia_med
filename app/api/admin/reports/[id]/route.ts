import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'

/**
 * GET /api/admin/reports/[id]
 * Busca um report específico (apenas admin_master)
 */
export async function GET(
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
    if (!authUser || authUser.role !== 'admin_master') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { id } = await params
    const app = getAdminApp()
    const db = app.firestore()

    // Buscar report
    const reportDoc = await db.collection('reports').doc(id).get()

    if (!reportDoc.exists) {
      return NextResponse.json(
        { error: 'Report não encontrado' },
        { status: 404 }
      )
    }

    const data = reportDoc.data()!

    // Buscar texto da questão (só se houver questionId)
    let questionText = data.questionId ? 'Questão não encontrada' : 'Bug geral (sem questão específica)'
    if (data.questionId) {
      try {
        const questionDoc = await db.collection('questions').doc(data.questionId).get()
        if (questionDoc.exists) {
          const questionData = questionDoc.data()!
          questionText = questionData.texto || questionData.enunciado || questionText
        }
      } catch (error) {
        console.error('Erro ao buscar questão:', error)
      }
    }

    // Converter datas
    let createdAt: Date
    let updatedAt: Date
    let resolvedAt: Date | undefined = undefined

    try {
      if (data.createdAt?.toDate) {
        createdAt = data.createdAt.toDate()
      } else if (data.createdAt?.seconds) {
        createdAt = new Date(data.createdAt.seconds * 1000)
      } else if (data.createdAt) {
        createdAt = new Date(data.createdAt)
      } else {
        createdAt = new Date()
      }

      if (isNaN(createdAt.getTime())) {
        createdAt = new Date()
      }
    } catch (error) {
      createdAt = new Date()
    }

    try {
      if (data.updatedAt?.toDate) {
        updatedAt = data.updatedAt.toDate()
      } else if (data.updatedAt?.seconds) {
        updatedAt = new Date(data.updatedAt.seconds * 1000)
      } else if (data.updatedAt) {
        updatedAt = new Date(data.updatedAt)
      } else {
        updatedAt = createdAt
      }

      if (isNaN(updatedAt.getTime())) {
        updatedAt = createdAt
      }
    } catch (error) {
      updatedAt = createdAt
    }

    if (data.resolvedAt) {
      try {
        if (data.resolvedAt.toDate) {
          resolvedAt = data.resolvedAt.toDate()
        } else if (data.resolvedAt.seconds) {
          resolvedAt = new Date(data.resolvedAt.seconds * 1000)
        } else {
          resolvedAt = new Date(data.resolvedAt)
        }

        if (isNaN(resolvedAt.getTime())) {
          resolvedAt = undefined
        }
      } catch (error) {
        // Ignorar erro
      }
    }

    return NextResponse.json({
      success: true,
      report: {
        id: reportDoc.id,
        questionId: data.questionId,
        questionText,
        userId: data.userId,
        userName: data.userName || '',
        userEmail: data.userEmail || '',
        texto: data.texto || '',
        tipos: data.tipos || [],
        imagemUrl: data.imagemUrl || null,
        status: data.status || 'pendente',
        archived: data.archived === true,
        resolvedAt: resolvedAt ? resolvedAt.toISOString() : undefined,
        resolvedBy: data.resolvedBy || undefined,
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
      },
    })
  } catch (error: any) {
    console.error('Erro ao buscar report:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar report' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/reports/[id]
 * Atualiza o status de um report (apenas admin_master)
 * Body pode conter: { status: 'pendente' | 'resolvido' } ou { archived: boolean }
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
    if (!authUser || authUser.role !== 'admin_master') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { status, archived } = body

    const app = getAdminApp()
    const db = app.firestore()

    // Verificar se o report existe
    const reportRef = db.collection('reports').doc(id)
    const reportDoc = await reportRef.get()

    if (!reportDoc.exists) {
      return NextResponse.json(
        { error: 'Report não encontrado' },
        { status: 404 }
      )
    }

    // Buscar nome do admin
    const adminDoc = await db.collection('users').doc(authUser.uid).get()
    const adminData = adminDoc.exists ? adminDoc.data() : null
    const adminName = adminData?.name || adminData?.displayName || authUser.email || 'Admin Master'

    // Atualizar report
    const updateData: any = {
      updatedAt: new Date(),
    }

    // Atualizar arquivamento se enviado
    if (typeof archived === 'boolean') {
      updateData.archived = archived
      if (archived) {
        updateData.archivedAt = new Date()
        updateData.archivedBy = adminName
      } else {
        updateData.archivedAt = null
        updateData.archivedBy = null
      }
    }

    // Atualizar status se enviado
    if (status) {
      if (status !== 'pendente' && status !== 'resolvido') {
        return NextResponse.json(
          { error: 'Status inválido. Deve ser "pendente" ou "resolvido"' },
          { status: 400 }
        )
      }
      updateData.status = status
      if (status === 'resolvido') {
        updateData.resolvedAt = new Date()
        updateData.resolvedBy = adminName
      } else {
        // Se voltar para pendente, remover dados de resolução
        updateData.resolvedAt = null
        updateData.resolvedBy = null
      }
    }

    await reportRef.update(updateData)

    // Buscar report atualizado
    const updatedDoc = await reportRef.get()
    const updatedData = updatedDoc.data()!

    // Converter datas
    let createdAt: Date
    let updatedAt: Date
    let resolvedAt: Date | undefined = undefined

    try {
      if (updatedData.createdAt?.toDate) {
        createdAt = updatedData.createdAt.toDate()
      } else if (updatedData.createdAt?.seconds) {
        createdAt = new Date(updatedData.createdAt.seconds * 1000)
      } else {
        createdAt = new Date(updatedData.createdAt)
      }
    } catch (error) {
      createdAt = new Date()
    }

    try {
      if (updatedData.updatedAt?.toDate) {
        updatedAt = updatedData.updatedAt.toDate()
      } else if (updatedData.updatedAt?.seconds) {
        updatedAt = new Date(updatedData.updatedAt.seconds * 1000)
      } else {
        updatedAt = new Date(updatedData.updatedAt)
      }
    } catch (error) {
      updatedAt = createdAt
    }

    if (updatedData.resolvedAt) {
      try {
        if (updatedData.resolvedAt.toDate) {
          resolvedAt = updatedData.resolvedAt.toDate()
        } else if (updatedData.resolvedAt.seconds) {
          resolvedAt = new Date(updatedData.resolvedAt.seconds * 1000)
        } else {
          resolvedAt = new Date(updatedData.resolvedAt)
        }
      } catch (error) {
        // Ignorar erro
      }
    }

    return NextResponse.json({
      success: true,
      report: {
        id: updatedDoc.id,
        questionId: updatedData.questionId,
        userId: updatedData.userId,
        userName: updatedData.userName || '',
        userEmail: updatedData.userEmail || '',
        texto: updatedData.texto || '',
        tipos: updatedData.tipos || [],
        imagemUrl: updatedData.imagemUrl || null,
        status: updatedData.status,
        archived: updatedData.archived === true,
        resolvedAt: resolvedAt ? resolvedAt.toISOString() : undefined,
        resolvedBy: updatedData.resolvedBy || undefined,
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
      },
    })
  } catch (error: any) {
    console.error('Erro ao atualizar report:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar report' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/reports/[id]
 * Exclui permanentemente um report arquivado (apenas admin_master)
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
    if (!authUser || authUser.role !== 'admin_master') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { id } = await params
    const app = getAdminApp()
    const db = app.firestore()

    // Verificar se o report existe
    const reportRef = db.collection('reports').doc(id)
    const reportDoc = await reportRef.get()

    if (!reportDoc.exists) {
      return NextResponse.json(
        { error: 'Report não encontrado' },
        { status: 404 }
      )
    }

    const reportData = reportDoc.data()!

    // Só permitir excluir reports arquivados
    if (reportData.archived !== true) {
      return NextResponse.json(
        { error: 'Apenas reports arquivados podem ser excluídos permanentemente' },
        { status: 400 }
      )
    }

    // Excluir permanentemente
    await reportRef.delete()

    return NextResponse.json({
      success: true,
      message: 'Report excluído permanentemente',
    })
  } catch (error: any) {
    console.error('Erro ao excluir report:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao excluir report' },
      { status: 500 }
    )
  }
}


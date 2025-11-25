import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'

/**
 * PUT /api/admin/reports/[id]
 * Atualiza o status de um report (apenas admin_master)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { id } = params
    const body = await request.json()
    const { status } = body

    if (!status || (status !== 'pendente' && status !== 'resolvido')) {
      return NextResponse.json(
        { error: 'Status inválido. Deve ser "pendente" ou "resolvido"' },
        { status: 400 }
      )
    }

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
      status,
      updatedAt: new Date(),
    }

    if (status === 'resolvido') {
      updateData.resolvedAt = new Date()
      updateData.resolvedBy = adminName
    } else {
      // Se voltar para pendente, remover dados de resolução
      updateData.resolvedAt = null
      updateData.resolvedBy = null
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


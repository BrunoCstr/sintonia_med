import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'

/**
 * PATCH /api/admin/notices/[id]
 * Atualiza um aviso (apenas admin_master)
 * Ao ativar um aviso, desativa todos os outros avisos ativos
 */
export async function PATCH(
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
    const { titulo, mensagem, ativo } = body

    const app = getAdminApp()
    const db = app.firestore()

    // Verificar se o aviso existe
    const noticeRef = db.collection('notices').doc(id)
    const noticeDoc = await noticeRef.get()

    if (!noticeDoc.exists) {
      return NextResponse.json(
        { error: 'Aviso não encontrado' },
        { status: 404 }
      )
    }

    const updateData: any = {
      updatedAt: new Date(),
    }

    // Validar e adicionar campos
    if (titulo !== undefined) {
      if (typeof titulo !== 'string' || titulo.trim() === '') {
        return NextResponse.json(
          { error: 'Título inválido' },
          { status: 400 }
        )
      }
      updateData.titulo = titulo.trim()
    }

    if (mensagem !== undefined) {
      if (typeof mensagem !== 'string' || mensagem.trim() === '') {
        return NextResponse.json(
          { error: 'Mensagem inválida' },
          { status: 400 }
        )
      }
      updateData.mensagem = mensagem.trim()
    }

    if (ativo !== undefined) {
      updateData.ativo = ativo === true

      // Se estiver ativando este aviso, desativar todos os outros
      if (ativo === true) {
        // Adicionar timestamp de ativação para forçar nova visualização
        updateData.lastActivatedAt = new Date()
        
        const activeNoticesSnapshot = await db.collection('notices')
          .where('ativo', '==', true)
          .get()
        
        const batch = db.batch()
        activeNoticesSnapshot.docs.forEach((doc) => {
          if (doc.id !== id) {
            batch.update(doc.ref, { ativo: false, updatedAt: new Date() })
          }
        })
        await batch.commit()
      }
    }

    // Atualizar aviso
    await noticeRef.update(updateData)

    return NextResponse.json({
      success: true,
      message: 'Aviso atualizado com sucesso',
    })
  } catch (error: any) {
    console.error('Erro ao atualizar aviso:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar aviso' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/notices/[id]
 * Deleta um aviso (apenas admin_master)
 */
export async function DELETE(
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

    const app = getAdminApp()
    const db = app.firestore()

    // Verificar se o aviso existe
    const noticeRef = db.collection('notices').doc(id)
    const noticeDoc = await noticeRef.get()

    if (!noticeDoc.exists) {
      return NextResponse.json(
        { error: 'Aviso não encontrado' },
        { status: 404 }
      )
    }

    // Deletar aviso
    await noticeRef.delete()

    return NextResponse.json({
      success: true,
      message: 'Aviso deletado com sucesso',
    })
  } catch (error: any) {
    console.error('Erro ao deletar aviso:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao deletar aviso' },
      { status: 500 }
    )
  }
}


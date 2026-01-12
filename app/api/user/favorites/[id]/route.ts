import { NextRequest, NextResponse } from 'next/server'
import { verifyFirebaseToken } from '@/lib/middleware-auth'
import { getAdminApp } from '@/lib/firebase-admin'

/**
 * GET /api/user/favorites/[id]
 * Busca uma questão favoritada específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('firebase-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const authUser = await verifyFirebaseToken(token)
    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params
    const app = getAdminApp()
    const db = app.firestore()

    const favoriteDoc = await db.collection('userFavorites').doc(id).get()

    if (!favoriteDoc.exists) {
      return NextResponse.json(
        { error: 'Favorito não encontrado' },
        { status: 404 }
      )
    }

    const data = favoriteDoc.data()

    // Verificar se pertence ao usuário
    if (data?.userId !== authUser.uid) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      id: favoriteDoc.id,
      questionId: data?.questionId,
      question: data?.question,
      personalComment: data?.personalComment || '',
      archived: data?.archived || false,
      createdAt: data?.createdAt?.toDate?.()?.toISOString() || data?.createdAt,
      updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || data?.updatedAt,
    })
  } catch (error: any) {
    console.error('Erro ao buscar favorito:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar favorito' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/user/favorites/[id]
 * Atualiza uma questão favoritada (comentário pessoal ou arquivar)
 * Body: { personalComment?: string, archived?: boolean }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('firebase-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const authUser = await verifyFirebaseToken(token)
    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { personalComment, archived } = body

    const app = getAdminApp()
    const db = app.firestore()

    const favoriteRef = db.collection('userFavorites').doc(id)
    const favoriteDoc = await favoriteRef.get()

    if (!favoriteDoc.exists) {
      return NextResponse.json(
        { error: 'Favorito não encontrado' },
        { status: 404 }
      )
    }

    const data = favoriteDoc.data()

    // Verificar se pertence ao usuário
    if (data?.userId !== authUser.uid) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Preparar atualizações
    const updates: any = {
      updatedAt: new Date(),
    }

    if (personalComment !== undefined) {
      updates.personalComment = personalComment
    }

    if (archived !== undefined) {
      updates.archived = archived
    }

    await favoriteRef.update(updates)

    return NextResponse.json({
      success: true,
      message: 'Favorito atualizado com sucesso',
    })
  } catch (error: any) {
    console.error('Erro ao atualizar favorito:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar favorito' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/user/favorites/[id]
 * Remove uma questão favoritada (apenas se estiver arquivada)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('firebase-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const authUser = await verifyFirebaseToken(token)
    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params
    const app = getAdminApp()
    const db = app.firestore()

    const favoriteDoc = await db.collection('userFavorites').doc(id).get()

    if (!favoriteDoc.exists) {
      return NextResponse.json(
        { error: 'Favorito não encontrado' },
        { status: 404 }
      )
    }

    const data = favoriteDoc.data()

    // Verificar se pertence ao usuário
    if (data?.userId !== authUser.uid) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Só permitir deletar se estiver arquivada
    if (!data?.archived) {
      return NextResponse.json(
        { error: 'Apenas questões arquivadas podem ser deletadas. Arquivar primeiro.' },
        { status: 400 }
      )
    }

    await favoriteDoc.ref.delete()

    return NextResponse.json({
      success: true,
      message: 'Favorito removido com sucesso',
    })
  } catch (error: any) {
    console.error('Erro ao deletar favorito:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao deletar favorito' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { verifyFirebaseToken } from '@/lib/middleware-auth'
import { getAdminApp } from '@/lib/firebase-admin'

/**
 * GET /api/user/favorites/check/[questionId]
 * Verifica se uma questão está favoritada pelo usuário
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    const token = request.cookies.get('firebase-token')?.value
    if (!token) {
      return NextResponse.json({ isFavorited: false })
    }

    const authUser = await verifyFirebaseToken(token)
    if (!authUser) {
      return NextResponse.json({ isFavorited: false })
    }

    const { questionId } = await params
    const app = getAdminApp()
    const db = app.firestore()

    // Buscar se a questão está favoritada (não arquivada)
    const favoritesSnapshot = await db
      .collection('userFavorites')
      .where('userId', '==', authUser.uid)
      .where('questionId', '==', questionId)
      .where('archived', '==', false)
      .limit(1)
      .get()

    const isFavorited = !favoritesSnapshot.empty
    let favoriteId = null

    if (isFavorited) {
      favoriteId = favoritesSnapshot.docs[0].id
    }

    return NextResponse.json({ isFavorited, favoriteId })
  } catch (error: any) {
    console.error('Erro ao verificar favorito:', error)
    return NextResponse.json({ isFavorited: false })
  }
}

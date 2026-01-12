import { NextRequest, NextResponse } from 'next/server'
import { verifyFirebaseToken } from '@/lib/middleware-auth'
import { getAdminApp } from '@/lib/firebase-admin'

/**
 * GET /api/user/favorites/archived
 * Lista todas as questões favoritadas arquivadas do usuário
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('firebase-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const authUser = await verifyFirebaseToken(token)
    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const app = getAdminApp()
    const db = app.firestore()

    // Buscar questões favoritadas arquivadas
    const favoritesSnapshot = await db
      .collection('userFavorites')
      .where('userId', '==', authUser.uid)
      .where('archived', '==', true)
      .orderBy('updatedAt', 'desc')
      .get()

    const favorites = favoritesSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        questionId: data.questionId,
        question: data.question,
        personalComment: data.personalComment || '',
        archived: data.archived || false,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      }
    })

    return NextResponse.json({ favorites })
  } catch (error: any) {
    console.error('Erro ao buscar questões arquivadas:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar questões arquivadas' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { verifyFirebaseToken } from '@/lib/middleware-auth'
import { getAdminApp } from '@/lib/firebase-admin'

/**
 * GET /api/user/favorites
 * Lista todas as questões favoritadas do usuário (não arquivadas)
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

    // Buscar questões favoritadas não arquivadas
    const favoritesSnapshot = await db
      .collection('userFavorites')
      .where('userId', '==', authUser.uid)
      .where('archived', '==', false)
      .orderBy('createdAt', 'desc')
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
    console.error('Erro ao buscar questões favoritadas:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar questões favoritadas' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/user/favorites
 * Adiciona uma questão aos favoritos
 * Body: { questionId: string, question: object }
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('firebase-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const authUser = await verifyFirebaseToken(token)
    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { questionId, question } = body

    if (!questionId || !question) {
      return NextResponse.json(
        { error: 'questionId e question são obrigatórios' },
        { status: 400 }
      )
    }

    const app = getAdminApp()
    const db = app.firestore()

    // Verificar se já está favoritada
    const existingSnapshot = await db
      .collection('userFavorites')
      .where('userId', '==', authUser.uid)
      .where('questionId', '==', questionId)
      .limit(1)
      .get()

    if (!existingSnapshot.empty) {
      // Se já existe mas está arquivada, desarquivar
      const existingDoc = existingSnapshot.docs[0]
      const existingData = existingDoc.data()
      
      if (existingData.archived) {
        await existingDoc.ref.update({
          archived: false,
          updatedAt: new Date(),
        })
        return NextResponse.json({ 
          success: true, 
          message: 'Questão desarquivada e adicionada aos favoritos',
          id: existingDoc.id 
        })
      }
      
      return NextResponse.json(
        { error: 'Questão já está nos favoritos' },
        { status: 400 }
      )
    }

    // Criar novo favorito
    const now = new Date()
    const favoriteData = {
      userId: authUser.uid,
      questionId,
      question,
      personalComment: '',
      archived: false,
      createdAt: now,
      updatedAt: now,
    }

    const docRef = await db.collection('userFavorites').add(favoriteData)

    return NextResponse.json({
      success: true,
      id: docRef.id,
      message: 'Questão adicionada aos favoritos',
    })
  } catch (error: any) {
    console.error('Erro ao adicionar favorito:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao adicionar favorito' },
      { status: 500 }
    )
  }
}

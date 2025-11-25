import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'

/**
 * GET /api/user/question-history
 * Busca IDs das questões já respondidas pelo usuário
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('firebase-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const authUser = await verifyFirebaseToken(token)
    if (!authUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const app = getAdminApp()
    const db = app.firestore()

    // Buscar histórico do usuário
    const historySnapshot = await db
      .collection('history')
      .where('userId', '==', authUser.uid)
      .get()

    const answeredQuestionIds = new Set<string>()
    historySnapshot.forEach((doc) => {
      const data = doc.data()
      if (data.questionId) {
        answeredQuestionIds.add(data.questionId)
      }
    })

    return NextResponse.json({ 
      answeredQuestionIds: Array.from(answeredQuestionIds) 
    })
  } catch (error: any) {
    console.error('Erro ao buscar histórico:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar histórico' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/user/question-history
 * Salva questões respondidas no histórico
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('firebase-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const authUser = await verifyFirebaseToken(token)
    if (!authUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { questionIds } = body

    if (!questionIds || !Array.isArray(questionIds)) {
      return NextResponse.json(
        { error: 'questionIds deve ser um array' },
        { status: 400 }
      )
    }

    const app = getAdminApp()
    const db = app.firestore()

    // Salvar cada questão no histórico em lotes (Firestore permite até 500 operações por batch)
    const now = new Date()
    let saved = 0

    for (let i = 0; i < questionIds.length; i += 500) {
      const batch = db.batch()
      const batchIds = questionIds.slice(i, i + 500)

      for (const questionId of batchIds) {
        const historyRef = db.collection('history').doc()
        batch.set(historyRef, {
          userId: authUser.uid,
          questionId,
          answeredAt: now,
          createdAt: now,
        })
      }

      await batch.commit()
      saved += batchIds.length
    }

    return NextResponse.json({ 
      success: true,
      saved 
    })
  } catch (error: any) {
    console.error('Erro ao salvar histórico:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao salvar histórico' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/user/question-history
 * Reseta o histórico de questões respondidas do usuário
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('firebase-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const authUser = await verifyFirebaseToken(token)
    if (!authUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const app = getAdminApp()
    const db = app.firestore()

    // Deletar em lotes (Firestore permite até 500 operações por batch)
    let totalDeleted = 0
    let hasMore = true

    while (hasMore) {
      // Buscar até 500 documentos por vez
      const historySnapshot = await db
        .collection('history')
        .where('userId', '==', authUser.uid)
        .limit(500)
        .get()

      if (historySnapshot.empty) {
        hasMore = false
        break
      }

      // Deletar em batch
      const batch = db.batch()
      historySnapshot.forEach((doc) => {
        batch.delete(doc.ref)
      })

      await batch.commit()
      totalDeleted += historySnapshot.size

      // Se retornou menos de 500, não há mais documentos
      if (historySnapshot.size < 500) {
        hasMore = false
      }
    }

    return NextResponse.json({ 
      success: true,
      deleted: totalDeleted 
    })
  } catch (error: any) {
    console.error('Erro ao resetar histórico:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao resetar histórico' },
      { status: 500 }
    )
  }
}


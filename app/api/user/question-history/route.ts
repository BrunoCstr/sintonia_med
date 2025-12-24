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
 * Reseta o histórico de questões respondidas do usuário e todos os resultados de simulados
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

    // Deletar histórico de questões (coleção history)
    let historyDeleted = 0
    let hasMoreHistory = true

    while (hasMoreHistory) {
      const historySnapshot = await db
        .collection('history')
        .where('userId', '==', authUser.uid)
        .limit(500)
        .get()

      if (historySnapshot.empty) {
        hasMoreHistory = false
        break
      }

      const batch = db.batch()
      historySnapshot.forEach((doc) => {
        batch.delete(doc.ref)
      })

      await batch.commit()
      historyDeleted += historySnapshot.size

      if (historySnapshot.size < 500) {
        hasMoreHistory = false
      }
    }

    // Deletar resultados de simulados (coleção results) - usado para gráficos e estatísticas
    let resultsDeleted = 0
    let hasMoreResults = true

    while (hasMoreResults) {
      const resultsSnapshot = await db
        .collection('results')
        .where('userId', '==', authUser.uid)
        .limit(500)
        .get()

      if (resultsSnapshot.empty) {
        hasMoreResults = false
        break
      }

      const batch = db.batch()
      resultsSnapshot.forEach((doc) => {
        batch.delete(doc.ref)
      })

      await batch.commit()
      resultsDeleted += resultsSnapshot.size

      if (resultsSnapshot.size < 500) {
        hasMoreResults = false
      }
    }

    return NextResponse.json({ 
      success: true,
      deleted: {
        history: historyDeleted,
        results: resultsDeleted,
        total: historyDeleted + resultsDeleted
      }
    })
  } catch (error: any) {
    console.error('Erro ao resetar histórico:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao resetar histórico' },
      { status: 500 }
    )
  }
}


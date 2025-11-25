import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'

/**
 * GET /api/user/stats
 * Busca estatísticas do usuário (questões respondidas, taxa de acertos, simulados)
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

    // Buscar resultados de simulados
    const resultsSnapshot = await db
      .collection('results')
      .where('userId', '==', authUser.uid)
      .get()

    // Calcular estatísticas dos simulados
    let totalQuizzes = 0
    let totalQuestionsAnswered = 0
    let totalCorrect = 0
    let totalIncorrect = 0

    resultsSnapshot.forEach((doc) => {
      const data = doc.data()
      totalQuizzes++
      totalQuestionsAnswered += data.correctCount || 0
      totalQuestionsAnswered += data.incorrectCount || 0
      totalCorrect += data.correctCount || 0
      totalIncorrect += data.incorrectCount || 0
    })

    // Calcular taxa de acertos
    const accuracyRate =
      totalQuestionsAnswered > 0
        ? Math.round((totalCorrect / totalQuestionsAnswered) * 100)
        : 0

    // Buscar questões respondidas no histórico
    const historySnapshot = await db
      .collection('history')
      .where('userId', '==', authUser.uid)
      .get()

    const uniqueQuestionsAnswered = new Set<string>()
    historySnapshot.forEach((doc) => {
      const data = doc.data()
      if (data.questionId) {
        uniqueQuestionsAnswered.add(data.questionId)
      }
    })

    return NextResponse.json({
      success: true,
      stats: {
        questionsAnswered: uniqueQuestionsAnswered.size,
        accuracyRate,
        quizzesCompleted: totalQuizzes,
      },
    })
  } catch (error: any) {
    console.error('Erro ao buscar estatísticas:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar estatísticas' },
      { status: 500 }
    )
  }
}


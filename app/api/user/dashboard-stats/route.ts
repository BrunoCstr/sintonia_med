import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'

/**
 * Helper function para converter Timestamp do Firestore para Date
 */
function convertToDate(timestamp: any): Date {
  try {
    if (!timestamp) {
      return new Date()
    }
    
    // Se já é uma Date
    if (timestamp instanceof Date) {
      return timestamp
    }
    
    // Se tem método toDate (Firestore Timestamp)
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate()
    }
    
    // Se tem propriedade seconds (Timestamp em segundos)
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000)
    }
    
    // Se é string ISO ou número
    const date = new Date(timestamp)
    if (!isNaN(date.getTime())) {
      return date
    }
    
    return new Date()
  } catch (error) {
    console.error('Erro ao converter timestamp:', error)
    return new Date()
  }
}

/**
 * GET /api/user/dashboard-stats
 * Busca estatísticas reais do dashboard do usuário
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

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Buscar resultados de simulados (coleção permanente)
    const resultsSnapshot = await db
      .collection('results')
      .where('userId', '==', authUser.uid)
      .get()

    // Calcular estatísticas por período baseado nos resultados
    let todayCount = 0
    let weekCount = 0
    let monthCount = 0
    let totalCount = 0

    resultsSnapshot.forEach((doc) => {
      const data = doc.data()
      const createdAt = convertToDate(data.createdAt)
      
      // Contar questões respondidas neste resultado (acertos + erros)
      const questionsAnswered = (data.correctCount || 0) + (data.incorrectCount || 0)
      
      totalCount += questionsAnswered
      if (createdAt >= todayStart) todayCount += questionsAnswered
      if (createdAt >= weekStart) weekCount += questionsAnswered
      if (createdAt >= monthStart) monthCount += questionsAnswered
    })

    // Calcular desempenho geral
    let totalCorrect = 0
    let totalIncorrect = 0
    let totalQuestionsAnswered = 0

    resultsSnapshot.forEach((doc) => {
      const data = doc.data()
      totalCorrect += data.correctCount || 0
      totalIncorrect += data.incorrectCount || 0
      // Usar apenas questões respondidas (acertos + erros), não incluir não respondidas
      const questionsAnswered = (data.correctCount || 0) + (data.incorrectCount || 0)
      totalQuestionsAnswered += questionsAnswered
    })

    const accuracyRate = totalQuestionsAnswered > 0
      ? Math.round((totalCorrect / totalQuestionsAnswered) * 100)
      : 0

    // Calcular evolução semanal (últimos 7 dias)
    const weeklyData = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(now.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const nextDay = new Date(date)
      nextDay.setDate(date.getDate() + 1)

      // Buscar resultados desse dia
      let dayCorrect = 0
      let dayTotalAnswered = 0

      resultsSnapshot.forEach((doc) => {
        const data = doc.data()
        const createdAt = convertToDate(data.createdAt)
        if (createdAt >= date && createdAt < nextDay) {
          dayCorrect += data.correctCount || 0
          // Usar apenas questões respondidas (acertos + erros)
          const questionsAnswered = (data.correctCount || 0) + (data.incorrectCount || 0)
          dayTotalAnswered += questionsAnswered
        }
      })

      const dayAccuracy = dayTotalAnswered > 0 ? Math.round((dayCorrect / dayTotalAnswered) * 100) : 0
      
      const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
      weeklyData.push({
        name: dayNames[date.getDay()],
        acertos: dayAccuracy,
      })
    }

    // Calcular desempenho por área/matéria
    const areaStats: Record<string, { correct: number; total: number }> = {}
    
    resultsSnapshot.forEach((doc) => {
      const data = doc.data()
      const questions = data.questions || []
      const answers = data.answers || {}

      questions.forEach((q: any) => {
        // Contar apenas questões respondidas (que têm resposta)
        if (answers[q.id] === undefined) {
          return // Pular questões não respondidas
        }
        
        const area = q.area || q.subject || 'Outros'
        if (!areaStats[area]) {
          areaStats[area] = { correct: 0, total: 0 }
        }
        areaStats[area].total++
        if (answers[q.id] === q.correctAnswer) {
          areaStats[area].correct++
        }
      })
    })

    const subjectData = Object.entries(areaStats)
      .map(([subject, stats]) => ({
        subject,
        correct: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
        total: 100,
      }))
      .sort((a, b) => b.correct - a.correct)
      .slice(0, 5)

    // Calcular erros por assunto (top 5 com mais erros)
    const errorStats: Record<string, number> = {}
    
    resultsSnapshot.forEach((doc) => {
      const data = doc.data()
      const questions = data.questions || []
      const answers = data.answers || {}

      questions.forEach((q: any) => {
        const area = q.area || q.subject || 'Outros'
        if (answers[q.id] !== undefined && answers[q.id] !== q.correctAnswer) {
          errorStats[area] = (errorStats[area] || 0) + 1
        }
      })
    })

    const errorsBySubject = Object.entries(errorStats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map((item) => {
        const total = Object.values(errorStats).reduce((sum, v) => sum + v, 0)
        return {
          name: item.name,
          value: total > 0 ? Math.round((item.value / total) * 100) : 0,
        }
      })

    return NextResponse.json({
      success: true,
      stats: {
        today: todayCount,
        week: weekCount,
        month: monthCount,
        total: totalCount,
        accuracyRate,
        totalCorrect,
        totalIncorrect,
        totalQuestionsAnswered,
      },
      weeklyData,
      subjectData,
      errorsBySubject,
    })
  } catch (error: any) {
    console.error('Erro ao buscar estatísticas do dashboard:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar estatísticas' },
      { status: 500 }
    )
  }
}


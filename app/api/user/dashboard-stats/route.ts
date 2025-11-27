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
    
    // Calcular início do dia em Brasília (UTC-3)
    // Brasília está sempre UTC-3 (sem horário de verão desde 2019)
    // 00:00 BRT = 03:00 UTC do mesmo dia
    // Para obter a data atual em Brasília, subtraímos 3 horas do UTC
    const brasiliaTime = new Date(now.getTime() - (3 * 60 * 60 * 1000))
    
    // Início do dia atual em Brasília (00:00:00 BRT = 03:00:00 UTC)
    const todayStart = new Date(Date.UTC(
      brasiliaTime.getUTCFullYear(),
      brasiliaTime.getUTCMonth(),
      brasiliaTime.getUTCDate(),
      3, 0, 0, 0 // 03:00 UTC = 00:00 BRT
    ))
    
    // Fim do dia atual em Brasília (23:59:59.999 BRT = 02:59:59.999 UTC do dia seguinte)
    const todayEnd = new Date(Date.UTC(
      brasiliaTime.getUTCFullYear(),
      brasiliaTime.getUTCMonth(),
      brasiliaTime.getUTCDate() + 1,
      2, 59, 59, 999 // 02:59:59.999 UTC = 23:59:59.999 BRT
    ))
    
    // Início da semana em Brasília (domingo à meia-noite)
    const weekStartBrasilia = new Date(brasiliaTime)
    weekStartBrasilia.setUTCDate(brasiliaTime.getUTCDate() - brasiliaTime.getUTCDay())
    const weekStart = new Date(Date.UTC(
      weekStartBrasilia.getUTCFullYear(),
      weekStartBrasilia.getUTCMonth(),
      weekStartBrasilia.getUTCDate(),
      3, 0, 0, 0 // 03:00 UTC = 00:00 BRT
    ))
    
    // Início do mês em Brasília
    const monthStart = new Date(Date.UTC(
      brasiliaTime.getUTCFullYear(),
      brasiliaTime.getUTCMonth(),
      1,
      3, 0, 0, 0 // 03:00 UTC = 00:00 BRT
    ))
    
    console.log(`[Dashboard Stats] Períodos calculados:`)
    console.log(`  - Hoje (Brasília): ${todayStart.toISOString()} até ${todayEnd.toISOString()}`)
    console.log(`  - Semana (Brasília): ${weekStart.toISOString()}`)
    console.log(`  - Mês (Brasília): ${monthStart.toISOString()}`)

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

    console.log(`[Dashboard Stats] Calculando estatísticas para usuário ${authUser.uid}`)
    console.log(`[Dashboard Stats] Início do dia (Brasília): ${todayStart.toISOString()}`)
    console.log(`[Dashboard Stats] Total de resultados: ${resultsSnapshot.size}`)

    resultsSnapshot.forEach((doc) => {
      const data = doc.data()
      const createdAt = convertToDate(data.createdAt) // Timestamp em UTC
      
      // Contar questões respondidas neste resultado (acertos + erros)
      const questionsAnswered = (data.correctCount || 0) + (data.incorrectCount || 0)
      
      totalCount += questionsAnswered
      
      // Verificar se é de hoje comparando timestamp UTC com o período do dia em Brasília
      // createdAt está em UTC, comparar diretamente com todayStart (03:00 UTC) e todayEnd (02:59:59.999 UTC do dia seguinte)
      const isToday = createdAt >= todayStart && createdAt < todayEnd
      
      if (isToday) {
        todayCount += questionsAnswered
        // Converter para BRT para log
        const createdAtBrasilia = new Date(createdAt.getTime() - (3 * 60 * 60 * 1000))
        console.log(`[Dashboard Stats] Resultado ${doc.id}: ${questionsAnswered} questões de hoje`)
        console.log(`  - createdAt UTC: ${createdAt.toISOString()}`)
        console.log(`  - createdAt BRT: ${createdAtBrasilia.toISOString().replace('Z', '')} (${createdAtBrasilia.getUTCFullYear()}-${String(createdAtBrasilia.getUTCMonth() + 1).padStart(2, '0')}-${String(createdAtBrasilia.getUTCDate()).padStart(2, '0')})`)
      } else {
        // Log para debug de resultados que não são de hoje
        const createdAtBrasilia = new Date(createdAt.getTime() - (3 * 60 * 60 * 1000))
        const createdAtDateBrasilia = `${createdAtBrasilia.getUTCFullYear()}-${String(createdAtBrasilia.getUTCMonth() + 1).padStart(2, '0')}-${String(createdAtBrasilia.getUTCDate()).padStart(2, '0')}`
        const todayDateBrasilia = `${brasiliaTime.getUTCFullYear()}-${String(brasiliaTime.getUTCMonth() + 1).padStart(2, '0')}-${String(brasiliaTime.getUTCDate()).padStart(2, '0')}`
        if (createdAtDateBrasilia !== todayDateBrasilia) {
          console.log(`[Dashboard Stats] Resultado ${doc.id}: ${questionsAnswered} questões NÃO são de hoje`)
          console.log(`  - Data do resultado (BRT): ${createdAtDateBrasilia}`)
          console.log(`  - Data de hoje (BRT): ${todayDateBrasilia}`)
        }
      }
      
      // Para semana e mês, comparar diretamente com timestamps UTC (já convertidos para início do dia em Brasília)
      if (createdAt >= weekStart) weekCount += questionsAnswered
      if (createdAt >= monthStart) monthCount += questionsAnswered
    })
    
    console.log(`[Dashboard Stats] Estatísticas finais - Hoje: ${todayCount}, Semana: ${weekCount}, Mês: ${monthCount}, Total: ${totalCount}`)

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

    // Calcular evolução semanal (últimos 7 dias) em horário de Brasília
    const weeklyData = []
    for (let i = 6; i >= 0; i--) {
      // Calcular data do dia em Brasília
      const dayBrasilia = new Date(brasiliaTime)
      dayBrasilia.setUTCDate(brasiliaTime.getUTCDate() - i)
      
      // Início do dia em Brasília (00:00 BRT = 03:00 UTC)
      const date = new Date(Date.UTC(
        dayBrasilia.getUTCFullYear(),
        dayBrasilia.getUTCMonth(),
        dayBrasilia.getUTCDate(),
        3, 0, 0, 0
      ))
      
      // Próximo dia em Brasília
      const nextDay = new Date(Date.UTC(
        dayBrasilia.getUTCFullYear(),
        dayBrasilia.getUTCMonth(),
        dayBrasilia.getUTCDate() + 1,
        3, 0, 0, 0
      ))

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


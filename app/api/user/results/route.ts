import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'

/**
 * POST /api/user/results
 * Salva um resultado de quiz
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
    const { questions, answers, filters, timeSpent } = body

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'Dados inválidos: questions é obrigatório e deve ser um array não vazio' }, { status: 400 })
    }

    if (!answers || typeof answers !== 'object') {
      return NextResponse.json({ error: 'Dados inválidos: answers é obrigatório' }, { status: 400 })
    }

    const app = getAdminApp()
    const db = app.firestore()

    // Calcular estatísticas
    const correctCount = questions.filter(
      (q: any) => answers[q.id] !== undefined && answers[q.id] === q.correctAnswer
    ).length
    const incorrectCount = questions.filter(
      (q: any) => answers[q.id] !== undefined && answers[q.id] !== q.correctAnswer
    ).length
    const unansweredCount = questions.filter(
      (q: any) => answers[q.id] === undefined
    ).length
    const percentage = questions.length > 0 
      ? Math.round((correctCount / questions.length) * 100)
      : 0

    // Extrair áreas/matérias únicas
    const subjects = Array.from(new Set(questions.map((q: any) => q.subject || q.area).filter(Boolean)))
    
    console.log('Salvando resultado:', {
      userId: authUser.uid,
      questionsCount: questions.length,
      correctCount,
      incorrectCount,
      percentage,
      subjects,
    })

    // Criar documento de resultado
    const now = new Date()
    const resultData = {
      userId: authUser.uid,
      questions,
      answers,
      filters: filters || {},
      timeSpent: timeSpent || null,
      questionsCount: questions.length,
      correctCount,
      incorrectCount,
      unansweredCount,
      percentage,
      subjects,
      createdAt: now,
      updatedAt: now,
    }

    const docRef = await db.collection('results').add(resultData)
    
    console.log('Resultado salvo com sucesso:', docRef.id)

    return NextResponse.json({ 
      success: true, 
      id: docRef.id,
      result: {
        id: docRef.id,
        ...resultData,
        createdAt: resultData.createdAt.toISOString(),
        updatedAt: resultData.updatedAt.toISOString(),
      }
    })
  } catch (error: any) {
    console.error('Erro ao salvar resultado:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao salvar resultado' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/user/results
 * Busca histórico de resultados do usuário
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

    // Buscar resultados do usuário ordenados por data (mais recente primeiro)
    const resultsSnapshot = await db
      .collection('results')
      .where('userId', '==', authUser.uid)
      .orderBy('createdAt', 'desc')
      .get()

    const results = resultsSnapshot.docs.map((doc) => {
      const data = doc.data()
      
      // Converter Timestamp do Firestore para Date
      let createdAt: Date
      let updatedAt: Date
      
      if (data.createdAt?.toDate) {
        // Firestore Timestamp
        createdAt = data.createdAt.toDate()
      } else if (data.createdAt?.seconds) {
        // Timestamp em segundos
        createdAt = new Date(data.createdAt.seconds * 1000)
      } else if (data.createdAt) {
        // String ISO ou Date
        createdAt = new Date(data.createdAt)
      } else {
        createdAt = new Date()
      }
      
      if (data.updatedAt?.toDate) {
        updatedAt = data.updatedAt.toDate()
      } else if (data.updatedAt?.seconds) {
        updatedAt = new Date(data.updatedAt.seconds * 1000)
      } else if (data.updatedAt) {
        updatedAt = new Date(data.updatedAt)
      } else {
        updatedAt = new Date()
      }
      
      return {
        id: doc.id,
        questionsCount: data.questionsCount || 0,
        correctCount: data.correctCount || 0,
        incorrectCount: data.incorrectCount || 0,
        percentage: data.percentage || 0,
        subjects: data.subjects || [],
        timeSpent: data.timeSpent || null,
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
      }
    })

    // Calcular estatísticas gerais
    const totalQuizzes = results.length
    // Somar apenas questões respondidas (não incluir não respondidas)
    const totalQuestions = results.reduce((sum, r) => sum + (r.correctCount + r.incorrectCount), 0)
    const averagePercentage = totalQuizzes > 0
      ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / totalQuizzes)
      : 0

    return NextResponse.json({
      results,
      stats: {
        totalQuizzes,
        totalQuestions,
        averagePercentage,
      },
    })
  } catch (error: any) {
    console.error('Erro ao buscar resultados:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar resultados' },
      { status: 500 }
    )
  }
}


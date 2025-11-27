import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp, isUserPremium } from '@/lib/firebase-admin'
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

    // Verificar se o usuário é premium
    const userIsPremium = await isUserPremium(authUser.uid)

    // Função helper para remover campos undefined de um objeto
    const removeUndefinedFields = (obj: any): any => {
      if (obj === null || typeof obj !== 'object') {
        return obj
      }
      // Preservar objetos Date
      if (obj instanceof Date) {
        return obj
      }
      if (Array.isArray(obj)) {
        return obj.map(removeUndefinedFields)
      }
      const cleaned: any = {}
      for (const key in obj) {
        if (obj[key] !== undefined) {
          // Preservar objetos Date
          if (obj[key] instanceof Date) {
            cleaned[key] = obj[key]
          } else if (typeof obj[key] === 'object') {
            cleaned[key] = removeUndefinedFields(obj[key])
          } else {
            cleaned[key] = obj[key]
          }
        }
      }
      return cleaned
    }

    // Processar questões - truncar comentarioGabarito se não for premium
    const processedQuestions = questions.map((q: any) => {
      const processed: any = { ...q }
      
      if (!userIsPremium) {
        // Se não for premium, truncar comentarioGabarito e explanation
        if (q.comentarioGabarito) {
          processed.comentarioGabarito = q.comentarioGabarito.substring(0, 100) + '...'
        }
        if (q.explanation) {
          processed.explanation = q.explanation.substring(0, 100) + '...'
        }
        // Remover campos undefined
        return removeUndefinedFields(processed)
      }
      
      // Remover campos undefined mesmo para premium
      return removeUndefinedFields(processed)
    })

    // Calcular estatísticas
    const correctCount = processedQuestions.filter(
      (q: any) => answers[q.id] !== undefined && answers[q.id] === q.correctAnswer
    ).length
    const incorrectCount = processedQuestions.filter(
      (q: any) => answers[q.id] !== undefined && answers[q.id] !== q.correctAnswer
    ).length
    const unansweredCount = processedQuestions.filter(
      (q: any) => answers[q.id] === undefined
    ).length
    const percentage = processedQuestions.length > 0 
      ? Math.round((correctCount / processedQuestions.length) * 100)
      : 0

    // Extrair áreas/matérias únicas
    const subjects = Array.from(new Set(processedQuestions.map((q: any) => q.subject || q.area).filter(Boolean)))
    
    console.log('Salvando resultado:', {
      userId: authUser.uid,
      questionsCount: processedQuestions.length,
      correctCount,
      incorrectCount,
      percentage,
      subjects,
      isPremium: userIsPremium,
    })

    // Validar e normalizar timeSpent
    let normalizedTimeSpent: number | null = null
    if (timeSpent !== null && timeSpent !== undefined) {
      const timeSpentNum = typeof timeSpent === 'number' ? timeSpent : parseFloat(String(timeSpent))
      if (!isNaN(timeSpentNum) && isFinite(timeSpentNum) && timeSpentNum >= 0) {
        normalizedTimeSpent = Math.round(timeSpentNum)
      }
    }

    // Criar documento de resultado
    // Usar Date simples como no history, para salvar como timestamp simples
    // O Firestore converterá automaticamente para timestamp no formato correto
    const now = new Date()
    
    const resultData = removeUndefinedFields({
      userId: authUser.uid,
      questions: processedQuestions,
      answers,
      filters: filters || {},
      timeSpent: normalizedTimeSpent,
      questionsCount: questions.length,
      correctCount,
      incorrectCount,
      unansweredCount,
      percentage,
      subjects,
      createdAt: now,
      updatedAt: now,
    })

    const docRef = await db.collection('results').add(resultData)
    
    console.log('Resultado salvo com sucesso:', docRef.id)

    // Garantir que createdAt e updatedAt sejam objetos Date válidos
    let createdAtDate: Date
    let updatedAtDate: Date
    
    try {
      if (resultData.createdAt instanceof Date) {
        createdAtDate = resultData.createdAt
      } else if (resultData.createdAt?.toDate && typeof resultData.createdAt.toDate === 'function') {
        createdAtDate = resultData.createdAt.toDate()
      } else if (resultData.createdAt?.seconds) {
        createdAtDate = new Date(resultData.createdAt.seconds * 1000)
      } else {
        createdAtDate = new Date(resultData.createdAt || now)
      }
      
      // Validar se a data é válida
      if (isNaN(createdAtDate.getTime())) {
        createdAtDate = now
      }
    } catch (error) {
      console.error('Erro ao converter createdAt:', error)
      createdAtDate = now
    }
    
    try {
      if (resultData.updatedAt instanceof Date) {
        updatedAtDate = resultData.updatedAt
      } else if (resultData.updatedAt?.toDate && typeof resultData.updatedAt.toDate === 'function') {
        updatedAtDate = resultData.updatedAt.toDate()
      } else if (resultData.updatedAt?.seconds) {
        updatedAtDate = new Date(resultData.updatedAt.seconds * 1000)
      } else {
        updatedAtDate = new Date(resultData.updatedAt || now)
      }
      
      // Validar se a data é válida
      if (isNaN(updatedAtDate.getTime())) {
        updatedAtDate = now
      }
    } catch (error) {
      console.error('Erro ao converter updatedAt:', error)
      updatedAtDate = now
    }

    return NextResponse.json({ 
      success: true, 
      id: docRef.id,
      result: {
        id: docRef.id,
        ...resultData,
        createdAt: createdAtDate.toISOString(),
        updatedAt: updatedAtDate.toISOString(),
      }
    })
  } catch (error: any) {
    console.error('Erro ao salvar resultado:', error)
    console.error('Stack trace:', error.stack)
    
    // Fornecer mais detalhes do erro em desenvolvimento
    const errorMessage = error.message || 'Erro ao salvar resultado'
    const errorDetails = process.env.NODE_ENV === 'development' 
      ? { 
          message: errorMessage,
          stack: error.stack,
          name: error.name
        }
      : { message: errorMessage }
    
    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
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
      
      try {
        // Verificar se createdAt existe e não é um objeto vazio
        if (!data.createdAt || (typeof data.createdAt === 'object' && Object.keys(data.createdAt).length === 0)) {
          createdAt = new Date()
        } else if (data.createdAt?.toDate && typeof data.createdAt.toDate === 'function') {
          // Firestore Timestamp
          createdAt = data.createdAt.toDate()
        } else if (data.createdAt?.seconds) {
          // Timestamp em segundos
          createdAt = new Date(data.createdAt.seconds * 1000)
        } else if (data.createdAt instanceof Date) {
          createdAt = data.createdAt
        } else if (typeof data.createdAt === 'string' || typeof data.createdAt === 'number') {
          // String ISO ou número
          createdAt = new Date(data.createdAt)
        } else {
          createdAt = new Date()
        }
        
        // Validar se a data é válida
        if (isNaN(createdAt.getTime())) {
          createdAt = new Date()
        }
      } catch (error) {
        createdAt = new Date()
      }
      
      try {
        // Verificar se updatedAt existe e não é um objeto vazio
        if (!data.updatedAt || (typeof data.updatedAt === 'object' && Object.keys(data.updatedAt).length === 0)) {
          updatedAt = new Date()
        } else if (data.updatedAt?.toDate && typeof data.updatedAt.toDate === 'function') {
          updatedAt = data.updatedAt.toDate()
        } else if (data.updatedAt?.seconds) {
          updatedAt = new Date(data.updatedAt.seconds * 1000)
        } else if (data.updatedAt instanceof Date) {
          updatedAt = data.updatedAt
        } else if (typeof data.updatedAt === 'string' || typeof data.updatedAt === 'number') {
          updatedAt = new Date(data.updatedAt)
        } else {
          updatedAt = new Date()
        }
        
        // Validar se a data é válida
        if (isNaN(updatedAt.getTime())) {
          updatedAt = new Date()
        }
      } catch (error) {
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
    const totalQuestionsAnswered = results.reduce((sum, r) => sum + (r.correctCount + r.incorrectCount), 0)
    const totalCorrect = results.reduce((sum, r) => sum + r.correctCount, 0)
    
    // Calcular média de acertos baseada em questões respondidas (não na média de percentages)
    const averagePercentage = totalQuestionsAnswered > 0
      ? Math.round((totalCorrect / totalQuestionsAnswered) * 100)
      : 0

    return NextResponse.json({
      results,
      stats: {
        totalQuizzes,
        totalQuestions: totalQuestionsAnswered,
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


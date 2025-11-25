import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'
import type { Question } from '@/lib/types'

/**
 * GET /api/questions
 * Busca questões com filtros (usuários autenticados)
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

    // Obter parâmetros de filtro da query string
    const searchParams = request.nextUrl.searchParams
    const areas = searchParams.get('areas')?.split(',').filter(Boolean) || []
    const subareas = searchParams.get('subareas')?.split(',').filter(Boolean) || []
    const dificuldade = searchParams.get('dificuldade') || ''
    const tipo = searchParams.get('tipo') || ''
    const officialOnly = searchParams.get('officialOnly') === 'true'
    const excludeAnswered = searchParams.get('excludeAnswered') !== 'false' // Por padrão exclui questões já respondidas
    const limit = parseInt(searchParams.get('limit') || '100')

    // Buscar questões já respondidas pelo usuário (se não for para excluir, não precisa buscar)
    let answeredQuestionIds = new Set<string>()
    if (excludeAnswered) {
      const historySnapshot = await db
        .collection('history')
        .where('userId', '==', authUser.uid)
        .get()
      
      historySnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.questionId) {
          answeredQuestionIds.add(data.questionId)
        }
      })
    }

    // Construir query base - apenas questões ativas
    let query: FirebaseFirestore.Query = db.collection('questions').where('ativo', '==', true)

    // Aplicar filtros
    if (dificuldade && ['facil', 'medio', 'dificil'].includes(dificuldade)) {
      query = query.where('dificuldade', '==', dificuldade)
    }

    if (tipo) {
      query = query.where('tipo', '==', tipo)
    }

    // Buscar questões
    const questionsSnapshot = await query.get()
    
    let questions = questionsSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Question
    })

    // Filtrar por áreas e subáreas no código (já que Firestore não suporta múltiplos valores em array-contains-any facilmente)
    if (areas.length > 0) {
      questions = questions.filter((q) => areas.includes(q.area))
    }

    if (subareas.length > 0) {
      questions = questions.filter((q) => subareas.includes(q.subarea))
    }

    // Filtrar questões oficiais (campo oficial === true)
    if (officialOnly) {
      questions = questions.filter((q) => q.oficial === true)
    }

    // Filtrar questões já respondidas pelo usuário
    if (excludeAnswered && answeredQuestionIds.size > 0) {
      questions = questions.filter((q) => !answeredQuestionIds.has(q.id))
    }

    // Embaralhar e limitar
    const shuffled = questions.sort(() => Math.random() - 0.5)
    const limited = shuffled.slice(0, limit)

    return NextResponse.json({ questions: limited, total: questions.length })
  } catch (error: any) {
    console.error('Erro ao buscar questões:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar questões' },
      { status: 500 }
    )
  }
}


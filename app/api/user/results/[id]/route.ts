import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp, isUserPremium } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'

/**
 * GET /api/user/results/[id]
 * Busca detalhes de um resultado específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
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

    // Buscar resultado específico
    const docRef = db.collection('results').doc(id)
    const doc = await docRef.get()

    if (!doc.exists) {
      return NextResponse.json({ error: 'Resultado não encontrado' }, { status: 404 })
    }

    const data = doc.data()!

    // Verificar se o resultado pertence ao usuário
    if (data.userId !== authUser.uid) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Verificar se o usuário é premium
    const userIsPremium = await isUserPremium(authUser.uid)

    // Converter Timestamp do Firestore para Date
    let createdAt: Date
    let updatedAt: Date
    
    try {
      if (data.createdAt?.toDate) {
        createdAt = data.createdAt.toDate()
      } else if (data.createdAt?.seconds) {
        createdAt = new Date(data.createdAt.seconds * 1000)
      } else if (data.createdAt) {
        createdAt = new Date(data.createdAt)
      } else {
        createdAt = new Date()
      }
      
      // Validar se a data é válida
      if (isNaN(createdAt.getTime())) {
        console.warn('Data createdAt inválida para resultado', id, data.createdAt)
        createdAt = new Date()
      }
    } catch (error) {
      console.error('Erro ao converter createdAt:', error, data.createdAt)
      createdAt = new Date()
    }
    
    try {
      if (data.updatedAt?.toDate) {
        updatedAt = data.updatedAt.toDate()
      } else if (data.updatedAt?.seconds) {
        updatedAt = new Date(data.updatedAt.seconds * 1000)
      } else if (data.updatedAt) {
        updatedAt = new Date(data.updatedAt)
      } else {
        updatedAt = new Date()
      }
      
      // Validar se a data é válida
      if (isNaN(updatedAt.getTime())) {
        console.warn('Data updatedAt inválida para resultado', id, data.updatedAt)
        updatedAt = new Date()
      }
    } catch (error) {
      console.error('Erro ao converter updatedAt:', error, data.updatedAt)
      updatedAt = new Date()
    }

    // Função helper para remover campos undefined de um objeto
    const removeUndefinedFields = (obj: any): any => {
      if (obj === null || typeof obj !== 'object') {
        return obj
      }
      if (Array.isArray(obj)) {
        return obj.map(removeUndefinedFields)
      }
      const cleaned: any = {}
      for (const key in obj) {
        if (obj[key] !== undefined) {
          cleaned[key] = typeof obj[key] === 'object' ? removeUndefinedFields(obj[key]) : obj[key]
        }
      }
      return cleaned
    }

    // Processar questões - truncar comentarioGabarito se não for premium
    const questions = (data.questions || []).map((q: any) => {
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

    const result = {
      id: doc.id,
      questions,
      answers: data.answers || {},
      filters: data.filters || {},
      timeSpent: data.timeSpent || null,
      questionsCount: data.questionsCount || 0,
      correctCount: data.correctCount || 0,
      incorrectCount: data.incorrectCount || 0,
      unansweredCount: data.unansweredCount || 0,
      percentage: data.percentage || 0,
      subjects: data.subjects || [],
      isFreeQuestion: data.isFreeQuestion || false,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    }

    return NextResponse.json({ result })
  } catch (error: any) {
    console.error('Erro ao buscar resultado:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar resultado' },
      { status: 500 }
    )
  }
}


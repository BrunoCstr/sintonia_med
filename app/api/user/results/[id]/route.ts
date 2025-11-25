import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
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

    // Converter Timestamp do Firestore para Date
    let createdAt: Date
    let updatedAt: Date
    
    if (data.createdAt?.toDate) {
      createdAt = data.createdAt.toDate()
    } else if (data.createdAt?.seconds) {
      createdAt = new Date(data.createdAt.seconds * 1000)
    } else if (data.createdAt) {
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

    const result = {
      id: doc.id,
      questions: data.questions || [],
      answers: data.answers || {},
      filters: data.filters || {},
      timeSpent: data.timeSpent || null,
      questionsCount: data.questionsCount || 0,
      correctCount: data.correctCount || 0,
      incorrectCount: data.incorrectCount || 0,
      unansweredCount: data.unansweredCount || 0,
      percentage: data.percentage || 0,
      subjects: data.subjects || [],
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


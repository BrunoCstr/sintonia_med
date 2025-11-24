import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'
import type { Question } from '@/lib/types'

/**
 * GET /api/admin/questions
 * Lista todas as questões (apenas admins)
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('firebase-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const authUser = await verifyFirebaseToken(token)
    if (!authUser || (authUser.role !== 'admin_master' && authUser.role !== 'admin_questoes')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const app = getAdminApp()
    const db = app.firestore()

    // Buscar questões
    const questionsSnapshot = await db.collection('questions').orderBy('createdAt', 'desc').get()
    
    const questions = questionsSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Question
    })

    return NextResponse.json({ questions })
  } catch (error: any) {
    console.error('Erro ao buscar questões:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar questões' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/questions
 * Cria uma nova questão (apenas admins)
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('firebase-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const authUser = await verifyFirebaseToken(token)
    if (!authUser || (authUser.role !== 'admin_master' && authUser.role !== 'admin_questoes')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const {
      enunciado,
      imagemUrl,
      alternativaA,
      alternativaB,
      alternativaC,
      alternativaD,
      alternativaE,
      alternativaCorreta,
      comentarioGabarito,
      area,
      subarea,
      dificuldade,
      tipo,
      ativo = true,
    } = body

    // Validação completa
    if (!enunciado || typeof enunciado !== 'string' || !enunciado.trim()) {
      return NextResponse.json(
        { error: 'O enunciado é obrigatório' },
        { status: 400 }
      )
    }

    const alternativas = [alternativaA, alternativaB, alternativaC, alternativaD, alternativaE]
    for (let i = 0; i < alternativas.length; i++) {
      if (!alternativas[i] || typeof alternativas[i] !== 'string' || !alternativas[i].trim()) {
        return NextResponse.json(
          { error: `A alternativa ${String.fromCharCode(65 + i)} é obrigatória` },
          { status: 400 }
        )
      }
    }

    if (!alternativaCorreta || !['A', 'B', 'C', 'D', 'E'].includes(alternativaCorreta)) {
      return NextResponse.json(
        { error: 'Selecione a alternativa correta' },
        { status: 400 }
      )
    }

    if (!comentarioGabarito || typeof comentarioGabarito !== 'string' || !comentarioGabarito.trim()) {
      return NextResponse.json(
        { error: 'O comentário do gabarito é obrigatório' },
        { status: 400 }
      )
    }

    if (!area || typeof area !== 'string' || !area.trim()) {
      return NextResponse.json(
        { error: 'A área é obrigatória' },
        { status: 400 }
      )
    }

    if (!subarea || typeof subarea !== 'string' || !subarea.trim()) {
      return NextResponse.json(
        { error: 'A subárea é obrigatória' },
        { status: 400 }
      )
    }

    if (!dificuldade || !['facil', 'medio', 'dificil'].includes(dificuldade)) {
      return NextResponse.json(
        { error: 'A dificuldade é obrigatória' },
        { status: 400 }
      )
    }

    if (!tipo || typeof tipo !== 'string' || !tipo.trim()) {
      return NextResponse.json(
        { error: 'O tipo de prova é obrigatório' },
        { status: 400 }
      )
    }

    const app = getAdminApp()
    const db = app.firestore()

    // Criar questão
    const questionData = {
      enunciado,
      imagemUrl: imagemUrl || null,
      alternativaA,
      alternativaB,
      alternativaC,
      alternativaD,
      alternativaE,
      alternativaCorreta,
      comentarioGabarito,
      area,
      subarea,
      dificuldade,
      tipo,
      ativo,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const docRef = await db.collection('questions').add(questionData)

    return NextResponse.json({
      success: true,
      id: docRef.id,
      question: { id: docRef.id, ...questionData },
    })
  } catch (error: any) {
    console.error('Erro ao criar questão:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar questão' },
      { status: 500 }
    )
  }
}


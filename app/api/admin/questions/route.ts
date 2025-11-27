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
    
    // Mapear questões e buscar informações do criador se não estiverem no documento
    const questionsPromises = questionsSnapshot.docs.map(async (doc) => {
      const data = doc.data()
      let question: Question = {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Question

      // Se a questão tem createdBy mas não tem createdByName, buscar
      if (data.createdBy && !data.createdByName) {
        try {
          const creatorDoc = await db.collection('users').doc(data.createdBy).get()
          if (creatorDoc.exists) {
            const creatorData = creatorDoc.data()
            question.createdByName = creatorData?.name || ''
            question.createdByPhotoURL = creatorData?.photoURL || ''
          }
        } catch (error) {
          console.error(`Erro ao buscar criador da questão ${doc.id}:`, error)
        }
      }

      return question
    })

    const questions = await Promise.all(questionsPromises)

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
      disciplina,
      dificuldade,
      period,
      oficial = false,
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

    if (!period || typeof period !== 'string' || !period.trim()) {
      return NextResponse.json(
        { error: 'O período é obrigatório' },
        { status: 400 }
      )
    }

    if (!disciplina || typeof disciplina !== 'string' || !['SOI', 'HAM', 'IESC', 'CI'].includes(disciplina)) {
      return NextResponse.json(
        { error: 'A disciplina é obrigatória' },
        { status: 400 }
      )
    }

    const app = getAdminApp()
    const db = app.firestore()

    // Buscar informações do usuário criador
    let createdByName = ''
    let createdByPhotoURL = ''
    try {
      const userDoc = await db.collection('users').doc(authUser.uid).get()
      if (userDoc.exists) {
        const userData = userDoc.data()
        createdByName = userData?.name || ''
        createdByPhotoURL = userData?.photoURL || ''
      }
    } catch (error) {
      console.error('Erro ao buscar dados do usuário criador:', error)
    }

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
      disciplina,
      dificuldade,
      period,
      createdBy: authUser.uid,
      createdByName,
      createdByPhotoURL,
      oficial: oficial === true || oficial === 'true',
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


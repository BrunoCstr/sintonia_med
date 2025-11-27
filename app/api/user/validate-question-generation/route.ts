import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp, isUserPremium } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'
import * as admin from 'firebase-admin'

/**
 * POST /api/user/validate-question-generation
 * Valida se o usuário pode gerar a quantidade de questões solicitada
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
    const { questionCount } = body

    if (!questionCount || typeof questionCount !== 'number') {
      return NextResponse.json({ error: 'questionCount é obrigatório' }, { status: 400 })
    }

    const app = getAdminApp()
    const db = app.firestore()

    // Verificar se o usuário é premium
    const userIsPremium = await isUserPremium(authUser.uid)

    // Se for premium, sempre permitir
    if (userIsPremium) {
      return NextResponse.json({
        allowed: true,
        reason: null,
      })
    }

    // Para usuários Free, verificar limite
    // Usar horário de Brasília (UTC-3) para reset à meia-noite local (00:00 BRT)
    // Brasília está sempre UTC-3 (sem horário de verão desde 2019)
    const now = new Date()
    
    // Calcular data atual em Brasília
    // UTC-3 significa que quando são 00:00 em Brasília, são 03:00 UTC
    // Então, para obter a data em Brasília, subtraímos 3 horas do UTC
    const brasiliaTime = new Date(now.getTime() - (3 * 60 * 60 * 1000))
    
    // Início do dia em Brasília (00:00:00.000 BRT = 03:00:00.000 UTC)
    const startOfDay = new Date(Date.UTC(
      brasiliaTime.getUTCFullYear(),
      brasiliaTime.getUTCMonth(),
      brasiliaTime.getUTCDate(),
      3, 0, 0, 0 // 03:00 UTC = 00:00 BRT
    ))
    
    // Fim do dia em Brasília (23:59:59.999 BRT = 02:59:59.999 UTC do dia seguinte)
    const endOfDay = new Date(Date.UTC(
      brasiliaTime.getUTCFullYear(),
      brasiliaTime.getUTCMonth(),
      brasiliaTime.getUTCDate() + 1,
      2, 59, 59, 999 // 02:59:59.999 UTC = 23:59:59.999 BRT
    ))

    // Converter para Firestore Timestamp
    const startTimestamp = admin.firestore.Timestamp.fromDate(startOfDay)
    const endTimestamp = admin.firestore.Timestamp.fromDate(endOfDay)

    // Buscar resultados do usuário criados hoje
    const todayResults = await db
      .collection('results')
      .where('userId', '==', authUser.uid)
      .where('createdAt', '>=', startTimestamp)
      .where('createdAt', '<', endTimestamp)
      .get()

    // Somar todas as questões geradas hoje
    let questionsGeneratedToday = 0
    todayResults.forEach((doc) => {
      const data = doc.data()
      const count = data.questionsCount || 0
      questionsGeneratedToday += typeof count === 'number' ? count : parseInt(count) || 0
    })

    const maxQuestionsPerDay = 5
    const remainingQuestions = Math.max(0, maxQuestionsPerDay - questionsGeneratedToday)
    const canGenerate = remainingQuestions >= questionCount && questionCount <= 5

    if (!canGenerate) {
      if (questionCount > 5) {
        return NextResponse.json({
          allowed: false,
          reason: 'Usuários do plano Free podem gerar no máximo 5 questões por simulado.',
        }, { status: 403 })
      }
      
      if (remainingQuestions === 0) {
        return NextResponse.json({
          allowed: false,
          reason: `Você já gerou ${questionsGeneratedToday} de ${maxQuestionsPerDay} questões hoje. Limite diário atingido.`,
        }, { status: 403 })
      }
      
      return NextResponse.json({
        allowed: false,
        reason: `Você já gerou ${questionsGeneratedToday} de ${maxQuestionsPerDay} questões hoje. Você pode gerar apenas mais ${remainingQuestions} questão${remainingQuestions > 1 ? 'ões' : ''} hoje.`,
      }, { status: 403 })
    }

    return NextResponse.json({
      allowed: true,
      remainingQuestions: remainingQuestions - questionCount,
      reason: null,
    })
  } catch (error: any) {
    console.error('Erro ao validar geração de questões:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao validar geração de questões' },
      { status: 500 }
    )
  }
}


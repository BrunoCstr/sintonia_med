import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp, isUserPremium } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'
import * as admin from 'firebase-admin'

/**
 * GET /api/user/check-free-limits
 * Verifica as limitações do plano Free para o usuário
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

    // Verificar se o usuário é premium
    const userIsPremium = await isUserPremium(authUser.uid)

    // Se for premium, não há limitações
    if (userIsPremium) {
      return NextResponse.json({
        isPremium: true,
        canGenerate: true,
        maxQuestions: null,
        reason: null,
      })
    }

    // Para usuários Free, contar questões geradas hoje (não simulados)
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(startOfDay)
    endOfDay.setDate(endOfDay.getDate() + 1)

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
    
    console.log(`[Free Limits] User ${authUser.uid}: ${questionsGeneratedToday} questões geradas hoje de ${todayResults.size} resultado(s)`)

    const maxQuestionsPerDay = 5
    const remainingQuestions = Math.max(0, maxQuestionsPerDay - questionsGeneratedToday)
    const canGenerateMore = remainingQuestions > 0

    // Calcular quando o limite será resetado (próxima meia-noite)
    const resetTime = endOfDay.getTime()
    const timeUntilReset = resetTime - now.getTime()

    return NextResponse.json({
      isPremium: false,
      canGenerate: canGenerateMore,
      maxQuestionsPerDay: maxQuestionsPerDay,
      questionsGeneratedToday: questionsGeneratedToday,
      remainingQuestions: remainingQuestions,
      reason: !canGenerateMore
        ? `Você já gerou ${questionsGeneratedToday} questões hoje. Usuários do plano Free podem gerar apenas ${maxQuestionsPerDay} questões por dia.`
        : null,
      resetTime: resetTime,
      timeUntilReset: timeUntilReset,
    })
  } catch (error: any) {
    console.error('Erro ao verificar limitações:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao verificar limitações' },
      { status: 500 }
    )
  }
}


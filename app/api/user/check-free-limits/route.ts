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
    console.log('[Free Limits] Iniciando verificação de limites...')
    
    // Verificar autenticação
    const token = request.cookies.get('firebase-token')?.value
    if (!token) {
      console.log('[Free Limits] Token não encontrado')
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    let authUser
    try {
      authUser = await verifyFirebaseToken(token)
      if (!authUser) {
        console.log('[Free Limits] Token inválido ou expirado')
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
      }
      console.log(`[Free Limits] Usuário autenticado: ${authUser.uid}`)
    } catch (authError: any) {
      console.error('[Free Limits] Erro ao verificar token:', authError)
      return NextResponse.json({ error: 'Erro ao verificar autenticação' }, { status: 401 })
    }

    let app, db
    try {
      app = getAdminApp()
      db = app.firestore()
      console.log('[Free Limits] Firebase Admin inicializado')
    } catch (firebaseError: any) {
      console.error('[Free Limits] Erro ao inicializar Firebase Admin:', firebaseError)
      return NextResponse.json(
        { error: 'Erro ao conectar com o banco de dados' },
        { status: 500 }
      )
    }

    // Verificar se o usuário é premium
    let userIsPremium = false
    try {
      userIsPremium = await isUserPremium(authUser.uid)
      console.log(`[Free Limits] Usuário ${authUser.uid} é premium: ${userIsPremium}`)
    } catch (premiumError: any) {
      console.error('[Free Limits] Erro ao verificar status premium:', premiumError)
      // Se houver erro, considerar como não premium e continuar
      userIsPremium = false
    }

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
    // Usar UTC para evitar problemas de timezone
    const now = new Date()
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0))
    const endOfDay = new Date(startOfDay)
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1)

    // Converter para Firestore Timestamp
    let startTimestamp, endTimestamp
    try {
      startTimestamp = admin.firestore.Timestamp.fromDate(startOfDay)
      endTimestamp = admin.firestore.Timestamp.fromDate(endOfDay)
      console.log(`[Free Limits] Período: ${startOfDay.toISOString()} até ${endOfDay.toISOString()}`)
    } catch (timestampError: any) {
      console.error('[Free Limits] Erro ao criar timestamps:', timestampError)
      // Em caso de erro, usar valores padrão
      startTimestamp = admin.firestore.Timestamp.fromDate(new Date(startOfDay))
      endTimestamp = admin.firestore.Timestamp.fromDate(new Date(endOfDay))
    }

    // Buscar resultados do usuário criados hoje
    let todayResults
    let questionsGeneratedToday = 0
    try {
      // Primeiro, buscar todos os resultados do usuário para debug
      const allUserResults = await db
        .collection('results')
        .where('userId', '==', authUser.uid)
        .get()
      
      console.log(`[Free Limits] Total de resultados do usuário ${authUser.uid}: ${allUserResults.size}`)
      
      // Log dos resultados para debug
      if (allUserResults.size > 0) {
        allUserResults.forEach((doc) => {
          const data = doc.data()
          const createdAt = data.createdAt
          let createdAtDate: Date | null = null
          
          try {
            if (createdAt?.toDate && typeof createdAt.toDate === 'function') {
              createdAtDate = createdAt.toDate()
            } else if (createdAt?.seconds) {
              createdAtDate = new Date(createdAt.seconds * 1000)
            } else if (createdAt instanceof Date) {
              createdAtDate = createdAt
            }
            
            if (createdAtDate) {
              const isToday = createdAtDate >= startOfDay && createdAtDate < endOfDay
              console.log(`[Free Limits] Resultado ${doc.id}: createdAt=${createdAtDate.toISOString()}, questionsCount=${data.questionsCount || 0}, isToday=${isToday}`)
            }
          } catch (dateError) {
            console.error(`[Free Limits] Erro ao processar data do resultado ${doc.id}:`, dateError)
          }
        })
      }
      
      // Tentar buscar com query filtrada
      todayResults = await db
        .collection('results')
        .where('userId', '==', authUser.uid)
        .where('createdAt', '>=', startTimestamp)
        .where('createdAt', '<', endTimestamp)
        .get()

      console.log(`[Free Limits] Resultados encontrados pela query filtrada: ${todayResults.size}`)

      // Se a query filtrada não retornar resultados mas sabemos que existem, filtrar manualmente
      if (todayResults.size === 0 && allUserResults.size > 0) {
        console.log('[Free Limits] Query filtrada não retornou resultados, filtrando manualmente...')
        
        allUserResults.forEach((doc) => {
          try {
            const data = doc.data()
            const createdAt = data.createdAt
            let createdAtDate: Date | null = null
            
            // Converter timestamp para Date
            if (createdAt?.toDate && typeof createdAt.toDate === 'function') {
              createdAtDate = createdAt.toDate()
            } else if (createdAt?.seconds) {
              createdAtDate = new Date(createdAt.seconds * 1000)
            } else if (createdAt instanceof Date) {
              createdAtDate = createdAt
            }
            
            // Verificar se é de hoje (comparando com startOfDay e endOfDay)
            if (createdAtDate && createdAtDate >= startOfDay && createdAtDate < endOfDay) {
              const count = data.questionsCount || 0
              const questionCount = typeof count === 'number' ? count : parseInt(String(count)) || 0
              questionsGeneratedToday += questionCount
              console.log(`[Free Limits] Resultado ${doc.id} adicionado manualmente: ${questionCount} questões`)
            }
          } catch (docError) {
            console.error(`[Free Limits] Erro ao processar documento ${doc.id}:`, docError)
          }
        })
      } else {
        // Somar todas as questões geradas hoje da query
        todayResults.forEach((doc) => {
          try {
            const data = doc.data()
            const count = data.questionsCount || 0
            const questionCount = typeof count === 'number' ? count : parseInt(String(count)) || 0
            questionsGeneratedToday += questionCount
          } catch (docError) {
            console.error(`[Free Limits] Erro ao processar documento ${doc.id}:`, docError)
          }
        })
      }
      
      console.log(`[Free Limits] User ${authUser.uid}: ${questionsGeneratedToday} questões geradas hoje de ${todayResults.size} resultado(s)`)
    } catch (queryError: any) {
      console.error('[Free Limits] Erro ao buscar resultados:', queryError)
      console.error('[Free Limits] Detalhes do erro:', {
        code: queryError.code,
        message: queryError.message,
        stack: queryError.stack
      })
      
      // Se houver erro na query, tentar buscar todos os resultados e filtrar manualmente
      try {
        console.log('[Free Limits] Tentando buscar todos os resultados do usuário como fallback...')
        const allResults = await db
          .collection('results')
          .where('userId', '==', authUser.uid)
          .get()
        
        allResults.forEach((doc) => {
          try {
            const data = doc.data()
            const createdAt = data.createdAt
            let createdAtDate: Date | null = null
            
            if (createdAt?.toDate && typeof createdAt.toDate === 'function') {
              createdAtDate = createdAt.toDate()
            } else if (createdAt?.seconds) {
              createdAtDate = new Date(createdAt.seconds * 1000)
            }
            
            if (createdAtDate && createdAtDate >= startOfDay && createdAtDate < endOfDay) {
              const count = data.questionsCount || 0
              const questionCount = typeof count === 'number' ? count : parseInt(String(count)) || 0
              questionsGeneratedToday += questionCount
            }
          } catch (docError) {
            // Ignorar documentos com erro
          }
        })
        
        console.log(`[Free Limits] Fallback: ${questionsGeneratedToday} questões encontradas`)
      } catch (fallbackError) {
        console.error('[Free Limits] Erro no fallback:', fallbackError)
        questionsGeneratedToday = 0
      }
      
      // Verificar se é erro de índice faltando
      if (queryError.code === 9 || queryError.message?.includes('index')) {
        console.error('[Free Limits] Índice do Firestore pode estar faltando. Criando índice composto para (userId, createdAt)')
      }
    }

    const maxQuestionsPerDay = 5
    const remainingQuestions = Math.max(0, maxQuestionsPerDay - questionsGeneratedToday)
    const canGenerateMore = remainingQuestions > 0

    // Calcular quando o limite será resetado (próxima meia-noite UTC)
    const resetTime = endOfDay.getTime()
    const timeUntilReset = Math.max(0, resetTime - now.getTime())
    
    console.log(`[Free Limits] User ${authUser.uid} - canGenerate: ${canGenerateMore}, remaining: ${remainingQuestions}, timeUntilReset: ${Math.round(timeUntilReset / 1000 / 60)} minutos`)

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
    console.error('[Free Limits] Erro inesperado ao verificar limitações:', error)
    console.error('[Free Limits] Stack trace:', error.stack)
    
    // Retornar resposta de erro mais informativa
    return NextResponse.json(
      { 
        error: error.message || 'Erro ao verificar limitações',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}


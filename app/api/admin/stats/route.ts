import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'

/**
 * Helper function para converter Timestamp do Firestore para Date
 */
function convertToDate(timestamp: any): Date {
  try {
    if (!timestamp) {
      return new Date()
    }
    
    // Se já é uma Date
    if (timestamp instanceof Date) {
      return timestamp
    }
    
    // Se tem método toDate (Firestore Timestamp)
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate()
    }
    
    // Se tem propriedade seconds (Timestamp em segundos)
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000)
    }
    
    // Se é string ISO ou número
    const date = new Date(timestamp)
    if (!isNaN(date.getTime())) {
      return date
    }
    
    return new Date()
  } catch (error) {
    console.error('Erro ao converter timestamp:', error)
    return new Date()
  }
}

/**
 * GET /api/admin/stats
 * Retorna estatísticas administrativas (apenas admins)
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

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    // Buscar todas as questões
    const questionsSnapshot = await db.collection('questions').get()
    
    let totalQuestions = 0
    let questionsThisWeek = 0

    questionsSnapshot.forEach((doc) => {
      const data = doc.data()
      totalQuestions++
      
      const createdAt = convertToDate(data.createdAt)
      if (createdAt >= weekStart) {
        questionsThisWeek++
      }
    })

    // Estatísticas que apenas admin_master pode ver
    let activeUsers = 0
    let usersThisMonth = 0
    let pendingReports = 0
    let growthRate = 0

    if (authUser.role === 'admin_master') {
      // Buscar usuários do Firebase Auth
      const authUsersList = await app.auth().listUsers(1000)
      
      // Buscar dados do Firestore
      const usersSnapshot = await db.collection('users').get()
      const firestoreUsersMap = new Map()
      
      usersSnapshot.docs.forEach((doc) => {
        firestoreUsersMap.set(doc.id, doc.data())
      })

      // Contar usuários ativos e novos este mês
      let usersLastMonth = 0
      
      authUsersList.users.forEach((authUser) => {
        const userData = firestoreUsersMap.get(authUser.uid) || {}
        const createdAt = convertToDate(userData.createdAt || authUser.metadata.creationTime)
        
        // Verificar se usuário está ativo (não desativado)
        const isDisabled = authUser.disabled || false
        if (!isDisabled) {
          // Se tem plano, verificar se está válido
          if (userData.plan && userData.planExpiresAt) {
            const expiresAt = convertToDate(userData.planExpiresAt)
            if (expiresAt > now) {
              activeUsers++
            }
          } else {
            // Usuário sem plano mas ativo (considerado ativo)
            activeUsers++
          }
        }
        
        // Contar usuários criados este mês
        if (createdAt >= monthStart) {
          usersThisMonth++
        }
        
        // Contar usuários do mês anterior
        if (createdAt >= lastMonthStart && createdAt <= lastMonthEnd) {
          usersLastMonth++
        }
      })

      // Calcular taxa de crescimento (comparação com mês anterior)
      if (usersLastMonth > 0) {
        growthRate = Math.round(((usersThisMonth - usersLastMonth) / usersLastMonth) * 100 * 10) / 10
      } else if (usersThisMonth > 0) {
        growthRate = 100 // Se não havia usuários no mês anterior, crescimento é 100%
      }

      // Buscar reports pendentes
      const reportsSnapshot = await db.collection('reports').where('status', '==', 'pendente').get()
      pendingReports = reportsSnapshot.size
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalQuestions,
        questionsThisWeek,
        ...(authUser.role === 'admin_master' && {
          activeUsers,
          usersThisMonth,
          pendingReports,
          growthRate,
        }),
      },
    })
  } catch (error: any) {
    console.error('Erro ao buscar estatísticas administrativas:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar estatísticas' },
      { status: 500 }
    )
  }
}


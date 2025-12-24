import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'

/**
 * GET /api/admin/reports
 * Lista todos os reports (apenas admin_master)
 * Query params:
 * - archived: 'true' para listar apenas arquivados, 'false' ou omitido para listar apenas não arquivados
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('firebase-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const authUser = await verifyFirebaseToken(token)
    if (!authUser || authUser.role !== 'admin_master') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const showArchived = searchParams.get('archived') === 'true'

    const app = getAdminApp()
    const db = app.firestore()

    // Buscar todos os reports ordenados por data de criação (mais recentes primeiro)
    const reportsSnapshot = await db
      .collection('reports')
      .orderBy('createdAt', 'desc')
      .get()

    const reports = []
    const questionIds = new Set<string>()

    for (const doc of reportsSnapshot.docs) {
      const data = doc.data()
      
      // Filtrar por status de arquivamento
      const isArchived = data.archived === true
      if (showArchived !== isArchived) {
        continue
      }

      // Só adicionar questionId ao set se não for null
      if (data.questionId) {
        questionIds.add(data.questionId)
      }

      // Converter Timestamp para Date
      let createdAt: Date
      let updatedAt: Date
      let resolvedAt: Date | undefined = undefined

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

        if (isNaN(createdAt.getTime())) {
          createdAt = new Date()
        }
      } catch (error) {
        console.error('Erro ao converter createdAt:', error)
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
          updatedAt = createdAt
        }

        if (isNaN(updatedAt.getTime())) {
          updatedAt = createdAt
        }
      } catch (error) {
        console.error('Erro ao converter updatedAt:', error)
        updatedAt = createdAt
      }

      if (data.resolvedAt) {
        try {
          if (data.resolvedAt.toDate) {
            resolvedAt = data.resolvedAt.toDate()
          } else if (data.resolvedAt.seconds) {
            resolvedAt = new Date(data.resolvedAt.seconds * 1000)
          } else {
            resolvedAt = new Date(data.resolvedAt)
          }

          if (isNaN(resolvedAt.getTime())) {
            resolvedAt = undefined
          }
        } catch (error) {
          console.error('Erro ao converter resolvedAt:', error)
        }
      }

      reports.push({
        id: doc.id,
        questionId: data.questionId,
        userId: data.userId,
        userName: data.userName || '',
        userEmail: data.userEmail || '',
        texto: data.texto || '',
        tipos: data.tipos || [],
        imagemUrl: data.imagemUrl || null,
        status: data.status || 'pendente',
        archived: data.archived === true,
        resolvedAt: resolvedAt ? resolvedAt.toISOString() : undefined,
        resolvedBy: data.resolvedBy || undefined,
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
      })
    }

    // Buscar textos das questões para exibir na lista
    const questionTexts: Record<string, string> = {}
    if (questionIds.size > 0) {
      // Firestore limita 'in' a 10 itens, então precisamos fazer múltiplas queries
      const questionIdsArray = Array.from(questionIds)
      const batchSize = 10
      
      for (let i = 0; i < questionIdsArray.length; i += batchSize) {
        const batch = questionIdsArray.slice(i, i + batchSize)
        
        // Buscar questões em lote
        const batchPromises = batch.map(async (questionId) => {
          try {
            const questionDoc = await db.collection('questions').doc(questionId).get()
            if (questionDoc.exists) {
              const data = questionDoc.data()!
              const questionText = data.texto || data.enunciado || ''
              return {
                id: questionId,
                text: questionText.substring(0, 100) + (questionText.length > 100 ? '...' : ''),
              }
            }
            return null
          } catch (error) {
            console.error(`Erro ao buscar questão ${questionId}:`, error)
            return null
          }
        })
        
        const batchResults = await Promise.all(batchPromises)
        batchResults.forEach((result) => {
          if (result) {
            questionTexts[result.id] = result.text
          }
        })
      }
    }

    // Adicionar questionText aos reports
    const reportsWithQuestionText = reports.map((report) => ({
      ...report,
      questionText: report.questionId 
        ? (questionTexts[report.questionId] || 'Questão não encontrada')
        : 'Suporte',
    }))

    return NextResponse.json({
      success: true,
      reports: reportsWithQuestionText,
      total: reportsWithQuestionText.length,
      pendentes: reportsWithQuestionText.filter((r) => r.status === 'pendente').length,
      resolvidos: reportsWithQuestionText.filter((r) => r.status === 'resolvido').length,
    })
  } catch (error: any) {
    console.error('Erro ao buscar reports:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar reports' },
      { status: 500 }
    )
  }
}


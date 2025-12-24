import { NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'

/**
 * GET /api/plans
 * Retorna os planos disponíveis (públicos - sem autenticação necessária)
 */
export async function GET() {
  try {
    const app = getAdminApp()
    const db = app.firestore()

    // Buscar planos do Firestore
    const plansSnapshot = await db.collection('plans').orderBy('durationMonths', 'asc').get()

    if (plansSnapshot.empty) {
      // Se não houver planos cadastrados, retornar erro
      return NextResponse.json({
        success: false,
        error: 'Nenhum plano cadastrado',
        plans: [],
      })
    }

    const plans = plansSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
    }))

    return NextResponse.json({
      success: true,
      plans,
    })
  } catch (error: any) {
    console.error('Erro ao buscar planos:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar planos', details: error.message },
      { status: 500 }
    )
  }
}


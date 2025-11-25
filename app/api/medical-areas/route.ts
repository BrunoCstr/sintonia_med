import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'
import type { MedicalArea } from '@/lib/types'

/**
 * GET /api/medical-areas
 * Lista áreas médicas ativas (usuários autenticados)
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

    // Buscar apenas áreas médicas ativas, ordenadas por nome
    const areasSnapshot = await db
      .collection('medical_areas')
      .where('ativo', '==', true)
      .orderBy('nome', 'asc')
      .get()

    const areas = areasSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as MedicalArea
    })

    return NextResponse.json({ areas })
  } catch (error: any) {
    console.error('Erro ao buscar áreas médicas:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar áreas médicas' },
      { status: 500 }
    )
  }
}



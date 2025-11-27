import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'
import type { Materia } from '@/lib/types'

/**
 * GET /api/materias
 * Lista matérias ativas de um sistema (usuários autenticados)
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
    const sistemaId = request.nextUrl.searchParams.get('sistemaId')

    if (!sistemaId) {
      return NextResponse.json(
        { error: 'sistemaId é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar apenas matérias ativas do sistema
    const materiasSnapshot = await db
      .collection('materias')
      .where('sistemaId', '==', sistemaId)
      .where('ativo', '==', true)
      .orderBy('nome', 'asc')
      .get()

    const materias = materiasSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        nome: data.nome,
        sistemaId: data.sistemaId,
        ativo: data.ativo,
      } as Partial<Materia>
    })

    return NextResponse.json({ materias })
  } catch (error: any) {
    console.error('Erro ao buscar matérias:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar matérias' },
      { status: 500 }
    )
  }
}


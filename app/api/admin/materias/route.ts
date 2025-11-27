import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'
import type { Materia } from '@/lib/types'

/**
 * GET /api/admin/materias
 * Lista todas as matérias de um sistema (apenas admins)
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
    const sistemaId = request.nextUrl.searchParams.get('sistemaId')

    let query = db.collection('materias').orderBy('nome', 'asc')
    
    if (sistemaId) {
      query = query.where('sistemaId', '==', sistemaId) as any
    }

    const materiasSnapshot = await query.get()

    const materias = materiasSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Materia
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

/**
 * POST /api/admin/materias
 * Cria uma nova matéria (apenas admins)
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
    const { nome, sistemaId, ativo = true } = body

    // Validação
    if (!nome || typeof nome !== 'string' || !nome.trim()) {
      return NextResponse.json(
        { error: 'O nome da matéria é obrigatório' },
        { status: 400 }
      )
    }

    if (!sistemaId || typeof sistemaId !== 'string') {
      return NextResponse.json(
        { error: 'O ID do sistema é obrigatório' },
        { status: 400 }
      )
    }

    const app = getAdminApp()
    const db = app.firestore()

    // Verificar se o sistema existe
    const sistemaDoc = await db.collection('sistemas').doc(sistemaId).get()
    if (!sistemaDoc.exists) {
      // Tentar medical_areas como fallback
      const fallbackDoc = await db.collection('medical_areas').doc(sistemaId).get()
      if (!fallbackDoc.exists) {
        return NextResponse.json(
          { error: 'Sistema não encontrado' },
          { status: 404 }
        )
      }
    }

    // Verificar se já existe uma matéria com o mesmo nome no mesmo sistema
    const existingMateria = await db
      .collection('materias')
      .where('sistemaId', '==', sistemaId)
      .where('nome', '==', nome.trim())
      .limit(1)
      .get()

    if (!existingMateria.empty) {
      return NextResponse.json(
        { error: 'Já existe uma matéria com este nome neste sistema' },
        { status: 400 }
      )
    }

    // Criar matéria
    const materiaData = {
      nome: nome.trim(),
      sistemaId,
      ativo: ativo !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: authUser.uid,
    }

    const docRef = await db.collection('materias').add(materiaData)

    return NextResponse.json({
      success: true,
      id: docRef.id,
      materia: { id: docRef.id, ...materiaData },
    })
  } catch (error: any) {
    console.error('Erro ao criar matéria:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar matéria' },
      { status: 500 }
    )
  }
}


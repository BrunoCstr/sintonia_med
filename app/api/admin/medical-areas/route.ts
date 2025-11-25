import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'
import type { MedicalArea } from '@/lib/types'

/**
 * GET /api/admin/medical-areas
 * Lista todas as áreas médicas (apenas admins)
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

    // Buscar áreas médicas ordenadas por nome
    const areasSnapshot = await db
      .collection('medical_areas')
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

/**
 * POST /api/admin/medical-areas
 * Cria uma nova área médica (apenas admins)
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
    const { nome, descricao, ativo = true } = body

    // Validação
    if (!nome || typeof nome !== 'string' || !nome.trim()) {
      return NextResponse.json(
        { error: 'O nome da área é obrigatório' },
        { status: 400 }
      )
    }

    const app = getAdminApp()
    const db = app.firestore()

    // Verificar se já existe uma área com o mesmo nome
    const existingArea = await db
      .collection('medical_areas')
      .where('nome', '==', nome.trim())
      .limit(1)
      .get()

    if (!existingArea.empty) {
      return NextResponse.json(
        { error: 'Já existe uma área médica com este nome' },
        { status: 400 }
      )
    }

    // Criar área médica
    const areaData = {
      nome: nome.trim(),
      descricao: descricao?.trim() || null,
      ativo: ativo !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: authUser.uid,
    }

    const docRef = await db.collection('medical_areas').add(areaData)

    return NextResponse.json({
      success: true,
      id: docRef.id,
      area: { id: docRef.id, ...areaData },
    })
  } catch (error: any) {
    console.error('Erro ao criar área médica:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar área médica' },
      { status: 500 }
    )
  }
}


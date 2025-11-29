import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'
import type { Sistema, MedicalArea } from '@/lib/types'

/**
 * GET /api/admin/medical-areas
 * Lista todas as sistemas (apenas admins)
 * Mantido o endpoint para compatibilidade, mas agora usa a coleção 'sistemas'
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

    // Buscar APENAS da coleção 'sistemas' (sem fallback)
    const areasSnapshot = await db
      .collection('sistemas')
      .orderBy('nome', 'asc')
      .get()

    const areas = areasSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Sistema
    })

    return NextResponse.json({ areas })
  } catch (error: any) {
    console.error('Erro ao buscar sistemas:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar sistemas' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/medical-areas
 * Cria uma nova sistema (apenas admins)
 * Mantido o endpoint para compatibilidade, mas agora usa a coleção 'sistemas'
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
    const { nome, descricao, periodo, ativo = true } = body

    // Validação
    if (!nome || typeof nome !== 'string' || !nome.trim()) {
      return NextResponse.json(
        { error: 'O nome do sistema é obrigatório' },
        { status: 400 }
      )
    }

    if (!periodo || typeof periodo !== 'string' || !periodo.trim()) {
      return NextResponse.json(
        { error: 'O período do sistema é obrigatório' },
        { status: 400 }
      )
    }

    const app = getAdminApp()
    const db = app.firestore()

    // Verificar se já existe um sistema com o mesmo nome (APENAS em 'sistemas')
    const existingArea = await db
      .collection('sistemas')
      .where('nome', '==', nome.trim())
      .limit(1)
      .get()

    if (!existingArea.empty) {
      return NextResponse.json(
        { error: 'Já existe um sistema com este nome' },
        { status: 400 }
      )
    }

    // Criar sistema
    const areaData = {
      nome: nome.trim(),
      descricao: descricao?.trim() || null,
      periodo: periodo.trim(),
      ativo: ativo !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: authUser.uid,
    }

    // Criar na coleção 'sistemas'
    const docRef = await db.collection('sistemas').add(areaData)

    return NextResponse.json({
      success: true,
      id: docRef.id,
      area: { id: docRef.id, ...areaData },
    })
  } catch (error: any) {
    console.error('Erro ao criar sistema:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar sistema' },
      { status: 500 }
    )
  }
}




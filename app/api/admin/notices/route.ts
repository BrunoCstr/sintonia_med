import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'

/**
 * GET /api/admin/notices
 * Lista todos os avisos (apenas admin_master)
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

    const app = getAdminApp()
    const db = app.firestore()

    // Buscar todos os avisos
    const noticesSnapshot = await db.collection('notices').orderBy('createdAt', 'desc').get()

    const notices = noticesSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        titulo: data.titulo,
        mensagem: data.mensagem,
        ativo: data.ativo,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date(data.createdAt).toISOString(),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : new Date(data.updatedAt).toISOString(),
        createdBy: data.createdBy,
        createdByName: data.createdByName || null,
      }
    })

    return NextResponse.json({ success: true, notices })
  } catch (error: any) {
    console.error('Erro ao listar avisos:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao listar avisos' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/notices
 * Cria um novo aviso (apenas admin_master)
 * Ao criar um aviso ativo, desativa todos os outros avisos ativos
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { titulo, mensagem, ativo = false } = body

    // Validações
    if (!titulo || typeof titulo !== 'string' || titulo.trim() === '') {
      return NextResponse.json(
        { error: 'Título é obrigatório' },
        { status: 400 }
      )
    }

    if (!mensagem || typeof mensagem !== 'string' || mensagem.trim() === '') {
      return NextResponse.json(
        { error: 'Mensagem é obrigatória' },
        { status: 400 }
      )
    }

    const app = getAdminApp()
    const db = app.firestore()

    // Se o aviso for ativo, desativar todos os outros avisos ativos
    if (ativo === true) {
      const activeNoticesSnapshot = await db.collection('notices')
        .where('ativo', '==', true)
        .get()
      
      const batch = db.batch()
      activeNoticesSnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { ativo: false, updatedAt: new Date() })
      })
      await batch.commit()
    }

    // Buscar informações do usuário criador
    const userDoc = await db.collection('users').doc(authUser.uid).get()
    const userData = userDoc.data()

    // Criar aviso
    const now = new Date()
    const noticeRef = db.collection('notices').doc()
    const noticeData: any = {
      titulo: titulo.trim(),
      mensagem: mensagem.trim(),
      ativo: ativo === true,
      createdAt: now,
      updatedAt: now,
      createdBy: authUser.uid,
      createdByName: userData?.name || null,
    }
    
    // Se o aviso for criado como ativo, adicionar timestamp de ativação
    if (ativo === true) {
      noticeData.lastActivatedAt = now
    }
    
    await noticeRef.set(noticeData)

    return NextResponse.json({
      success: true,
      message: 'Aviso criado com sucesso',
      notice: {
        id: noticeRef.id,
        titulo: titulo.trim(),
        mensagem: mensagem.trim(),
        ativo: ativo === true,
      },
    })
  } catch (error: any) {
    console.error('Erro ao criar aviso:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar aviso' },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'

/**
 * GET /api/notices/active
 * Busca o aviso ativo atual (endpoint público para usuários autenticados)
 */
export async function GET(request: NextRequest) {
  try {
    const app = getAdminApp()
    const db = app.firestore()

    // Buscar o aviso ativo
    const noticesSnapshot = await db.collection('notices')
      .where('ativo', '==', true)
      .limit(1)
      .get()

    if (noticesSnapshot.empty) {
      return NextResponse.json({ success: true, notice: null })
    }

    const noticeDoc = noticesSnapshot.docs[0]
    const data = noticeDoc.data()

    const notice = {
      id: noticeDoc.id,
      titulo: data.titulo,
      mensagem: data.mensagem,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date(data.createdAt).toISOString(),
      lastActivatedAt: data.lastActivatedAt?.toDate ? data.lastActivatedAt.toDate().toISOString() : data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : new Date().toISOString(),
    }

    return NextResponse.json({ success: true, notice })
  } catch (error: any) {
    console.error('Erro ao buscar aviso ativo:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar aviso ativo' },
      { status: 500 }
    )
  }
}


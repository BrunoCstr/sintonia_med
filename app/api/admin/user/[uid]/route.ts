import { NextRequest, NextResponse } from 'next/server'
import { getUserWithClaims, verifyAdmin } from '@/lib/firebase-admin'

/**
 * GET /api/admin/user/[uid]
 * Obtém informações de um usuário incluindo role
 * 
 * Requer: requesterUid como query parameter (usuário que está fazendo a requisição)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { uid: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const requesterUid = searchParams.get('requesterUid')

    if (!requesterUid) {
      return NextResponse.json(
        { error: 'requesterUid é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o requester é admin
    const isAdmin = await verifyAdmin(requesterUid)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas admin_master pode acessar informações de usuários.' },
        { status: 403 }
      )
    }

    const { uid } = params
    const user = await getUserWithClaims(uid)

    return NextResponse.json({ success: true, user })
  } catch (error: any) {
    console.error('Erro ao buscar usuário:', error)
    
    if (error.code === 'auth/user-not-found') {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Erro ao buscar usuário' },
      { status: 500 }
    )
  }
}




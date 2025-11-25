import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/firebase-admin'
import { getAdminApp } from '@/lib/firebase-admin'

/**
 * PATCH /api/admin/users/[uid]/toggle-status
 * Ativa ou desativa um usuário no Firebase Auth
 * 
 * Body:
 * {
 *   disabled: boolean,
 *   requesterUid: string
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const body = await request.json()
    const { disabled, requesterUid } = body
    const { uid } = await params

    if (!requesterUid) {
      return NextResponse.json(
        { error: 'requesterUid é obrigatório' },
        { status: 400 }
      )
    }

    if (typeof disabled !== 'boolean') {
      return NextResponse.json(
        { error: 'disabled deve ser um boolean' },
        { status: 400 }
      )
    }

    // Verificar se o requester é admin_master
    const isAdmin = await verifyAdmin(requesterUid)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas admin_master pode ativar/desativar usuários.' },
        { status: 403 }
      )
    }

    // Não permitir desativar a si mesmo
    if (uid === requesterUid) {
      return NextResponse.json(
        { error: 'Você não pode desativar sua própria conta' },
        { status: 400 }
      )
    }

    const app = getAdminApp()

    // Verificar se o usuário existe
    try {
      await app.auth().getUser(uid)
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return NextResponse.json(
          { error: 'Usuário não encontrado' },
          { status: 404 }
        )
      }
      throw error
    }

    // Atualizar status do usuário
    await app.auth().updateUser(uid, {
      disabled: disabled,
    })

    return NextResponse.json({
      success: true,
      message: disabled ? 'Usuário desativado com sucesso' : 'Usuário ativado com sucesso',
    })
  } catch (error: any) {
    console.error('Erro ao alterar status do usuário:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao alterar status do usuário' },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { setUserRole, verifyAdmin, getUserByUid } from '@/lib/firebase-admin'
import type { UserRole } from '@/lib/firebase-admin'

/**
 * POST /api/admin/set-role
 * Define a role de um usuário
 * 
 * Body:
 * {
 *   uid: string,
 *   role: 'aluno' | 'admin_master' | 'admin_questoes',
 *   requesterUid: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { uid, role, requesterUid } = body

    // Validação de campos obrigatórios
    if (!uid || !role || !requesterUid) {
      return NextResponse.json(
        { 
          error: 'Campos obrigatórios faltando',
          required: ['uid', 'role', 'requesterUid']
        },
        { status: 400 }
      )
    }

    // Validar role
    const validRoles: UserRole[] = ['aluno', 'admin_master', 'admin_questoes']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { 
          error: 'Role inválido',
          validRoles
        },
        { status: 400 }
      )
    }

    // Verificar se o requester é admin_master
    const isAdmin = await verifyAdmin(requesterUid)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas admin_master pode definir roles.' },
        { status: 403 }
      )
    }

    // Verificar se o usuário alvo existe
    try {
      await getUserByUid(uid)
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return NextResponse.json(
          { error: 'Usuário não encontrado' },
          { status: 404 }
        )
      }
      throw error
    }

    // Definir role
    await setUserRole(uid, role)

    return NextResponse.json({ 
      success: true, 
      message: `Role '${role}' definido para usuário ${uid}` 
    })
  } catch (error: any) {
    console.error('Erro ao definir role:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao definir role' },
      { status: 500 }
    )
  }
}





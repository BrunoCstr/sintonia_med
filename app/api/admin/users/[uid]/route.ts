import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/firebase-admin'
import { getAdminApp } from '@/lib/firebase-admin'
import * as admin from 'firebase-admin'

/**
 * PUT /api/admin/users/[uid]
 * Atualiza um usuário existente
 * 
 * Body:
 * {
 *   name?: string,
 *   period?: string,
 *   institution?: string,
 *   role?: 'aluno' | 'admin_master' | 'admin_questoes',
 *   requesterUid: string
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const body = await request.json()
    const { name, period, institution, role, requesterUid } = body
    const { uid } = await params

    if (!requesterUid) {
      return NextResponse.json(
        { error: 'requesterUid é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o requester é admin_master
    const isAdmin = await verifyAdmin(requesterUid)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas admin_master pode editar usuários.' },
        { status: 403 }
      )
    }

    const app = getAdminApp()
    const db = app.firestore()

    // Buscar informações do usuário que está editando
    const requesterDoc = await db.collection('users').doc(requesterUid).get()
    const requesterData = requesterDoc.exists ? requesterDoc.data() : null
    const requesterAuth = await app.auth().getUser(requesterUid)

    // Preparar dados de quem editou
    const editedBy = {
      uid: requesterUid,
      name: requesterData?.name || requesterAuth.displayName || requesterAuth.email?.split('@')[0] || 'Admin',
      photoURL: requesterData?.photoURL || requesterAuth.photoURL || null,
      editedAt: admin.firestore.FieldValue.serverTimestamp(),
    }

    // Verificar se o usuário existe
    let authUser
    try {
      authUser = await app.auth().getUser(uid)
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return NextResponse.json(
          { error: 'Usuário não encontrado' },
          { status: 404 }
        )
      }
      throw error
    }

    const firestoreUpdates: any = {
      editedBy: editedBy.uid,
      editedByName: editedBy.name,
      editedByPhoto: editedBy.photoURL,
      editedAt: editedBy.editedAt,
    }

    // Atualizar nome no Auth se fornecido
    if (name !== undefined) {
      await app.auth().updateUser(uid, {
        displayName: name,
      })
      firestoreUpdates.name = name
    }

    // Atualizar campos do Firestore
    if (period !== undefined) {
      firestoreUpdates.period = period
    }
    if (institution !== undefined) {
      firestoreUpdates.institution = institution
    }

    // Atualizar role se fornecido
    if (role !== undefined) {
      const validRoles: string[] = ['aluno', 'admin_master', 'admin_questoes']
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: 'Role inválido' },
          { status: 400 }
        )
      }

      // Atualizar custom claims
      await app.auth().setCustomUserClaims(uid, { role })
      firestoreUpdates.role = role
      firestoreUpdates.roleUpdatedAt = admin.firestore.FieldValue.serverTimestamp()
    }

    // Atualizar Firestore se houver mudanças
    if (Object.keys(firestoreUpdates).length > 0) {
      const userRef = db.collection('users').doc(uid)
      const userDoc = await userRef.get()

      if (userDoc.exists) {
        await userRef.update(firestoreUpdates)
      } else {
        // Criar documento se não existir
        await userRef.set({
          email: authUser.email,
          name: name || authUser.displayName || authUser.email?.split('@')[0] || 'Usuário',
          period: period || '-',
          institution: institution || '-',
          role: role || authUser.customClaims?.role || 'aluno',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          ...firestoreUpdates,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Usuário atualizado com sucesso',
    })
  } catch (error: any) {
    console.error('Erro ao atualizar usuário:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar usuário' },
      { status: 500 }
    )
  }
}

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


import { NextRequest, NextResponse } from 'next/server'
import { setUserRole, verifyAdmin, getUserByUid, getAdminApp } from '@/lib/firebase-admin'
import type { UserRole } from '@/lib/firebase-admin'
import * as admin from 'firebase-admin'

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

    const app = getAdminApp()
    const db = app.firestore()

    // Buscar informações do usuário que está alterando a permissão
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

    // Definir role (isso já atualiza o Firestore, mas vamos adicionar informações de quem editou)
    await setUserRole(uid, role)

    // Atualizar informações de quem editou no Firestore
    const userRef = db.collection('users').doc(uid)
    const userDoc = await userRef.get()

    if (userDoc.exists) {
      await userRef.update({
        editedBy: editedBy.uid,
        editedByName: editedBy.name,
        editedByPhoto: editedBy.photoURL,
        editedAt: editedBy.editedAt,
      })
    } else {
      // Se o documento não existe, criar com dados básicos
      const targetUser = await app.auth().getUser(uid)
      await userRef.set({
        email: targetUser.email,
        name: targetUser.displayName || targetUser.email?.split('@')[0] || 'Usuário',
        period: '-',
        institution: '-',
        role,
        plan: null,
        planExpiresAt: null,
        roleUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        editedBy: editedBy.uid,
        editedByName: editedBy.name,
        editedByPhoto: editedBy.photoURL,
        editedAt: editedBy.editedAt,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    }

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






import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/firebase-admin'
import { getAdminApp } from '@/lib/firebase-admin'
import * as admin from 'firebase-admin'

/**
 * DELETE /api/admin/users/[uid]/remove-plan
 * Remove o plano de um usuário (apenas admin_master)
 * 
 * Body:
 * {
 *   requesterUid: string
 * }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const body = await request.json()
    const { requesterUid } = body
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
        { error: 'Acesso negado. Apenas admin_master pode remover planos.' },
        { status: 403 }
      )
    }

    const app = getAdminApp()
    const db = app.firestore()

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

    // Buscar informações do usuário que está removendo o plano
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

    // Atualizar documento no Firestore
    const userRef = db.collection('users').doc(uid)
    const userDoc = await userRef.get()

    if (userDoc.exists) {
      await userRef.update({
        plan: null,
        planExpiresAt: null,
        editedBy: editedBy.uid,
        editedByName: editedBy.name,
        editedByPhoto: editedBy.photoURL,
        editedAt: editedBy.editedAt,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    } else {
      // Se o documento não existe, criar com dados básicos
      await userRef.set({
        email: authUser.email,
        name: authUser.displayName || authUser.email?.split('@')[0] || 'Usuário',
        period: '-',
        institution: '-',
        role: authUser.customClaims?.role || 'aluno',
        plan: null,
        planExpiresAt: null,
        editedBy: editedBy.uid,
        editedByName: editedBy.name,
        editedByPhoto: editedBy.photoURL,
        editedAt: editedBy.editedAt,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Plano removido com sucesso',
    })
  } catch (error: any) {
    console.error('Erro ao remover plano:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao remover plano' },
      { status: 500 }
    )
  }
}


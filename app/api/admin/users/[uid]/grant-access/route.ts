import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/firebase-admin'
import { getAdminApp } from '@/lib/firebase-admin'
import * as admin from 'firebase-admin'

/**
 * POST /api/admin/users/[uid]/grant-access
 * Libera acesso manual para um usuário (concede plano)
 * 
 * Body:
 * {
 *   plan: 'monthly' | 'semester',
 *   requesterUid: string
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const body = await request.json()
    const { plan, requesterUid } = body
    const { uid } = await params

    if (!requesterUid) {
      return NextResponse.json(
        { error: 'requesterUid é obrigatório' },
        { status: 400 }
      )
    }

    if (!plan || !['monthly', 'semester'].includes(plan)) {
      return NextResponse.json(
        { error: 'Plano inválido. Use "monthly" ou "semester"' },
        { status: 400 }
      )
    }

    // Verificar se o requester é admin_master
    const isAdmin = await verifyAdmin(requesterUid)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas admin_master pode liberar acesso.' },
        { status: 403 }
      )
    }

    const app = getAdminApp()
    const db = app.firestore()

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

    // Calcular data de expiração
    const now = new Date()
    const expiresAt = new Date(now)
    
    if (plan === 'monthly') {
      expiresAt.setDate(expiresAt.getDate() + 30) // 30 dias
    } else if (plan === 'semester') {
      expiresAt.setDate(expiresAt.getDate() + 180) // 180 dias (6 meses)
    }

    // Atualizar ou criar documento no Firestore
    const userRef = db.collection('users').doc(uid)
    const userDoc = await userRef.get()

    if (userDoc.exists) {
      await userRef.update({
        plan,
        planExpiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    } else {
      // Se o documento não existe, criar com dados básicos
      const authUser = await app.auth().getUser(uid)
      await userRef.set({
        email: authUser.email,
        name: authUser.displayName || authUser.email?.split('@')[0] || 'Usuário',
        period: '-',
        institution: '-',
        role: authUser.customClaims?.role || 'aluno',
        plan,
        planExpiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    }

    return NextResponse.json({
      success: true,
      message: `Acesso ${plan === 'monthly' ? 'mensal' : 'semestral'} liberado com sucesso`,
      plan,
      expiresAt: expiresAt.toISOString(),
    })
  } catch (error: any) {
    console.error('Erro ao liberar acesso:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao liberar acesso' },
      { status: 500 }
    )
  }
}


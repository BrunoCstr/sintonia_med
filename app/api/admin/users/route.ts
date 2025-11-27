import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/firebase-admin'
import { getAdminApp } from '@/lib/firebase-admin'
import * as admin from 'firebase-admin'

/**
 * GET /api/admin/users
 * Lista todos os usuários do Firestore com informações completas
 * 
 * Query params:
 * - requesterUid: UID do usuário que está fazendo a requisição (obrigatório)
 * - search: termo de busca opcional para filtrar por nome ou email
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const requesterUid = searchParams.get('requesterUid')
    const searchTerm = searchParams.get('search') || ''

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
        { error: 'Acesso negado. Apenas admin_master pode listar usuários.' },
        { status: 403 }
      )
    }

    const app = getAdminApp()
    const db = app.firestore()

    // Buscar TODOS os usuários do Firebase Auth primeiro
    const authUsersList = await app.auth().listUsers(1000)
    const authUsersMap = new Map()
    
    // Criar mapa de usuários do Auth
    authUsersList.users.forEach((authUser) => {
      authUsersMap.set(authUser.uid, authUser)
    })

    // Buscar todos os documentos do Firestore
    const usersSnapshot = await db.collection('users').get()
    const firestoreUsersMap = new Map()
    
    usersSnapshot.docs.forEach((doc) => {
      firestoreUsersMap.set(doc.id, doc.data())
    })

    // Combinar dados do Auth e Firestore
    const users = authUsersList.users.map((authUser) => {
      const userData = firestoreUsersMap.get(authUser.uid) || {}
      
      // Verificar se usuário está desativado
      const isDisabled = authUser.disabled || false
      
      // Calcular status baseado no plano e se está desativado
      let status = 'expired'
      if (isDisabled) {
        status = 'disabled'
      } else if (userData.plan && userData.planExpiresAt) {
        const expiresAt = userData.planExpiresAt.toDate ? userData.planExpiresAt.toDate() : new Date(userData.planExpiresAt)
        if (expiresAt > new Date()) {
          status = 'active'
        }
      } else if (!userData.plan) {
        status = 'active' // Usuário sem plano mas ativo
      }

      return {
        id: authUser.uid,
        name: userData.name || authUser.displayName || authUser.email?.split('@')[0] || 'Usuário',
        email: userData.email || authUser.email || '',
        period: userData.period || '-',
        institution: userData.institution || '-',
        role: authUser.customClaims?.role || userData.role || 'aluno',
        plan: userData.plan || null,
        planExpiresAt: userData.planExpiresAt?.toDate ? userData.planExpiresAt.toDate() : (userData.planExpiresAt ? new Date(userData.planExpiresAt) : null),
        status,
        disabled: isDisabled,
        createdAt: userData.createdAt?.toDate ? userData.createdAt.toDate() : (userData.createdAt ? new Date(userData.createdAt) : (authUser.metadata.creationTime ? new Date(authUser.metadata.creationTime) : new Date())),
        editedBy: userData.editedBy || null,
        editedByName: userData.editedByName || null,
        editedByPhoto: userData.editedByPhoto || null,
        editedAt: userData.editedAt?.toDate ? userData.editedAt.toDate() : (userData.editedAt ? new Date(userData.editedAt) : null),
      }
    })

    // Adicionar usuários que estão no Firestore mas não no Auth (caso existam)
    firestoreUsersMap.forEach((userData, uid) => {
      if (!authUsersMap.has(uid)) {
        users.push({
          id: uid,
          name: userData.name || 'Usuário',
          email: userData.email || '',
          period: userData.period || '-',
          institution: userData.institution || '-',
          role: userData.role || 'aluno',
          plan: userData.plan || null,
          planExpiresAt: userData.planExpiresAt?.toDate ? userData.planExpiresAt.toDate() : (userData.planExpiresAt ? new Date(userData.planExpiresAt) : null),
          status: 'expired',
          disabled: true, // Se não está no Auth, considerar como desativado
          createdAt: userData.createdAt?.toDate ? userData.createdAt.toDate() : (userData.createdAt ? new Date(userData.createdAt) : new Date()),
          editedBy: userData.editedBy || null,
          editedByName: userData.editedByName || null,
          editedByPhoto: userData.editedByPhoto || null,
          editedAt: userData.editedAt?.toDate ? userData.editedAt.toDate() : (userData.editedAt ? new Date(userData.editedAt) : null),
        })
      }
    })

    // Ordenar por data de criação (mais recentes primeiro)
    users.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)
      return dateB.getTime() - dateA.getTime()
    })

    // Filtrar por termo de busca se fornecido
    let filteredUsers = users
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filteredUsers = users.filter(
        (user) =>
          user.name.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower)
      )
    }

    return NextResponse.json({ success: true, users: filteredUsers })
  } catch (error: any) {
    console.error('Erro ao listar usuários:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao listar usuários' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/users
 * Cria um novo usuário usando Firebase Admin
 * 
 * Body:
 * {
 *   email: string,
 *   password: string,
 *   name: string,
 *   period: string,
 *   institution: string,
 *   role?: 'aluno' | 'admin_master' | 'admin_questoes',
 *   requesterUid: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, period, institution, role, requesterUid } = body

    // Validação de campos obrigatórios
    if (!email || !password || !name || !period || !institution || !requesterUid) {
      return NextResponse.json(
        {
          error: 'Campos obrigatórios faltando',
          required: ['email', 'password', 'name', 'period', 'institution', 'requesterUid'],
        },
        { status: 400 }
      )
    }

    // Verificar se o requester é admin_master
    const isAdmin = await verifyAdmin(requesterUid)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas admin_master pode criar usuários.' },
        { status: 403 }
      )
    }

    const app = getAdminApp()
    const db = app.firestore()

    // Verificar se o email já está em uso
    try {
      await app.auth().getUserByEmail(email)
      return NextResponse.json(
        { error: 'Este email já está em uso' },
        { status: 400 }
      )
    } catch (error: any) {
      if (error.code !== 'auth/user-not-found') {
        throw error
      }
      // Usuário não existe, pode continuar
    }

    // Criar usuário no Firebase Auth
    const userRole = role || 'aluno'
    const newUser = await app.auth().createUser({
      email,
      password,
      displayName: name,
      emailVerified: false,
    })

    // Definir custom claims
    await app.auth().setCustomUserClaims(newUser.uid, { role: userRole })

    // Criar documento no Firestore
    await db.collection('users').doc(newUser.uid).set({
      name,
      email,
      period,
      institution,
      role: userRole,
      plan: null,
      planExpiresAt: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return NextResponse.json({
      success: true,
      message: 'Usuário criado com sucesso',
      user: {
        uid: newUser.uid,
        email: newUser.email,
        name,
        role: userRole,
      },
    })
  } catch (error: any) {
    console.error('Erro ao criar usuário:', error)
    
    if (error.code === 'auth/email-already-exists') {
      return NextResponse.json(
        { error: 'Este email já está em uso' },
        { status: 400 }
      )
    }

    if (error.code === 'auth/invalid-email') {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      )
    }

    if (error.code === 'auth/weak-password') {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Erro ao criar usuário' },
      { status: 500 }
    )
  }
}


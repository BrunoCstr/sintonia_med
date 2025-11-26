// Firebase Admin SDK - Para uso em API routes e server-side
// Este arquivo contém funções para gerenciar Firebase Auth Custom Claims

import * as admin from 'firebase-admin'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'

// Tipos
export type UserRole = 'aluno' | 'admin_master' | 'admin_questoes'

export interface SetUserRoleRequest {
  uid: string
  role: UserRole
}

// Inicializar Firebase Admin SDK (singleton pattern)
let adminApp: admin.app.App | null = null

export function getAdminApp(): admin.app.App {
  if (adminApp) {
    return adminApp
  }

  // Verificar se já está inicializado
  if (admin.apps.length > 0) {
    adminApp = admin.app()
    return adminApp
  }

  // Tentar carregar service account key
  const rootDir = process.cwd()
  const possibleNames = [
    process.env.FIREBASE_SERVICE_ACCOUNT_FILE,
  ]

  let serviceAccount: any = null

  // Procurar arquivo JSON do Firebase Admin SDK
  try {
    const files = readdirSync(rootDir)
    const firebaseAdminFiles = files.filter((file: string) =>
      file.endsWith('.json') &&
      (file.includes('firebase-adminsdk') || file === 'firebase-service-account.json')
    )

    if (firebaseAdminFiles.length > 0) {
      const serviceAccountPath = join(rootDir, firebaseAdminFiles[0])
      if (existsSync(serviceAccountPath)) {
        serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))
        console.log(`✅ Firebase Admin: Carregando service account de ${firebaseAdminFiles[0]}`)
      }
    }
  } catch (error) {
    // Ignorar erro de leitura de diretório
  }

  // Obter storageBucket das variáveis de ambiente ou do service account
  let storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 
                     process.env.FIREBASE_STORAGE_BUCKET ||
                     serviceAccount?.storageBucket

  // Se não houver bucket configurado, usar o padrão do projeto
  if (!storageBucket) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 
                     process.env.FIREBASE_PROJECT_ID ||
                     serviceAccount?.project_id
    if (projectId) {
      // Bucket padrão do Firebase: {project-id}.appspot.com
      storageBucket = `${projectId}.appspot.com`
    }
  }

  // Inicializar com service account ou variáveis de ambiente
  if (serviceAccount) {
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: storageBucket || serviceAccount.storageBucket || `${serviceAccount.project_id}.appspot.com`,
    })
  } else if (process.env.FIREBASE_PROJECT_ID) {
    adminApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      storageBucket: storageBucket || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`,
    })
  } else {
    throw new Error(
      'Firebase Admin não configurado. Configure service account ou variáveis de ambiente:\n' +
      '  - Coloque um arquivo JSON do Firebase Admin SDK na raiz do projeto\n' +
      '  - Ou defina: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY'
    )
  }

  return adminApp
}

/**
 * Verifica se um usuário é admin_master
 */
export async function verifyAdmin(uid: string): Promise<boolean> {
  try {
    const app = getAdminApp()
    const user = await app.auth().getUser(uid)
    const role = user.customClaims?.role as UserRole
    return role === 'admin_master'
  } catch (error) {
    console.error('Erro ao verificar admin:', error)
    return false
  }
}

/**
 * Verifica se um usuário tem uma role específica
 */
export async function verifyRole(uid: string, requiredRole: UserRole): Promise<boolean> {
  try {
    const app = getAdminApp()
    const user = await app.auth().getUser(uid)
    const role = user.customClaims?.role as UserRole
    return role === requiredRole
  } catch (error) {
    console.error('Erro ao verificar role:', error)
    return false
  }
}

/**
 * Verifica se um usuário tem uma das roles permitidas
 */
export async function verifyAnyRole(uid: string, allowedRoles: UserRole[]): Promise<boolean> {
  try {
    const app = getAdminApp()
    const user = await app.auth().getUser(uid)
    const role = user.customClaims?.role as UserRole
    return allowedRoles.includes(role)
  } catch (error) {
    console.error('Erro ao verificar roles:', error)
    return false
  }
}

/**
 * Define a role de um usuário (Custom Claims + Firestore)
 */
export async function setUserRole(
  uid: string,
  role: UserRole
): Promise<void> {
  const app = getAdminApp()
  const db = app.firestore()

  // Validar role
  const validRoles: UserRole[] = ['aluno', 'admin_master', 'admin_questoes']
  if (!validRoles.includes(role)) {
    throw new Error(`Role inválido: ${role}. Roles válidos: ${validRoles.join(', ')}`)
  }

  // Verificar se o usuário existe
  let authUser
  try {
    authUser = await app.auth().getUser(uid)
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      throw new Error(`Usuário não encontrado: ${uid}`)
    }
    throw error
  }

  // Definir custom claim
  await app.auth().setCustomUserClaims(uid, { role })

  // Atualizar Firestore
  const userRef = db.collection('users').doc(uid)
  const userDoc = await userRef.get()

  if (userDoc.exists) {
    await userRef.update({
      role,
      roleUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  } else {
    // Criar documento se não existir
    await userRef.set({
      email: authUser.email,
      name: authUser.displayName || authUser.email?.split('@')[0] || 'Usuário',
      role,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      roleUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  }
}

/**
 * Busca usuário por email
 */
export async function getUserByEmail(email: string) {
  const app = getAdminApp()
  return await app.auth().getUserByEmail(email)
}

/**
 * Busca usuário por UID
 */
export async function getUserByUid(uid: string) {
  const app = getAdminApp()
  return await app.auth().getUser(uid)
}

/**
 * Lista todos os usuários (com paginação)
 */
export async function listUsers(maxResults: number = 1000, nextPageToken?: string) {
  const app = getAdminApp()
  return await app.auth().listUsers(maxResults, nextPageToken)
}

/**
 * Obtém informações do usuário incluindo custom claims
 */
/**
 * Verifica se o usuário tem plano premium ativo
 */
export async function isUserPremium(uid: string): Promise<boolean> {
  try {
    const app = getAdminApp()
    const db = app.firestore()
    
    const userDoc = await db.collection('users').doc(uid).get()
    // No Admin SDK, exists é uma propriedade, não uma função
    if (!userDoc.exists) {
      return false
    }
    
    const userData = userDoc.data()
    if (!userData?.plan) {
      return false
    }
    
    // Verificar se o plano não expirou
    if (userData.planExpiresAt) {
      const expiresAt = userData.planExpiresAt.toDate ? userData.planExpiresAt.toDate() : new Date(userData.planExpiresAt)
      const now = new Date()
      const isExpired = expiresAt <= now
      
      // Se expirou, limpar no banco de dados
      if (isExpired) {
        const userRef = db.collection('users').doc(uid)
        await userRef.update({
          plan: null,
          planExpiresAt: null,
          updatedAt: new Date(),
        })
        console.log(`[isUserPremium] Plano expirado removido para usuário ${uid}`)
        return false
      }
      
      return true
    }
    
    // Se não tem data de expiração, considerar como ativo
    return true
  } catch (error) {
    console.error('Erro ao verificar status premium:', error)
    return false
  }
}

export async function getUserWithClaims(uid: string) {
  const app = getAdminApp()
  const user = await app.auth().getUser(uid)
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
    role: user.customClaims?.role as UserRole | undefined,
    customClaims: user.customClaims,
    metadata: user.metadata,
  }
}

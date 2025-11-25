// Helper functions for middleware authentication
import { getAdminApp } from './firebase-admin'
import * as admin from 'firebase-admin'
import type { UserRole } from './types'

// Re-export getAdminApp for convenience
export { getAdminApp }

export interface AuthUser {
  uid: string
  email: string | undefined
  role: UserRole
}

/**
 * Verifica e valida o token Firebase do usuário
 */
export async function verifyFirebaseToken(token: string): Promise<AuthUser | null> {
  try {
    const app = getAdminApp()
    const decodedToken = await app.auth().verifyIdToken(token)
    
    // Extrair role dos Custom Claims (source of truth)
    const role = (decodedToken.role as UserRole) || 'aluno'
    
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role,
    }
  } catch (error) {
    // Token inválido ou expirado
    return null
  }
}

/**
 * Sincroniza a role do Firestore com os Custom Claims
 * Se forem diferentes, atualiza o Firestore para corresponder aos Claims
 */
export async function syncRoleWithFirestore(uid: string, claimRole: UserRole): Promise<void> {
  try {
    const app = getAdminApp()
    const db = app.firestore()
    const userRef = db.collection('users').doc(uid)
    const userDoc = await userRef.get()
    
    // No Firebase Admin SDK, exists é uma propriedade, não uma função
    if (userDoc.exists) {
      const firestoreRole = userDoc.data()?.role as UserRole
      
      // Se a role do Firestore for diferente da role dos Claims, sincronizar
      if (firestoreRole !== claimRole) {
        await userRef.update({
          role: claimRole,
          roleUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        console.log(`✅ Role sincronizada: ${uid} - Firestore: ${firestoreRole} → Claims: ${claimRole}`)
      }
    }
  } catch (error) {
    // Não bloquear o fluxo se houver erro na sincronização
    console.error('Erro ao sincronizar role:', error)
  }
}

/**
 * Extrai o token Firebase do request
 * Tenta buscar de cookies, headers Authorization ou cookie __session
 */
export function extractTokenFromRequest(request: Request & { cookies?: any }): string | null {
  // Tentar buscar do header Authorization
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  
  // Tentar buscar do cookie usando NextRequest.cookies (se disponível)
  if (request.cookies) {
    const token = request.cookies.get('firebase-token')
    if (token) {
      return token.value
    }
  }
  
  // Fallback: tentar buscar do cookie header manualmente
  const cookieHeader = request.headers.get('cookie')
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map(c => c.trim())
    for (const cookie of cookies) {
      if (cookie.startsWith('firebase-token=')) {
        return cookie.substring('firebase-token='.length)
      }
      if (cookie.startsWith('__session=')) {
        return cookie.substring('__session='.length)
      }
    }
  }
  
  return null
}


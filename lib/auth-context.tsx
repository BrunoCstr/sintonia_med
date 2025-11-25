'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  type User,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import type { UserProfile, UserRole } from './types'

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  userRole: UserRole | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string, period: string, institution: string) => Promise<void>
  logout: () => Promise<void>
  refreshUserRole: () => Promise<void>
  refreshUserProfile: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  // Função para sincronizar token com o servidor (para uso no middleware)
  const syncTokenWithServer = async (user: User) => {
    try {
      const token = await user.getIdToken()
      await fetch('/api/auth/sync-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })
    } catch (error) {
      // Não bloquear o fluxo se houver erro na sincronização
      console.error('Erro ao sincronizar token:', error)
    }
  }

  const refreshUserRole = async () => {
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdTokenResult(true)
      const role = (token.claims.role as UserRole) || 'aluno'
      setUserRole(role)
      // Sincronizar token após refresh
      await syncTokenWithServer(auth.currentUser)
    }
  }

  const refreshUserProfile = async () => {
    if (auth.currentUser) {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid))
      if (userDoc.exists()) {
        const profile = userDoc.data() as UserProfile
        setUserProfile(profile)
      }
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)
      if (user) {
        // Load user profile from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          const profile = userDoc.data() as UserProfile
          setUserProfile(profile)
          
          const token = await user.getIdTokenResult()
          const role = (token.claims.role as UserRole) || profile.role || 'aluno'
          setUserRole(role)
          
          // Sincronizar token com o servidor para uso no middleware
          await syncTokenWithServer(user)
        }
      } else {
        setUserProfile(null)
        setUserRole(null)
        // Remover token do servidor ao fazer logout
        try {
          await fetch('/api/auth/sync-token', {
            method: 'DELETE',
          })
        } catch (error) {
          console.error('Erro ao remover token:', error)
        }
      }
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const signIn = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    // Sincronizar token após login
    await syncTokenWithServer(userCredential.user)
  }

  const signUp = async (email: string, password: string, name: string, period: string, institution: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    await setDoc(doc(db, 'users', user.uid), {
      name,
      email,
      period,
      institution,
      plan: null,
      planExpiresAt: null,
      role: 'aluno', // Default role
      createdAt: new Date(),
    })
    
    // Sincronizar token após cadastro
    await syncTokenWithServer(user)
  }

  const logout = async () => {
    // Remover token do servidor antes de fazer logout
    try {
      await fetch('/api/auth/sync-token', {
        method: 'DELETE',
      })
    } catch (error) {
      console.error('Erro ao remover token:', error)
    }
    await signOut(auth)
  }

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email, {
      url: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/login`,
      handleCodeInApp: false,
    })
  }

  return (
    <AuthContext.Provider value={{ user, userProfile, userRole, loading, signIn, signUp, logout, refreshUserRole, refreshUserProfile, resetPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

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
import { doc, getDoc } from 'firebase/firestore'
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
  resendVerificationEmail: (email: string) => Promise<void>
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
      // Verificar se o plano expirou e atualizar no banco se necessário
      try {
        await fetch('/api/user/check-expired-plan', {
          method: 'POST',
          credentials: 'include',
        })
      } catch (error) {
        console.error('Erro ao verificar plano expirado:', error)
        // Continuar mesmo se houver erro
      }

      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid))
      if (userDoc.exists()) {
        const profileData = userDoc.data()
        // Converter Timestamp do Firestore para Date
        const profile: UserProfile = {
          ...profileData,
          planExpiresAt: profileData.planExpiresAt?.toDate 
            ? profileData.planExpiresAt.toDate().toISOString()
            : profileData.planExpiresAt,
        } as UserProfile
        setUserProfile(profile)
      }
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)
      if (user) {
        // Verificar se o e-mail está verificado antes de sincronizar token
        // Isso previne que tokens sejam salvos para usuários com e-mail não verificado
        if (!user.emailVerified) {
          // E-mail não verificado - não sincronizar token e fazer logout
          console.warn('⚠️ E-mail não verificado detectado no onAuthStateChanged - fazendo logout')
          try {
            await fetch('/api/auth/sync-token', {
              method: 'DELETE',
            })
          } catch (error) {
            console.error('Erro ao remover token:', error)
          }
          await signOut(auth)
          setUserProfile(null)
          setUserRole(null)
          setLoading(false)
          return
        }

        // Verificar se o plano expirou e atualizar no banco se necessário
        try {
          await fetch('/api/user/check-expired-plan', {
            method: 'POST',
            credentials: 'include',
          })
        } catch (error) {
          console.error('Erro ao verificar plano expirado:', error)
          // Continuar mesmo se houver erro
        }

        // Load user profile from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          const profileData = userDoc.data()
          // Converter Timestamp do Firestore para Date
          const profile: UserProfile = {
            ...profileData,
            planExpiresAt: profileData.planExpiresAt?.toDate 
              ? profileData.planExpiresAt.toDate().toISOString()
              : profileData.planExpiresAt,
          } as UserProfile
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
    
    // Verificar se o e-mail está verificado
    if (!userCredential.user.emailVerified) {
      // Tentar enviar e-mail de verificação usando Nodemailer antes de fazer logout
      try {
        const response = await fetch('/api/auth/send-verification-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, uid: userCredential.user.uid }),
        })
      } catch (emailError: any) {
        // Erro silencioso ao enviar e-mail
      }
      
      // Fazer logout para forçar verificação
      await signOut(auth)
      throw {
        code: 'auth/email-not-verified',
        message: 'Por favor, verifique seu e-mail antes de fazer login. Um novo e-mail de verificação foi enviado. Verifique sua caixa de entrada e spam.',
      }
    }
    
    // Sincronizar token após login
    await syncTokenWithServer(userCredential.user)
  }

  const signUp = async (email: string, password: string, name: string, period: string, institution: string) => {
    // Verificar rate limit antes de criar conta
    const rateLimitResponse = await fetch('/api/auth/check-rate-limit', {
      method: 'POST',
    })
    const rateLimitData = await rateLimitResponse.json()
    
    if (!rateLimitData.allowed) {
      throw new Error(`Limite de tentativas excedido. Você pode criar até ${rateLimitData.maxAttempts} contas por dia por dispositivo. Tente novamente amanhã.`)
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    // Enviar e-mail de verificação usando Nodemailer via API
    let emailSent = false
    let verificationLink: string | null = null
    
    try {
      const response = await fetch('/api/auth/send-verification-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, uid: user.uid }),
      })
      
      if (response.ok) {
        const data = await response.json()
        emailSent = true
        verificationLink = data.link || null
      } else {
        const errorData = await response.json()
        console.error('Erro na API de verificação:', errorData.error)
        // Tentar obter o link mesmo em caso de erro parcial
        if (errorData.link) {
          verificationLink = errorData.link
        }
      }
    } catch (apiError: any) {
      console.error('❌ Erro ao enviar e-mail de verificação:', apiError.message || apiError)
      // Não bloquear o cadastro se houver erro ao enviar e-mail
    }

    // Criar perfil do usuário no Firestore via API route (usa Admin SDK)
    // Isso evita problemas de permissão do Firestore
    try {
      // Obter token para passar no header (caso o cookie ainda não esteja disponível)
      const token = await user.getIdToken()
      
      // Sincronizar token primeiro para que a API possa autenticar
      await syncTokenWithServer(user)
      
      const profileResponse = await fetch('/api/auth/create-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          name,
          email,
          period,
          institution,
        }),
      })

      if (!profileResponse.ok) {
        const errorData = await profileResponse.json()
        console.error('Erro ao criar perfil:', errorData.error)
        throw new Error(errorData.error || 'Erro ao criar perfil do usuário')
      }
    } catch (profileError: any) {
      console.error('❌ Erro ao criar perfil do usuário:', profileError.message || profileError)
      // Se falhar ao criar perfil, ainda tentar continuar, mas logar o erro
      throw new Error(profileError.message || 'Erro ao criar perfil. Tente novamente.')
    }
    
    // Incrementar rate limit após sucesso
    try {
      await fetch('/api/auth/increment-rate-limit', {
        method: 'PUT',
      })
    } catch (error) {
      console.error('Erro ao incrementar rate limit:', error)
      // Não bloquear o cadastro se houver erro
    }
    
    // Sincronizar token após cadastro
    await syncTokenWithServer(user)
    
    // O usuário pode usar o botão de reenviar na página de login se necessário
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

  const resendVerificationEmail = async (email: string) => {
    try {
      // Usar a API que envia e-mail via Nodemailer
      // Se temos o usuário logado, usar o UID
      const uid = auth.currentUser && auth.currentUser.email === email ? auth.currentUser.uid : undefined
      
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        
        // Se a rota resend-verification não funcionar, tentar send-verification-email
        if (response.status === 404 || response.status === 500) {
          const fallbackResponse = await fetch('/api/auth/send-verification-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, uid }),
          })
          
          if (fallbackResponse.ok) {
            const data = await fallbackResponse.json()
            if (data.success) {
              return
            }
            
            if (data.warning) {
              throw new Error(data.warning)
            }
          }
        }
        
        throw new Error(errorData.error || 'Erro ao reenviar e-mail de verificação')
      }

      const data = await response.json()
      if (data.alreadyVerified) {
        throw new Error('E-mail já está verificado')
      }
      
    } catch (error: any) {
      // Se o erro for de usuário não encontrado ou similar, relançar
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
        throw error
      }
      // Para outros erros, tentar usar a mensagem de erro ou uma mensagem genérica
      throw new Error(error.message || 'Erro ao reenviar e-mail de verificação. Verifique se o e-mail está correto.')
    }
  }

  return (
    <AuthContext.Provider value={{ user, userProfile, userRole, loading, signIn, signUp, logout, refreshUserRole, refreshUserProfile, resetPassword, resendVerificationEmail }}>
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

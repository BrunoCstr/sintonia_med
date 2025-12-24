'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'

/**
 * Hook para verificar se o usuário tem plano premium ativo
 */
export function usePremium() {
  const { userProfile, refreshUserProfile } = useAuth()
  const [hasCheckedExpired, setHasCheckedExpired] = useState(false)

  // Verificar plano expirado uma vez quando o componente monta
  useEffect(() => {
    if (!hasCheckedExpired && userProfile?.plan && userProfile?.planExpiresAt) {
      const checkExpired = async () => {
        try {
          const response = await fetch('/api/user/check-expired-plan', {
            method: 'POST',
            credentials: 'include',
          })
          
          if (response.ok) {
            const data = await response.json()
            if (data.expired) {
              // Plano expirou, atualizar perfil
              await refreshUserProfile()
            }
          }
        } catch (error) {
          console.error('Erro ao verificar plano expirado:', error)
        } finally {
          setHasCheckedExpired(true)
        }
      }
      
      checkExpired()
    }
  }, [userProfile, hasCheckedExpired, refreshUserProfile])

  const isPremium = () => {
    if (!userProfile?.plan) return false
    
    // Plano vitalício é sempre ativo
    if (userProfile.plan === 'lifetime') {
      return true
    }
    
    // Verificar se o plano não expirou
    if (userProfile.planExpiresAt) {
      const expiresAt = new Date(userProfile.planExpiresAt)
      const now = new Date()
      return expiresAt > now
    }

    // Se não tem data de expiração, considerar como ativo
    return true
  }
  
  const isLifetime = userProfile?.plan === 'lifetime'

  return {
    isPremium: isPremium(),
    isLifetime,
    plan: userProfile?.plan || null,
    planExpiresAt: userProfile?.planExpiresAt || null,
  }
}






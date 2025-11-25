'use client'

import { useAuth } from '@/lib/auth-context'

/**
 * Hook para verificar se o usuário tem plano premium ativo
 */
export function usePremium() {
  const { userProfile } = useAuth()

  const isPremium = () => {
    if (!userProfile?.plan) return false
    
    // Verificar se o plano não expirou
    if (userProfile.planExpiresAt) {
      const expiresAt = new Date(userProfile.planExpiresAt)
      const now = new Date()
      return expiresAt > now
    }

    // Se não tem data de expiração, considerar como ativo
    return true
  }

  return {
    isPremium: isPremium(),
    plan: userProfile?.plan || null,
    planExpiresAt: userProfile?.planExpiresAt || null,
  }
}





'use client'

import { useAuth } from '@/lib/auth-context'
import { UserRole } from '@/lib/types'

export function useRole() {
  const { userRole, loading } = useAuth()

  const isAluno = userRole === 'aluno'
  const isAdminMaster = userRole === 'admin_master'
  const isAdminQuestoes = userRole === 'admin_questoes'
  const isAnyAdmin = isAdminMaster || isAdminQuestoes

  const hasAccessToQuestions = isAnyAdmin || isAdminMaster
  const hasAccessToUsers = isAdminMaster
  const hasAccessToReports = isAdminMaster
  const hasAccessToAdminPanel = isAnyAdmin

  return {
    userRole,
    loading,
    isAluno,
    isAdminMaster,
    isAdminQuestoes,
    isAnyAdmin,
    hasAccessToQuestions,
    hasAccessToUsers,
    hasAccessToReports,
    hasAccessToAdminPanel,
  }
}

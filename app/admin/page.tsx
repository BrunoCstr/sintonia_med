'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileQuestion, Users, Flag, TrendingUp, Loader2, Stethoscope } from 'lucide-react'
import { useRole } from '@/lib/hooks/use-role'
import { useState, useEffect } from 'react'

interface AdminStats {
  totalQuestions: number
  questionsThisWeek: number
  activeUsers?: number
  usersThisMonth?: number
  pendingReports?: number
  growthRate?: number
}

export default function AdminDashboardPage() {
  const { userRole, isAdminMaster } = useRole()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch('/api/admin/stats', {
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Erro ao buscar estatísticas')
        }

        const data = await response.json()
        if (data.success && data.stats) {
          setStats(data.stats)
        } else {
          throw new Error('Dados inválidos retornados')
        }
      } catch (err: any) {
        console.error('Erro ao buscar estatísticas:', err)
        setError(err.message || 'Erro ao carregar estatísticas')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('pt-BR').format(num)
  }

  const formatGrowthRate = (rate: number) => {
    const sign = rate >= 0 ? '+' : ''
    return `${sign}${rate.toFixed(1)}%`
  }

  return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Painel Administrativo
          </h1>
          <p className="text-muted-foreground">
            Bem-vindo ao painel de administração do SintoniaMed
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Questões
              </CardTitle>
              <FileQuestion className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Carregando...</span>
                </div>
              ) : error ? (
                <div className="text-sm text-destructive">Erro ao carregar</div>
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {stats ? formatNumber(stats.totalQuestions) : '0'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats && stats.questionsThisWeek > 0
                      ? `+${formatNumber(stats.questionsThisWeek)} esta semana`
                      : 'Nenhuma esta semana'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {isAdminMaster && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Usuários Ativos
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Carregando...</span>
                    </div>
                  ) : error ? (
                    <div className="text-sm text-destructive">Erro ao carregar</div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold">
                        {stats?.activeUsers !== undefined ? formatNumber(stats.activeUsers) : '0'}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {stats && stats.usersThisMonth !== undefined && stats.usersThisMonth > 0
                          ? `+${formatNumber(stats.usersThisMonth)} este mês`
                          : 'Nenhum este mês'}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Reports Pendentes
                  </CardTitle>
                  <Flag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Carregando...</span>
                    </div>
                  ) : error ? (
                    <div className="text-sm text-destructive">Erro ao carregar</div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold">
                        {stats?.pendingReports !== undefined ? formatNumber(stats.pendingReports) : '0'}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {stats && stats.pendingReports !== undefined && stats.pendingReports > 0
                          ? 'Requer atenção'
                          : 'Nenhum pendente'}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Taxa de Crescimento
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Carregando...</span>
                    </div>
                  ) : error ? (
                    <div className="text-sm text-destructive">Erro ao carregar</div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold">
                        {stats?.growthRate !== undefined
                          ? formatGrowthRate(stats.growthRate)
                          : '0%'}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        vs. mês anterior
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>
              Acesso rápido às funcionalidades principais
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <a
              href="/admin/questions/new"
              className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
            >
              <FileQuestion className="h-8 w-8 text-primary" />
              <div>
                <div className="font-medium">Adicionar Questão</div>
                <div className="text-sm text-muted-foreground">
                  Criar nova questão no banco
                </div>
              </div>
            </a>

            <a
              href="/admin/medical-areas"
              className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
            >
              <Stethoscope className="h-8 w-8 text-primary" />
              <div>
                <div className="font-medium">Áreas Médicas</div>
                <div className="text-sm text-muted-foreground">
                  Gerenciar áreas e subáreas médicas
                </div>
              </div>
            </a>

            {isAdminMaster && (
              <>
                <a
                  href="/admin/users"
                  className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
                >
                  <Users className="h-8 w-8 text-primary" />
                  <div>
                    <div className="font-medium">Gerenciar Usuários</div>
                    <div className="text-sm text-muted-foreground">
                      Ver e editar usuários
                    </div>
                  </div>
                </a>

                <a
                  href="/admin/reports"
                  className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
                >
                  <Flag className="h-8 w-8 text-primary" />
                  <div>
                    <div className="font-medium">Ver Reports</div>
                    <div className="text-sm text-muted-foreground">
                      Revisar erros reportados
                    </div>
                  </div>
                </a>
              </>
            )}
          </CardContent>
        </Card>
      </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useRole } from '@/lib/hooks/use-role'
import { usePremium } from '@/lib/hooks/use-premium'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Brain, TrendingUp, Calendar, Target, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react'
import { PlansWelcomeDialog } from '@/components/plans-welcome-dialog'

// Cor vermelha da paleta (#90091C - Deep crimson)
const CHART_COLOR = '#90091C'

const COLORS = [
  '#90091C', // Vermelho principal da paleta
  '#700712', // Vermelho mais escuro
  '#B00B24', // Vermelho um pouco mais claro
  '#50040A', // Vermelho muito escuro
  '#D00D2C', // Vermelho mais claro
]

export default function DashboardPage() {
  const { user, userProfile, loading } = useAuth()
  const { userRole, isAdminMaster, isAdminQuestoes } = useRole()
  const { isPremium } = usePremium()
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [showPlansDialog, setShowPlansDialog] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      loadDashboardStats()
    }
  }, [user])

  // Mostrar dialog de planos para usuários free somente uma vez após login
  useEffect(() => {
    if (!loading && user && userProfile && !isPremium) {
      // Verificar se o modal já foi mostrado nesta sessão
      if (typeof window !== 'undefined') {
        const hasSeenInSession = sessionStorage.getItem('plansWelcomeShown') === 'true'
        const justLoggedIn = sessionStorage.getItem('justLoggedIn') === 'true'
        
        // Se acabou de fazer login (incluindo primeiro login após cadastro), mostrar o dialog
        if (justLoggedIn) {
          sessionStorage.removeItem('justLoggedIn')
          const timer = setTimeout(() => {
            setShowPlansDialog(true)
            sessionStorage.setItem('plansWelcomeShown', 'true')
          }, 1500)
          return () => clearTimeout(timer)
        }
        
        // Se não viu ainda nesta sessão e não acabou de fazer login, mostrar também
        // Isso garante que novos usuários vejam o dialog mesmo se a flag justLoggedIn não foi setada
        if (!hasSeenInSession) {
          // Verificar se é um novo usuário (criado hoje)
          let isNewUser = false
          if (userProfile.createdAt) {
            try {
              const userCreatedAt = typeof userProfile.createdAt === 'string' 
                ? new Date(userProfile.createdAt) 
                : userProfile.createdAt instanceof Date 
                  ? userProfile.createdAt 
                  : null
              
              if (userCreatedAt && !isNaN(userCreatedAt.getTime())) {
                isNewUser = (Date.now() - userCreatedAt.getTime()) < 24 * 60 * 60 * 1000 // Criado nas últimas 24h
              }
            } catch (e) {
              console.error('Erro ao verificar data de criação:', e)
            }
          }
          
          // Mostrar para novos usuários ou se nunca viu o dialog
          if (isNewUser || !hasSeenInSession) {
            const timer = setTimeout(() => {
              setShowPlansDialog(true)
              sessionStorage.setItem('plansWelcomeShown', 'true')
            }, 1500)
            return () => clearTimeout(timer)
          }
        }
      }
    } else if (isPremium) {
      // Se o usuário se tornou premium, fechar o dialog
      setShowPlansDialog(false)
    }
  }, [loading, user, userProfile, isPremium])

  const loadDashboardStats = async () => {
    try {
      setLoadingStats(true)
      const response = await fetch('/api/user/dashboard-stats', {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar estatísticas')
      }

      const data = await response.json()
      setDashboardData(data)
    } catch (error) {
      console.error('Erro ao carregar estatísticas do dashboard:', error)
      // Usar dados padrão em caso de erro
      setDashboardData({
        stats: {
          today: 0,
          week: 0,
          month: 0,
          total: 0,
          accuracyRate: 0,
          totalCorrect: 0,
          totalIncorrect: 0,
        },
        weeklyData: [],
        subjectData: [],
        errorsBySubject: [],
      })
    } finally {
      setLoadingStats(false)
    }
  }

  if (loading || !user || !userProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  const stats = dashboardData?.stats || {
    today: 0,
    week: 0,
    month: 0,
    total: 0,
    accuracyRate: 0,
    totalCorrect: 0,
    totalIncorrect: 0,
  }

  const weeklyData = dashboardData?.weeklyData || []
  const subjectData = dashboardData?.subjectData || []
  const errorsBySubject = dashboardData?.errorsBySubject || []

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Olá, {userProfile.name.split(' ')[0]}!</h1>
          <p className="text-muted-foreground">
            Bem-vindo de volta ao seu painel de estudos
          </p>
        </div>

        {/* CTA Button - Top */}
        <Card className="mb-6 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 border-2 border-primary/20">
          <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6">
            <div className="flex items-center gap-4">
              <Brain className="h-10 w-10 text-primary" />
              <div>
                <h3 className="text-xl font-bold">Pronto para mais questões?</h3>
                <p className="text-sm text-muted-foreground">
                  Crie um simulado personalizado e continue evoluindo
                </p>
              </div>
            </div>
            <Button size="lg" onClick={() => router.push('/generator')} className="w-full sm:w-auto cursor-pointer">
              Gerar Lista de Questões
            </Button>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hoje</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.today}</div>
                  <p className="text-xs text-muted-foreground">questões respondidas</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.week}</div>
                  <p className="text-xs text-muted-foreground">questões respondidas</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Este Mês</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.month}</div>
                  <p className="text-xs text-muted-foreground">questões respondidas</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Geral</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.total.toLocaleString('pt-BR')}</div>
                  <p className="text-xs text-muted-foreground">questões respondidas</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Overall Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Desempenho Geral</CardTitle>
            <CardDescription>Seu percentual de acertos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingStats ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <span className="text-sm">Acertos</span>
                  </div>
                  <span className="text-2xl font-bold text-success">{stats.accuracyRate}%</span>
                </div>
                <Progress value={stats.accuracyRate} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{stats.totalCorrect.toLocaleString('pt-BR')} acertos</span>
                  <span>{stats.totalIncorrect.toLocaleString('pt-BR')} erros</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Performance Evolution */}
          <Card>
            <CardHeader>
              <CardTitle>Evolução Semanal</CardTitle>
              <CardDescription>Percentual de acertos por dia</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <div className="flex items-center justify-center h-[300px]">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : weeklyData.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  <p>Nenhum dado disponível ainda</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="acertos"
                      stroke={CHART_COLOR}
                      strokeWidth={2}
                      dot={{ fill: CHART_COLOR }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Errors by Subject */}
          <Card>
            <CardHeader>
              <CardTitle>Assuntos com Mais Erros</CardTitle>
              <CardDescription>Top 5 áreas para revisar</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <div className="flex items-center justify-center h-[300px]">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : errorsBySubject.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  <p>Nenhum dado disponível ainda</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={errorsBySubject}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}%`}
                      outerRadius={80}
                      fill={CHART_COLOR}
                      dataKey="value"
                    >
                      {errorsBySubject.map((entry: { name: string; value: number }, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Subject Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Desempenho por Matéria</CardTitle>
            <CardDescription>Percentual de acertos em cada disciplina</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="flex items-center justify-center h-[350px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : subjectData.length === 0 ? (
              <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                <p>Nenhum dado disponível ainda</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={subjectData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="subject" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="correct" fill={CHART_COLOR} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* CTA Button */}
        <Card className="bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <Brain className="h-12 w-12 text-primary" />
            <div>
              <h3 className="mb-2 text-2xl font-bold">Pronto para mais questões?</h3>
              <p className="text-muted-foreground">
                Crie um simulado personalizado e continue evoluindo
              </p>
            </div>
            <Button size="lg" onClick={() => router.push('/generator')} className="cursor-pointer">
              Gerar Lista de Questões
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Plans Welcome Dialog */}
      <PlansWelcomeDialog 
        open={showPlansDialog} 
        onOpenChange={setShowPlansDialog}
      />
    </DashboardLayout>
  )
}

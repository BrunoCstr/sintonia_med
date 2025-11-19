'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useRole } from '@/lib/hooks/use-role'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Brain, TrendingUp, Calendar, Target, CheckCircle2, XCircle, Clock } from 'lucide-react'

// Mock data for charts
const performanceData = [
  { name: 'Seg', acertos: 65 },
  { name: 'Ter', acertos: 72 },
  { name: 'Qua', acertos: 68 },
  { name: 'Qui', acertos: 78 },
  { name: 'Sex', acertos: 85 },
  { name: 'Sáb', acertos: 80 },
  { name: 'Dom', acertos: 75 },
]

const subjectData = [
  { subject: 'Anatomia', correct: 85, total: 100 },
  { subject: 'Fisiologia', correct: 72, total: 100 },
  { subject: 'Patologia', correct: 68, total: 100 },
  { subject: 'Farmacologia', correct: 78, total: 100 },
  { subject: 'Clínica Médica', correct: 90, total: 100 },
]

const errorsBySubject = [
  { name: 'Cardiologia', value: 18 },
  { name: 'Neurologia', value: 15 },
  { name: 'Gastro', value: 12 },
  { name: 'Respiratório', value: 10 },
  { name: 'Outros', value: 8 },
]

const COLORS = ['#4A5FCC', '#5B7ED8', '#7C9FE5', '#9DBFF1', '#BEDFFE']

export default function DashboardPage() {
  const { user, userProfile, loading } = useAuth()
  const { userRole, isAdminMaster, isAdminQuestoes } = useRole()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth/login')
      } else if (userRole && (isAdminMaster || isAdminQuestoes)) {
        router.push('/admin')
      }
    }
  }, [user, loading, userRole, isAdminMaster, isAdminQuestoes, router])

  if (loading || !user || !userProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (isAdminMaster || isAdminQuestoes) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold">Olá, {userProfile.name.split(' ')[0]}!</h1>
          <p className="text-muted-foreground">
            Bem-vindo de volta ao seu painel de estudos
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hoje</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">15</div>
              <p className="text-xs text-muted-foreground">questões respondidas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">127</div>
              <p className="text-xs text-muted-foreground">questões respondidas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Este Mês</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">543</div>
              <p className="text-xs text-muted-foreground">questões respondidas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Geral</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1.247</div>
              <p className="text-xs text-muted-foreground">questões respondidas</p>
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span className="text-sm">Acertos</span>
              </div>
              <span className="text-2xl font-bold text-success">76%</span>
            </div>
            <Progress value={76} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>948 acertos</span>
              <span>299 erros</span>
            </div>
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
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceData}>
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
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Errors by Subject */}
          <Card>
            <CardHeader>
              <CardTitle>Assuntos com Mais Erros</CardTitle>
              <CardDescription>Top 5 áreas para revisar</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={errorsBySubject}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {errorsBySubject.map((entry, index) => (
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
                <Bar dataKey="correct" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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
            <Button size="lg" onClick={() => router.push('/generator')}>
              Gerar Lista de Questões
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

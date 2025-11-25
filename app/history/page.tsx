'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, CheckCircle2, XCircle, Eye } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'

interface QuizResult {
  id: string
  questionsCount: number
  correctCount: number
  incorrectCount: number
  percentage: number
  subjects: string[]
  timeSpent: number | null
  createdAt: Date
  updatedAt: Date
}

interface HistoryStats {
  totalQuizzes: number
  totalQuestions: number
  averagePercentage: number
}

export default function HistoryPage() {
  const { user } = useAuth()
  const [results, setResults] = useState<QuizResult[]>([])
  const [stats, setStats] = useState<HistoryStats>({
    totalQuizzes: 0,
    totalQuestions: 0,
    averagePercentage: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadHistory = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch('/api/user/results', {
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Erro ao carregar histórico')
        }

        const data = await response.json()
        setResults(data.results || [])
        setStats(data.stats || { totalQuizzes: 0, totalQuestions: 0, averagePercentage: 0 })
      } catch (error) {
        console.error('Erro ao carregar histórico:', error)
      } finally {
        setLoading(false)
      }
    }

    loadHistory()
  }, [user])

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return 'N/A'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins} min${secs > 0 ? ` ${secs}s` : ''}`
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Histórico de Simulados</h1>
          <p className="text-muted-foreground">Acompanhe todos os simulados que você realizou</p>
        </div>

        {/* Stats Summary */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total de Simulados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalQuizzes}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Questões Respondidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalQuestions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Média de Acertos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.averagePercentage}%</div>
            </CardContent>
          </Card>
        </div>

        {/* History List */}
        {results.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Você ainda não realizou nenhum simulado.</p>
              <Button className="mt-4" asChild>
                <Link href="/generator">Gerar Primeiro Simulado</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {results.map((quiz) => (
              <Card key={quiz.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        Simulado de {quiz.questionsCount} questões
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(quiz.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}
                        {quiz.timeSpent && (
                          <>
                            <Clock className="ml-2 h-3 w-3" />
                            {formatDuration(quiz.timeSpent)}
                          </>
                        )}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={quiz.percentage >= 70 ? 'default' : 'secondary'}
                      className="text-lg px-3 py-1"
                    >
                      {quiz.percentage}%
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Results */}
                  <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span className="text-sm">
                        <span className="font-semibold text-success">{quiz.correctCount}</span> acertos
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-destructive" />
                      <span className="text-sm">
                        <span className="font-semibold text-destructive">{quiz.incorrectCount}</span> erros
                      </span>
                    </div>
                  </div>

                  {/* Subjects */}
                  {quiz.subjects && quiz.subjects.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {quiz.subjects.map((subject) => (
                        <Badge key={subject} variant="outline">
                          {subject}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/history/${quiz.id}`}>
                      <Eye className="mr-2 h-4 w-4" />
                      Ver Detalhes
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

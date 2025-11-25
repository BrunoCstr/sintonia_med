'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Calendar, Clock, CheckCircle2, XCircle, ArrowLeft, TrendingUp, Target, Award, Circle, Lock, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { usePremium } from '@/lib/hooks/use-premium'
import Image from 'next/image'
import Link from 'next/link'

interface QuizDetail {
  id: string
  questions: any[]
  answers: Record<string, number>
  filters: any
  timeSpent: number | null
  questionsCount: number
  correctCount: number
  incorrectCount: number
  unansweredCount: number
  percentage: number
  subjects: string[]
  createdAt: string
  updatedAt: string
}

export default function HistoryDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuth()
  const { isPremium } = usePremium()
  const [quiz, setQuiz] = useState<QuizDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadQuiz = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/user/results/${id}`, {
          credentials: 'include',
        })

        if (!response.ok) {
          if (response.status === 404) {
            setQuiz(null)
            setLoading(false)
            return
          }
          throw new Error('Erro ao carregar simulado')
        }

        const data = await response.json()
        setQuiz(data.result)
      } catch (error) {
        console.error('Erro ao carregar simulado:', error)
        setQuiz(null)
      } finally {
        setLoading(false)
      }
    }

    loadQuiz()
  }, [id, user])

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

  if (!quiz) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[400px] flex-col items-center justify-center">
          <p className="text-muted-foreground">Simulado não encontrado</p>
          <Button className="mt-4" onClick={() => router.push('/history')}>
            Voltar ao Histórico
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with back button */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/history')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Detalhes do Simulado</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date(quiz.createdAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Performance Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-2 border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Desempenho</CardTitle>
                <Target className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{quiz.percentage}%</div>
              <Progress value={quiz.percentage} className="mt-2 h-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Acertos</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-success" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">{quiz.correctCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                de {quiz.questionsCount} questões
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Erros</CardTitle>
                <XCircle className="h-4 w-4 text-destructive" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{quiz.incorrectCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {quiz.questionsCount > 0 ? ((quiz.incorrectCount / quiz.questionsCount) * 100).toFixed(0) : 0}% das questões
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Tempo</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatDuration(quiz.timeSpent)}</div>
              <p className="text-xs text-muted-foreground mt-1">tempo total</p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Badge */}
        <Card className={cn(
          "border-2",
          quiz.percentage >= 80 ? "border-success/50 bg-success/5" :
          quiz.percentage >= 70 ? "border-primary/50 bg-primary/5" :
          "border-warning/50 bg-warning/5"
        )}>
          <CardContent className="flex items-center gap-4 py-6">
            <div className={cn(
              "rounded-full p-4",
              quiz.percentage >= 80 ? "bg-success/10" :
              quiz.percentage >= 70 ? "bg-primary/10" :
              "bg-warning/10"
            )}>
              <Award className={cn(
                "h-8 w-8",
                quiz.percentage >= 80 ? "text-success" :
                quiz.percentage >= 70 ? "text-primary" :
                "text-warning"
              )} />
            </div>
            <div>
              <h3 className="text-xl font-bold">
                {quiz.percentage >= 80 ? "Excelente Desempenho!" :
                 quiz.percentage >= 70 ? "Bom Desempenho!" :
                 "Continue Praticando!"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {quiz.percentage >= 80 ? "Você está indo muito bem! Continue assim." :
                 quiz.percentage >= 70 ? "Você está no caminho certo. Continue estudando!" :
                 "Revise os conteúdos e tente novamente."}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Subjects Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Matérias Abordadas</CardTitle>
            <CardDescription>Conteúdos cobrados neste simulado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {quiz.subjects.map((subject) => (
                <Badge key={subject} variant="secondary" className="text-sm px-4 py-2">
                  {subject}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Questions Review */}
        {quiz.questions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Revisão das Questões</CardTitle>
              <CardDescription>Veja suas respostas e gabaritos comentados</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {quiz.questions.map((question: any, index: number) => {
                const userAnswer = quiz.answers[question.id]
                const isUnanswered = userAnswer === undefined
                const isCorrect = !isUnanswered && userAnswer === question.correctAnswer
                const letter = (i: number) => String.fromCharCode(65 + i)

                return (
                  <div key={question.id} className="space-y-4 rounded-lg border p-6">
                    {/* Question header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <Badge variant="outline">{question.subject || question.area}</Badge>
                          {!isUnanswered && (
                            <Badge variant={isCorrect ? "default" : "destructive"}>
                              {isCorrect ? (
                                <><CheckCircle2 className="mr-1 h-3 w-3" /> Acertou</>
                              ) : (
                                <><XCircle className="mr-1 h-3 w-3" /> Errou</>
                              )}
                            </Badge>
                          )}
                          {isUnanswered && (
                            <Badge variant="secondary">
                              <Circle className="mr-1 h-3 w-3" /> Não respondida
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-semibold text-lg leading-relaxed">
                          {index + 1}. {question.text}
                        </h4>
                        {question.imagemUrl && (
                          <div className="relative mt-3 h-48 w-full overflow-hidden rounded-lg border">
                            <Image
                              src={question.imagemUrl}
                              alt="Questão"
                              fill
                              className="object-contain"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Alternatives */}
                    <div className="space-y-2">
                      {question.alternatives.map((alt: string, altIndex: number) => {
                        const isUserAnswer = userAnswer === altIndex
                        const isCorrectAnswer = altIndex === question.correctAnswer
                        const showCorrectAnswer = !isUnanswered

                        return (
                          <div
                            key={altIndex}
                            className={cn(
                              "rounded-lg border-2 p-4",
                              showCorrectAnswer && isCorrectAnswer && "border-success bg-success/5",
                              isUserAnswer && !isCorrectAnswer && "border-destructive bg-destructive/5",
                              (!showCorrectAnswer || (!isUserAnswer && !isCorrectAnswer)) && "border-gray-200"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={cn(
                                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold",
                                  showCorrectAnswer && isCorrectAnswer && "border-success bg-success text-white",
                                  isUserAnswer && !isCorrectAnswer && "border-destructive bg-destructive text-white",
                                  (!showCorrectAnswer || (!isUserAnswer && !isCorrectAnswer)) && "border-gray-300"
                                )}
                              >
                                {letter(altIndex)}
                              </div>
                              <div className="flex-1">
                                <p>{alt}</p>
                                {showCorrectAnswer && isCorrectAnswer && (
                                  <p className="mt-1 text-xs font-medium text-success">
                                    ✓ Resposta correta
                                  </p>
                                )}
                                {isUserAnswer && !isCorrectAnswer && (
                                  <p className="mt-1 text-xs font-medium text-destructive">
                                    ✗ Sua resposta
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Explanation - Só mostra se foi respondida */}
                    {!isUnanswered && (
                      <div className="rounded-lg bg-muted/50 p-4">
                        <h5 className="mb-2 flex items-center gap-2 font-semibold">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          Explicação
                          {!isPremium && (
                            <Badge variant="secondary" className="ml-auto">
                              <Lock className="mr-1 h-3 w-3" />
                              Premium
                            </Badge>
                          )}
                        </h5>
                        {isPremium ? (
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {question.explanation || question.comentarioGabarito || 'Sem explicação disponível'}
                          </p>
                        ) : (
                          <div className="space-y-4">
                            <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 bg-background/50 p-6 text-center">
                              <Lock className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
                              <h5 className="mb-2 font-semibold">Gabarito Comentado Premium</h5>
                              <p className="mb-4 text-sm text-muted-foreground">
                                Assine um plano premium para ter acesso ao gabarito comentado completo de todas as questões!
                              </p>
                              <Button asChild className="w-full sm:w-auto">
                                <Link href="/plans">
                                  <Crown className="mr-2 h-4 w-4" />
                                  Assinar Agora
                                </Link>
                              </Button>
                            </div>
                            {/* Show basic explanation for free users - truncated and blurred */}
                            {(question.explanation || question.comentarioGabarito) && (
                              <div className="rounded-lg border p-3 relative max-h-32 overflow-hidden">
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  Resposta Correta: {String.fromCharCode(65 + question.correctAnswer)}
                                </p>
                                <p className={cn(
                                  "text-xs text-muted-foreground/70 blur-sm select-none pointer-events-none line-clamp-3 break-words whitespace-normal"
                                )}>
                                  {(() => {
                                    const text = question.explanation || question.comentarioGabarito || ''
                                    return text.length > 150 ? text.substring(0, 150) + '...' : text
                                  })()}
                                </p>
                                <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-lg">
                                  <Lock className="h-6 w-6 text-muted-foreground/50" />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Mensagem para questões não respondidas */}
                    {isUnanswered && (
                      <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 p-4 text-center">
                        <Circle className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">
                          Questão não respondida - Gabarito não revelado
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <Card>
          <CardContent className="flex flex-col sm:flex-row gap-4 py-6">
            <Button className="flex-1" asChild>
              <a href="/generator">
                Gerar Novo Simulado
              </a>
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => router.push('/history')}>
              Voltar ao Histórico
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

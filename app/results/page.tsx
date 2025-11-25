'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Circle, ChevronDown, Flag, BarChart3, Home, RefreshCw, Lock, Crown } from 'lucide-react'
import { type Question } from '@/lib/mock-data'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { usePremium } from '@/lib/hooks/use-premium'
import Image from 'next/image'
import Link from 'next/link'

export default function ResultsPage() {
  const [results, setResults] = useState<{ questions: Question[]; answers: Record<string, number> } | null>(null)
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set())
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [reportQuestionId, setReportQuestionId] = useState<string | null>(null)
  const [reportTypes, setReportTypes] = useState<string[]>([])
  const [reportDescription, setReportDescription] = useState('')
  const router = useRouter()
  const { userProfile } = useAuth()
  const { isPremium } = usePremium()

  useEffect(() => {
    const resultsStr = localStorage.getItem('quizResults')
    if (!resultsStr) {
      router.push('/generator')
      return
    }

    const data = JSON.parse(resultsStr)
    setResults(data)
  }, [router])

  if (!results) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  const { questions, answers } = results
  const correctCount = questions.filter((q) => answers[q.id] === q.correctAnswer).length
  const incorrectCount = questions.filter(
    (q) => answers[q.id] !== undefined && answers[q.id] !== q.correctAnswer
  ).length
  const unansweredCount = questions.filter((q) => answers[q.id] === undefined).length
  const percentage = Math.round((correctCount / questions.length) * 100)

  const toggleQuestion = (id: string) => {
    setExpandedQuestions((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const handleReport = (questionId: string) => {
    setReportQuestionId(questionId)
    setReportTypes([])
    setReportDescription('')
    setShowReportDialog(true)
  }

  const submitReport = () => {
    console.log('[v0] Report submitted:', {
      questionId: reportQuestionId,
      types: reportTypes,
      description: reportDescription,
      user: userProfile?.email,
      date: new Date(),
    })
    setShowReportDialog(false)
    alert('Relatório enviado com sucesso! Agradecemos sua contribuição.')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-8">
      <div className="container mx-auto max-w-4xl px-4">
        {/* Results Summary */}
        <Card className="mb-8">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Simulado Concluído!</CardTitle>
            <CardDescription>Veja seu desempenho abaixo</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="mb-2 text-6xl font-bold text-primary">{percentage}%</div>
              <p className="text-muted-foreground">de acertos</p>
            </div>

            <Progress value={percentage} className="h-3" />

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <span className="text-2xl font-bold text-success">{correctCount}</span>
                </div>
                <p className="text-sm text-muted-foreground">Acertos</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <XCircle className="h-5 w-5 text-destructive" />
                  <span className="text-2xl font-bold text-destructive">{incorrectCount}</span>
                </div>
                <p className="text-sm text-muted-foreground">Erros</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Circle className="h-5 w-5 text-muted-foreground" />
                  <span className="text-2xl font-bold text-muted-foreground">{unansweredCount}</span>
                </div>
                <p className="text-sm text-muted-foreground">Não respondidas</p>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-wrap gap-2 justify-center">
            <Button onClick={() => router.push('/generator')}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Novo Simulado
            </Button>
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              <Home className="mr-2 h-4 w-4" />
              Ir para Dashboard
            </Button>
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              <BarChart3 className="mr-2 h-4 w-4" />
              Ver Estatísticas
            </Button>
          </CardFooter>
        </Card>

        {/* Questions Review */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Revisão das Questões</h2>

          {questions.map((question, index) => {
            const userAnswer = answers[question.id]
            const isCorrect = userAnswer === question.correctAnswer
            const isUnanswered = userAnswer === undefined
            const isExpanded = expandedQuestions.has(question.id)

            return (
              <Card
                key={question.id}
                className={cn(
                  'border-l-4',
                  isCorrect && 'border-l-success',
                  !isCorrect && !isUnanswered && 'border-l-destructive',
                  isUnanswered && 'border-l-muted-foreground'
                )}
              >
                <Collapsible open={isExpanded} onOpenChange={() => toggleQuestion(question.id)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div
                            className={cn(
                              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-semibold',
                              isCorrect && 'bg-success/10 text-success',
                              !isCorrect && !isUnanswered && 'bg-destructive/10 text-destructive',
                              isUnanswered && 'bg-muted text-muted-foreground'
                            )}
                          >
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base leading-relaxed">
                              {question.text}
                            </CardTitle>
                            {/* Image if exists */}
                            {(question as any).imagemUrl && (
                              <div className="relative mt-3 h-48 w-full overflow-hidden rounded-lg border">
                                <Image
                                  src={(question as any).imagemUrl}
                                  alt="Questão"
                                  fill
                                  className="object-contain"
                                />
                              </div>
                            )}
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                {question.subject}
                              </span>
                              {isCorrect && (
                                <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                                  Acertou
                                </span>
                              )}
                              {!isCorrect && !isUnanswered && (
                                <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                                  Errou
                                </span>
                              )}
                              {isUnanswered && (
                                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                  Não respondida
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <ChevronDown
                          className={cn(
                            'h-5 w-5 shrink-0 transition-transform text-muted-foreground',
                            isExpanded && 'rotate-180'
                          )}
                        />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="space-y-4 pt-0">
                      {/* Alternatives */}
                      <div className="space-y-2">
                        {question.alternatives.map((alt, altIndex) => {
                          const isUserAnswer = userAnswer === altIndex
                          const isCorrectAnswer = altIndex === question.correctAnswer
                          const letter = String.fromCharCode(65 + altIndex)

                          return (
                            <div
                              key={altIndex}
                              className={cn(
                                'rounded-lg border-2 p-3',
                                isCorrectAnswer && 'border-success bg-success/5',
                                isUserAnswer && !isCorrectAnswer && 'border-destructive bg-destructive/5',
                                !isUserAnswer && !isCorrectAnswer && 'border-border'
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={cn(
                                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold',
                                    isCorrectAnswer && 'border-success bg-success text-success-foreground',
                                    isUserAnswer &&
                                      !isCorrectAnswer &&
                                      'border-destructive bg-destructive text-destructive-foreground',
                                    !isUserAnswer && !isCorrectAnswer && 'border-muted-foreground/30'
                                  )}
                                >
                                  {letter}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm">{alt}</p>
                                  {isUserAnswer && !isCorrectAnswer && (
                                    <p className="mt-1 text-xs text-destructive">Sua resposta</p>
                                  )}
                                  {isCorrectAnswer && (
                                    <p className="mt-1 text-xs text-success">Resposta correta</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Explanation */}
                      <div className="rounded-lg bg-muted/50 p-4">
                        <h4 className="mb-2 flex items-center gap-2 font-semibold">
                          Gabarito Comentado
                          {!isPremium && (
                            <Badge variant="secondary" className="ml-auto">
                              <Lock className="mr-1 h-3 w-3" />
                              Premium
                            </Badge>
                          )}
                        </h4>
                        {isPremium ? (
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            {(question as any).comentarioGabarito || question.explanation}
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
                            {/* Show basic explanation for free users */}
                            {question.explanation && (
                              <div className="rounded-lg border p-3">
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  Resposta Correta: {String.fromCharCode(65 + question.correctAnswer)}
                                </p>
                                <p className="text-xs text-muted-foreground/70">
                                  {question.explanation.substring(0, 100)}...
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Report Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReport(question.id)}
                        className="w-full sm:w-auto"
                      >
                        <Flag className="mr-2 h-4 w-4" />
                        Relatar Erro
                      </Button>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Relatar Problema</DialogTitle>
            <DialogDescription>
              Encontrou algum erro nesta questão? Nos ajude a melhorar!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3">
              <Label>Tipo de problema</Label>
              {[
                'Duas alternativas corretas',
                'Gabarito trocado',
                'Sem coerência resposta-texto',
                'Outro',
              ].map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={type}
                    checked={reportTypes.includes(type)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setReportTypes((prev) => [...prev, type])
                      } else {
                        setReportTypes((prev) => prev.filter((t) => t !== type))
                      }
                    }}
                  />
                  <label htmlFor={type} className="text-sm leading-none">
                    {type}
                  </label>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição do problema</Label>
              <Textarea
                id="description"
                placeholder="Descreva o problema encontrado..."
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={submitReport} disabled={reportTypes.length === 0}>
              Enviar Relatório
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Collapsible, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ReportDialog } from '@/components/report-dialog'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Circle, ChevronDown, Flag, BarChart3, Home, RefreshCw, Lock, Crown, Sparkles, ArrowRight, Star } from 'lucide-react'
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
  const [favoritedQuestions, setFavoritedQuestions] = useState<Set<string>>(new Set())
  const [favoriteIds, setFavoriteIds] = useState<Record<string, string>>({})
  const [loadingFavorites, setLoadingFavorites] = useState<Record<string, boolean>>({})
  const router = useRouter()
  const { userProfile, user } = useAuth()
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

  // Carregar status de favoritos ao montar o componente
  useEffect(() => {
    if (!user || !results) return

    const checkFavorites = async () => {
      const favoritesMap: Record<string, string> = {}
      const favoritedSet = new Set<string>()

      for (const question of results.questions) {
        try {
          const response = await fetch(`/api/user/favorites/check/${question.id}`, {
            credentials: 'include',
          })
          if (response.ok) {
            const data = await response.json()
            if (data.isFavorited) {
              favoritedSet.add(question.id)
              if (data.favoriteId) {
                favoritesMap[question.id] = data.favoriteId
              }
            }
          }
        } catch (error) {
          console.error('Erro ao verificar favorito:', error)
        }
      }

      setFavoritedQuestions(favoritedSet)
      setFavoriteIds(favoritesMap)
    }

    checkFavorites()
  }, [user, results])

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
    setShowReportDialog(true)
  }

  const handleToggleFavorite = async (question: Question) => {
    if (!user || !results) return

    const isFavorited = favoritedQuestions.has(question.id)
    setLoadingFavorites((prev) => ({ ...prev, [question.id]: true }))

    try {
      if (isFavorited) {
        // Desfavoritar
        const favoriteId = favoriteIds[question.id]
        if (favoriteId) {
          const response = await fetch(`/api/user/favorites/${favoriteId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ archived: true }),
          })

          if (response.ok) {
            setFavoritedQuestions((prev) => {
              const newSet = new Set(prev)
              newSet.delete(question.id)
              return newSet
            })
          }
        }
      } else {
        // Favoritar
        // Preparar dados completos da questão
        const questionData = {
          id: question.id,
          text: question.text,
          alternatives: question.alternatives,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          subject: question.subject,
          difficulty: question.difficulty,
          period: question.period,
          isOfficial: question.isOfficial,
          imagemUrl: (question as any).imagemUrl,
          comentarioGabarito: (question as any).comentarioGabarito || question.explanation,
        }

        const response = await fetch('/api/user/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            questionId: question.id,
            question: questionData,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          setFavoritedQuestions((prev) => new Set(prev).add(question.id))
          if (data.id) {
            setFavoriteIds((prev) => ({ ...prev, [question.id]: data.id }))
          }
        }
      }
    } catch (error) {
      console.error('Erro ao favoritar/desfavoritar:', error)
    } finally {
      setLoadingFavorites((prev) => ({ ...prev, [question.id]: false }))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-8">
      <div className="container mx-auto max-w-4xl px-4 w-full overflow-hidden">
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
            <Button onClick={() => router.push('/generator')} className="cursor-pointer">
              <RefreshCw className="mr-2 h-4 w-4" />
              Novo Simulado
            </Button>
            <Button variant="outline" onClick={() => router.push('/dashboard')} className="cursor-pointer">
              <Home className="mr-2 h-4 w-4" />
              Ir para Dashboard
            </Button>
            <Button variant="outline" onClick={() => router.push('/dashboard')} className="cursor-pointer">
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
                  'w-full max-w-full overflow-hidden border-l-4',
                  isCorrect && 'border-l-success',
                  !isCorrect && !isUnanswered && 'border-l-destructive',
                  isUnanswered && 'border-l-muted-foreground'
                )}
              >
                <Collapsible open={isExpanded} onOpenChange={() => toggleQuestion(question.id)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="w-full max-w-full overflow-hidden">
                      <div className="flex items-center justify-between gap-4 w-full max-w-full">
                        <div className="flex items-center gap-3 flex-1 min-w-0 w-full max-w-full overflow-hidden">
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
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="text-base font-medium">
                              Questão {(index + 1).toString().padStart(2, '0')}
                            </span>
                            <div className="flex flex-wrap gap-2">
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
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Botão de favoritar - sempre visível */}
                          {!isUnanswered && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleToggleFavorite(question)
                              }}
                              disabled={loadingFavorites[question.id]}
                              className="cursor-pointer"
                              title={favoritedQuestions.has(question.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                            >
                              <Star
                                className={cn(
                                  'h-5 w-5 transition-colors',
                                  favoritedQuestions.has(question.id)
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-muted-foreground hover:text-yellow-400'
                                )}
                              />
                            </Button>
                          )}
                          <ChevronDown
                            className={cn(
                              'h-5 w-5 shrink-0 transition-transform text-muted-foreground',
                              isExpanded && 'rotate-180'
                            )}
                          />
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        style={{ overflow: 'hidden' }}
                      >
                        <CardContent className="space-y-4 pt-0">
                      {/* Question Text */}
                      <div className="space-y-3">
                        <div
                          className="prose prose-sm max-w-none break-words text-base leading-relaxed w-full max-w-full overflow-wrap-anywhere"
                          style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                          dangerouslySetInnerHTML={{ __html: question.text }}
                        />
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
                      </div>
                      {/* Alternatives */}
                      <div className="space-y-2">
                        {question.alternatives.map((alt, altIndex) => {
                          const isUserAnswer = userAnswer === altIndex
                          const isCorrectAnswer = altIndex === question.correctAnswer
                          const letter = String.fromCharCode(65 + altIndex)

                          // Se não foi respondida, não mostrar qual é a correta
                          const showCorrectAnswer = !isUnanswered

                          return (
                            <div
                              key={altIndex}
                              className={cn(
                                'rounded-lg border-2 p-3',
                                showCorrectAnswer && isCorrectAnswer && 'border-success bg-success/5',
                                isUserAnswer && !isCorrectAnswer && 'border-destructive bg-destructive/5',
                                !isUserAnswer && (!showCorrectAnswer || !isCorrectAnswer) && 'border-border'
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={cn(
                                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold',
                                    showCorrectAnswer && isCorrectAnswer && 'border-success bg-success text-success-foreground',
                                    isUserAnswer &&
                                      !isCorrectAnswer &&
                                      'border-destructive bg-destructive text-destructive-foreground',
                                    (!showCorrectAnswer || (!isUserAnswer && !isCorrectAnswer)) && 'border-muted-foreground/30'
                                  )}
                                >
                                  {letter}
                                </div>
                                <div className="min-w-0 flex-1 w-full max-w-full overflow-hidden">
                                  <p 
                                    className="break-words whitespace-normal text-sm overflow-wrap-anywhere"
                                    style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                                  >
                                    {alt}
                                  </p>
                                  {isUserAnswer && !isCorrectAnswer && (
                                    <p className="mt-1 text-xs text-destructive">Sua resposta</p>
                                  )}
                                  {showCorrectAnswer && isCorrectAnswer && (
                                    <p className="mt-1 text-xs text-success">Resposta correta</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Explanation - Só mostra se a questão foi respondida */}
                      {!isUnanswered && (
                        <div className="rounded-lg bg-muted/50 p-4">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <h4 className="flex items-center gap-2 font-semibold">
                              Gabarito Comentado
                              {!isPremium && (
                                <Badge variant="secondary">
                                  <Lock className="mr-1 h-3 w-3" />
                                  Premium
                                </Badge>
                              )}
                            </h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleFavorite(question)}
                              disabled={loadingFavorites[question.id]}
                              className="cursor-pointer"
                              title={favoritedQuestions.has(question.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                            >
                              <Star
                                className={cn(
                                  'h-5 w-5 transition-colors',
                                  favoritedQuestions.has(question.id)
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-muted-foreground hover:text-yellow-400'
                                )}
                              />
                            </Button>
                          </div>
                          {isPremium ? (
                            <div
                              className="prose prose-sm max-w-none break-words text-sm leading-relaxed text-muted-foreground"
                              dangerouslySetInnerHTML={{
                                __html: (question as any).comentarioGabarito || question.explanation || '',
                              }}
                            />
                          ) : (
                            <div className="space-y-4">
                              <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 bg-background/50 p-6 text-center">
                                <Lock className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
                                <h5 className="mb-2 font-semibold">Gabarito Comentado Premium</h5>
                                <p className="mb-4 text-sm text-muted-foreground">
                                  Assine um plano premium para ter acesso ao gabarito comentado completo de todas as questões!
                                </p>
                                <Button asChild className="w-full sm:w-auto cursor-pointer">
                                  <Link href="/plans">
                                    <Crown className="mr-2 h-4 w-4" />
                                    Assinar Agora
                                  </Link>
                                </Button>
                              </div>
                              {/* Show basic explanation for free users - truncated and blurred */}
                              {question.explanation && (
                                <div className="rounded-lg border p-3 relative max-h-32 overflow-hidden">
                                  <p className="text-xs font-medium text-muted-foreground mb-1">
                                    Resposta Correta: {String.fromCharCode(65 + question.correctAnswer)}
                                  </p>
                                  <div
                                    className={cn(
                                      "prose prose-sm max-w-none break-words whitespace-normal text-xs text-muted-foreground/70 blur-sm select-none pointer-events-none line-clamp-3"
                                    )}
                                    dangerouslySetInnerHTML={{
                                      __html: question.explanation.length > 150 
                                        ? question.explanation.substring(0, 150) + '...' 
                                        : question.explanation,
                                    }}
                                  />
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
                        <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 p-6 text-center">
                          <Circle className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
                          <h5 className="mb-2 font-semibold">Questão não respondida</h5>
                          <p className="text-sm text-muted-foreground">
                            Como você não respondeu esta questão, o gabarito não será revelado.
                          </p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReport(question.id)}
                          className="cursor-pointer"
                        >
                          <Flag className="mr-2 h-4 w-4" />
                          Relatar Erro
                        </Button>
                      </div>
                        </CardContent>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Collapsible>
              </Card>
            )
          })}
        </div>

        {/* Upgrade Banner for Free Users with 5 questions */}
        {!isPremium && questions.length === 5 && (
          <Card className="mt-8 border-2 border-primary/30 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 shadow-lg">
            <CardContent className="flex flex-col md:flex-row items-center justify-between gap-6 py-8">
              <div className="flex items-start gap-4 flex-1">
                <div className="rounded-full bg-primary/20 p-3">
                  <Crown className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2">Quer mais questões?</h3>
                  <p className="text-muted-foreground mb-4">
                    Você completou sua lista diária de 5 questões no plano gratuito. 
                    Upgrade para premium e tenha acesso a:
                  </p>
                  <ul className="space-y-2 mb-4">
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      <span>Listas ilimitadas</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      <span>Questões ilimitadas</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      <span>Gabarito comentado completo</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      <span>Painel personalizado com gráficos de desempenho</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Button 
                  size="lg" 
                  onClick={() => router.push('/plans')}
                  className="w-full md:w-auto gap-2 cursor-pointer"
                >
                  <Sparkles className="h-4 w-4" />
                  Ver Planos Premium
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/dashboard')}
                  className="w-full md:w-auto cursor-pointer"
                >
                  Continuar Gratuito
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Report Dialog */}
      <ReportDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        questionId={reportQuestionId || undefined}
      />
    </div>
  )
}

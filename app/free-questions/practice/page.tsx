'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import type { Question as QuestionDB } from '@/lib/types'
import { useAuth } from '@/lib/auth-context'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Star, ChevronRight, Scissors, Loader2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Interface para questões no formato do quiz
interface QuizQuestion {
  id: string
  text: string
  alternatives: string[]
  correctAnswer: number
  explanation: string
  subject: string
  difficulty: 'easy' | 'medium' | 'hard'
  period: string
  isOfficial: boolean
  imagemUrl?: string
}

// Converter questão do banco para formato do quiz
function convertQuestionToQuiz(question: QuestionDB, period: string): QuizQuestion {
  const alternatives = [
    question.alternativaA,
    question.alternativaB,
    question.alternativaC,
    question.alternativaD,
  ]
  
  if (question.alternativaE && typeof question.alternativaE === 'string' && question.alternativaE.trim().length > 0) {
    alternatives.push(question.alternativaE)
  }

  const correctAnswerIndex = question.alternativaCorreta.charCodeAt(0) - 65

  const difficultyMap: Record<string, 'easy' | 'medium' | 'hard'> = {
    facil: 'easy',
    medio: 'medium',
    dificil: 'hard',
  }

  return {
    id: question.id,
    text: question.enunciado,
    alternatives,
    correctAnswer: correctAnswerIndex,
    explanation: question.comentarioGabarito,
    subject: question.area,
    difficulty: difficultyMap[question.dificuldade] || 'medium',
    period,
    isOfficial: question.oficial || question.tipo === 'oficial' || (question.tipo?.toLowerCase().includes('oficial') ?? false),
    imagemUrl: question.imagemUrl,
  }
}

export default function FreeQuestionsPracticePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)
  const [loadingFavorite, setLoadingFavorite] = useState(false)
  const [favoriteId, setFavoriteId] = useState<string | null>(null)
  const [disabledAlternatives, setDisabledAlternatives] = useState<Set<number>>(new Set())
  const [scissorsUsed, setScissorsUsed] = useState(false)
  const [filters, setFilters] = useState<{ period: string; sistemas: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Carregar filtros do localStorage
    const filtersStr = localStorage.getItem('freeQuestionsFilters')
    if (!filtersStr) {
      router.push('/free-questions')
      return
    }

    const savedFilters = JSON.parse(filtersStr)
    setFilters(savedFilters)
    loadQuestion(savedFilters)
  }, [router])

  const loadQuestion = useCallback(async (filtersToUse: { period: string; sistemas: string[] }) => {
    try {
      setLoading(true)
      setError(null)
      setSelectedAnswer(null)
      setShowAnswer(false)
      setDisabledAlternatives(new Set())
      setScissorsUsed(false)
      setIsFavorited(false)
      setFavoriteId(null)

      // Construir query string para a API
      const params = new URLSearchParams()
      if (filtersToUse.sistemas && filtersToUse.sistemas.length > 0) {
        params.append('areas', filtersToUse.sistemas.join(','))
      }
      if (filtersToUse.period) {
        params.append('period', filtersToUse.period)
      }
      params.append('limit', '1')
      params.append('excludeAnswered', 'false') // Não excluir questões já respondidas para questões livres

      const response = await fetch(`/api/questions?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Erro ao buscar questão')
      }

      const data = await response.json()
      const questions = data.questions || []

      if (questions.length === 0) {
        setError('Nenhuma questão encontrada com os filtros selecionados.')
        setLoading(false)
        return
      }

      const quizQuestion = convertQuestionToQuiz(questions[0], filtersToUse.period || '')
      setCurrentQuestion(quizQuestion)

      // Verificar se está favoritada
      if (user) {
        const favoriteResponse = await fetch(`/api/user/favorites/check/${quizQuestion.id}`, {
          credentials: 'include',
        })
        if (favoriteResponse.ok) {
          const favoriteData = await favoriteResponse.json()
          setIsFavorited(favoriteData.isFavorited)
          setFavoriteId(favoriteData.favoriteId)
        }
      }

      setLoading(false)
    } catch (error) {
      console.error('Erro ao carregar questão:', error)
      setError('Erro ao carregar questão. Tente novamente.')
      setLoading(false)
    }
  }, [user])

  const handleAnswer = (answerIndex: number) => {
    if (showAnswer) return // Não permitir mudar resposta após mostrar gabarito
    setSelectedAnswer(answerIndex)
  }

  const handleRespond = () => {
    if (selectedAnswer === null) return
    setShowAnswer(true)

    // Salvar no histórico se o usuário estiver logado
    if (user && currentQuestion) {
      fetch('/api/user/question-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ questionIds: [currentQuestion.id] }),
      }).catch((error) => {
        console.error('Erro ao salvar histórico:', error)
      })
    }
  }

  const handleNextQuestion = () => {
    if (filters) {
      loadQuestion(filters)
    }
  }

  const handleToggleFavorite = async () => {
    if (!user || !currentQuestion || loadingFavorite) return

    setLoadingFavorite(true)
    try {
      if (isFavorited && favoriteId) {
        // Desfavoritar (arquivar)
        const response = await fetch(`/api/user/favorites/${favoriteId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ archived: true }),
        })

        if (response.ok) {
          setIsFavorited(false)
          setFavoriteId(null)
        }
      } else {
        // Favoritar
        const questionData = {
          id: currentQuestion.id,
          text: currentQuestion.text,
          alternatives: currentQuestion.alternatives,
          correctAnswer: currentQuestion.correctAnswer,
          explanation: currentQuestion.explanation,
          subject: currentQuestion.subject,
          difficulty: currentQuestion.difficulty,
          period: currentQuestion.period,
          isOfficial: currentQuestion.isOfficial,
          imagemUrl: currentQuestion.imagemUrl,
          comentarioGabarito: currentQuestion.explanation,
        }

        const response = await fetch('/api/user/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            questionId: currentQuestion.id,
            question: questionData,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          setIsFavorited(true)
          if (data.id) {
            setFavoriteId(data.id)
          }
        }
      }
    } catch (error) {
      console.error('Erro ao favoritar/desfavoritar:', error)
    } finally {
      setLoadingFavorite(false)
    }
  }

  const handleScissors = () => {
    if (!currentQuestion || scissorsUsed || showAnswer) return

    // Encontrar índices das alternativas erradas (excluindo a correta)
    const wrongIndices = currentQuestion.alternatives
      .map((_, index) => index)
      .filter((index) => index !== currentQuestion.correctAnswer)

    // Embaralhar e pegar 2 aleatórias
    const shuffled = wrongIndices.sort(() => Math.random() - 0.5)
    const toDisable = shuffled.slice(0, 2)

    setDisabledAlternatives(new Set(toDisable))
    setScissorsUsed(true)
  }

  if (loading && !currentQuestion) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  if (error || !currentQuestion) {
    return (
      <DashboardLayout>
        <div className="container mx-auto max-w-4xl">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || 'Erro ao carregar questão'}</AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button onClick={() => router.push('/free-questions')} variant="outline">
              Voltar para Configuração
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const isCorrect = selectedAnswer === currentQuestion.correctAnswer
  const hasSelectedAnswer = selectedAnswer !== null

  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-4xl px-4">
        {/* Header com botão Próxima Questão */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Questão Livre</h1>
          <Button
            onClick={handleNextQuestion}
            disabled={loading}
            variant="outline"
            className="cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando...
              </>
            ) : (
              <>
                Próxima Questão
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {/* Question Card */}
        <Card className="mb-6 w-full max-w-full overflow-hidden">
          <CardHeader className="w-full max-w-full">
            <div className="mb-4 flex items-start justify-between">
              <div className="mb-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {currentQuestion.subject}
                </span>
                {currentQuestion.period && currentQuestion.period.trim() && (
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                    {currentQuestion.period}
                  </span>
                )}
                {currentQuestion.isOfficial && (
                  <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
                    Oficial
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {/* Botão Tesourinha */}
                {!showAnswer && !scissorsUsed && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleScissors}
                    title="Cortar 2 alternativas erradas"
                    className="cursor-pointer"
                  >
                    <Scissors className="h-4 w-4" />
                  </Button>
                )}
                {/* Botão Favoritar */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleFavorite}
                  disabled={loadingFavorite}
                  className="cursor-pointer"
                >
                  <Star
                    className={cn(
                      'h-4 w-4',
                      isFavorited ? 'fill-yellow-400 text-yellow-400' : ''
                    )}
                  />
                </Button>
              </div>
            </div>
            <div
              className="prose prose-sm max-w-none break-words text-lg leading-relaxed w-full max-w-full overflow-wrap-anywhere"
              style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
              dangerouslySetInnerHTML={{ __html: currentQuestion.text }}
            />
          </CardHeader>

          <CardContent className="space-y-3">
            {/* Image if exists */}
            {currentQuestion.imagemUrl && (
              <div className="relative h-64 w-full overflow-hidden rounded-lg border">
                <Image
                  src={currentQuestion.imagemUrl}
                  alt="Questão"
                  fill
                  className="object-contain"
                />
              </div>
            )}
            {currentQuestion.alternatives.map((alt, index) => {
              const isSelected = selectedAnswer === index
              const isCorrectAnswer = index === currentQuestion.correctAnswer
              const isDisabled = disabledAlternatives.has(index)
              const letter = String.fromCharCode(65 + index)

              // Determinar cor da borda
              let borderColor = ''
              if (showAnswer) {
                if (isCorrectAnswer) {
                  borderColor = 'border-green-500 bg-green-50 dark:bg-green-950'
                } else if (isSelected && !isCorrectAnswer) {
                  borderColor = 'border-red-500 bg-red-50 dark:bg-red-950'
                }
              } else if (isSelected) {
                borderColor = 'border-primary bg-primary/5'
              }

              return (
                <button
                  key={index}
                  onClick={() => handleAnswer(index)}
                  disabled={isDisabled || showAnswer}
                  className={cn(
                    'w-full max-w-full rounded-lg border-2 p-4 text-left transition-all overflow-hidden',
                    isDisabled
                      ? 'opacity-50 cursor-not-allowed border-dashed border-muted-foreground/30 bg-muted/30'
                      : showAnswer
                      ? borderColor
                      : isSelected
                      ? 'border-primary bg-primary/5 hover:border-primary/70 cursor-pointer'
                      : 'border-border bg-card hover:bg-accent hover:border-primary/50 cursor-pointer'
                  )}
                >
                  <div className="flex items-start gap-3 w-full max-w-full">
                    <div
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 font-semibold',
                        isDisabled
                          ? 'border-muted-foreground/30 bg-muted'
                          : showAnswer && isCorrectAnswer
                          ? 'border-green-500 bg-green-500 text-white'
                          : showAnswer && isSelected && !isCorrectAnswer
                          ? 'border-red-500 bg-red-500 text-white'
                          : isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-muted-foreground/30'
                      )}
                    >
                      {letter}
                    </div>
                    <span
                      className="min-w-0 flex-1 break-words whitespace-normal pt-1 overflow-wrap-anywhere"
                      style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                    >
                      {alt}
                    </span>
                  </div>
                </button>
              )
            })}
          </CardContent>
        </Card>

        {/* Botão Responder */}
        {!showAnswer && hasSelectedAnswer && (
          <div className="mb-6 flex justify-center">
            <Button onClick={handleRespond} size="lg" className="cursor-pointer">
              Responder
            </Button>
          </div>
        )}

        {/* Gabarito Comentado */}
        {showAnswer && (
          <Card className="mb-6">
            <CardHeader>
              <h2 className="text-xl font-semibold">Gabarito Comentado</h2>
            </CardHeader>
            <CardContent>
              <div
                className="prose prose-sm max-w-none break-words"
                style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                dangerouslySetInnerHTML={{ __html: currentQuestion.explanation }}
              />
            </CardContent>
          </Card>
        )}

        {/* Botão Próxima Questão (embaixo) */}
        {showAnswer && (
          <div className="mb-6 flex justify-center">
            <Button
              onClick={handleNextQuestion}
              disabled={loading}
              size="lg"
              className="cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Carregando...
                </>
              ) : (
                <>
                  Próxima Questão
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

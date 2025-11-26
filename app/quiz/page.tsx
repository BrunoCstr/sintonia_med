'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Clock, ChevronLeft, ChevronRight, Flag } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import type { Question as QuestionDB } from '@/lib/types'
import { useAuth } from '@/lib/auth-context'
import { usePremium } from '@/lib/hooks/use-premium'

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
    question.alternativaE,
  ]

  const correctAnswerIndex = question.alternativaCorreta.charCodeAt(0) - 65 // A=0, B=1, etc.

  // Mapear dificuldade do banco para o formato do quiz
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
    isOfficial: question.tipo === 'oficial' || question.tipo.toLowerCase().includes('oficial'),
    imagemUrl: question.imagemUrl,
  }
}

export default function QuizPage() {
  const { user } = useAuth()
  const { isPremium } = usePremium()
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [showFinishDialog, setShowFinishDialog] = useState(false)
  const [showNoQuestionsDialog, setShowNoQuestionsDialog] = useState(false)
  const [isFinishing, setIsFinishing] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setLoading(true)
        const filtersStr = localStorage.getItem('quizFilters')
        if (!filtersStr) {
          router.push('/generator')
          return
        }

        const filters = JSON.parse(filtersStr)

        // Construir query string para a API
        const params = new URLSearchParams()
        if (filters.areas && filters.areas.length > 0) {
          params.append('areas', filters.areas.join(','))
        }
        if (filters.difficulty) {
          params.append('dificuldade', filters.difficulty)
        }
        if (filters.officialOnly) {
          params.append('officialOnly', 'true')
        }
        if (filters.tipo) {
          params.append('tipo', filters.tipo)
        }
        params.append('limit', filters.count.toString())
        params.append('excludeAnswered', 'true') // Excluir questões já respondidas por padrão

        const response = await fetch(`/api/questions?${params.toString()}`)
        if (!response.ok) {
          throw new Error('Erro ao buscar questões')
        }

        const data = await response.json()
        const quizQuestions = (data.questions || []).map((q: QuestionDB) =>
          convertQuestionToQuiz(q, filters.period || '')
        )

        if (quizQuestions.length === 0) {
          setLoading(false)
          setShowNoQuestionsDialog(true)
          return
        }

        setQuestions(quizQuestions)

        if (filters.timed && filters.timeLimit) {
          setTimeLeft(filters.timeLimit * 60) // Convert to seconds
        }
        
        setLoading(false)
      } catch (error) {
        console.error('Erro ao carregar questões:', error)
        setLoading(false)
        setShowNoQuestionsDialog(true)
      }
    }

    loadQuestions()
  }, [router])

  const handleAnswer = (questionId: string, answerIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answerIndex }))
  }

  const handleFinish = useCallback(async () => {
    // Prevenir múltiplas chamadas simultâneas
    if (isFinishing) {
      console.log('Já está finalizando, ignorando chamada duplicada')
      return
    }

    setIsFinishing(true)
    
    try {
      // Salvar resultados no localStorage (para compatibilidade com a página de resultados)
      const filtersStr = localStorage.getItem('quizFilters')
      const filters = filtersStr ? JSON.parse(filtersStr) : {}
      
      // Processar questões para localStorage - truncar comentarioGabarito se não for premium
      const questionsForStorage = questions.map((q) => {
        if (!isPremium && (q as any).comentarioGabarito) {
          return {
            ...q,
            comentarioGabarito: (q as any).comentarioGabarito.substring(0, 100) + '...',
            explanation: q.explanation ? q.explanation.substring(0, 100) + '...' : q.explanation,
          }
        }
        return q
      })
      
      localStorage.setItem('quizResults', JSON.stringify({ questions: questionsForStorage, answers }))
      
      // Salvar resultados no Firestore e questões respondidas no histórico
      if (user) {
        try {
        // Calcular tempo gasto (se houver timer)
        const timeSpent = timeLeft !== null && filters.timeLimit 
          ? filters.timeLimit * 60 - timeLeft 
          : null

        // Função helper para remover campos undefined antes de enviar
        const removeUndefinedFields = (obj: any): any => {
          if (obj === null || typeof obj !== 'object') {
            return obj
          }
          if (Array.isArray(obj)) {
            return obj.map(removeUndefinedFields)
          }
          const cleaned: any = {}
          for (const key in obj) {
            if (obj[key] !== undefined) {
              cleaned[key] = typeof obj[key] === 'object' ? removeUndefinedFields(obj[key]) : obj[key]
            }
          }
          return cleaned
        }

        // Limpar questões antes de enviar
        const cleanedQuestions = removeUndefinedFields(questions)

        // Salvar resultado completo no Firestore
        const resultsResponse = await fetch('/api/user/results', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            questions: cleanedQuestions,
            answers,
            filters,
            timeSpent,
          }),
        })

        if (!resultsResponse.ok) {
          const errorData = await resultsResponse.json()
          console.error('Erro ao salvar resultado:', errorData)
          throw new Error(errorData.error || 'Erro ao salvar resultado')
        }

        const resultsData = await resultsResponse.json()
        console.log('Resultado salvo com sucesso:', resultsData.id)

        // Salvar questões respondidas no histórico do Firestore
        const answeredQuestionIds = Object.keys(answers)
        if (answeredQuestionIds.length > 0) {
          const historyResponse = await fetch('/api/user/question-history', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ questionIds: answeredQuestionIds }),
          })

          if (!historyResponse.ok) {
            const errorData = await historyResponse.json()
            console.error('Erro ao salvar histórico de questões:', errorData)
            // Não bloquear o fluxo se houver erro ao salvar histórico
          } else {
            const historyData = await historyResponse.json()
            console.log('Histórico de questões salvo:', historyData.saved, 'questões')
          }
        }
        } catch (error) {
          console.error('Erro ao salvar resultado:', error)
          // Não bloquear o fluxo se houver erro ao salvar
        }
      }
      
      router.push('/results')
    } catch (error) {
      console.error('Erro ao finalizar simulado:', error)
      setIsFinishing(false)
      // Ainda redireciona para results mesmo se houver erro
      router.push('/results')
    }
  }, [questions, answers, user, router, timeLeft, isFinishing])

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          // Finalizar quando o tempo acabar
          handleFinish()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, handleFinish])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  // Se não há questões e não está mostrando o dialog, ainda está carregando
  if (questions.length === 0 && !showNoQuestionsDialog) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  // Se não há questões mas o dialog está aberto, renderizar apenas o dialog
  if (questions.length === 0) {
    return (
      <>
        {/* No Questions Dialog */}
        <AlertDialog open={showNoQuestionsDialog} onOpenChange={setShowNoQuestionsDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Nenhuma questão encontrada</AlertDialogTitle>
              <AlertDialogDescription>
                Não foram encontradas questões com os filtros selecionados.
                <br />
                <br />
                Tente ajustar os filtros ou resete o histórico de questões respondidas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => router.push('/generator')}>
                Voltar ao Gerador
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )
  }

  const currentQuestion = questions[currentIndex]
  const progress = ((currentIndex + 1) / questions.length) * 100
  const answeredCount = Object.keys(answers).length

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-8">
      <div className="container mx-auto max-w-4xl px-4 w-full overflow-hidden">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">
              Questão {currentIndex + 1} de {questions.length}
            </h1>
            {timeLeft !== null && (
              <div className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium",
                timeLeft < 60 ? "bg-destructive/10 text-destructive" : "bg-muted"
              )}>
                <Clock className="h-4 w-4" />
                {formatTime(timeLeft)}
              </div>
            )}
          </div>
          <Button variant="outline" onClick={() => setShowFinishDialog(true)} className="cursor-pointer">
            <Flag className="mr-2 h-4 w-4" />
            Finalizar
          </Button>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <Progress value={progress} className="h-2" />
          <p className="mt-2 text-sm text-muted-foreground">
            {answeredCount} de {questions.length} respondidas
          </p>
        </div>

        {/* Question Card */}
        <Card className="mb-6 w-full max-w-full overflow-hidden">
          <CardHeader className="w-full max-w-full">
            <div className="mb-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {currentQuestion.subject}
              </span>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                {currentQuestion.period}
              </span>
              {currentQuestion.isOfficial && (
                <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
                  Oficial
                </span>
              )}
            </div>
            <CardTitle 
              className="break-words whitespace-normal text-lg leading-relaxed w-full max-w-full overflow-wrap-anywhere"
              style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
            >
              {currentQuestion.text}
            </CardTitle>
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
              const isSelected = answers[currentQuestion.id] === index
              const letter = String.fromCharCode(65 + index) // A, B, C, D, E

              return (
                <button
                  key={index}
                  onClick={() => handleAnswer(currentQuestion.id, index)}
                  className={cn(
                    'w-full max-w-full cursor-pointer rounded-lg border-2 p-4 text-left transition-all hover:border-primary/50 overflow-hidden',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:bg-accent'
                  )}
                >
                  <div className="flex items-start gap-3 w-full max-w-full">
                    <div
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 font-semibold',
                        isSelected
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

          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="cursor-pointer"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Anterior
            </Button>
            <Button
              onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
              disabled={currentIndex === questions.length - 1}
              className="cursor-pointer"
            >
              Próxima
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>

        {/* Question Navigator */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Navegação Rápida</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {questions.map((q, index) => {
                const isAnswered = answers[q.id] !== undefined
                const isCurrent = index === currentIndex

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(index)}
                    className={cn(
                      'flex h-10 w-10 items-center cursor-pointer justify-center rounded-lg border-2 font-medium transition-all',
                      isCurrent && 'border-primary ring-2 ring-primary/20',
                      isAnswered && !isCurrent && 'bg-success/10 border-success text-success',
                      !isAnswered && !isCurrent && 'border-border hover:border-primary/50'
                    )}
                  >
                    {index + 1}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Finish Dialog */}
      <AlertDialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar simulado?</AlertDialogTitle>
            <AlertDialogDescription>
              Você respondeu {answeredCount} de {questions.length} questões.
              {answeredCount < questions.length && (
                <span className="mt-2 block font-medium text-warning">
                  Ainda há {questions.length - answeredCount} questão(ões) não respondida(s).
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinish}>Finalizar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* No Questions Dialog */}
      <AlertDialog open={showNoQuestionsDialog} onOpenChange={setShowNoQuestionsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nenhuma questão encontrada</AlertDialogTitle>
            <AlertDialogDescription>
              Não foram encontradas questões com os filtros selecionados.
              <br />
              <br />
              Tente ajustar os filtros ou resetar o histórico de questões respondidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => router.push('/generator')}>
              Voltar ao Gerador
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

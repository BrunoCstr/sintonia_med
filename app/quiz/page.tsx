'use client'

import { useEffect, useState } from 'react'
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
import { generateQuiz, type Question } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

export default function QuizPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [showFinishDialog, setShowFinishDialog] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const filtersStr = localStorage.getItem('quizFilters')
    if (!filtersStr) {
      router.push('/generator')
      return
    }

    const filters = JSON.parse(filtersStr)
    const quiz = generateQuiz(filters)

    if (quiz.length === 0) {
      alert('Nenhuma questão encontrada com os filtros selecionados')
      router.push('/generator')
      return
    }

    setQuestions(quiz)

    if (filters.timed && filters.timeLimit) {
      setTimeLeft(filters.timeLimit * 60) // Convert to seconds
    }
  }, [router])

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          handleFinish()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft])

  const handleAnswer = (questionId: string, answerIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answerIndex }))
  }

  const handleFinish = () => {
    localStorage.setItem('quizResults', JSON.stringify({ questions, answers }))
    router.push('/results')
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (questions.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  const currentQuestion = questions[currentIndex]
  const progress = ((currentIndex + 1) / questions.length) * 100
  const answeredCount = Object.keys(answers).length

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-8">
      <div className="container mx-auto max-w-4xl px-4">
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
          <Button variant="outline" onClick={() => setShowFinishDialog(true)}>
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
        <Card className="mb-6">
          <CardHeader>
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
            <CardTitle className="text-lg leading-relaxed">{currentQuestion.text}</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {currentQuestion.alternatives.map((alt, index) => {
              const isSelected = answers[currentQuestion.id] === index
              const letter = String.fromCharCode(65 + index) // A, B, C, D, E

              return (
                <button
                  key={index}
                  onClick={() => handleAnswer(currentQuestion.id, index)}
                  className={cn(
                    'w-full rounded-lg border-2 p-4 text-left transition-all hover:border-primary/50',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:bg-accent'
                  )}
                >
                  <div className="flex items-start gap-3">
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
                    <span className="flex-1 pt-1">{alt}</span>
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
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Anterior
            </Button>
            <Button
              onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
              disabled={currentIndex === questions.length - 1}
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
                      'flex h-10 w-10 items-center justify-center rounded-lg border-2 font-medium transition-all',
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
    </div>
  )
}

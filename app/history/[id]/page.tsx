'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Calendar, Clock, CheckCircle2, XCircle, ArrowLeft, TrendingUp, Target, Award } from 'lucide-react'
import { cn } from '@/lib/utils'

// Mock data - in production this would come from Firebase
const mockQuizDetails = {
  '1': {
    id: '1',
    date: new Date('2025-01-15'),
    questionsCount: 20,
    correct: 16,
    incorrect: 4,
    percentage: 80,
    duration: '25 min',
    subjects: ['Cardiologia', 'Anatomia'],
    questions: [
      {
        id: 'q1',
        text: 'Qual é a principal função do ventrículo esquerdo?',
        alternatives: [
          'Receber sangue oxigenado dos pulmões',
          'Bombear sangue para a circulação sistêmica',
          'Bombear sangue para os pulmões',
          'Receber sangue venoso do corpo',
        ],
        correctAnswer: 1,
        userAnswer: 1,
        subject: 'Cardiologia',
        explanation: 'O ventrículo esquerdo é responsável por bombear sangue oxigenado para todo o corpo através da aorta.'
      },
      {
        id: 'q2',
        text: 'Qual osso do crânio articula-se com a mandíbula?',
        alternatives: [
          'Osso temporal',
          'Osso frontal',
          'Osso parietal',
          'Osso occipital',
        ],
        correctAnswer: 0,
        userAnswer: 2,
        subject: 'Anatomia',
        explanation: 'O osso temporal possui a fossa mandibular, que forma a articulação temporomandibular (ATM) com o côndilo da mandíbula.'
      },
    ],
  },
  '2': {
    id: '2',
    date: new Date('2025-01-14'),
    questionsCount: 10,
    correct: 7,
    incorrect: 3,
    percentage: 70,
    duration: '12 min',
    subjects: ['Fisiologia'],
    questions: [],
  },
  '3': {
    id: '3',
    date: new Date('2025-01-13'),
    questionsCount: 30,
    correct: 24,
    incorrect: 6,
    percentage: 80,
    duration: '42 min',
    subjects: ['Patologia', 'Farmacologia', 'Clínica Médica'],
    questions: [],
  },
}

export default function HistoryDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const quiz = mockQuizDetails[id as keyof typeof mockQuizDetails]

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
              {quiz.date.toLocaleDateString('pt-BR', {
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
              <div className="text-3xl font-bold text-success">{quiz.correct}</div>
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
              <div className="text-3xl font-bold text-destructive">{quiz.incorrect}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {((quiz.incorrect / quiz.questionsCount) * 100).toFixed(0)}% das questões
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
              <div className="text-3xl font-bold">{quiz.duration}</div>
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
              {quiz.questions.map((question, index) => {
                const isCorrect = question.userAnswer === question.correctAnswer
                const letter = (i: number) => String.fromCharCode(65 + i)

                return (
                  <div key={question.id} className="space-y-4 rounded-lg border p-6">
                    {/* Question header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <Badge variant="outline">{question.subject}</Badge>
                          <Badge variant={isCorrect ? "default" : "destructive"}>
                            {isCorrect ? (
                              <><CheckCircle2 className="mr-1 h-3 w-3" /> Acertou</>
                            ) : (
                              <><XCircle className="mr-1 h-3 w-3" /> Errou</>
                            )}
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-lg leading-relaxed">
                          {index + 1}. {question.text}
                        </h4>
                      </div>
                    </div>

                    {/* Alternatives */}
                    <div className="space-y-2">
                      {question.alternatives.map((alt, altIndex) => {
                        const isUserAnswer = question.userAnswer === altIndex
                        const isCorrectAnswer = question.correctAnswer === altIndex

                        return (
                          <div
                            key={altIndex}
                            className={cn(
                              "rounded-lg border-2 p-4",
                              isCorrectAnswer && "border-success bg-success/5",
                              isUserAnswer && !isCorrectAnswer && "border-destructive bg-destructive/5",
                              !isUserAnswer && !isCorrectAnswer && "border-gray-200"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={cn(
                                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold",
                                  isCorrectAnswer && "border-success bg-success text-white",
                                  isUserAnswer && !isCorrectAnswer && "border-destructive bg-destructive text-white",
                                  !isUserAnswer && !isCorrectAnswer && "border-gray-300"
                                )}
                              >
                                {letter(altIndex)}
                              </div>
                              <div className="flex-1">
                                <p>{alt}</p>
                                {isCorrectAnswer && (
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

                    {/* Explanation */}
                    <div className="rounded-lg bg-muted/50 p-4">
                      <h5 className="mb-2 flex items-center gap-2 font-semibold">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Explicação
                      </h5>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {question.explanation}
                      </p>
                    </div>
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

'use client'

import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, CheckCircle2, XCircle, Eye } from 'lucide-react'
import Link from 'next/link'

const mockHistory = [
  {
    id: '1',
    date: new Date('2025-01-15'),
    questionsCount: 20,
    correct: 16,
    incorrect: 4,
    percentage: 80,
    duration: '25 min',
    subjects: ['Cardiologia', 'Anatomia'],
  },
  {
    id: '2',
    date: new Date('2025-01-14'),
    questionsCount: 10,
    correct: 7,
    incorrect: 3,
    percentage: 70,
    duration: '12 min',
    subjects: ['Fisiologia'],
  },
  {
    id: '3',
    date: new Date('2025-01-13'),
    questionsCount: 30,
    correct: 24,
    incorrect: 6,
    percentage: 80,
    duration: '42 min',
    subjects: ['Patologia', 'Farmacologia', 'Clínica Médica'],
  },
]

export default function HistoryPage() {
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
              <div className="text-2xl font-bold">23</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Questões Respondidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1.247</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Média de Acertos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">76%</div>
            </CardContent>
          </Card>
        </div>

        {/* History List */}
        <div className="space-y-4">
          {mockHistory.map((quiz) => (
            <Card key={quiz.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      Simulado de {quiz.questionsCount} questões
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Calendar className="h-3 w-3" />
                      {quiz.date.toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                      <Clock className="ml-2 h-3 w-3" />
                      {quiz.duration}
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
                      <span className="font-semibold text-success">{quiz.correct}</span> acertos
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm">
                      <span className="font-semibold text-destructive">{quiz.incorrect}</span> erros
                    </span>
                  </div>
                </div>

                {/* Subjects */}
                <div className="flex flex-wrap gap-2">
                  {quiz.subjects.map((subject) => (
                    <Badge key={subject} variant="outline">
                      {subject}
                    </Badge>
                  ))}
                </div>

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
      </div>
    </DashboardLayout>
  )
}

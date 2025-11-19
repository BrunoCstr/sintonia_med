'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useRole } from '@/lib/hooks/use-role'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Brain, Clock, Filter } from 'lucide-react'

const subjects = [
  'Anatomia',
  'Fisiologia',
  'Bioquímica',
  'Patologia',
  'Farmacologia',
  'Microbiologia',
  'Parasitologia',
  'Imunologia',
  'Cardiologia',
  'Pneumologia',
  'Gastroenterologia',
  'Nefrologia',
  'Endocrinologia',
  'Neurologia',
  'Psiquiatria',
]

export default function GeneratorPage() {
  const { user, userProfile, loading } = useAuth()
  const { isAdminMaster, isAdminQuestoes } = useRole()
  const router = useRouter()
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [difficulty, setDifficulty] = useState('')
  const [officialOnly, setOfficialOnly] = useState(false)
  const [questionCount, setQuestionCount] = useState('10')
  const [timed, setTimed] = useState(false)
  const [timeLimit, setTimeLimit] = useState('30')
  const [errors, setErrors] = useState<{ subjects?: string; difficulty?: string }>({})

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth/login')
      } else if (isAdminMaster || isAdminQuestoes) {
        router.push('/admin')
      }
    }
  }, [user, loading, isAdminMaster, isAdminQuestoes, router])

  const toggleSubject = (subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    )
  }

  const handleGenerate = () => {
    // Reset errors
    setErrors({})

    // Validate subjects
    if (selectedSubjects.length === 0) {
      setErrors((prev) => ({ ...prev, subjects: 'Selecione pelo menos uma matéria' }))
    }

    // Validate difficulty
    if (!difficulty) {
      setErrors((prev) => ({ ...prev, difficulty: 'Selecione a dificuldade' }))
    }

    // If there are errors, don't proceed
    if (selectedSubjects.length === 0 || !difficulty) {
      return
    }

    const filters = {
      period: userProfile?.period || '',
      subjects: selectedSubjects,
      difficulty,
      official: officialOnly,
      count: parseInt(questionCount),
      timed,
      timeLimit: timed ? parseInt(timeLimit) : undefined,
    }

    localStorage.setItem('quizFilters', JSON.stringify(filters))
    router.push('/quiz')
  }

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
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gerar Lista de Questões</h1>
          <p className="text-muted-foreground">
            Personalize seu simulado escolhendo os filtros abaixo
          </p>
          {userProfile?.period && (
            <p className="mt-2 text-sm text-muted-foreground">
              Período: <span className="font-semibold text-foreground">{userProfile.period}</span>
            </p>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros Básicos
            </CardTitle>
            <CardDescription>Configure as características das questões</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>
                Matérias <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {subjects.map((subject) => (
                  <div key={subject} className="flex items-center space-x-2">
                    <Checkbox
                      id={subject}
                      checked={selectedSubjects.includes(subject)}
                      onCheckedChange={() => {
                        toggleSubject(subject)
                        // Clear error when subject is selected
                        if (errors.subjects && selectedSubjects.length === 0) {
                          setErrors((prev) => ({ ...prev, subjects: undefined }))
                        }
                      }}
                    />
                    <label
                      htmlFor={subject}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {subject}
                    </label>
                  </div>
                ))}
              </div>
              {errors.subjects && (
                <p className="text-sm text-destructive">{errors.subjects}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                Dificuldade <span className="text-destructive">*</span>
              </Label>
              <Select
                value={difficulty}
                onValueChange={(value) => {
                  setDifficulty(value)
                  // Clear error when difficulty is selected
                  if (errors.difficulty) {
                    setErrors((prev) => ({ ...prev, difficulty: undefined }))
                  }
                }}
              >
                <SelectTrigger className={errors.difficulty ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecione a dificuldade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Fácil</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="hard">Difícil</SelectItem>
                </SelectContent>
              </Select>
              {errors.difficulty && (
                <p className="text-sm text-destructive">{errors.difficulty}</p>
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Apenas Questões Oficiais</Label>
                <p className="text-sm text-muted-foreground">
                  Incluir somente questões de provas oficiais
                </p>
              </div>
              <Switch checked={officialOnly} onCheckedChange={setOfficialOnly} />
            </div>

            <div className="space-y-2">
              <Label>Número de Questões</Label>
              <Select value={questionCount} onValueChange={setQuestionCount}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 questões</SelectItem>
                  <SelectItem value="10">10 questões</SelectItem>
                  <SelectItem value="20">20 questões</SelectItem>
                  <SelectItem value="30">30 questões</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Modo Cronometrado
            </CardTitle>
            <CardDescription>Adicione um limite de tempo ao simulado</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Ativar cronômetro</Label>
                <p className="text-sm text-muted-foreground">
                  Limite o tempo total para responder as questões
                </p>
              </div>
              <Switch checked={timed} onCheckedChange={setTimed} />
            </div>

            {timed && (
              <div className="space-y-2">
                <Label htmlFor="timeLimit">Tempo total (minutos)</Label>
                <Input
                  id="timeLimit"
                  type="number"
                  min="1"
                  max="180"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <Brain className="h-12 w-12 text-primary" />
            <div>
              <h3 className="mb-2 text-xl font-semibold">Pronto para começar?</h3>
              <p className="text-sm text-muted-foreground">
                {questionCount} questões{' '}
                {timed && `em ${timeLimit} minutos`}
                {selectedSubjects.length > 0 && ` de ${selectedSubjects.length} matéria(s)`}
              </p>
            </div>
            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={parseInt(questionCount) === 0 || selectedSubjects.length === 0 || !difficulty}
            >
              Gerar Simulado
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

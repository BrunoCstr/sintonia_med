'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useRole } from '@/lib/hooks/use-role'
import { usePremium } from '@/lib/hooks/use-premium'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Brain, Clock, Filter, AlertCircle, Crown } from 'lucide-react'
import type { MedicalArea } from '@/lib/types'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Link from 'next/link'

export default function GeneratorPage() {
  const { user, userProfile, loading } = useAuth()
  const { isAdminMaster, isAdminQuestoes } = useRole()
  const { isPremium } = usePremium()
  const router = useRouter()
  const [medicalAreas, setMedicalAreas] = useState<MedicalArea[]>([])
  const [loadingAreas, setLoadingAreas] = useState(true)
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [difficulty, setDifficulty] = useState('')
  const [officialOnly, setOfficialOnly] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all')
  const [questionCount, setQuestionCount] = useState('5')
  const [timed, setTimed] = useState(false)
  const [timeLimit, setTimeLimit] = useState('30')
  const [errors, setErrors] = useState<{ subjects?: string; difficulty?: string; limit?: string }>({})
  const [freeLimits, setFreeLimits] = useState<{ 
    canGenerate: boolean
    maxQuestionsPerDay: number
    questionsGeneratedToday: number
    remainingQuestions: number
    resetTime: number
    timeUntilReset: number
    reason: string | null 
  } | null>(null)
  const [checkingLimits, setCheckingLimits] = useState(true)
  const [timeUntilReset, setTimeUntilReset] = useState<number | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])


  useEffect(() => {
    const checkFreeLimits = async () => {
      if (!user || isPremium) {
        setCheckingLimits(false)
        return
      }

      try {
        const response = await fetch('/api/user/check-free-limits')
        if (response.ok) {
          const data = await response.json()
          setFreeLimits({
            canGenerate: data.canGenerate,
            maxQuestionsPerDay: data.maxQuestionsPerDay || 5,
            questionsGeneratedToday: data.questionsGeneratedToday || 0,
            remainingQuestions: data.remainingQuestions || 5,
            resetTime: data.resetTime,
            timeUntilReset: data.timeUntilReset,
            reason: data.reason,
          })
          setTimeUntilReset(data.timeUntilReset)
        }
      } catch (error) {
        console.error('Erro ao verificar limitações:', error)
      } finally {
        setCheckingLimits(false)
      }
    }

    if (user && !loading) {
      checkFreeLimits()
      // Atualizar a cada minuto
      const interval = setInterval(() => {
        checkFreeLimits()
      }, 60000) // 1 minuto
      
      // Atualizar quando a página ganha foco (usuário volta para a aba)
      const handleFocus = () => {
        checkFreeLimits()
      }
      window.addEventListener('focus', handleFocus)
      
      return () => {
        clearInterval(interval)
        window.removeEventListener('focus', handleFocus)
      }
    }
  }, [user, loading, isPremium])

  // Atualizar contador de tempo a cada segundo
  useEffect(() => {
    if (!freeLimits || isPremium || !freeLimits.resetTime) return

    const interval = setInterval(() => {
      const now = Date.now()
      const remaining = freeLimits.resetTime - now
      setTimeUntilReset(Math.max(0, remaining))
      
      // Se chegou a meia-noite, recarregar limites
      if (remaining <= 0) {
        setFreeLimits(prev => prev ? {
          ...prev,
          canGenerate: true,
          questionsGeneratedToday: 0,
          remainingQuestions: prev.maxQuestionsPerDay,
          timeUntilReset: 24 * 60 * 60 * 1000, // 24 horas
        } : null)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [freeLimits, isPremium])

  // Função para formatar tempo restante
  const formatTimeRemaining = (ms: number) => {
    if (ms <= 0) return '00:00:00'
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((ms % (1000 * 60)) / 1000)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    const loadMedicalAreas = async () => {
      try {
        setLoadingAreas(true)
        
        // Buscar diretamente do Firestore usando Firebase Client SDK
        const areasQuery = query(
          collection(db, 'medical_areas'),
          where('ativo', '==', true),
          orderBy('nome', 'asc')
        )
        
        const querySnapshot = await getDocs(areasQuery)
        const areas: MedicalArea[] = []
        
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          areas.push({
            id: doc.id,
            nome: data.nome,
            descricao: data.descricao,
            ativo: data.ativo,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            createdBy: data.createdBy || '',
          })
        })
        
        console.log('Áreas médicas carregadas:', areas.length)
        setMedicalAreas(areas)
        // Marcar todas as matérias por padrão
        const allAreaNames = areas.map(area => area.nome)
        setSelectedSubjects(allAreaNames)
      } catch (error) {
        console.error('Erro ao carregar áreas médicas:', error)
        // Tentar via API como fallback
        try {
          const response = await fetch('/api/medical-areas', {
            credentials: 'include',
          })
          if (response.ok) {
            const data = await response.json()
            setMedicalAreas(data.areas || [])
          }
        } catch (apiError) {
          console.error('Erro ao carregar via API:', apiError)
        }
      } finally {
        setLoadingAreas(false)
      }
    }

    if (user) {
      loadMedicalAreas()
    }
  }, [user])

  const toggleSubject = (subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    )
  }

  const handleGenerate = async () => {
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

    const requestedCount = parseInt(questionCount)

    // VALIDAÇÃO NO BACKEND para usuários Free
    if (!isPremium) {
      try {
        const validationResponse = await fetch('/api/user/validate-question-generation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ questionCount: requestedCount }),
        })

        if (!validationResponse.ok) {
          const errorData = await validationResponse.json()
          setErrors((prev) => ({ 
            ...prev, 
            limit: errorData.reason || 'Limite diário atingido. Você não pode gerar mais questões hoje.' 
          }))
          // Recarregar limites após erro
          if (user && !loading) {
            const limitsResponse = await fetch('/api/user/check-free-limits')
            if (limitsResponse.ok) {
              const limitsData = await limitsResponse.json()
              setFreeLimits({
                canGenerate: limitsData.canGenerate,
                maxQuestionsPerDay: limitsData.maxQuestionsPerDay || 5,
                questionsGeneratedToday: limitsData.questionsGeneratedToday || 0,
                remainingQuestions: limitsData.remainingQuestions || 0,
                resetTime: limitsData.resetTime,
                timeUntilReset: limitsData.timeUntilReset,
                reason: limitsData.reason,
              })
            }
          }
          return
        }
      } catch (error) {
        console.error('Erro ao validar geração:', error)
        setErrors((prev) => ({ 
          ...prev, 
          limit: 'Erro ao verificar limites. Tente novamente.' 
        }))
        return
      }
    }

    // Mapear dificuldade para o formato do banco
    const difficultyMap: Record<string, string> = {
      easy: 'facil',
      medium: 'medio',
      hard: 'dificil',
    }

    const filters = {
      period: selectedPeriod === 'all' ? '' : (selectedPeriod || userProfile?.period || ''),
      areas: selectedSubjects, // Usar áreas ao invés de subjects
      difficulty: difficultyMap[difficulty] || difficulty,
      officialOnly, // Flag para filtrar questões oficiais
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

        {/* Contador de Limites do Plano Free */}
        {!isPremium && freeLimits && (
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Limite Diário - Plano Free
              </CardTitle>
              <CardDescription>
                Você pode gerar até {freeLimits.maxQuestionsPerDay} questões por dia
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Questões geradas hoje</p>
                  <p className="text-2xl font-bold text-foreground">
                    {freeLimits.questionsGeneratedToday} / {freeLimits.maxQuestionsPerDay}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Questões restantes</p>
                  <p className={`text-2xl font-bold ${freeLimits.remainingQuestions > 0 ? 'text-success' : 'text-destructive'}`}>
                    {freeLimits.remainingQuestions}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progresso diário</span>
                  <span className="font-medium">
                    {Math.round((freeLimits.questionsGeneratedToday / freeLimits.maxQuestionsPerDay) * 100)}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (freeLimits.questionsGeneratedToday / freeLimits.maxQuestionsPerDay) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {freeLimits.remainingQuestions === 0 && timeUntilReset !== null && (
                <div className="rounded-lg border border-warning/20 bg-warning/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-warning" />
                    <p className="text-sm font-semibold text-warning">Limite diário atingido</p>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    O limite será resetado em:
                  </p>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="text-lg font-mono font-bold text-primary">
                      {formatTimeRemaining(timeUntilReset)}
                    </span>
                  </div>
                </div>
              )}

              {freeLimits.remainingQuestions > 0 && timeUntilReset !== null && (
                <div className="rounded-lg border border-muted bg-muted/30 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Próximo reset em:</span>
                    <span className="text-sm font-mono font-medium text-foreground">
                      {formatTimeRemaining(timeUntilReset)}
                    </span>
                  </div>
                </div>
              )}

              {freeLimits.remainingQuestions > 0 && (
                <div className="pt-2">
                  <Link href="/plans">
                    <Button variant="outline" className="w-full cursor-pointer" size="sm">
                      <Crown className="mr-2 h-4 w-4" />
                      Assine Premium para gerar questões ilimitadas
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
              {loadingAreas ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : medicalAreas.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma área médica disponível no momento.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {medicalAreas.map((area) => (
                      <div key={area.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={area.id}
                          checked={selectedSubjects.includes(area.nome)}
                          onCheckedChange={() => {
                            toggleSubject(area.nome)
                            // Clear error when subject is selected
                            if (errors.subjects && selectedSubjects.length === 0) {
                              setErrors((prev) => ({ ...prev, subjects: undefined }))
                            }
                          }}
                        />
                        <label
                          htmlFor={area.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {area.nome}
                        </label>
                      </div>
                    ))}
                  </div>
                  {errors.subjects && (
                    <p className="text-sm text-destructive">{errors.subjects}</p>
                  )}
                </>
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
              <Label>Período</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os períodos</SelectItem>
                  <SelectItem value="1º Período">1º Período</SelectItem>
                  <SelectItem value="2º Período">2º Período</SelectItem>
                  <SelectItem value="3º Período">3º Período</SelectItem>
                  <SelectItem value="4º Período">4º Período</SelectItem>
                  <SelectItem value="5º Período">5º Período</SelectItem>
                  <SelectItem value="6º Período">6º Período</SelectItem>
                  <SelectItem value="7º Período">7º Período</SelectItem>
                  <SelectItem value="8º Período">8º Período</SelectItem>
                  <SelectItem value="Formado">Formado</SelectItem>
                </SelectContent>
              </Select>
              {userProfile?.period && selectedPeriod !== userProfile.period && selectedPeriod !== 'all' && (
                <p className="text-xs text-muted-foreground">
                  Seu período cadastrado é: <span className="font-medium">{userProfile.period}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Número de Questões</Label>
              <Select 
                value={questionCount} 
                onValueChange={setQuestionCount}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 questões</SelectItem>
                  {isPremium && (
                    <>
                      <SelectItem value="10">10 questões</SelectItem>
                      <SelectItem value="20">20 questões</SelectItem>
                      <SelectItem value="30">30 questões</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              {!isPremium && (
                <p className="text-xs text-muted-foreground">
                  Plano Free: máximo de 5 questões por simulado
                </p>
              )}
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

        {/* Alertas de limitação para plano Free */}
        {!isPremium && freeLimits && freeLimits.remainingQuestions === 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Limite diário de questões atingido</AlertTitle>
            <AlertDescription>
              Você já gerou todas as {freeLimits.maxQuestionsPerDay} questões disponíveis hoje.
              {timeUntilReset !== null && (
                <>
                  <br />
                  <span className="font-medium">O limite será resetado em: {formatTimeRemaining(timeUntilReset)}</span>
                </>
              )}
              <br />
              <Link href="/plans" className="mt-2 inline-flex items-center gap-1 text-sm font-medium underline">
                <Crown className="h-3 w-3" />
                Assine um plano premium para gerar questões ilimitadas
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {errors.limit && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Limitação do plano Free</AlertTitle>
            <AlertDescription>
              {errors.limit}
              {!isPremium && (
                <>
                  <br />
                  <Link href="/plans" className="mt-2 inline-flex items-center gap-1 text-sm font-medium underline">
                    <Crown className="h-3 w-3" />
                    Assine um plano premium para remover limitações
                  </Link>
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

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
              disabled={
                checkingLimits ||
                parseInt(questionCount) === 0 || 
                selectedSubjects.length === 0 || 
                !difficulty ||
                (!isPremium && freeLimits && (freeLimits.remainingQuestions === 0 || parseInt(questionCount) > freeLimits.remainingQuestions))
              }
              className="cursor-pointer"
            >
              {checkingLimits 
                ? 'Verificando...' 
                : !isPremium && freeLimits && freeLimits.remainingQuestions === 0
                ? 'Limite Diário Atingido'
                : 'Gerar Simulado'}
            </Button>
            {!isPremium && freeLimits && freeLimits.remainingQuestions > 0 && (
              <p className="text-xs text-center text-muted-foreground">
                Você pode gerar mais {freeLimits.remainingQuestions} questão{freeLimits.remainingQuestions > 1 ? 'ões' : ''} hoje
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

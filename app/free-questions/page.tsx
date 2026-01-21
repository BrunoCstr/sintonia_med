'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { usePremium } from '@/lib/hooks/use-premium'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { BookOpen, AlertCircle, Loader2, Clock, Crown } from 'lucide-react'
import type { Sistema, MedicalArea } from '@/lib/types'
import Link from 'next/link'

export default function FreeQuestionsPage() {
  const { user, userProfile, loading: authLoading } = useAuth()
  const { isPremium } = usePremium()
  const router = useRouter()
  const [sistemas, setSistemas] = useState<MedicalArea[]>([])
  const [loadingSistemas, setLoadingSistemas] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('')
  const [selectedSistemas, setSelectedSistemas] = useState<string[]>([])
  const [errors, setErrors] = useState<{ period?: string; sistemas?: string; limit?: string }>({})
  const [isStarting, setIsStarting] = useState(false)
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
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  // Verificar limites do plano free
  useEffect(() => {
    const checkFreeLimits = async () => {
      // Só verificar limites se o usuário não for premium
      if (!user || isPremium) {
        setCheckingLimits(false)
        setFreeLimits(null)
        return
      }

      try {
        setCheckingLimits(true)
        const response = await fetch('/api/user/check-free-limits', {
          credentials: 'include',
        })
        
        if (response.ok) {
          const data = await response.json()
          
          // Se for premium, não definir limites
          if (data.isPremium) {
            setFreeLimits(null)
            setCheckingLimits(false)
            return
          }
          
          // Garantir valores padrão se não vierem na resposta
          const now = Date.now()
          const endOfDay = new Date()
          endOfDay.setUTCHours(23, 59, 59, 999)
          endOfDay.setUTCMilliseconds(999)
          const timeUntilMidnight = Math.max(0, endOfDay.getTime() - now)
          
          setFreeLimits({
            canGenerate: data.canGenerate ?? (data.remainingQuestions > 0),
            maxQuestionsPerDay: data.maxQuestionsPerDay || 5,
            questionsGeneratedToday: data.questionsGeneratedToday ?? 0,
            remainingQuestions: data.remainingQuestions ?? Math.max(0, 5 - (data.questionsGeneratedToday || 0)),
            resetTime: data.resetTime || endOfDay.getTime(),
            timeUntilReset: data.timeUntilReset || timeUntilMidnight,
            reason: data.reason || null,
          })
          setTimeUntilReset(data.timeUntilReset || timeUntilMidnight)
        } else {
          // Em caso de erro, definir valores padrão para mostrar o contador
          console.error(`[Free Limits] Erro ao verificar limitações: ${response.status}`)
          
          // Se o erro não for de autenticação, definir valores padrão
          if (response.status !== 401) {
            const now = Date.now()
            const endOfDay = new Date()
            endOfDay.setUTCHours(23, 59, 59, 999)
            endOfDay.setUTCMilliseconds(999)
            const timeUntilMidnight = Math.max(0, endOfDay.getTime() - now)
            
            setFreeLimits({
              canGenerate: true,
              maxQuestionsPerDay: 5,
              questionsGeneratedToday: 0,
              remainingQuestions: 5,
              resetTime: endOfDay.getTime(),
              timeUntilReset: timeUntilMidnight,
              reason: null,
            })
            setTimeUntilReset(timeUntilMidnight)
          }
        }
      } catch (error) {
        console.error('Erro ao verificar limitações:', error)
        // Em caso de erro de rede, ainda assim definir valores padrão
        const now = Date.now()
        const endOfDay = new Date()
        endOfDay.setUTCHours(23, 59, 59, 999)
        endOfDay.setUTCMilliseconds(999)
        const timeUntilMidnight = Math.max(0, endOfDay.getTime() - now)
        
        setFreeLimits({
          canGenerate: true,
          maxQuestionsPerDay: 5,
          questionsGeneratedToday: 0,
          remainingQuestions: 5,
          resetTime: endOfDay.getTime(),
          timeUntilReset: timeUntilMidnight,
          reason: null,
        })
        setTimeUntilReset(timeUntilMidnight)
      } finally {
        setCheckingLimits(false)
      }
    }

    if (user && !authLoading) {
      checkFreeLimits()
      // Atualizar a cada minuto
      const interval = setInterval(() => {
        checkFreeLimits()
      }, 60000)
      
      // Atualizar quando a página ganha foco
      const handleFocus = () => {
        checkFreeLimits()
      }
      window.addEventListener('focus', handleFocus)
      
      return () => {
        clearInterval(interval)
        window.removeEventListener('focus', handleFocus)
      }
    } else if (!user && !authLoading) {
      setFreeLimits(null)
      setCheckingLimits(false)
    }
  }, [user, authLoading, isPremium])

  // Atualizar contador de tempo a cada segundo
  useEffect(() => {
    if (!freeLimits || isPremium) return

    const calculateResetTime = () => {
      const now = new Date()
      const brasiliaTime = new Date(now.getTime() - (3 * 60 * 60 * 1000))
      const endOfDay = new Date(Date.UTC(
        brasiliaTime.getUTCFullYear(),
        brasiliaTime.getUTCMonth(),
        brasiliaTime.getUTCDate() + 1,
        2, 59, 59, 999
      ))
      return endOfDay.getTime()
    }

    const updateCounter = () => {
      const now = Date.now()
      const resetTime = calculateResetTime()
      const remaining = Math.max(0, resetTime - now)
      setTimeUntilReset(remaining)
    }

    updateCounter()
    const interval = setInterval(updateCounter, 1000)
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

  // Definir período inicial baseado no perfil do usuário
  useEffect(() => {
    if (selectedPeriod === '' && !authLoading) {
      const validPeriods = ['1º Período', '2º Período', '3º Período', '4º Período', '5º Período', '6º Período', '7º Período', '8º Período']
      
      if (userProfile?.period && validPeriods.includes(userProfile.period)) {
        setSelectedPeriod(userProfile.period)
      } else {
        setSelectedPeriod('1º Período')
      }
    }
  }, [userProfile, authLoading, selectedPeriod])

  // Carregar sistemas
  useEffect(() => {
    const loadSistemas = async () => {
      try {
        setLoadingSistemas(true)
        const response = await fetch('/api/medical-areas', {
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Erro ao carregar sistemas')
        }

        const data = await response.json()
        setSistemas(data.areas || [])
      } catch (error) {
        console.error('Erro ao carregar sistemas:', error)
      } finally {
        setLoadingSistemas(false)
      }
    }

    if (user) {
      loadSistemas()
    }
  }, [user])

  // Filtrar sistemas baseado no período selecionado
  const filteredSistemas = useMemo(() => {
    if (selectedPeriod === 'all' || !selectedPeriod) {
      return sistemas
    }
    return sistemas.filter(
      (sistema) => sistema.periodo === selectedPeriod || sistema.periodo === 'Todos os períodos'
    )
  }, [sistemas, selectedPeriod])

  // Quando o período mudar, resetar sistemas selecionados e marcar "TODOS"
  useEffect(() => {
    if (selectedPeriod && filteredSistemas.length > 0) {
      // Verificar se os sistemas selecionados ainda estão disponíveis
      const hasValidSelection = selectedSistemas.some(id => 
        id === 'TODOS' || filteredSistemas.find(s => s.id === id)
      )
      
      // Se não houver seleção válida ou seleção vazia, marcar "TODOS"
      if (!hasValidSelection || selectedSistemas.length === 0) {
        setSelectedSistemas(['TODOS'])
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod])

  const handleSistemaToggle = (sistemaId: string) => {
    setSelectedSistemas((prev) => {
      if (sistemaId === 'TODOS') {
        // Se clicar em TODOS e já estiver selecionado, desmarcar
        if (prev.includes('TODOS')) {
          return []
        }
        // Se clicar em TODOS e não estiver selecionado, marcar apenas TODOS
        return ['TODOS']
      } else {
        // Se clicar em um sistema específico, remover TODOS e adicionar/remover o sistema
        const newSelection = prev.filter((id) => id !== 'TODOS')
        if (newSelection.includes(sistemaId)) {
          return newSelection.filter((id) => id !== sistemaId)
        } else {
          return [...newSelection, sistemaId]
        }
      }
    })
  }

  const handleStart = async () => {
    // Validar
    const newErrors: { period?: string; sistemas?: string; limit?: string } = {}

    if (!selectedPeriod || selectedPeriod.trim() === '') {
      newErrors.period = 'Selecione um período'
    }

    if (selectedSistemas.length === 0) {
      newErrors.sistemas = 'Selecione pelo menos um sistema'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsStarting(true)

    // VALIDAÇÃO NO BACKEND para usuários Free
    if (!isPremium) {
      try {
        const validationResponse = await fetch('/api/user/validate-question-generation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ questionCount: 1 }), // Questões livres geram 1 por vez
        })

        if (!validationResponse.ok) {
          const errorData = await validationResponse.json()
          setErrors((prev) => ({ 
            ...prev, 
            limit: errorData.reason || 'Limite diário atingido. Você não pode praticar mais questões hoje.' 
          }))
          // Recarregar limites após erro
          if (user && !authLoading) {
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
          setIsStarting(false)
          return
        }
      } catch (error) {
        console.error('Erro ao validar geração:', error)
        setErrors((prev) => ({ 
          ...prev, 
          limit: 'Erro ao verificar limites. Tente novamente.' 
        }))
        setIsStarting(false)
        return
      }
    }

    // Preparar filtros
    const sistemasToUse = selectedSistemas.includes('TODOS')
      ? filteredSistemas.map((s) => s.nome)
      : selectedSistemas.map((id) => sistemas.find((s) => s.id === id)?.nome).filter(Boolean) as string[]

    // Salvar filtros no localStorage e redirecionar
    const filters = {
      period: selectedPeriod,
      sistemas: sistemasToUse,
    }

    localStorage.setItem('freeQuestionsFilters', JSON.stringify(filters))
    router.push('/free-questions/practice')
  }

  if (authLoading || loadingSistemas) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-primary" />
            Questões Livres
          </h1>
          <p className="text-muted-foreground mt-2">
            Pratique questões individuais e veja o gabarito comentado imediatamente após responder.
          </p>
        </div>

        {/* Contador de Limites do Plano Free */}
        {!isPremium && (
          <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Limite Diário - Plano Free
              </CardTitle>
              <CardDescription>
                {freeLimits ? (
                  `Você pode praticar até ${freeLimits.maxQuestionsPerDay} questões por dia`
                ) : (
                  'Carregando informações de limite...'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {checkingLimits && !freeLimits ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : freeLimits ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Questões praticadas hoje</p>
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
                          Assine Premium para praticar questões ilimitadas
                        </Button>
                      </Link>
                    </div>
                  )}
                </>
              ) : null}
            </CardContent>
          </Card>
        )}

        {/* Alertas de limitação para plano Free */}
        {!isPremium && freeLimits && freeLimits.remainingQuestions === 0 && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Limite diário de questões atingido</AlertTitle>
            <AlertDescription>
              Você já praticou todas as {freeLimits.maxQuestionsPerDay} questões disponíveis hoje.
              {timeUntilReset !== null && (
                <>
                  <br />
                  <span className="font-medium">O limite será resetado em: {formatTimeRemaining(timeUntilReset)}</span>
                </>
              )}
              <br />
              <Link href="/plans" className="mt-2 inline-flex items-center gap-1 text-sm font-medium underline">
                <Crown className="h-3 w-3" />
                Assine um plano premium para praticar questões ilimitadas
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {errors.limit && (
          <Alert variant="destructive" className="mb-6">
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

        <Card>
          <CardHeader>
            <CardTitle>Configuração</CardTitle>
            <CardDescription>
              Selecione o período e os sistemas que deseja praticar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Período */}
            <div className="space-y-2">
              <Label htmlFor="period">Período</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger id="period" className={errors.period ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1º Período">1º Período</SelectItem>
                  <SelectItem value="2º Período">2º Período</SelectItem>
                  <SelectItem value="3º Período">3º Período</SelectItem>
                  <SelectItem value="4º Período">4º Período</SelectItem>
                  <SelectItem value="5º Período">5º Período</SelectItem>
                  <SelectItem value="6º Período">6º Período</SelectItem>
                  <SelectItem value="7º Período">7º Período</SelectItem>
                  <SelectItem value="8º Período">8º Período</SelectItem>
                </SelectContent>
              </Select>
              {errors.period && (
                <p className="text-sm text-destructive">{errors.period}</p>
              )}
            </div>

            {/* Sistemas */}
            <div className="space-y-2">
              <Label>Sistemas</Label>
              {loadingSistemas ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Carregando sistemas...</span>
                </div>
              ) : filteredSistemas.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Nenhum sistema encontrado para o período selecionado.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent/50">
                    <Checkbox
                      id="todos"
                      checked={selectedSistemas.includes('TODOS')}
                      onCheckedChange={() => handleSistemaToggle('TODOS')}
                    />
                    <label
                      htmlFor="todos"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                    >
                      TODOS
                    </label>
                  </div>
                  {filteredSistemas.map((sistema) => (
                    <div
                      key={sistema.id}
                      className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent/50"
                    >
                      <Checkbox
                        id={sistema.id}
                        checked={selectedSistemas.includes(sistema.id)}
                        onCheckedChange={() => handleSistemaToggle(sistema.id)}
                        disabled={selectedSistemas.includes('TODOS')}
                      />
                      <label
                        htmlFor={sistema.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                      >
                        {sistema.nome}
                      </label>
                    </div>
                  ))}
                </div>
              )}
              {errors.sistemas && (
                <p className="text-sm text-destructive">{errors.sistemas}</p>
              )}
            </div>

            {/* Botão Iniciar */}
            <div className="pt-4">
              <Button
                onClick={handleStart}
                disabled={
                  isStarting || 
                  loadingSistemas || 
                  checkingLimits ||
                  (!isPremium && freeLimits ? freeLimits.remainingQuestions === 0 : false)
                }
                className="w-full"
                size="lg"
              >
                {isStarting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando...
                  </>
                ) : checkingLimits ? (
                  'Verificando...'
                ) : !isPremium && freeLimits && freeLimits.remainingQuestions === 0 ? (
                  'Limite Diário Atingido'
                ) : (
                  'Iniciar'
                )}
              </Button>
              {!isPremium && freeLimits && freeLimits.remainingQuestions > 0 && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Você pode praticar mais {freeLimits.remainingQuestions} {freeLimits.remainingQuestions === 1 ? 'questão' : 'questões'} hoje
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

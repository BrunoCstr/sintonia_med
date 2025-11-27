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
import type { Sistema, MedicalArea } from '@/lib/types'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Link from 'next/link'

export default function GeneratorPage() {
  const { user, userProfile, loading } = useAuth()
  const { isAdminMaster, isAdminQuestoes } = useRole()
  const { isPremium } = usePremium()
  const router = useRouter()
  const [sistemas, setSistemas] = useState<MedicalArea[]>([])
  const [materias, setMaterias] = useState<Record<string, any[]>>({}) // Matérias por sistema
  const [loadingAreas, setLoadingAreas] = useState(true)
  const [selectedSistemas, setSelectedSistemas] = useState<string[]>([])
  const [selectedMaterias, setSelectedMaterias] = useState<string[]>([])
  const [selectedDisciplinas, setSelectedDisciplinas] = useState<string[]>(['SOI', 'HAM', 'IESC', 'CI']) // Pré-marcado em todos (quando período é "all")
  const [difficulty, setDifficulty] = useState('all') // Pré-marcado em todos
  const [officialOnly, setOfficialOnly] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all') // Pré-marcado em todos
  const [questionCount, setQuestionCount] = useState('5')
  const [timed, setTimed] = useState(false)
  const [timeLimit, setTimeLimit] = useState('30')
  const [errors, setErrors] = useState<{ sistemas?: string; limit?: string }>({})
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
          let errorData: any = {}
          
          try {
            const text = await response.text()
            if (text) {
              errorData = JSON.parse(text)
            }
          } catch (parseError) {
            console.error('[Free Limits] Erro ao parsear resposta de erro:', parseError)
          }
          
          console.error('[Free Limits] Detalhes do erro:', errorData)
          
          // Se o erro não for de autenticação, definir valores padrão
          if (response.status !== 401) {
            const now = Date.now()
            const endOfDay = new Date()
            endOfDay.setUTCHours(23, 59, 59, 999)
            endOfDay.setUTCMilliseconds(999)
            const timeUntilMidnight = Math.max(0, endOfDay.getTime() - now)
            
            // Em caso de erro 500, ainda assim mostrar valores padrão para permitir uso
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
        // Em caso de erro de rede, ainda assim definir valores padrão para mostrar o contador
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
    } else if (!user && !loading) {
      // Se não houver usuário, limpar os limites
      setFreeLimits(null)
      setCheckingLimits(false)
    }
  }, [user, loading, isPremium])

  // Ajustar questionCount quando freeLimits mudar (para usuários Free)
  useEffect(() => {
    if (!isPremium && freeLimits) {
      const currentCount = parseInt(questionCount)
      const maxAllowed = Math.min(5, freeLimits.remainingQuestions)
      
      if (freeLimits.remainingQuestions > 0) {
        // Se o valor atual for maior que o permitido, ajustar para o máximo permitido
        if (currentCount > maxAllowed) {
          setQuestionCount(maxAllowed.toString())
        } else if (currentCount < 1) {
          // Garantir que o valor mínimo seja 1
          setQuestionCount('1')
        }
      } else {
        // Se não houver questões restantes, resetar para 1 (mas o botão estará desabilitado)
        setQuestionCount('1')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freeLimits, isPremium]) // questionCount intencionalmente omitido para evitar loop

  // Atualizar contador de tempo a cada segundo
  useEffect(() => {
    if (!freeLimits || isPremium) return

    // Calcular meia-noite de hoje em Brasília (UTC-3) para sempre ter um valor atualizado
    const calculateResetTime = () => {
      const now = new Date()
      
      // Calcular data atual em Brasília
      // UTC-3 significa que quando são 00:00 em Brasília, são 03:00 UTC
      // Então, para obter a data em Brasília, subtraímos 3 horas do UTC
      const brasiliaTime = new Date(now.getTime() - (3 * 60 * 60 * 1000))
      
      // Fim do dia em Brasília (23:59:59.999 BRT = 02:59:59.999 UTC do dia seguinte)
      const endOfDay = new Date(Date.UTC(
        brasiliaTime.getUTCFullYear(),
        brasiliaTime.getUTCMonth(),
        brasiliaTime.getUTCDate() + 1,
        2, 59, 59, 999 // 02:59:59.999 UTC = 23:59:59.999 BRT
      ))
      
      return endOfDay.getTime()
    }

    // Função para atualizar o contador
    const updateCounter = () => {
      const now = Date.now()
      const resetTime = calculateResetTime()
      const remaining = Math.max(0, resetTime - now)
      setTimeUntilReset(remaining)
    }

    // Atualizar imediatamente
    updateCounter()

    // Atualizar a cada segundo
    const interval = setInterval(() => {
      updateCounter()
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
    const loadSistemas = async () => {
      try {
        setLoadingAreas(true)
        
        // Usar API para buscar sistemas (a API já tem lógica para buscar de 'sistemas' primeiro)
        const response = await fetch('/api/medical-areas', {
          credentials: 'include',
        })
        
        if (!response.ok) {
          throw new Error('Erro ao carregar sistemas')
        }
        
        const data = await response.json()
        const areas = data.areas || []
        
        console.log('✅ Sistemas carregados:', areas.length)
        console.log('Sistemas:', areas.map(a => ({ id: a.id, nome: a.nome })))
        setSistemas(areas)
        
        // Marcar todos os sistemas por padrão
        const allSistemaNames = areas.map((area: MedicalArea) => area.nome)
        setSelectedSistemas(allSistemaNames)
        
        // Carregar matérias (submatérias) para cada sistema via API pública
        const materiasMap: Record<string, any[]> = {}
        const todasMaterias: string[] = []
        
        console.log('📚 Carregando matérias para', areas.length, 'sistemas...')
        
        for (const sistema of areas) {
          try {
            const materiasResponse = await fetch(`/api/materias?sistemaId=${sistema.id}`, {
              credentials: 'include',
            })
            
            if (materiasResponse.ok) {
              const materiasData = await materiasResponse.json()
              const sistemaMaterias = materiasData.materias || []
              materiasMap[sistema.id] = sistemaMaterias
              
              console.log(`  ✓ Sistema "${sistema.nome}" (${sistema.id}): ${sistemaMaterias.length} matérias`)
              
              // Coletar todas as matérias para marcar por padrão
              sistemaMaterias.forEach((m: any) => {
                if (!todasMaterias.includes(m.nome)) {
                  todasMaterias.push(m.nome)
                }
              })
            } else {
              const errorText = await materiasResponse.text()
              console.warn(`  ✗ Sistema "${sistema.nome}" (${sistema.id}): Erro ${materiasResponse.status} - ${errorText}`)
              materiasMap[sistema.id] = []
            }
          } catch (error: any) {
            console.error(`  ✗ Erro ao carregar matérias do sistema "${sistema.nome}" (${sistema.id}):`, error.message)
            materiasMap[sistema.id] = []
          }
        }
        
        setMaterias(materiasMap)
        // Marcar todas as matérias por padrão
        setSelectedMaterias(todasMaterias)
        
        console.log('✅ Matérias carregadas:', Object.keys(materiasMap).length, 'sistemas com matérias')
        console.log('✅ Total de matérias únicas:', todasMaterias.length)
        console.log('✅ Matérias por sistema:', Object.entries(materiasMap).map(([id, mats]) => ({
          sistemaId: id,
          sistemaNome: areas.find(a => a.id === id)?.nome,
          materias: mats.length
        })))
      } catch (error) {
        console.error('Erro ao carregar sistemas:', error)
      } finally {
        setLoadingAreas(false)
      }
    }

    if (user) {
      loadSistemas()
    }
  }, [user])
  
  // Atualizar disciplinas disponíveis baseado no período selecionado
  useEffect(() => {
    if (selectedPeriod === 'all' || !selectedPeriod) {
      // Se todos os períodos estão selecionados, mostrar todas as disciplinas
      setSelectedDisciplinas(['SOI', 'HAM', 'IESC', 'CI'])
    } else {
      const periodNum = parseInt(selectedPeriod.charAt(0))
      if (periodNum >= 1 && periodNum <= 5) {
        setSelectedDisciplinas(['SOI', 'HAM', 'IESC'])
      } else if (periodNum >= 6 && periodNum <= 8) {
        setSelectedDisciplinas(['CI', 'HAM', 'IESC'])
      } else {
        setSelectedDisciplinas(['SOI', 'HAM', 'IESC', 'CI'])
      }
    }
  }, [selectedPeriod])

  const toggleSistema = (sistemaNome: string) => {
    setSelectedSistemas((prev) => {
      const newSelected = prev.includes(sistemaNome) 
        ? prev.filter((s) => s !== sistemaNome) 
        : [...prev, sistemaNome]
      
      // Se desmarcou o sistema, desmarcar todas as matérias desse sistema
      if (!newSelected.includes(sistemaNome)) {
        const sistema = sistemas.find(s => s.nome === sistemaNome)
        if (sistema) {
          const sistemaMaterias = materias[sistema.id] || []
          setSelectedMaterias(prevMaterias => 
            prevMaterias.filter(m => !sistemaMaterias.some(sm => sm.nome === m))
          )
        }
      } else {
        // Se marcou o sistema, marcar todas as matérias desse sistema
        const sistema = sistemas.find(s => s.nome === sistemaNome)
        if (sistema) {
          const sistemaMaterias = materias[sistema.id] || []
          setSelectedMaterias(prevMaterias => {
            const novasMaterias = sistemaMaterias
              .map(m => m.nome)
              .filter(m => !prevMaterias.includes(m))
            return [...prevMaterias, ...novasMaterias]
          })
        }
      }
      
      return newSelected
    })
  }
  
  const toggleMateria = (materiaNome: string) => {
    setSelectedMaterias((prev) =>
      prev.includes(materiaNome) ? prev.filter((m) => m !== materiaNome) : [...prev, materiaNome]
    )
  }
  
  const toggleDisciplina = (disciplina: string) => {
    setSelectedDisciplinas((prev) =>
      prev.includes(disciplina) ? prev.filter((d) => d !== disciplina) : [...prev, disciplina]
    )
  }

  const handleGenerate = async () => {
    // Reset errors
    setErrors({})

    // Validate sistemas
    if (selectedSistemas.length === 0) {
      setErrors((prev) => ({ ...prev, sistemas: 'Selecione pelo menos um sistema' }))
    }

    // If there are errors, don't proceed
    if (selectedSistemas.length === 0) {
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
      all: '', // Todos
    }

    const filters = {
      period: selectedPeriod === 'all' ? '' : (selectedPeriod || userProfile?.period || ''),
      areas: selectedSistemas, // Sistemas selecionados
      subareas: selectedMaterias.length > 0 ? selectedMaterias : undefined, // Matérias selecionadas
      disciplinas: selectedDisciplinas.length > 0 ? selectedDisciplinas : undefined, // Disciplinas selecionadas
      difficulty: difficulty === 'all' ? '' : (difficultyMap[difficulty] || difficulty),
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
        {!isPremium && (
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Limite Diário - Plano Free
              </CardTitle>
              <CardDescription>
                {freeLimits ? (
                  `Você pode gerar até ${freeLimits.maxQuestionsPerDay} questões por dia`
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
                </>
              ) : null}
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
            {/* Primeiro Filtro: Período */}
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
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
            </div>

            {/* Segundo Filtro: Disciplina */}
            <div className="space-y-3">
              <Label>Disciplina</Label>
              <div className="grid grid-cols-4 gap-3">
                {(() => {
                  const periodNum = selectedPeriod === 'all' || !selectedPeriod 
                    ? null 
                    : parseInt(selectedPeriod.charAt(0))
                  
                  // Se todos os períodos, mostrar todas as disciplinas
                  const disciplinasDisponiveis = 
                    selectedPeriod === 'all' || !selectedPeriod
                      ? ['SOI', 'HAM', 'IESC', 'CI']
                      : (periodNum && periodNum >= 1 && periodNum <= 5)
                        ? ['SOI', 'HAM', 'IESC']
                        : ['CI', 'HAM', 'IESC']
                  
                  return disciplinasDisponiveis.map((disc) => (
                    <div key={disc} className="flex items-center space-x-2">
                      <Checkbox
                        id={`disciplina-${disc}`}
                        checked={selectedDisciplinas.includes(disc)}
                        onCheckedChange={() => toggleDisciplina(disc)}
                      />
                      <label
                        htmlFor={`disciplina-${disc}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {disc}
                      </label>
                    </div>
                  ))
                })()}
              </div>
            </div>

            {/* Terceiro Filtro: Sistemas */}
            <div className="space-y-3">
              <Label>
                Sistemas <span className="text-destructive">*</span>
              </Label>
              {loadingAreas ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : sistemas.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum sistema disponível no momento.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {sistemas.map((sistema) => (
                      <div key={sistema.id} className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={sistema.id}
                            checked={selectedSistemas.includes(sistema.nome)}
                            onCheckedChange={() => {
                              toggleSistema(sistema.nome)
                              if (errors.sistemas && selectedSistemas.length === 0) {
                                setErrors((prev) => ({ ...prev, sistemas: undefined }))
                              }
                            }}
                          />
                          <label
                            htmlFor={sistema.id}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {sistema.nome}
                          </label>
                        </div>
                        {/* Matérias do sistema (submatérias - checkboxes menores) */}
                        {selectedSistemas.includes(sistema.nome) && (
                          <>
                            {materias[sistema.id] && materias[sistema.id].length > 0 ? (
                              <div className="ml-6 space-y-1 border-l-2 border-muted pl-3 mt-2">
                                {materias[sistema.id].map((materia) => (
                                  <div key={materia.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`materia-${materia.id}`}
                                      checked={selectedMaterias.includes(materia.nome)}
                                      onCheckedChange={() => toggleMateria(materia.nome)}
                                      className="h-3 w-3 checkbox-materia"
                                    />
                                    <label
                                      htmlFor={`materia-${materia.id}`}
                                      className="text-xs font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                      {materia.nome}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="ml-6 text-xs text-muted-foreground italic mt-1">
                                Nenhuma matéria cadastrada
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  {errors.sistemas && (
                    <p className="text-sm text-destructive">{errors.sistemas}</p>
                  )}
                </>
              )}
            </div>

            {/* Quarto Filtro: Matéria - já está integrado acima nos sistemas */}

            {/* Quinto Filtro: Dificuldade */}
            <div className="space-y-2">
              <Label>Dificuldade</Label>
              <Select
                value={difficulty}
                onValueChange={(value) => {
                  setDifficulty(value)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a dificuldade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="easy">Fácil</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="hard">Difícil</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sexto Filtro: Número de Questões */}
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
                  {!isPremium && freeLimits ? (
                    // Para usuários Free, mostrar opções baseadas nas questões restantes
                    freeLimits.remainingQuestions > 0 ? (
                      Array.from({ length: Math.min(5, freeLimits.remainingQuestions) }, (_, i) => {
                        const count = i + 1
                        return (
                          <SelectItem key={count} value={count.toString()}>
                            {count} {count === 1 ? 'questão' : 'questões'}
                          </SelectItem>
                        )
                      })
                    ) : (
                      <SelectItem value="0" disabled>Nenhuma questão disponível</SelectItem>
                    )
                  ) : (
                    // Para usuários Premium, mostrar opções padrão
                    <>
                      <SelectItem value="5">5 questões</SelectItem>
                      <SelectItem value="10">10 questões</SelectItem>
                      <SelectItem value="20">20 questões</SelectItem>
                      <SelectItem value="30">30 questões</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              {!isPremium && freeLimits && (
                <p className="text-xs text-muted-foreground">
                  {freeLimits.remainingQuestions > 0 
                    ? `Você pode gerar até ${Math.min(5, freeLimits.remainingQuestions)} ${Math.min(5, freeLimits.remainingQuestions) === 1 ? 'questão' : 'questões'} por simulado`
                    : 'Limite diário atingido'}
                </p>
              )}
            </div>

            {/* Sétimo Filtro: Switch de Questão Oficial */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Apenas Questões Oficiais</Label>
                <p className="text-sm text-muted-foreground">
                  Incluir somente questões de provas oficiais
                </p>
              </div>
              <Switch checked={officialOnly} onCheckedChange={setOfficialOnly} />
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
                {selectedSistemas.length > 0 && ` de ${selectedSistemas.length} sistema(s)`}
              </p>
            </div>
            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={
                checkingLimits ||
                parseInt(questionCount) === 0 || 
                selectedSistemas.length === 0 ||
                (!isPremium && freeLimits ? (freeLimits.remainingQuestions === 0 || parseInt(questionCount) > freeLimits.remainingQuestions) : false)
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
                Você pode gerar mais {freeLimits.remainingQuestions} {freeLimits.remainingQuestions === 1 ? 'questão' : 'questões'} hoje
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

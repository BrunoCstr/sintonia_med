'use client'

import { useState, useEffect, useMemo } from 'react'
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
import { Brain, Clock, Filter, AlertCircle, Crown, X, ChevronDown, Check } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
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
  const [selectedPeriod, setSelectedPeriod] = useState<string>('') // Será definido quando userProfile carregar
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

  // Definir período inicial baseado no perfil do usuário
  useEffect(() => {
    if (selectedPeriod === '' && !loading) {
      // Lista de períodos válidos para o select
      const validPeriods = ['1º Período', '2º Período', '3º Período', '4º Período', '5º Período', '6º Período', '7º Período', '8º Período']
      
      if (userProfile?.period && validPeriods.includes(userProfile.period)) {
        // Se o usuário tiver período definido e ele estiver na lista válida, usar ele
        setSelectedPeriod(userProfile.period)
      } else {
        // Se não houver período definido ou ele não estiver na lista válida, usar "1º Período" como padrão
        setSelectedPeriod('1º Período')
      }
    }
  }, [userProfile, loading, selectedPeriod])

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
        console.log('Sistemas:', areas.map((a: MedicalArea) => ({ id: a.id, nome: a.nome })))
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
          sistemaNome: areas.find((a: MedicalArea) => a.id === id)?.nome,
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
  
  // Filtrar sistemas baseado no período selecionado
  const filteredSistemas = useMemo(() => {
    if (selectedPeriod === 'all' || !selectedPeriod) {
      return sistemas
    }
    // Filtrar sistemas que correspondem ao período selecionado ou "Todos os períodos"
    return sistemas.filter(
      (sistema) => sistema.periodo === selectedPeriod || sistema.periodo === 'Todos os períodos'
    )
  }, [sistemas, selectedPeriod])

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

  // Atualizar sistemas selecionados quando o período mudar
  useEffect(() => {
    if (selectedPeriod === 'all' || !selectedPeriod) {
      // Se "Todos" está selecionado, selecionar todos os sistemas disponíveis
      const allSistemaNames = sistemas.map(s => s.nome)
      setSelectedSistemas(allSistemaNames)
    } else {
      // Filtrar apenas sistemas do período selecionado
      const sistemasDoPeriodo = filteredSistemas.map(s => s.nome)
      // Manter apenas sistemas que estão no período selecionado e selecionar todos se nenhum estiver selecionado
      setSelectedSistemas((prev) => {
        const filtered = prev.filter(nome => sistemasDoPeriodo.includes(nome))
        // Se não há sistemas selecionados do período, selecionar todos do período
        return filtered.length > 0 ? filtered : sistemasDoPeriodo
      })
    }
  }, [selectedPeriod, filteredSistemas, sistemas])

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
            <div className="space-y-4 pb-2">
              <div className="flex items-center justify-between">
                <Label>
                  Sistemas <span className="text-destructive">*</span>
                </Label>
                {filteredSistemas.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        const allSistemaNames = filteredSistemas.map(s => s.nome)
                        setSelectedSistemas(allSistemaNames)
                        // Marcar todas as matérias dos sistemas filtrados
                        const todasMaterias: string[] = []
                        filteredSistemas.forEach(sistema => {
                          const sistemaMaterias = materias[sistema.id] || []
                          sistemaMaterias.forEach(m => {
                            if (!todasMaterias.includes(m.nome)) {
                              todasMaterias.push(m.nome)
                            }
                          })
                        })
                        setSelectedMaterias(todasMaterias)
                      }}
                    >
                      Selecionar todos
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setSelectedSistemas([])
                        setSelectedMaterias([])
                      }}
                    >
                      Limpar
                    </Button>
                  </div>
                )}
              </div>

              {/* Chips dos sistemas selecionados */}
              {selectedSistemas.length > 0 && (
                <div 
                  className={`flex gap-2 p-3 rounded-lg bg-muted/50 border border-border/50 ${
                    selectedSistemas.length > 5 
                      ? 'overflow-x-auto overflow-y-hidden scrollbar-thin-horizontal scrollbar-track-transparent scrollbar-thumb-primary/30 hover:scrollbar-thumb-primary/50' 
                      : 'flex-wrap'
                  }`}
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'oklch(0.50 0.20 15 / 0.3) transparent'
                  }}
                >
                  {selectedSistemas.map((sistemaNome) => {
                    const sistema = filteredSistemas.find(s => s.nome === sistemaNome)
                    const sistemaMaterias = sistema ? (materias[sistema.id] || []) : []
                    const materiasDoSistema = sistemaMaterias.map(m => m.nome)
                    const materiasSelecionadas = selectedMaterias.filter(m => materiasDoSistema.includes(m))
                    
                    return (
                      <Badge
                        key={sistemaNome}
                        variant="secondary"
                        className={`pl-2 pr-1 py-1 gap-1 cursor-pointer hover:bg-secondary/80 transition-colors ${
                          selectedSistemas.length > 5 ? 'shrink-0' : ''
                        }`}
                        onClick={() => toggleSistema(sistemaNome)}
                      >
                        <span className="text-xs">{sistemaNome}</span>
                        {sistemaMaterias.length > 0 && (
                          <span className="text-[10px] text-muted-foreground ml-1">
                            ({materiasSelecionadas.length}/{sistemaMaterias.length})
                          </span>
                        )}
                        <X className="h-3 w-3 ml-1 hover:text-destructive" />
                      </Badge>
                    )
                  })}
                </div>
              )}

              {loadingAreas ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : sistemas.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum sistema disponível no momento.
                </p>
              ) : filteredSistemas.length === 0 ? (
                <div className="rounded-lg border border-warning/20 bg-warning/5 p-4">
                  <p className="text-sm font-medium text-warning mb-1">
                    Nenhum sistema disponível para o {selectedPeriod}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Verifique se existem sistemas cadastrados para este período ou selecione "Todos" para ver todos os sistemas.
                  </p>
                </div>
              ) : (
                <>
                  <div 
                    className={`space-y-3 pb-4 ${
                      filteredSistemas.length > 5 
                        ? 'max-h-[320px] overflow-y-auto pr-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-primary/30 hover:scrollbar-thumb-primary/50' 
                        : ''
                    }`}
                    style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'oklch(0.50 0.20 15 / 0.3) transparent'
                    }}
                  >
                    <Accordion type="multiple" className="w-full">
                      {filteredSistemas.map((sistema, index) => {
                        const sistemaMaterias = materias[sistema.id] || []
                        const materiasDoSistema = sistemaMaterias.map(m => m.nome)
                        const materiasSelecionadas = selectedMaterias.filter(m => materiasDoSistema.includes(m))
                        const isSelected = selectedSistemas.includes(sistema.nome)
                        const allMateriasSelected = sistemaMaterias.length > 0 && materiasSelecionadas.length === sistemaMaterias.length
                        const someMateriasSelected = materiasSelecionadas.length > 0 && materiasSelecionadas.length < sistemaMaterias.length
                        const isLast = index === filteredSistemas.length - 1

                        return (
                          <AccordionItem
                            key={sistema.id}
                            value={sistema.id}
                            className={`rounded-lg border px-4 py-1 transition-all !border-b ${!isLast ? 'mb-2' : 'mb-0'} ${
                              isSelected 
                                ? 'border-primary/50 bg-primary/5' 
                                : 'border-border hover:border-primary/30'
                            }`}
                          >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              id={sistema.id}
                              checked={isSelected}
                              onCheckedChange={() => {
                                toggleSistema(sistema.nome)
                                if (errors.sistemas && selectedSistemas.length === 0) {
                                  setErrors((prev) => ({ ...prev, sistemas: undefined }))
                                }
                              }}
                              className="shrink-0"
                            />
                            <AccordionTrigger className="flex-1 hover:no-underline py-3">
                              <div className="flex items-center gap-3 w-full pr-2">
                                <span className={`font-medium ${isSelected ? 'text-primary' : ''}`}>
                                  {sistema.nome}
                                </span>
                                {sistema.periodo && sistema.periodo !== 'Todos os períodos' && (
                                  <Badge 
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0 ml-2 shrink-0"
                                  >
                                    {sistema.periodo}
                                  </Badge>
                                )}
                                {sistemaMaterias.length > 0 && (
                                  <Badge 
                                    variant={allMateriasSelected ? "default" : someMateriasSelected ? "secondary" : "outline"}
                                    className="text-[10px] px-2 py-0 ml-auto"
                                  >
                                    {materiasSelecionadas.length}/{sistemaMaterias.length}
                                  </Badge>
                                )}
                              </div>
                            </AccordionTrigger>
                          </div>
                          <AccordionContent>
                            {sistemaMaterias.length > 0 ? (
                              <div className="space-y-3 pt-2 pb-2">
                                {/* Botões de seleção rápida para matérias */}
                                <div className="flex gap-2 mb-3">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-6 text-[10px] px-2"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      // Marcar todas as matérias deste sistema
                                      const novasMaterias = sistemaMaterias
                                        .map(m => m.nome)
                                        .filter(m => !selectedMaterias.includes(m))
                                      setSelectedMaterias(prev => [...prev, ...novasMaterias])
                                      // Garantir que o sistema está selecionado
                                      if (!selectedSistemas.includes(sistema.nome)) {
                                        setSelectedSistemas(prev => [...prev, sistema.nome])
                                      }
                                    }}
                                  >
                                    <Check className="h-3 w-3 mr-1" />
                                    Todas
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-6 text-[10px] px-2"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      // Desmarcar todas as matérias deste sistema
                                      setSelectedMaterias(prev => 
                                        prev.filter(m => !materiasDoSistema.includes(m))
                                      )
                                    }}
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    Nenhuma
                                  </Button>
                                </div>
                                
                                {/* Grid de matérias com scroll customizado */}
                                <div 
                                  className={`grid grid-cols-1 sm:grid-cols-2 gap-2 pr-1 ${
                                    sistemaMaterias.length > 5 
                                      ? 'max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-primary/30 hover:scrollbar-thumb-primary/50' 
                                      : ''
                                  }`}
                                  style={{
                                    scrollbarWidth: 'thin',
                                    scrollbarColor: 'hsl(var(--primary) / 0.3) transparent'
                                  }}
                                >
                                  {sistemaMaterias.map((materia) => (
                                    <div 
                                      key={materia.id} 
                                      className={`flex items-center gap-2 p-2 rounded-md transition-colors cursor-pointer ${
                                        selectedMaterias.includes(materia.nome)
                                          ? 'bg-primary/10 border border-primary/20'
                                          : 'hover:bg-muted/50 border border-transparent'
                                      }`}
                                      onClick={() => {
                                        toggleMateria(materia.nome)
                                        // Se está marcando uma matéria e o sistema não está selecionado, selecionar
                                        if (!selectedMaterias.includes(materia.nome) && !selectedSistemas.includes(sistema.nome)) {
                                          setSelectedSistemas(prev => [...prev, sistema.nome])
                                        }
                                      }}
                                    >
                                      <Checkbox
                                        id={`materia-${materia.id}`}
                                        checked={selectedMaterias.includes(materia.nome)}
                                        onCheckedChange={() => {
                                          toggleMateria(materia.nome)
                                          if (!selectedMaterias.includes(materia.nome) && !selectedSistemas.includes(sistema.nome)) {
                                            setSelectedSistemas(prev => [...prev, sistema.nome])
                                          }
                                        }}
                                        className="h-4 w-4 shrink-0"
                                      />
                                      <label
                                        htmlFor={`materia-${materia.id}`}
                                        className="text-sm leading-none cursor-pointer flex-1"
                                      >
                                        {materia.nome}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground italic py-2">
                                Nenhuma matéria cadastrada para este sistema
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                        )
                      })}
                    </Accordion>
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

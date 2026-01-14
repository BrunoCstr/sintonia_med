'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { BookOpen, AlertCircle, Loader2 } from 'lucide-react'
import type { Sistema, MedicalArea } from '@/lib/types'

export default function FreeQuestionsPage() {
  const { user, userProfile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [sistemas, setSistemas] = useState<MedicalArea[]>([])
  const [loadingSistemas, setLoadingSistemas] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('')
  const [selectedSistemas, setSelectedSistemas] = useState<string[]>([])
  const [errors, setErrors] = useState<{ period?: string; sistemas?: string }>({})
  const [isStarting, setIsStarting] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

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
    const newErrors: { period?: string; sistemas?: string } = {}

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
                disabled={isStarting || loadingSistemas}
                className="w-full"
                size="lg"
              >
                {isStarting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando...
                  </>
                ) : (
                  'Iniciar'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

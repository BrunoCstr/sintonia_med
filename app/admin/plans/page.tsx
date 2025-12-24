'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Loader2, 
  Save,
  DollarSign,
  Calendar,
  Sparkles,
  Info
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRole } from '@/lib/hooks/use-role'
import { formatPrice } from '@/lib/utils'
import { toast } from 'sonner'

interface Plan {
  id: string
  name: string
  price: number
  originalPrice: number | null
  badge: string
  badgeVariant: string
  duration: string
  durationMonths: number
  recommended: boolean
  createdAt: string | null
  updatedAt: string | null
}

export default function PlansPage() {
  const { isAdminMaster } = useRole()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  
  // Form states para cada plano
  const [formPrices, setFormPrices] = useState<Record<string, string>>({})
  const [formOriginalPrices, setFormOriginalPrices] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isAdminMaster) {
      fetchPlans()
    }
  }, [isAdminMaster])

  const fetchPlans = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/plans', {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Erro ao buscar planos')
      }

      const data = await response.json()
      if (data.success) {
        setPlans(data.plans || [])
        
        // Inicializar os valores dos inputs
        const prices: Record<string, string> = {}
        const originalPrices: Record<string, string> = {}
        
        data.plans.forEach((plan: Plan) => {
          prices[plan.id] = plan.price.toFixed(2).replace('.', ',')
          originalPrices[plan.id] = plan.originalPrice 
            ? plan.originalPrice.toFixed(2).replace('.', ',') 
            : ''
        })
        
        setFormPrices(prices)
        setFormOriginalPrices(originalPrices)
      }
    } catch (err: any) {
      console.error('Erro ao buscar planos:', err)
      toast.error('Erro ao carregar planos')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (planId: string) => {
    const priceStr = formPrices[planId]?.replace(',', '.')
    const originalPriceStr = formOriginalPrices[planId]?.trim().replace(',', '.')
    
    const price = parseFloat(priceStr)
    // Se originalPriceStr estiver vazio ou for apenas espaços, enviar null
    const originalPrice = originalPriceStr && originalPriceStr.length > 0 
      ? parseFloat(originalPriceStr) 
      : null

    if (isNaN(price) || price <= 0) {
      toast.error('Preço deve ser um número positivo')
      return
    }

    if (originalPrice !== null) {
      if (isNaN(originalPrice) || originalPrice <= 0) {
        toast.error('Preço original deve ser um número positivo ou vazio')
        return
      }
      
      // Validar que preço original deve ser maior que preço atual
      if (originalPrice <= price) {
        toast.error('Preço original deve ser maior que o preço atual para mostrar desconto')
        return
      }
    }

    try {
      setSaving(planId)

      const response = await fetch('/api/admin/plans', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          planId,
          price,
          originalPrice,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao salvar plano')
      }

      toast.success('Preço atualizado com sucesso!')
      await fetchPlans()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar plano')
    } finally {
      setSaving(null)
    }
  }

  const formatInputPrice = (value: string): string => {
    // Remove tudo que não é número, vírgula ou ponto
    let cleaned = value.replace(/[^\d,.]/g, '')
    
    // Converte ponto para vírgula (formato brasileiro)
    cleaned = cleaned.replace(/\./g, ',')
    
    // Garante apenas uma vírgula
    const parts = cleaned.split(',')
    if (parts.length > 2) {
      cleaned = parts[0] + ',' + parts.slice(1).join('')
    }
    
    // Limita a 2 casas decimais
    if (parts.length === 2 && parts[1].length > 2) {
      cleaned = parts[0] + ',' + parts[1].slice(0, 2)
    }
    
    return cleaned
  }

  const handlePriceChange = (planId: string, value: string) => {
    setFormPrices(prev => ({
      ...prev,
      [planId]: formatInputPrice(value)
    }))
  }

  const handleOriginalPriceChange = (planId: string, value: string) => {
    setFormOriginalPrices(prev => ({
      ...prev,
      [planId]: formatInputPrice(value)
    }))
  }

  const hasChanges = (plan: Plan): boolean => {
    const currentPriceStr = formPrices[plan.id]?.replace(',', '.') || '0'
    const currentOriginalPriceStr = formOriginalPrices[plan.id]?.replace(',', '.') || ''
    
    const currentPrice = parseFloat(currentPriceStr) || 0
    const currentOriginalPrice = currentOriginalPriceStr ? parseFloat(currentOriginalPriceStr) : null
    
    const savedPrice = plan.price
    const savedOriginalPrice = plan.originalPrice
    
    // Comparar preços com precisão de 2 casas decimais
    const priceChanged = Math.abs(currentPrice - savedPrice) > 0.01
    const originalPriceChanged = (currentOriginalPrice === null && savedOriginalPrice !== null) ||
                                 (currentOriginalPrice !== null && savedOriginalPrice === null) ||
                                 (currentOriginalPrice !== null && savedOriginalPrice !== null && 
                                  Math.abs(currentOriginalPrice - savedOriginalPrice) > 0.01)
    
    return priceChanged || originalPriceChanged
  }

  const calculateDiscount = (plan: Plan): number | null => {
    const originalPriceStr = formOriginalPrices[plan.id]?.trim().replace(',', '.')
    const priceStr = formPrices[plan.id]?.replace(',', '.')
    
    if (!originalPriceStr || originalPriceStr.length === 0) {
      return null
    }
    
    const originalPrice = parseFloat(originalPriceStr)
    const price = parseFloat(priceStr)
    
    // Só calcular desconto se ambos os valores forem válidos E originalPrice > price
    if (!isNaN(originalPrice) && !isNaN(price) && originalPrice > 0 && price > 0 && originalPrice > price) {
      return Math.round(((originalPrice - price) / originalPrice) * 100)
    }
    return null
  }

  if (!isAdminMaster) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Acesso negado. Apenas Admin Master pode acessar esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gerenciar Planos</h1>
        <p className="text-muted-foreground">
          Atualize os preços dos planos de assinatura
        </p>
      </div>

      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
        <CardContent className="flex items-start gap-3 pt-4">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <p className="font-medium mb-1">Informações sobre alteração de preços</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-400">
              <li>As alterações são aplicadas imediatamente em toda a aplicação</li>
              <li>Os valores são refletidos na página de planos e no checkout</li>
              <li>Não é possível criar novos planos ou excluir os existentes</li>
              <li>O preço original é usado para mostrar o desconto (opcional)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : plans.length === 0 ? (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardContent className="py-12 text-center">
            <Info className="mx-auto h-12 w-12 text-amber-600 dark:text-amber-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-amber-900 dark:text-amber-100">
              Nenhum plano cadastrado
            </h3>
            <p className="text-amber-800 dark:text-amber-300 mb-4">
              Crie os planos no Firestore Database para começar a gerenciar assinaturas.
            </p>
            <div className="text-left max-w-2xl mx-auto bg-white dark:bg-gray-900 p-4 rounded-lg border">
              <p className="font-medium mb-2">Collection: <code className="text-primary">plans</code></p>
              <p className="text-sm text-muted-foreground mb-3">
                Crie documentos com os seguintes campos:
              </p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• <strong>id</strong>: "monthly" ou "semester" (string)</li>
                <li>• <strong>name</strong>: Nome do plano (string)</li>
                <li>• <strong>price</strong>: Preço atual (number)</li>
                <li>• <strong>originalPrice</strong>: Preço original ou null (number/null)</li>
                <li>• <strong>badge</strong>: Texto do badge (string)</li>
                <li>• <strong>badgeVariant</strong>: "default" ou "secondary" (string)</li>
                <li>• <strong>duration</strong>: "1 mês" ou "6 meses" (string)</li>
                <li>• <strong>durationMonths</strong>: 1 ou 6 (number)</li>
                <li>• <strong>recommended</strong>: true ou false (boolean)</li>
                <li>• <strong>createdAt</strong>: timestamp atual</li>
                <li>• <strong>updatedAt</strong>: timestamp atual</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-3">
                Consulte o arquivo <code>firestore-plans-structure.md</code> para mais detalhes.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {plans.map((plan) => {
            const discount = calculateDiscount(plan)
            
            return (
              <Card key={plan.id} className={plan.recommended ? 'border-primary' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {plan.recommended && <Sparkles className="h-5 w-5 text-primary" />}
                      {plan.name}
                    </CardTitle>
                    <Badge variant={plan.badgeVariant as any}>{plan.badge}</Badge>
                  </div>
                  <CardDescription className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {plan.duration} de acesso
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Preço Atual Exibido */}
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-sm text-muted-foreground mb-1">Preço atual exibido:</p>
                    <div className="flex items-baseline gap-2">
                      {plan.originalPrice && plan.originalPrice > plan.price && (
                        <span className="text-lg text-muted-foreground line-through">
                          R$ {formatPrice(plan.originalPrice)}
                        </span>
                      )}
                      <span className="text-3xl font-bold text-primary">
                        R$ {formatPrice(plan.price)}
                      </span>
                      {plan.originalPrice && plan.originalPrice > plan.price && (
                        <Badge variant="destructive" className="text-xs">
                          {Math.round(((plan.originalPrice - plan.price) / plan.originalPrice) * 100)}% OFF
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Form de Edição */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor={`price-${plan.id}`} className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Preço (R$) *
                      </Label>
                      <Input
                        id={`price-${plan.id}`}
                        value={formPrices[plan.id] || ''}
                        onChange={(e) => handlePriceChange(plan.id, e.target.value)}
                        placeholder="Ex: 29,90"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor={`original-price-${plan.id}`} className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Preço Original (R$)
                        <span className="text-xs text-muted-foreground font-normal">- opcional, para mostrar desconto</span>
                      </Label>
                      <Input
                        id={`original-price-${plan.id}`}
                        value={formOriginalPrices[plan.id] || ''}
                        onChange={(e) => handleOriginalPriceChange(plan.id, e.target.value)}
                        placeholder="Ex: 35,90 (deixe vazio se não houver)"
                        className="mt-1"
                      />
                    </div>

                    {/* Preview do desconto */}
                    {discount && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium text-green-600 dark:text-green-400">
                          Desconto calculado: {discount}% OFF
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Botão Salvar */}
                  <Button
                    onClick={() => handleSave(plan.id)}
                    disabled={saving === plan.id || !hasChanges(plan)}
                    className="w-full cursor-pointer"
                  >
                    {saving === plan.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        {hasChanges(plan) ? 'Salvar Alterações' : 'Sem alterações'}
                      </>
                    )}
                  </Button>

                  {/* Última atualização */}
                  {plan.updatedAt && (
                    <p className="text-xs text-muted-foreground text-center">
                      Última atualização: {new Date(plan.updatedAt).toLocaleString('pt-BR')}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}


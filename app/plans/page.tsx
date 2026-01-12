'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Check, Sparkles, TrendingUp, ArrowLeft, X, ShieldCheck, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { auth } from '@/lib/firebase'
import { formatPrice } from '@/lib/utils'
import { PaymentBrick } from '@/components/payment-brick'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface Plan {
  id: string
  name: string
  price: number
  originalPrice: number | null
  badge: string
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline'
  duration: string
  durationMonths: number
  recommended?: boolean
}

const features = [
  'Acesso ilimitado ao banco de questões',
  '5 mil questões disponíveis',
  'Questões oficiais das provas nacionais',
  'Questões de concursos da área da saúde',
  'Gabarito comentado para todas as questões',
  'Painel de controle de desempenho',
  'Simulados personalizados',
]

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<{ 
    code: string; 
    discount: number; 
    applicablePlans: string[] | null 
  } | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [showCheckout, setShowCheckout] = useState(false)
  const [checkoutData, setCheckoutData] = useState<{ preferenceId: string; amount: number } | null>(null)
  const [processingPayment, setProcessingPayment] = useState(false)
  const router = useRouter()
  const { user, refreshUserProfile } = useAuth()

  // Buscar planos do Firestore
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch('/api/plans')
        const data = await response.json()
        if (data.success && data.plans && data.plans.length > 0) {
          setPlans(data.plans)
        } else {
          // Não há planos disponíveis
          setPlans([])
        }
      } catch (error) {
        console.error('Erro ao buscar planos:', error)
        setPlans([])
      } finally {
        setLoadingPlans(false)
      }
    }
    fetchPlans()
  }, [])

  const getFriendlyPaymentError = (status?: string | null, statusDetail?: string | null) => {
    const detailMap: Record<string, string> = {
      cc_rejected_bad_filled_card_number: 'Número do cartão inválido. Confira e tente novamente.',
      cc_rejected_bad_filled_date: 'Data de validade inválida.',
      cc_rejected_bad_filled_other: 'Dados do cartão inválidos. Revise as informações.',
      cc_rejected_bad_filled_security_code: 'Código de segurança inválido.',
      cc_rejected_blacklist: 'Pagamento bloqueado. Entre em contato com o emissor.',
      cc_rejected_call_for_authorize: 'É necessário autorizar a compra com o banco.',
      cc_rejected_card_disabled: 'Cartão inativo. Ative-o antes de usar.',
      cc_rejected_duplicated_payment: 'Pagamento duplicado. Verifique seu histórico.',
      cc_rejected_high_risk: 'Pagamento rejeitado por risco elevado.',
      cc_rejected_insufficient_amount: 'Saldo insuficiente.',
      cc_rejected_other_reason: 'Pagamento rejeitado pelo emissor. Use outro cartão ou contato o banco.',
    }

    if (statusDetail && detailMap[statusDetail]) {
      return detailMap[statusDetail]
    }

    const statusMap: Record<string, string> = {
      rejected: 'Pagamento rejeitado. Tente novamente ou use outro cartão.',
      cancelled: 'Pagamento cancelado.',
      pending: 'Pagamento pendente de confirmação.',
      in_process: 'Pagamento em processamento.',
    }

    if (status && statusMap[status]) {
      return statusMap[status]
    }

    return 'Não foi possível aprovar o pagamento. Tente novamente.'
  }

  // Tornar overlay transparente quando o dialog estiver aberto
  useEffect(() => {
    if (showCheckout) {
      // Aguardar um pouco para garantir que o overlay foi renderizado
      const timer = setTimeout(() => {
        const overlay = document.querySelector('[data-radix-dialog-overlay]') as HTMLElement
        if (overlay) {
          overlay.style.backgroundColor = 'transparent'
          overlay.style.backdropFilter = 'none'
        }
      }, 10)

      return () => clearTimeout(timer)
    }
  }, [showCheckout])

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      alert('Digite um código de cupom')
      return
    }

    try {
      const response = await fetch(`/api/coupons/validate?code=${encodeURIComponent(couponCode)}`)
      const data = await response.json()

      if (data.valid) {
        const discount = data.discount / 100 // Converter de percentual para decimal
        setAppliedCoupon({ 
          code: data.code, 
          discount,
          applicablePlans: data.applicablePlans || null, // Planos aplicáveis do cupom
        })
        
        // Se for cupom de 100%, mostrar mensagem especial
        if (discount === 1 || data.discount === 100) {
          toast.success('Cupom cortesia de 100% ativado com sucesso!', {
            description: 'Por favor, recarregue a página e cheque seu perfil para conferir a ativação do plano.',
            duration: 8000,
          })
        }
      } else {
        alert(data.error || 'Cupom inválido')
        setAppliedCoupon(null)
      }
    } catch (error) {
      console.error('Erro ao validar cupom:', error)
      alert('Erro ao validar cupom. Tente novamente.')
      setAppliedCoupon(null)
    }
  }

  // Verificar se o cupom é aplicável a um plano específico
  const isCouponApplicableToPlan = (planId: string) => {
    if (!appliedCoupon) return false
    // Se não há restrição de planos, o cupom é aplicável a todos
    if (!appliedCoupon.applicablePlans || appliedCoupon.applicablePlans.length === 0) {
      return true
    }
    // Verificar se o plano está na lista de planos aplicáveis
    return appliedCoupon.applicablePlans.includes(planId)
  }

  const calculatePrice = (basePrice: number, planId: string) => {
    if (appliedCoupon && isCouponApplicableToPlan(planId)) {
      return basePrice * (1 - appliedCoupon.discount)
    }
    return basePrice
  }

  const handleSelectPlan = async (planId: string) => {
    const currentUser = auth.currentUser
    if (!currentUser) {
      router.push('/auth/login?redirect=/plans')
      return
    }

    // Validar se o cupom é aplicável ao plano selecionado
    if (appliedCoupon && !isCouponApplicableToPlan(planId)) {
      alert(`O cupom "${appliedCoupon.code}" não é válido para o ${planId === 'monthly' ? 'Plano Mensal' : 'Plano Semestral'}.`)
      return
    }

    try {
      setSelectedPlan(planId)
      
      // Garantir que o token está sincronizado antes de fazer a requisição
      const token = await currentUser.getIdToken(true) // true para forçar refresh do token
      await fetch('/api/auth/sync-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ token }),
      })
      
      // Criar preferência de pagamento no Mercado Pago
      const response = await fetch('/api/payment/create-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          planId,
          couponCode: appliedCoupon && isCouponApplicableToPlan(planId) ? appliedCoupon.code : null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao criar pagamento')
      }

      const data = await response.json()
      
      // Se foi acesso gratuito (cupom 100%), atualizar o perfil e redirecionar para sucesso
      // Também verificamos se amount <= 0 ou se não há preferenceId como proteção adicional
      if (data.freeAccess || data.amount <= 0 || !data.preferenceId) {
        // Resetar estado do botão antes de redirecionar
        setSelectedPlan(null)
        
        // Mostrar mensagem de sucesso
        toast.success('Cupom cortesia de 100% ativado com sucesso!', {
          description: 'Por favor, recarregue a página e cheque seu perfil para conferir a ativação do plano.',
          duration: 8000,
        })
        
        // Atualizar o perfil do usuário para refletir o novo plano
        await refreshUserProfile()
        
        // Aguardar um pouco para o usuário ver a mensagem antes de redirecionar
        setTimeout(() => {
          router.push('/payment/success?status=approved&free_access=true')
        }, 2000)
        return
      }
      
      // Abrir checkout transparente (apenas se tiver preferenceId válido e amount > 0)
      setCheckoutData({
        preferenceId: data.preferenceId,
        amount: data.amount,
      })
      setShowCheckout(true)
    } catch (error: any) {
      console.error('Erro ao processar pagamento:', error)
      alert(`Erro ao processar pagamento: ${error.message}`)
      setSelectedPlan(null)
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/30">
      <div className="container mx-auto max-w-6xl px-4 py-12">
        <Button variant="ghost" asChild className="mb-8 cursor-pointer">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>

        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold">Escolha seu plano</h1>
          <p className="text-lg text-muted-foreground">
            Invista no seu futuro profissional com acesso completo ao SintoniaMed
          </p>
        </div>

        {/* Plans Grid */}
        {loadingPlans ? (
          <div className="mb-8 flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : plans.length === 0 ? (
          <Card className="mb-8 border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
            <CardContent className="py-12 text-center">
              <ShieldCheck className="mx-auto h-16 w-16 text-amber-600 dark:text-amber-400 mb-4" />
              <h3 className="text-2xl font-bold mb-2 text-amber-900 dark:text-amber-100">
                Assinaturas Temporariamente Indisponíveis
              </h3>
              <p className="text-amber-800 dark:text-amber-300 mb-4">
                Não há planos de assinatura disponíveis no momento.
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Entre em contato conosco para mais informações sobre planos e preços.
              </p>
            </CardContent>
          </Card>
        ) : (
        <div className="mb-8 grid gap-6 md:grid-cols-2">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative ${plan.recommended ? 'border-primary shadow-lg shadow-primary/20' : ''}`}
            >
              {plan.recommended && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    Recomendado
                  </Badge>
                </div>
              )}
              
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <Badge variant={plan.badgeVariant}>{plan.badge}</Badge>
                </div>
                <CardDescription>{plan.duration} de acesso completo</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-2">
                  {plan.originalPrice && plan.originalPrice > plan.price && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground line-through">
                        R$ {formatPrice(plan.originalPrice)}
                      </span>
                      <Badge variant="destructive" className="text-xs">
                        {Math.round(((plan.originalPrice - plan.price) / plan.originalPrice) * 100)}% OFF
                      </Badge>
                    </div>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">
                      R$ {formatPrice(calculatePrice(plan.price, plan.id))}
                    </span>
                    {appliedCoupon && isCouponApplicableToPlan(plan.id) && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Cupom aplicado
                      </Badge>
                    )}
                  </div>
                  {plan.id === 'monthly' && (
                    <p className="text-sm text-muted-foreground">por mês</p>
                  )}
                  {plan.id === 'semester' && (
                    <p className="text-sm text-muted-foreground">
                      ou R$ {formatPrice(calculatePrice(plan.price, plan.id) / 6)}/mês
                    </p>
                  )}
                  {appliedCoupon && !isCouponApplicableToPlan(plan.id) && (
                    <p className="text-sm text-destructive font-medium">
                      Cupom não aplicável a este plano
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full cursor-pointer"
                  size="lg"
                  variant={plan.recommended ? 'default' : 'outline'}
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={
                    (selectedPlan === plan.id) || 
                    (appliedCoupon ? !isCouponApplicableToPlan(plan.id) : false)
                  }
                  title={
                    appliedCoupon && !isCouponApplicableToPlan(plan.id)
                      ? `O cupom "${appliedCoupon.code}" não é válido para este plano`
                      : undefined
                  }
                >
                  {selectedPlan === plan.id 
                    ? 'Processando...' 
                    : appliedCoupon && !isCouponApplicableToPlan(plan.id)
                    ? 'Cupom não aplicável'
                    : 'Assinar Agora'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        )}

        {/* Payment Security Info */}
        <div className="mb-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>Pagamento seguro via MercadoPago</span>
        </div>

        {/* Coupon Section */}
        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              Tem um cupom de desconto?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Digite o código do cupom"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleApplyCoupon} disabled={!couponCode} className="cursor-pointer">
                Aplicar
              </Button>
            </div>
            {appliedCoupon && (
              <div className="mt-2 space-y-1">
                <p className="text-sm text-success">
                  Cupom "{appliedCoupon.code}" aplicado! Desconto de {appliedCoupon.discount * 100}%
                </p>
                {appliedCoupon.applicablePlans && appliedCoupon.applicablePlans.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Válido apenas para: {appliedCoupon.applicablePlans.map(p => 
                      p === 'monthly' ? 'Plano Mensal' : 'Plano Semestral'
                    ).join(' e ')}
                  </p>
                )}
              </div>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Digite o código do cupom para aplicar o desconto
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Checkout Transparente Dialog */}
      <Dialog open={showCheckout} onOpenChange={(open) => {
        // Só permite fechar programaticamente (via botão X ou código)
        if (open === false) {
          setShowCheckout(false)
          setSelectedPlan(null) // Resetar estado do botão quando fechar o dialog
          setCheckoutData(null) // Limpar dados do checkout
        }
      }}>
        <DialogContent 
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          onInteractOutside={(e) => {
            // Prevenir fechar ao clicar fora
            e.preventDefault()
          }}
        >
          <DialogHeader>
            <DialogTitle>Finalizar Pagamento</DialogTitle>
            <DialogDescription>
              Complete o pagamento para ativar sua assinatura
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Pagamento seguro via MercadoPago</span>
          </div>
          
          {checkoutData && (
            <PaymentBrick
              publicKey={process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || ''}
              preferenceId={checkoutData.preferenceId}
              amount={checkoutData.amount}
              onPaymentSuccess={(paymentId, status) => {
                setProcessingPayment(true)
                setShowCheckout(false)
                router.push(`/payment/success?status=${status}&payment_id=${paymentId}`)
              }}
              onPaymentError={(error) => {
                console.error('Erro no pagamento:', error)
                const friendlyMessage = getFriendlyPaymentError(error.status, error.statusDetail) || error.message
                setShowCheckout(false)
                setSelectedPlan(null)
                setCheckoutData(null) // Limpar dados do checkout
                router.push(
                  `/payment/failure?status=${error.status || 'rejected'}&message=${encodeURIComponent(
                    friendlyMessage
                  )}`
                )
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

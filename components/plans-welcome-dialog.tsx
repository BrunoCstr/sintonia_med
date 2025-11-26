'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Check, Sparkles, Crown, ArrowLeft, TrendingUp } from 'lucide-react'
import { usePremium } from '@/lib/hooks/use-premium'
import { auth } from '@/lib/firebase'
import { PaymentBrick, PaymentErrorInfo } from '@/components/payment-brick'

const plans = [
  {
    id: 'monthly',
    name: 'Plano Mensal',
    price: 29.90,
    originalPrice: null,
    badge: 'Flexível',
    badgeVariant: 'secondary' as const,
    duration: '1 mês',
  },
  {
    id: 'semester',
    name: 'Plano Semestral',
    price: 143.00,
    originalPrice: 179.00,
    badge: 'Mais Vendido',
    badgeVariant: 'default' as const,
    duration: '6 meses',
    recommended: true,
  },
]

const freeFeatures = [
  'Acesso ao banco de questões completo (5 mil questões)',
  '1 lista de 5 questões por dia',
  'Gabarito Simples',
]

const premiumFeatures = [
  'Acesso ao banco de questões completo (5 mil questões)',
  'Listas ilimitadas',
  'Questões Ilimitadas',
  'Painel personalizado com acompanhamento de desenvolvimento',
  'Pontos fortes e fracos',
  'Gráficos de desempenho',
  'Assuntos que você mais erra',
  'Gabarito comentado completo',
]

interface PlansWelcomeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onContinueFree?: () => void
}

export function PlansWelcomeDialog({ open, onOpenChange, onContinueFree }: PlansWelcomeDialogProps) {
  const router = useRouter()
  const { isPremium } = usePremium()
  const [showCheckout, setShowCheckout] = useState(false)
  const [checkoutData, setCheckoutData] = useState<{ preferenceId: string; amount: number } | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<{ 
    code: string; 
    discount: number; 
    applicablePlans: string[] | null 
  } | null>(null)

  // Se o usuário já for premium, não mostrar o dialog
  useEffect(() => {
    if (isPremium && open) {
      onOpenChange(false)
    }
  }, [isPremium, open, onOpenChange])

  // Limpar checkout quando o dialog principal fecha
  useEffect(() => {
    if (!open) {
      setShowCheckout(false)
      setCheckoutData(null)
      setSelectedPlan(null)
      setCouponCode('')
      setAppliedCoupon(null)
    }
  }, [open])

  // Tornar overlay transparente quando o checkout estiver aberto
  useEffect(() => {
    if (showCheckout) {
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

  const handleContinueFree = () => {
    onOpenChange(false)
    onContinueFree?.()
  }

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      alert('Digite um código de cupom')
      return
    }

    try {
      const response = await fetch(`/api/coupons/validate?code=${encodeURIComponent(couponCode)}`)
      const data = await response.json()

      if (data.valid) {
        setAppliedCoupon({ 
          code: data.code, 
          discount: data.discount / 100, // Converter de percentual para decimal
          applicablePlans: data.applicablePlans || null, // Planos aplicáveis do cupom
        })
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

  const handleSelectPlan = async (planId: string) => {
    const currentUser = auth.currentUser
    if (!currentUser) {
      router.push('/auth/login?redirect=/dashboard')
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
      const token = await currentUser.getIdToken(true)
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
      
      // Abrir checkout dentro do dialog
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

  if (isPremium) {
    return null
  }

  return (
    <Dialog 
      open={open} 
      onOpenChange={(newOpen) => {
        if (!newOpen && showCheckout) {
          // Se está no checkout, apenas fechar o checkout, não o dialog principal
          setShowCheckout(false)
          setCheckoutData(null)
          setSelectedPlan(null)
        } else {
          onOpenChange(newOpen)
        }
      }}
    >
      <DialogContent 
        className={showCheckout ? "max-w-2xl max-h-[90vh] overflow-y-auto" : "max-w-5xl max-h-[90vh] overflow-y-auto"}
        onInteractOutside={(e) => {
          if (showCheckout) {
            // Prevenir fechar ao clicar fora quando estiver no checkout
            e.preventDefault()
          }
        }}
      >
        {showCheckout && checkoutData ? (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle>Finalizar Pagamento</DialogTitle>
                  <DialogDescription>
                    Complete o pagamento para ativar sua assinatura
                  </DialogDescription>
                </div>
                <Button
                className="cursor-pointer"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowCheckout(false)
                    setCheckoutData(null)
                    setSelectedPlan(null)
                  }}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>
            
            <PaymentBrick
              publicKey={process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || ''}
              preferenceId={checkoutData.preferenceId}
              amount={checkoutData.amount}
              onPaymentSuccess={(paymentId, status) => {
                setProcessingPayment(true)
                setShowCheckout(false)
                onOpenChange(false)
                router.push(`/payment/success?status=${status}&payment_id=${paymentId}`)
              }}
              onPaymentError={(error) => {
                console.error('Erro no pagamento:', error)
                const friendlyMessage = getFriendlyPaymentError(error.status, error.statusDetail) || error.message
                setShowCheckout(false)
                setSelectedPlan(null)
                setCheckoutData(null)
                router.push(
                  `/payment/failure?status=${error.status || 'rejected'}&message=${encodeURIComponent(
                    friendlyMessage
                  )}`
                )
              }}
            />
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-3xl font-bold text-center">
                Escolha o melhor plano para você
              </DialogTitle>
              <DialogDescription className="text-center text-base">
                Compare os planos e escolha o que melhor atende às suas necessidades
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 md:grid-cols-3 mt-6">
          {/* Plano Free */}
          <Card className="relative">
            <CardHeader>
              <CardTitle className="text-xl">Plano Free</CardTitle>
              <CardDescription>Perfeito para começar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <span className="text-3xl font-bold">Grátis</span>
              </div>
              <div className="space-y-2">
                {freeFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button 
              
                variant="outline" 
                className="w-full cursor-pointer"
                onClick={handleContinueFree}
              >
                Continuar Gratuito
              </Button>
            </CardFooter>
          </Card>

          {/* Planos Premium */}
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
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <Badge variant={plan.badgeVariant}>{plan.badge}</Badge>
                </div>
                <CardDescription>{plan.duration} de acesso completo</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {plan.originalPrice && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground line-through">
                        R$ {plan.originalPrice.toFixed(2)}
                      </span>
                      <Badge variant="destructive" className="text-xs">
                        20% OFF
                      </Badge>
                    </div>
                  )}
                  {appliedCoupon && isCouponApplicableToPlan(plan.id) && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground line-through">
                        R$ {plan.price.toFixed(2)}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        Cupom aplicado
                      </Badge>
                    </div>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">
                      R$ {calculatePrice(plan.price, plan.id).toFixed(2)}
                    </span>
                  </div>
                  {plan.id === 'monthly' && (
                    <p className="text-sm text-muted-foreground">por mês</p>
                  )}
                  {plan.id === 'semester' && (
                    <p className="text-sm text-muted-foreground">
                      ou R$ {(calculatePrice(plan.price, plan.id) / 6).toFixed(2)}/mês
                    </p>
                  )}
                  {appliedCoupon && !isCouponApplicableToPlan(plan.id) && (
                    <p className="text-sm text-destructive font-medium">
                      Cupom não aplicável a este plano
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  {premiumFeatures.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
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

            {/* Coupon Section */}
            <Card className="mx-auto max-w-2xl mt-6">
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleApplyCoupon()
                      }
                    }}
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

            <div className="mt-6 text-center">
              <Button
                variant="ghost"
                onClick={handleContinueFree}
                className="text-muted-foreground cursor-pointer"
              >
                Continuar com o plano gratuito por enquanto
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}


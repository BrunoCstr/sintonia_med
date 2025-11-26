'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Check, Sparkles, TrendingUp, ArrowLeft, X } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { auth } from '@/lib/firebase'
import { PaymentBrick } from '@/components/payment-brick'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [showCheckout, setShowCheckout] = useState(false)
  const [checkoutData, setCheckoutData] = useState<{ preferenceId: string; amount: number } | null>(null)
  const [processingPayment, setProcessingPayment] = useState(false)
  const router = useRouter()
  const { user } = useAuth()

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
        setAppliedCoupon({ 
          code: data.code, 
          discount: data.discount / 100 // Converter de percentual para decimal
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

  const calculatePrice = (basePrice: number) => {
    if (appliedCoupon) {
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
          couponCode: appliedCoupon?.code || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao criar pagamento')
      }

      const data = await response.json()
      
      // Abrir checkout transparente
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
        <Button variant="ghost" asChild className="mb-8">
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
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">
                      R$ {calculatePrice(plan.price).toFixed(2)}
                    </span>
                    {appliedCoupon && (
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
                      ou R$ {(calculatePrice(plan.price) / 6).toFixed(2)}/mês
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
                  className="w-full"
                  size="lg"
                  variant={plan.recommended ? 'default' : 'outline'}
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={selectedPlan === plan.id}
                >
                  {selectedPlan === plan.id ? 'Processando...' : 'Assinar Agora'}
                </Button>
              </CardFooter>
            </Card>
          ))}
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
              <Button onClick={handleApplyCoupon} disabled={!couponCode}>
                Aplicar
              </Button>
            </div>
            {appliedCoupon && (
              <p className="mt-2 text-sm text-success">
                Cupom "{appliedCoupon.code}" aplicado! Desconto de {appliedCoupon.discount * 100}%
              </p>
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

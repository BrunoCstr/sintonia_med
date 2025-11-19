'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Check, Sparkles, TrendingUp, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'

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
  const router = useRouter()
  const { user } = useAuth()

  const handleApplyCoupon = () => {
    // Mock coupon validation
    const mockCoupons: Record<string, number> = {
      'MEDICINA20': 0.20,
      'ESTUDANTE15': 0.15,
      'SINTONIZA10': 0.10,
    }

    const discount = mockCoupons[couponCode.toUpperCase()]
    if (discount) {
      setAppliedCoupon({ code: couponCode, discount })
    } else {
      alert('Cupom inválido')
    }
  }

  const calculatePrice = (basePrice: number) => {
    if (appliedCoupon) {
      return basePrice * (1 - appliedCoupon.discount)
    }
    return basePrice
  }

  const handleSelectPlan = (planId: string) => {
    if (!user) {
      router.push('/auth/login?redirect=/plans')
      return
    }
    setSelectedPlan(planId)
    // Here you would integrate with Mercado Pago
    // For now, we'll just redirect to dashboard
    setTimeout(() => {
      router.push('/dashboard')
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
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
              Experimente os cupons: MEDICINA20, ESTUDANTE15, ou SINTONIZA10
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

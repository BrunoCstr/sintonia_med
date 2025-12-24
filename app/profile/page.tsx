'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth-context'
import { useRole } from '@/lib/hooks/use-role'
import { formatPrice } from '@/lib/utils'
import { User, Mail, Calendar, CreditCard, Edit2, Loader2, Check, Sparkles, TrendingUp, X, Camera, ShieldCheck, Crown, Infinity } from 'lucide-react'
import { TwoFactorSettings } from '@/components/admin/two-factor-settings'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { PaymentBrick } from '@/components/payment-brick'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const periods = [
  '1º Período',
  '2º Período',
  '3º Período',
  '4º Período',
  '5º Período',
  '6º Período',
  '7º Período',
  '8º Período',
  'Formado',
]

const plans = [
  {
    id: 'monthly',
    name: 'Plano Mensal',
    price: 29.9,
    duration: '1 mês',
  },
  {
    id: 'semester',
    name: 'Plano Semestral',
    price: 143.0,
    originalPrice: 179.0,
    duration: '6 meses',
    recommended: true,
  },
]

const features = [
  'Acesso ilimitado ao banco de questões',
  '+5 mil questões disponíveis',
  'Questões oficiais das provas nacionais',
  'Questões de concursos da área da saúde',
  'Painel de controle de desempenho',
  'Simulados personalizados',
  'Gabarito comentado para todas as questões',
]

export default function ProfilePage() {
  const router = useRouter()
  const { user, userProfile, refreshUserProfile } = useAuth()
  const { isAnyAdmin } = useRole()
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null)
  const [checkingPlan, setCheckingPlan] = useState(true)

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
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(userProfile?.name || '')
  const [period, setPeriod] = useState(userProfile?.period || '')
  const [loading, setLoading] = useState(false)
  const [statsLoading, setStatsLoading] = useState(true)
  const [stats, setStats] = useState({
    questionsAnswered: 0,
    accuracyRate: 0,
    quizzesCompleted: 0,
  })
  const [showPlans, setShowPlans] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
    applicablePlans: string[] | null
  } | null>(null)
  const [subscribing, setSubscribing] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [showCheckout, setShowCheckout] = useState(false)
  const [checkoutData, setCheckoutData] = useState<{ preferenceId: string; amount: number } | null>(null)

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

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || '')
      setPeriod(userProfile.period || '')
    }
  }, [userProfile])

  // Verificar plano expirado e calcular dias restantes
  useEffect(() => {
    const checkExpiredPlan = async () => {
      if (!user) {
        setCheckingPlan(false)
        return
      }

      try {
        setCheckingPlan(true)
        const response = await fetch('/api/user/check-expired-plan', {
          method: 'POST',
          credentials: 'include',
        })

        if (response.ok) {
          const data = await response.json()
          
          // Se o plano expirou, atualizar o perfil
          if (data.expired) {
            await refreshUserProfile()
            setDaysRemaining(null)
          } else if (data.daysRemaining !== undefined) {
            setDaysRemaining(data.daysRemaining)
          } else if (userProfile?.planExpiresAt) {
            // Calcular dias restantes localmente se a API não retornou
            try {
              const expiresDate = typeof userProfile.planExpiresAt === 'string'
                ? new Date(userProfile.planExpiresAt)
                : userProfile.planExpiresAt instanceof Date
                  ? userProfile.planExpiresAt
                  : new Date(userProfile.planExpiresAt)
              
              if (!isNaN(expiresDate.getTime())) {
                const now = new Date()
                const diffTime = expiresDate.getTime() - now.getTime()
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                setDaysRemaining(Math.max(0, diffDays))
              }
            } catch (error) {
              console.error('Erro ao calcular dias restantes:', error)
            }
          }
        }
      } catch (error) {
        console.error('Erro ao verificar plano expirado:', error)
        // Calcular dias restantes localmente em caso de erro
        if (userProfile?.planExpiresAt) {
          try {
            const expiresDate = typeof userProfile.planExpiresAt === 'string'
              ? new Date(userProfile.planExpiresAt)
              : userProfile.planExpiresAt instanceof Date
                ? userProfile.planExpiresAt
                : new Date(userProfile.planExpiresAt)
            
            if (!isNaN(expiresDate.getTime())) {
              const now = new Date()
              const diffTime = expiresDate.getTime() - now.getTime()
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
              setDaysRemaining(Math.max(0, diffDays))
            }
          } catch (error) {
            console.error('Erro ao calcular dias restantes:', error)
          }
        }
      } finally {
        setCheckingPlan(false)
      }
    }

    checkExpiredPlan()
  }, [user, userProfile, refreshUserProfile])

  useEffect(() => {
    loadStats()
  }, [user])

  const loadStats = async () => {
    if (!user) return

    try {
      setStatsLoading(true)
      const response = await fetch('/api/user/stats', {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar estatísticas')
      }

      const data = await response.json()
      setStats(data.stats || { questionsAnswered: 0, accuracyRate: 0, quizzesCompleted: 0 })
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user) return

    setLoading(true)
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ name, period }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao atualizar perfil')
      }

      const data = await response.json()
      if (refreshUserProfile) {
        await refreshUserProfile()
      }
      alert('Perfil atualizado com sucesso!')
      setIsEditing(false)
    } catch (error: any) {
      console.error('Error updating profile:', error)
      alert(error.message || 'Erro ao atualizar perfil')
    } finally {
      setLoading(false)
    }
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

  const handleSubscribe = async (planId: string) => {
    const currentUser = auth.currentUser
    if (!currentUser) {
      router.push('/auth/login?redirect=/profile')
      return
    }

    // Validar se o cupom é aplicável ao plano selecionado
    if (appliedCoupon && !isCouponApplicableToPlan(planId)) {
      alert(`O cupom "${appliedCoupon.code}" não é válido para o ${planId === 'monthly' ? 'Plano Mensal' : 'Plano Semestral'}.`)
      return
    }

    setSubscribing(true)
    setSelectedPlan(planId)

    try {
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
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao criar pagamento')
      }

      const data = await response.json()

      // Abrir checkout transparente
      setCheckoutData({
        preferenceId: data.preferenceId,
        amount: data.amount,
      })
      setShowCheckout(true)
    } catch (error: any) {
      console.error('Erro ao assinar plano:', error)
      alert(error.message || 'Erro ao assinar plano')
    } finally {
      setSubscribing(false)
      setSelectedPlan(null)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem válida')
      return
    }

    // Validar tamanho (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 2MB')
      return
    }

    // Criar preview local
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Fazer upload
    setUploadingAvatar(true)
    try {
      // Obter token do Firebase Auth
      const token = user ? await user.getIdToken() : null
      if (!token) {
        throw new Error('Não autenticado. Por favor, faça login novamente.')
      }

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/user/upload-avatar', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao fazer upload da foto')
      }

      const data = await response.json()
      if (refreshUserProfile) {
        await refreshUserProfile()
      }
      alert('Foto de perfil atualizada com sucesso!')
    } catch (error: any) {
      console.error('Erro ao fazer upload da foto:', error)
      alert(error.message || 'Erro ao fazer upload da foto')
      setAvatarPreview(null)
    } finally {
      setUploadingAvatar(false)
      // Limpar input
      e.target.value = ''
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Perfil</h1>
          <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
            <CardDescription>Atualize seus dados cadastrais</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                  className="hidden"
                />
                <label
                  htmlFor="avatar-upload"
                  className="cursor-pointer block group"
                  title="Clique para alterar a foto de perfil"
                >
                  <Avatar className="h-20 w-20 relative overflow-hidden ring-2 ring-transparent group-hover:ring-primary transition-all duration-200">
                    {(avatarPreview || userProfile?.photoURL) && (
                      <AvatarImage
                        src={avatarPreview || userProfile?.photoURL}
                        alt={userProfile?.name || 'Avatar'}
                        className="object-cover"
                      />
                    )}
                    <AvatarFallback className="bg-primary text-2xl text-primary-foreground">
                      {userProfile ? getInitials(userProfile.name) : 'US'}
                    </AvatarFallback>
                    {/* Overlay no hover */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-full">
                      {uploadingAvatar ? (
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                      ) : (
                        <Camera className="h-6 w-6 text-white" />
                      )}
                    </div>
                  </Avatar>
                </label>
              </div>
              <div>
                <h3 className="text-lg font-semibold">{userProfile?.name}</h3>
                <p className="text-sm text-muted-foreground">{userProfile?.email}</p>
              </div>
            </div>

            {/* Form */}
            {isEditing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="period">Período</Label>
                  <Select value={period} onValueChange={setPeriod} disabled={loading}>
                    <SelectTrigger id="period">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {periods.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={loading} className="cursor-pointer">
                    {loading ? 'Salvando...' : 'Salvar'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false)
                      setName(userProfile?.name || '')
                      setPeriod(userProfile?.period || '')
                    }}
                    disabled={loading}
                    className="cursor-pointer"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Nome</p>
                    <p className="font-medium">{userProfile?.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{userProfile?.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Período</p>
                    <p className="font-medium">{userProfile?.period}</p>
                  </div>
                </div>

                <Button onClick={() => setIsEditing(true)} className="cursor-pointer">
                  <Edit2 className="mr-2 h-4 w-4" />
                  Editar Perfil
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscription Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Assinatura
            </CardTitle>
            <CardDescription>Gerencie seu plano atual</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Plano Vitalício - Design especial */}
            {userProfile?.plan === 'lifetime' ? (
              <div className="relative overflow-hidden rounded-xl border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-amber-500/10 to-orange-500/5 p-6">
                {/* Decoração de fundo */}
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-amber-500/10 blur-2xl" />
                <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-20 w-20 rounded-full bg-orange-500/10 blur-2xl" />
                
                <div className="relative flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/25">
                    <Crown className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent dark:from-amber-400 dark:to-orange-400">
                        Plano Vitalício
                      </h3>
                      <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25 hover:bg-amber-500/20">
                        Cortesia
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                      <Infinity className="h-4 w-4 text-amber-500" />
                      Acesso premium sem expiração
                    </p>
                  </div>
                </div>
                
                <div className="relative mt-4 pt-4 border-t border-amber-500/20">
                  <p className="text-xs text-amber-600/70 dark:text-amber-400/70">
                    Você possui acesso completo a todas as funcionalidades da plataforma para sempre.
                  </p>
                </div>
              </div>
            ) : (
              /* Planos normais (mensal/semestral ou sem plano) */
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-semibold">
                    {userProfile?.plan === 'monthly' && 'Plano Mensal'}
                    {userProfile?.plan === 'semester' && 'Plano Semestral'}
                    {!userProfile?.plan && 'Nenhum Plano Ativo'}
                  </p>
                  {userProfile?.plan && userProfile?.planExpiresAt && (() => {
                    try {
                      const expiresDate = typeof userProfile.planExpiresAt === 'string'
                        ? new Date(userProfile.planExpiresAt)
                        : userProfile.planExpiresAt instanceof Date
                          ? userProfile.planExpiresAt
                          : new Date(userProfile.planExpiresAt)

                      if (isNaN(expiresDate.getTime())) {
                        return null
                      }

                      // Calcular dias restantes se não foi calculado ainda
                      let daysLeft = daysRemaining
                      if (daysLeft === null) {
                        const now = new Date()
                        const diffTime = expiresDate.getTime() - now.getTime()
                        daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                      }

                      const formattedDate = expiresDate.toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })

                      return (
                        <p className="text-sm text-muted-foreground">
                          Expira em: {formattedDate}
                          {daysLeft !== null && daysLeft >= 0 && (
                            <span className="ml-2 text-primary font-medium">
                              ({daysLeft} {daysLeft === 1 ? 'dia' : 'dias'})
                            </span>
                          )}
                        </p>
                      )
                    } catch (error) {
                      console.error('Erro ao formatar data de expiração:', error)
                      return null
                    }
                  })()}
                </div>
                <Badge variant={userProfile?.plan ? 'default' : 'secondary'}>
                  {userProfile?.plan ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            )}

            {/* Não mostra opções de plano para usuários com plano vitalício */}
            {userProfile?.plan === 'lifetime' ? null : !showPlans ? (
              <Button
                variant={userProfile?.plan ? 'outline' : 'default'}
                onClick={() => setShowPlans(true)} 
                className="cursor-pointer"
              >
                {userProfile?.plan ? 'Alterar Plano' : 'Assinar Agora'}
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Escolha seu plano</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowPlans(false)
                      setCouponCode('')
                      setAppliedCoupon(null)
                    }}
                    className="cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {plans.map((plan) => (
                    <Card
                      key={plan.id}
                      className={`relative ${plan.recommended ? 'border-primary shadow-lg shadow-primary/20' : ''}`}
                    >
                      {plan.recommended && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <Badge className="gap-1">
                            <Sparkles className="h-3 w-3" />
                            Recomendado
                          </Badge>
                        </div>
                      )}

                      <CardHeader>
                        <CardTitle className="text-xl">{plan.name}</CardTitle>
                        <CardDescription>{plan.duration} de acesso completo</CardDescription>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          {plan.originalPrice && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground line-through">
                                R$ {formatPrice(plan.originalPrice)}
                              </span>
                              <Badge variant="destructive" className="text-xs">
                                20% OFF
                              </Badge>
                            </div>
                          )}
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold">
                              R$ {formatPrice(calculatePrice(plan.price, plan.id))}
                            </span>
                            {appliedCoupon && isCouponApplicableToPlan(plan.id) && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                Cupom aplicado
                              </Badge>
                            )}
                          </div>
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

                        <div className="space-y-2">
                          {features.slice(0, 3).map((feature, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                              <span className="text-xs">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>

                      <div className="px-6 pb-6">
                        <Button
                          className="w-full cursor-pointer"
                          variant={plan.recommended ? 'default' : 'outline'}
                          onClick={() => handleSubscribe(plan.id)}
                          disabled={
                            (subscribing && selectedPlan === plan.id) ||
                            (appliedCoupon && !isCouponApplicableToPlan(plan.id))
                          }
                          title={
                            appliedCoupon && !isCouponApplicableToPlan(plan.id)
                              ? `O cupom "${appliedCoupon.code}" não é válido para este plano`
                              : undefined
                          }
                        >
                          {subscribing && selectedPlan === plan.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processando...
                            </>
                          ) : appliedCoupon && !isCouponApplicableToPlan(plan.id) ? (
                            'Cupom não aplicável'
                          ) : (
                            'Assinar Agora'
                          )}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Coupon Section */}
                <div className="rounded-lg border p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <Label className="text-sm font-medium">Tem um cupom de desconto?</Label>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite o código do cupom"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-1"
                      disabled={subscribing}
                    />
                    <Button onClick={handleApplyCoupon} disabled={!couponCode || subscribing} className="cursor-pointer">
                      Aplicar
                    </Button>
                  </div>
                  {appliedCoupon && (
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-success">
                        Cupom "{appliedCoupon.code}" aplicado! Desconto de{' '}
                        {appliedCoupon.discount * 100}%
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
                  <p className="mt-2 text-xs text-muted-foreground">
                    Digite o código do cupom para aplicar o desconto
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Two Factor Authentication - Only for Admins */}
        {isAnyAdmin && <TwoFactorSettings />}

        {/* Account Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Estatísticas da Conta</CardTitle>
          </CardHeader>

          <CardContent>
            {statsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-2xl font-bold text-primary">
                    {stats.questionsAnswered.toLocaleString('pt-BR')}
                  </p>
                  <p className="text-sm text-muted-foreground">Questões respondidas</p>
                </div>

                <div className="rounded-lg border p-4 text-center">
                  <p className="text-2xl font-bold text-success">{stats.accuracyRate}%</p>
                  <p className="text-sm text-muted-foreground">Taxa de acertos</p>
                </div>

                <div className="rounded-lg border p-4 text-center">
                  <p className="text-2xl font-bold text-secondary">
                    {stats.quizzesCompleted}
                  </p>
                  <p className="text-sm text-muted-foreground">Simulados realizados</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Checkout Transparente Dialog */}
      <Dialog open={showCheckout} onOpenChange={(open) => {
        // Só permite fechar programaticamente (via botão X ou código)
        if (open === false) {
          setShowCheckout(false)
          setSelectedPlan(null) // Resetar estado do botão quando fechar o dialog
          setSubscribing(false) // Resetar estado de processamento
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
                setSubscribing(false)
                setShowCheckout(false)
                if (refreshUserProfile) {
                  refreshUserProfile()
                }
                router.push(`/payment/success?status=${status}&payment_id=${paymentId}`)
              }}
              onPaymentError={(error) => {
                console.error('Erro no pagamento:', error)
                const friendlyMessage = getFriendlyPaymentError(error.status, error.statusDetail) || error.message
                setSubscribing(false)
                setSelectedPlan(null)
                setShowCheckout(false)
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
    </DashboardLayout>
  )
}

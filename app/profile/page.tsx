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
import { User, Mail, Calendar, CreditCard, Edit2, Loader2, Check, Sparkles, TrendingUp, X, Camera } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'

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
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null)
  const [subscribing, setSubscribing] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || '')
      setPeriod(userProfile.period || '')
    }
  }, [userProfile])

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

  const handleApplyCoupon = () => {
    const mockCoupons: Record<string, number> = {
      MEDICINA20: 0.2,
      ESTUDANTE15: 0.15,
      SINTONIZA10: 0.1,
    }

    const discount = mockCoupons[couponCode.toUpperCase()]
    if (discount) {
      setAppliedCoupon({ code: couponCode.toUpperCase(), discount })
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

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      router.push('/auth/login?redirect=/profile')
      return
    }

    setSubscribing(true)
    setSelectedPlan(planId)

    try {
      const response = await fetch('/api/user/subscribe', {
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
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao assinar plano')
      }

      const data = await response.json()
      if (refreshUserProfile) {
        await refreshUserProfile()
      }
      alert('Assinatura ativada com sucesso!')
      setShowPlans(false)
      setSelectedPlan(null)
      setCouponCode('')
      setAppliedCoupon(null)
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
                  <Button onClick={handleSave} disabled={loading}>
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

                <Button onClick={() => setIsEditing(true)}>
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
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-semibold">
                  {userProfile?.plan === 'monthly' && 'Plano Mensal'}
                  {userProfile?.plan === 'semester' && 'Plano Semestral'}
                  {!userProfile?.plan && 'Nenhum Plano Ativo'}
                </p>
                {userProfile?.plan && userProfile?.planExpiresAt && (
                  <p className="text-sm text-muted-foreground">
                    Expira em: {new Date(userProfile.planExpiresAt).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
              <Badge variant={userProfile?.plan ? 'default' : 'secondary'}>
                {userProfile?.plan ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>

            {!showPlans ? (
              <Button
                variant={userProfile?.plan ? 'outline' : 'default'}
                onClick={() => setShowPlans(true)}
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
                                R$ {plan.originalPrice.toFixed(2)}
                              </span>
                              <Badge variant="destructive" className="text-xs">
                                20% OFF
                              </Badge>
                            </div>
                          )}
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold">
                              R$ {calculatePrice(plan.price).toFixed(2)}
                            </span>
                            {appliedCoupon && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                Cupom aplicado
                              </Badge>
                            )}
                          </div>
                          {plan.id === 'semester' && (
                            <p className="text-sm text-muted-foreground">
                              ou R$ {(calculatePrice(plan.price) / 6).toFixed(2)}/mês
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
                          className="w-full"
                          variant={plan.recommended ? 'default' : 'outline'}
                          onClick={() => handleSubscribe(plan.id)}
                          disabled={subscribing && selectedPlan === plan.id}
                        >
                          {subscribing && selectedPlan === plan.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processando...
                            </>
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
                    <Button onClick={handleApplyCoupon} disabled={!couponCode || subscribing}>
                      Aplicar
                    </Button>
                  </div>
                  {appliedCoupon && (
                    <p className="mt-2 text-sm text-success">
                      Cupom "{appliedCoupon.code}" aplicado! Desconto de{' '}
                      {appliedCoupon.discount * 100}%
                    </p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Experimente os cupons: MEDICINA20, ESTUDANTE15, ou SINTONIZA10
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

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
    </DashboardLayout>
  )
}

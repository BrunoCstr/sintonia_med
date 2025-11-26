'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Loader2, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  Calendar,
  Users
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRole } from '@/lib/hooks/use-role'

interface Coupon {
  code: string
  discount: number
  description: string | null
  active: boolean
  maxUses: number | null
  maxUsesPerUser: number | null
  validFrom: string
  validUntil: string
  applicablePlans: string[] | null
  createdAt: string
  updatedAt: string
  createdBy: string
}

interface CouponStats {
  totalUses: number
  totalUsesApproved: number
  uniqueUsers: number
  uniqueUsersApproved: number
  totalDiscount: number
  totalDiscountApproved: number
}

export default function CouponsPage() {
  const { user } = useAuth()
  const { isAdminMaster } = useRole()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [stats, setStats] = useState<Record<string, CouponStats>>({})
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showStatsDialog, setShowStatsDialog] = useState(false)
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null)
  const [selectedStats, setSelectedStats] = useState<CouponStats | null>(null)
  
  // Form states
  const [formCode, setFormCode] = useState('')
  const [formDiscount, setFormDiscount] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formActive, setFormActive] = useState(true)
  const [formMaxUses, setFormMaxUses] = useState('')
  const [formMaxUsesPerUser, setFormMaxUsesPerUser] = useState('')
  const [formValidFrom, setFormValidFrom] = useState('')
  const [formValidUntil, setFormValidUntil] = useState('')
  const [formApplicablePlans, setFormApplicablePlans] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isAdminMaster) {
      fetchCoupons()
    }
  }, [isAdminMaster])

  const fetchCoupons = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/coupons', {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Erro ao buscar cupons')
      }

      const data = await response.json()
      if (data.success) {
        setCoupons(data.coupons || [])
        
        // Buscar estatísticas para cada cupom
        const statsPromises = data.coupons.map((coupon: Coupon) => 
          fetchCouponStats(coupon.code)
        )
        const statsResults = await Promise.all(statsPromises)
        const statsMap: Record<string, CouponStats> = {}
        data.coupons.forEach((coupon: Coupon, index: number) => {
          statsMap[coupon.code] = statsResults[index]
        })
        setStats(statsMap)
      }
    } catch (err: any) {
      console.error('Erro ao buscar cupons:', err)
      alert('Erro ao carregar cupons')
    } finally {
      setLoading(false)
    }
  }

  const fetchCouponStats = async (code: string): Promise<CouponStats> => {
    try {
      const response = await fetch(`/api/admin/coupons/${code}/stats`, {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        return data.stats || { 
          totalUses: 0, 
          totalUsesApproved: 0,
          uniqueUsers: 0, 
          uniqueUsersApproved: 0,
          totalDiscount: 0,
          totalDiscountApproved: 0
        }
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error)
    }
    return { 
      totalUses: 0, 
      totalUsesApproved: 0,
      uniqueUsers: 0, 
      uniqueUsersApproved: 0,
      totalDiscount: 0,
      totalDiscountApproved: 0
    }
  }

  const resetForm = () => {
    setFormCode('')
    setFormDiscount('')
    setFormDescription('')
    setFormActive(true)
    setFormMaxUses('')
    setFormMaxUsesPerUser('')
    setFormValidFrom('')
    setFormValidUntil('')
    setFormApplicablePlans([])
    setError('')
  }

  const handleCreate = () => {
    resetForm()
    setShowCreateDialog(true)
  }

  const handleEdit = (coupon: Coupon) => {
    setFormCode(coupon.code)
    setFormDiscount(coupon.discount.toString())
    setFormDescription(coupon.description || '')
    setFormActive(coupon.active)
    setFormMaxUses(coupon.maxUses?.toString() || '')
    setFormMaxUsesPerUser(coupon.maxUsesPerUser?.toString() || '')
    
    // Converter data ISO para formato de input (YYYY-MM-DD) usando UTC para evitar problemas de timezone
    const formatDateForInput = (dateString: string) => {
      const date = new Date(dateString)
      const year = date.getUTCFullYear()
      const month = String(date.getUTCMonth() + 1).padStart(2, '0')
      const day = String(date.getUTCDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    
    setFormValidFrom(formatDateForInput(coupon.validFrom))
    setFormValidUntil(formatDateForInput(coupon.validUntil))
    setFormApplicablePlans(coupon.applicablePlans || [])
    setSelectedCoupon(coupon)
    setShowEditDialog(true)
  }

  const handleViewStats = async (coupon: Coupon) => {
    const couponStats = await fetchCouponStats(coupon.code)
    setSelectedCoupon(coupon)
    setSelectedStats(couponStats)
    setShowStatsDialog(true)
  }

  const handleSave = async () => {
    if (!formCode || !formDiscount || !formValidFrom || !formValidUntil) {
      setError('Preencha todos os campos obrigatórios')
      return
    }

    const discount = parseFloat(formDiscount)
    if (isNaN(discount) || discount < 0 || discount > 100) {
      setError('Desconto deve ser um número entre 0 e 100')
      return
    }

    try {
      setSaving(true)
      setError('')

      // Criar datas como meia-noite UTC para evitar problemas de timezone
      // O input de data retorna "YYYY-MM-DD" que queremos interpretar como meia-noite UTC
      const createUTCDate = (dateString: string) => {
        // Adicionar "T00:00:00.000Z" para garantir que seja meia-noite UTC
        return `${dateString}T00:00:00.000Z`
      }

      const couponData = {
        code: formCode.toUpperCase(),
        discount,
        description: formDescription || null,
        active: formActive,
        maxUses: formMaxUses ? parseInt(formMaxUses) : null,
        maxUsesPerUser: formMaxUsesPerUser ? parseInt(formMaxUsesPerUser) : null,
        validFrom: createUTCDate(formValidFrom),
        validUntil: createUTCDate(formValidUntil),
        applicablePlans: formApplicablePlans.length > 0 ? formApplicablePlans : null,
      }

      const url = selectedCoupon 
        ? `/api/admin/coupons/${selectedCoupon.code}`
        : '/api/admin/coupons'
      
      const method = selectedCoupon ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(couponData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao salvar cupom')
      }

      setShowCreateDialog(false)
      setShowEditDialog(false)
      resetForm()
      await fetchCoupons()
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar cupom')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (code: string) => {
    if (!confirm(`Tem certeza que deseja desativar o cupom ${code}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/coupons/${code}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Erro ao desativar cupom')
      }

      await fetchCoupons()
    } catch (err: any) {
      alert(err.message || 'Erro ao desativar cupom')
    }
  }

  const formatDate = (dateString: string) => {
    // Converter ISO string para data local sem ajuste de timezone
    const date = new Date(dateString)
    // Usar UTC para evitar problemas de timezone na exibição
    const day = String(date.getUTCDate()).padStart(2, '0')
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const year = date.getUTCFullYear()
    return `${day}/${month}/${year}`
  }

  const isExpired = (validUntil: string) => {
    // Considerar que o cupom é válido até o final do dia de validade
    // A data salva é meia-noite UTC do dia, então precisamos considerar até 23:59:59.999 do mesmo dia
    const validUntilDate = new Date(validUntil)
    // Criar data do final do dia (23:59:59.999 UTC)
    const endOfValidDay = new Date(Date.UTC(
      validUntilDate.getUTCFullYear(),
      validUntilDate.getUTCMonth(),
      validUntilDate.getUTCDate(),
      23, 59, 59, 999
    ))
    return endOfValidDay < new Date()
  }

  const isActive = (coupon: Coupon) => {
    return coupon.active && !isExpired(coupon.validUntil)
  }

  if (!isAdminMaster) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Acesso negado. Apenas admin_master pode acessar esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciar Cupons</h1>
          <p className="text-muted-foreground">
            Crie e gerencie cupons de desconto para assinaturas
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Cupom
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Cupons Cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            {coupons.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                Nenhum cupom cadastrado
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Desconto</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Usos</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon) => (
                    <TableRow key={coupon.code}>
                      <TableCell className="font-mono font-medium">
                        {coupon.code}
                      </TableCell>
                      <TableCell>{coupon.discount}%</TableCell>
                      <TableCell>
                        {isActive(coupon) ? (
                          <Badge variant="default">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="mr-1 h-3 w-3" />
                            {isExpired(coupon.validUntil) ? 'Expirado' : 'Inativo'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{formatDate(coupon.validFrom)}</div>
                          <div className="text-muted-foreground">
                            até {formatDate(coupon.validUntil)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {stats[coupon.code] ? (
                          <div className="text-sm">
                            <div>{stats[coupon.code].totalUses} usos</div>
                            <div className="text-muted-foreground">
                              {stats[coupon.code].uniqueUsers} usuários
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewStats(coupon)}
                          >
                            <TrendingUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(coupon)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(coupon.code)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog || showEditDialog} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false)
          setShowEditDialog(false)
          resetForm()
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedCoupon ? 'Editar Cupom' : 'Novo Cupom'}
            </DialogTitle>
            <DialogDescription>
              {selectedCoupon 
                ? 'Atualize as informações do cupom'
                : 'Preencha os dados para criar um novo cupom de desconto'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Código *</Label>
                <Input
                  id="code"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  placeholder="EX: MEDICINA20"
                  disabled={!!selectedCoupon}
                />
              </div>
              <div>
                <Label htmlFor="discount">Desconto (%) *</Label>
                <Input
                  id="discount"
                  type="number"
                  min="0"
                  max="100"
                  value={formDiscount}
                  onChange={(e) => setFormDiscount(e.target.value)}
                  placeholder="20"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Descrição opcional do cupom"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="validFrom">Válido de *</Label>
                <Input
                  id="validFrom"
                  type="date"
                  value={formValidFrom}
                  onChange={(e) => setFormValidFrom(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="validUntil">Válido até *</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={formValidUntil}
                  onChange={(e) => setFormValidUntil(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxUses">Máximo de usos (opcional)</Label>
                <Input
                  id="maxUses"
                  type="number"
                  min="1"
                  value={formMaxUses}
                  onChange={(e) => setFormMaxUses(e.target.value)}
                  placeholder="Ilimitado"
                />
              </div>
              <div>
                <Label htmlFor="maxUsesPerUser">Máximo por usuário (opcional)</Label>
                <Input
                  id="maxUsesPerUser"
                  type="number"
                  min="1"
                  value={formMaxUsesPerUser}
                  onChange={(e) => setFormMaxUsesPerUser(e.target.value)}
                  placeholder="Ilimitado"
                />
              </div>
            </div>

            <div>
              <Label>Planos Aplicáveis</Label>
              <div className="mt-2 flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formApplicablePlans.includes('monthly')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormApplicablePlans([...formApplicablePlans, 'monthly'])
                      } else {
                        setFormApplicablePlans(formApplicablePlans.filter(p => p !== 'monthly'))
                      }
                    }}
                  />
                  <span>Mensal</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formApplicablePlans.includes('semester')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormApplicablePlans([...formApplicablePlans, 'semester'])
                      } else {
                        setFormApplicablePlans(formApplicablePlans.filter(p => p !== 'semester'))
                      }
                    }}
                  />
                  <span>Semestral</span>
                </label>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Deixe desmarcado para aplicar a todos os planos
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="active"
                checked={formActive}
                onCheckedChange={setFormActive}
              />
              <Label htmlFor="active">Cupom ativo</Label>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false)
                setShowEditDialog(false)
                resetForm()
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Dialog */}
      <Dialog open={showStatsDialog} onOpenChange={setShowStatsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Estatísticas - {selectedCoupon?.code}</DialogTitle>
            <DialogDescription>
              Detalhes de uso deste cupom
            </DialogDescription>
          </DialogHeader>

          {selectedStats && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{selectedStats.totalUsesApproved}</div>
                    <div className="text-sm text-muted-foreground">Total de Usos (Aprovados)</div>
                    {selectedStats.totalUses > selectedStats.totalUsesApproved && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {selectedStats.totalUses} total (incluindo não aprovados)
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{selectedStats.uniqueUsersApproved}</div>
                    <div className="text-sm text-muted-foreground">Usuários Únicos (Aprovados)</div>
                    {selectedStats.uniqueUsers > selectedStats.uniqueUsersApproved && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {selectedStats.uniqueUsers} total (incluindo não aprovados)
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    R$ {selectedStats.totalDiscountApproved.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total de Desconto Aplicado (Aprovados)</div>
                  {selectedStats.totalDiscount > selectedStats.totalDiscountApproved && (
                    <div className="text-xs text-muted-foreground mt-1">
                      R$ {selectedStats.totalDiscount.toFixed(2)} total (incluindo não aprovados)
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowStatsDialog(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


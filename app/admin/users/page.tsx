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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Search, Eye, Shield, CheckCircle, XCircle, Plus, Loader2, Edit, UserX, UserCheck, Filter, X, Crown, MinusCircle } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth-context'
import { useRole } from '@/lib/hooks/use-role'
import { DataTablePagination } from '@/components/data-table-pagination'

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

const institutions = [
  'UNIGRANRIO – Duque de Caxias, RJ',
  'UNIGRANRIO – Barra da Tijuca, RJ',
  'AFYA – Itaperuna, RJ (UNIREDENTOR)',
  'AFYA – Contagem, MG',
  'AFYA – Ipatinga, MG (UNIVAÇO)',
  'AFYA – Itajubá, MG (FMIT)',
  'AFYA – Montes Claros, MG (UNIFIPMOC)',
  'AFYA – São João del-Rei, MG (UNIPTAN)',
  'AFYA – Paraíba, PB',
  'AFYA – Teresina, PI',
  'AFYA – Parnaíba, PI (IESVAP)',
  'AFYA – Abaetetuba, PA',
  'AFYA – Marabá, PA (FACIMPA)',
  'AFYA – Redenção, PA (FESAR)',
  'AFYA – Bragança, PA',
  'AFYA – Guanambi, BA',
  'AFYA – Itabuna, BA',
  'AFYA – Salvador (UNIDOM), BA',
  'AFYA – Jaboatão dos Guararapes, PE',
  'AFYA – Garanhuns, PE',
  'AFYA – Maceió, AL',
  'AFYA – Itacoatiara, AM',
  'AFYA – Manacapuru, AM',
  'AFYA – Ji-Paraná, RO',
  'AFYA – Porto Velho, RO',
  'AFYA – Palmas, TO',
  'AFYA – Porto Nacional, TO',
  'AFYA – Santa Inês, MA',
  'AFYA – Vitória da Conquista, BA',
  'AFYA – Cruzeiro do Sul, AC',
  'AFYA – Araguaína, TO (UNITPAC)',
  'AFYA – Pato Branco, PR',
  'Nenhuma das opções listada',
]

interface User {
  id: string
  name: string
  email: string
  period: string
  institution?: string
  role: string
  plan: string | null
  planExpiresAt: Date | null
  status: string
  disabled?: boolean
  createdAt: Date
  editedBy?: string | null
  editedByName?: string | null
  editedByPhoto?: string | null
  editedAt?: Date | null
}

export default function UsersPage() {
  const { user } = useAuth()
  const { isAdminMaster } = useRole()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(15)
  
  // Filter states
  const [filterPeriod, setFilterPeriod] = useState<string>('all')
  const [filterPlan, setFilterPlan] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [showGrantDialog, setShowGrantDialog] = useState(false)
  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [grantPlan, setGrantPlan] = useState<'monthly' | 'semester'>('monthly')
  const [newRole, setNewRole] = useState<string>('')
  const [grantingAccess, setGrantingAccess] = useState(false)
  const [removingPlan, setRemovingPlan] = useState(false)
  
  // Form states for creating user
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserPeriod, setNewUserPeriod] = useState('')
  const [newUserInstitution, setNewUserInstitution] = useState('')
  const [newUserRole, setNewUserRole] = useState<'aluno' | 'admin_master' | 'admin_questoes'>('aluno')
  const [creatingUser, setCreatingUser] = useState(false)
  const [createError, setCreateError] = useState('')

  // Form states for editing user
  const [editUserName, setEditUserName] = useState('')
  const [editUserPeriod, setEditUserPeriod] = useState('')
  const [editUserInstitution, setEditUserInstitution] = useState('')
  const [editUserRole, setEditUserRole] = useState<'aluno' | 'admin_master' | 'admin_questoes'>('aluno')
  const [editingUser, setEditingUser] = useState(false)
  const [editError, setEditError] = useState('')

  // Fetch users from API
  const fetchUsers = async () => {
    if (!user?.uid) return
    
    try {
      setLoading(true)
      const response = await fetch(
        `/api/admin/users?requesterUid=${user.uid}${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''}`
      )
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar usuários')
      }
      
      if (data.success) {
        // Converter datas de string para Date se necessário
        const usersWithDates = data.users.map((u: any) => ({
          ...u,
          createdAt: u.createdAt ? (typeof u.createdAt === 'string' ? new Date(u.createdAt) : u.createdAt) : new Date(),
          planExpiresAt: u.planExpiresAt ? (typeof u.planExpiresAt === 'string' ? new Date(u.planExpiresAt) : u.planExpiresAt) : null,
          editedAt: u.editedAt ? (typeof u.editedAt === 'string' ? new Date(u.editedAt) : u.editedAt) : null,
          disabled: u.disabled || false,
        }))
        setUsers(usersWithDates)
      }
    } catch (error: any) {
      console.error('Erro ao buscar usuários:', error)
      alert(error.message || 'Erro ao buscar usuários')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [user?.uid, searchTerm])

  const handleViewDetails = (user: User) => {
    setSelectedUser(user)
    setShowDetailsDialog(true)
  }

  const handleGrantSubscription = (user: User) => {
    setSelectedUser(user)
    setShowGrantDialog(true)
  }

  const handleChangeRole = (user: User) => {
    setSelectedUser(user)
    setNewRole(user.role)
    setShowRoleDialog(true)
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setEditUserName(user.name)
    setEditUserPeriod(user.period)
    setEditUserInstitution(user.institution || '')
    setEditUserRole(user.role as 'aluno' | 'admin_master' | 'admin_questoes')
    setEditError('')
    setShowEditDialog(true)
  }

  const confirmEditUser = async () => {
    if (!user?.uid || !selectedUser) return

    // Validation
    if (!editUserName || !editUserPeriod || !editUserInstitution) {
      setEditError('Preencha todos os campos obrigatórios')
      return
    }

    try {
      setEditingUser(true)
      setEditError('')

      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editUserName,
          period: editUserPeriod,
          institution: editUserInstitution,
          role: editUserRole,
          requesterUid: user.uid,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao editar usuário')
      }

      // Success - refresh users list and close dialog
      setShowEditDialog(false)
      await fetchUsers()
    } catch (error: any) {
      setEditError(error.message || 'Erro ao editar usuário')
    } finally {
      setEditingUser(false)
    }
  }

  const handleToggleUserStatus = async (userToToggle: User) => {
    if (!user?.uid) return

    const isCurrentlyDisabled = userToToggle.disabled || userToToggle.status === 'disabled'
    const newStatus = !isCurrentlyDisabled

    if (!confirm(`Tem certeza que deseja ${newStatus ? 'desativar' : 'ativar'} o usuário ${userToToggle.name}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${userToToggle.id}/toggle-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          disabled: newStatus,
          requesterUid: user.uid,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao alterar status do usuário')
      }

      // Success - refresh users list
      await fetchUsers()
    } catch (error: any) {
      alert(error.message || 'Erro ao alterar status do usuário')
    }
  }

  const handleCreateUser = () => {
    setNewUserName('')
    setNewUserEmail('')
    setNewUserPassword('')
    setNewUserPeriod('')
    setNewUserInstitution('')
    setNewUserRole('aluno')
    setCreateError('')
    setShowCreateDialog(true)
  }

  const confirmCreateUser = async () => {
    if (!user?.uid) return

    // Validation
    if (!newUserName || !newUserEmail || !newUserPassword || !newUserPeriod || !newUserInstitution) {
      setCreateError('Preencha todos os campos obrigatórios')
      return
    }

    if (newUserPassword.length < 6) {
      setCreateError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    try {
      setCreatingUser(true)
      setCreateError('')

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newUserEmail,
          password: newUserPassword,
          name: newUserName,
          period: newUserPeriod,
          institution: newUserInstitution,
          role: newUserRole,
          requesterUid: user.uid,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar usuário')
      }

      // Success - refresh users list and close dialog
      setShowCreateDialog(false)
      await fetchUsers()
    } catch (error: any) {
      setCreateError(error.message || 'Erro ao criar usuário')
    } finally {
      setCreatingUser(false)
    }
  }

  const confirmGrantSubscription = async () => {
    if (!user?.uid || !selectedUser) return

    try {
      setGrantingAccess(true)
      const response = await fetch(`/api/admin/users/${selectedUser.id}/grant-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: grantPlan,
          requesterUid: user.uid,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao liberar acesso')
      }

      // Success - refresh users list and close dialog
      setShowGrantDialog(false)
      await fetchUsers()
      alert(data.message || 'Acesso liberado com sucesso!')
    } catch (error: any) {
      console.error('Erro ao liberar acesso:', error)
      alert(error.message || 'Erro ao liberar acesso')
    } finally {
      setGrantingAccess(false)
    }
  }

  const confirmChangeRole = async () => {
    if (!user?.uid || !selectedUser) return

    try {
      const response = await fetch('/api/admin/set-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: selectedUser.id,
          role: newRole,
          requesterUid: user.uid,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao alterar permissão')
      }

      // Success - refresh users list
      setShowRoleDialog(false)
      await fetchUsers()
    } catch (error: any) {
      console.error('Erro ao alterar permissão:', error)
      alert(error.message || 'Erro ao alterar permissão')
    }
  }

  const handleRemovePlan = (userToRemove: User) => {
    setSelectedUser(userToRemove)
    if (confirm(`Tem certeza que deseja remover o plano do usuário ${userToRemove.name}?`)) {
      confirmRemovePlan()
    }
  }

  const confirmRemovePlan = async () => {
    if (!user?.uid || !selectedUser) return

    try {
      setRemovingPlan(true)
      const response = await fetch(`/api/admin/users/${selectedUser.id}/remove-plan`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requesterUid: user.uid,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao remover plano')
      }

      // Success - refresh users list
      await fetchUsers()
      alert('Plano removido com sucesso!')
    } catch (error: any) {
      console.error('Erro ao remover plano:', error)
      alert(error.message || 'Erro ao remover plano')
    } finally {
      setRemovingPlan(false)
      setSelectedUser(null)
    }
  }

  const getStatusBadge = (status: string, disabled?: boolean) => {
    if (disabled) {
      return (
        <Badge variant="secondary" className="bg-muted text-muted-foreground">
          <UserX className="mr-1 h-3 w-3" />
          Desativado
        </Badge>
      )
    }
    
    switch (status) {
      case 'active':
        return (
          <Badge variant="secondary" className="bg-success/10 text-success">
            <CheckCircle className="mr-1 h-3 w-3" />
            Ativo
          </Badge>
        )
      case 'expired':
        return (
          <Badge variant="secondary" className="bg-destructive/10 text-destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Expirado
          </Badge>
        )
      case 'disabled':
        return (
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            <UserX className="mr-1 h-3 w-3" />
            Desativado
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin_master':
        return (
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            <Shield className="mr-1 h-3 w-3" />
            Admin Master
          </Badge>
        )
      case 'admin_questoes':
        return (
          <Badge variant="secondary" className="bg-secondary/10 text-secondary">
            <Shield className="mr-1 h-3 w-3" />
            Admin Questões
          </Badge>
        )
      case 'aluno':
        return <Badge variant="outline">Aluno</Badge>
      default:
        return <Badge variant="outline">{role}</Badge>
    }
  }

  const formatDate = (date: Date | null | string) => {
    if (!date) return '-'
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(dateObj)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setFilterPeriod('all')
    setFilterPlan('all')
    setFilterStatus('all')
    setFilterRole('all')
  }

  const hasActiveFilters = searchTerm || filterPeriod !== 'all' || filterPlan !== 'all' || filterStatus !== 'all' || filterRole !== 'all'

  // Filtrar todos os usuários primeiro
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Filtro de busca (nome ou email)
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const matchesSearch = 
          user.name.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower)
        if (!matchesSearch) return false
      }

      // Filtro de período
      if (filterPeriod !== 'all' && user.period !== filterPeriod) {
        return false
      }

      // Filtro de plano
      if (filterPlan !== 'all') {
        if (filterPlan === 'none' && user.plan !== null) {
          return false
        }
        if (filterPlan !== 'none' && user.plan !== filterPlan) {
          return false
        }
      }

    // Filtro de status
    if (filterStatus !== 'all') {
      // Se está desativado, só mostra se o filtro for "disabled"
      if (user.disabled) {
        if (filterStatus !== 'disabled') return false
      } else {
        // Se não está desativado, verifica o status do plano
        if (filterStatus === 'disabled') return false
        if (filterStatus === 'active' && user.status !== 'active') return false
        if (filterStatus === 'expired' && user.status !== 'expired') return false
      }
    }

    // Filtro de permissão/role
    if (filterRole !== 'all' && user.role !== filterRole) {
      return false
    }

    return true
  })
  }, [users, searchTerm, filterPeriod, filterPlan, filterStatus, filterRole])

  // Paginar os resultados filtrados
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredUsers.slice(startIndex, endIndex)
  }, [filteredUsers, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterPeriod, filterPlan, filterStatus, filterRole])

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
            <p className="text-muted-foreground">
              Gerencie os usuários e suas assinaturas
            </p>
          </div>
          <Button onClick={handleCreateUser} className="cursor-pointer">
            <Plus className="mr-2 h-4 w-4" />
            Cadastrar Usuário
          </Button>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Buscar e Filtrar Usuários
              </CardTitle>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-muted-foreground cursor-pointer"
                >
                  <X className="mr-1 h-4 w-4" />
                  Limpar Filtros
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Filters Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Filter by Period */}
                <div className="space-y-2">
                  <Label htmlFor="filter-period">Período</Label>
                  <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                    <SelectTrigger id="filter-period">
                      <SelectValue placeholder="Todos os períodos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os períodos</SelectItem>
                      {periods.map((period) => (
                        <SelectItem key={period} value={period}>
                          {period}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filter by Plan */}
                <div className="space-y-2">
                  <Label htmlFor="filter-plan">Plano</Label>
                  <Select value={filterPlan} onValueChange={setFilterPlan}>
                    <SelectTrigger id="filter-plan">
                      <SelectValue placeholder="Todos os planos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os planos</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="semester">Semestral</SelectItem>
                      <SelectItem value="none">Sem plano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Filter by Status */}
                <div className="space-y-2">
                  <Label htmlFor="filter-status">Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger id="filter-status">
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="expired">Expirado</SelectItem>
                      <SelectItem value="disabled">Desativado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Filter by Role */}
                <div className="space-y-2">
                  <Label htmlFor="filter-role">Permissão</Label>
                  <Select value={filterRole} onValueChange={setFilterRole}>
                    <SelectTrigger id="filter-role">
                      <SelectValue placeholder="Todas as permissões" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as permissões</SelectItem>
                      <SelectItem value="aluno">Aluno</SelectItem>
                      <SelectItem value="admin_questoes">Admin de Questões</SelectItem>
                      <SelectItem value="admin_master">Admin Master</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardContent className="px-6 py-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">
                  {searchTerm ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
                </p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Permissão</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Expira em</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.email}
                        </TableCell>
                        <TableCell>{user.period}</TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>
                          {user.plan ? (
                            <Badge variant="outline">
                              {user.plan === 'monthly' ? 'Mensal' : 'Semestral'}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(user.planExpiresAt)}
                        </TableCell>
                        <TableCell>{getStatusBadge(user.status, user.disabled)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              className="cursor-pointer"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(user)}
                              title="Ver detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              className="cursor-pointer"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditUser(user)}
                              title="Editar usuário"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              className={`cursor-pointer ${user.disabled ? 'text-success hover:text-success' : 'text-destructive hover:text-destructive'}`}
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleUserStatus(user)}
                              title={user.disabled ? 'Ativar usuário' : 'Desativar usuário'}
                            >
                              {user.disabled ? (
                                <UserCheck className="h-4 w-4" />
                              ) : (
                                <UserX className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              className="cursor-pointer"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleGrantSubscription(user)}
                              disabled={user.disabled}
                              title="Liberar acesso"
                            >
                              <Crown className="h-4 w-4" />
                            </Button>
                            <Button
                              className="cursor-pointer"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleChangeRole(user)}
                              title="Alterar permissão"
                            >
                              <Shield className="h-4 w-4" />
                            </Button>
                            {isAdminMaster && (
                              <Button
                                className="cursor-pointer text-destructive hover:text-destructive disabled:opacity-50"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemovePlan(user)}
                                disabled={!user.plan || removingPlan || user.disabled}
                                title={user.plan ? 'Remover plano' : 'Usuário não possui plano'}
                              >
                                <MinusCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="border-t px-6 py-4">
                  <DataTablePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    itemsPerPage={itemsPerPage}
                    totalItems={filteredUsers.length}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={setItemsPerPage}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Usuário</DialogTitle>
            <DialogDescription>
              Informações completas do usuário
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nome</p>
                  <p className="text-sm">{selectedUser.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-sm">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Período</p>
                  <p className="text-sm">{selectedUser.period}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Instituição</p>
                  <p className="text-sm">{selectedUser.institution || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Permissão</p>
                  {getRoleBadge(selectedUser.role)}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Plano</p>
                  <p className="text-sm">
                    {selectedUser.plan
                      ? selectedUser.plan === 'monthly'
                        ? 'Mensal'
                        : 'Semestral'
                      : 'Nenhum'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Data de expiração
                  </p>
                  <p className="text-sm">{formatDate(selectedUser.planExpiresAt)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  {getStatusBadge(selectedUser.status, selectedUser.disabled)}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Cadastro em
                  </p>
                  <p className="text-sm">{formatDate(selectedUser.createdAt)}</p>
                </div>
              </div>
              {selectedUser.editedBy && selectedUser.editedAt && (
                <div className="mt-4 rounded-lg border border-muted bg-muted/30 p-4">
                  <p className="mb-2 text-sm font-medium text-muted-foreground">
                    Última edição
                  </p>
                  <div className="flex items-center gap-3">
                    {selectedUser.editedByPhoto ? (
                      <img
                        src={selectedUser.editedByPhoto}
                        alt={selectedUser.editedByName || 'Admin'}
                        className="h-10 w-10 rounded-full object-cover border-2 border-border"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 border-2 border-border">
                        <span className="text-sm font-semibold text-primary">
                          {(selectedUser.editedByName || 'A')[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {selectedUser.editedByName || 'Admin'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(selectedUser.editedAt)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)} className="cursor-pointer">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grant Subscription Dialog */}
      <Dialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Liberar Acesso Manual</DialogTitle>
            <DialogDescription>
              Conceda acesso ao sistema para {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plan-type">Tipo de Plano</Label>
              <Select value={grantPlan} onValueChange={(value: any) => setGrantPlan(value)}>
                <SelectTrigger id="plan-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensal (30 dias)</SelectItem>
                  <SelectItem value="semester">Semestral (180 dias)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              O acesso será liberado imediatamente e o usuário poderá utilizar todas as
              funcionalidades do sistema.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGrantDialog(false)} disabled={grantingAccess} className="cursor-pointer">
              Cancelar
            </Button>
            <Button onClick={confirmGrantSubscription} disabled={grantingAccess} className="cursor-pointer">
              {grantingAccess ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Liberando...
                </>
              ) : (
                'Confirmar Liberação'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Permissão do Usuário</DialogTitle>
            <DialogDescription>
              Modifique as permissões de {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user-role">Permissão</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger id="user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aluno">Aluno</SelectItem>
                  <SelectItem value="admin_questoes">Admin de Questões</SelectItem>
                  <SelectItem value="admin_master">Admin Master</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg bg-warning/10 p-3 text-sm text-warning-foreground">
              <p className="font-medium text-white">Atenção</p>
              <p className="text-xs text-white">
                Alterar a permissão de um usuário modifica suas visões e acessos no sistema. O
                usuário precisará fazer logout e login novamente para que as alterações
                tenham efeito.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)} className="cursor-pointer">
              Cancelar
            </Button>
            <Button onClick={confirmChangeRole} className="cursor-pointer">Confirmar Alteração</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
            <DialogDescription>
              Crie um novo usuário usando Firebase Admin. O usuário poderá fazer login imediatamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {createError && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {createError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-user-name">Nome *</Label>
                <Input
                  id="new-user-name"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-user-email">Email *</Label>
                <Input
                  id="new-user-email"
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-user-password">Senha *</Label>
                <Input
                  id="new-user-password"
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-user-role">Permissão *</Label>
                <Select value={newUserRole} onValueChange={(value: any) => setNewUserRole(value)}>
                  <SelectTrigger id="new-user-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aluno">Aluno</SelectItem>
                    <SelectItem value="admin_questoes">Admin de Questões</SelectItem>
                    <SelectItem value="admin_master">Admin Master</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-user-period">Período *</Label>
                <Select value={newUserPeriod} onValueChange={setNewUserPeriod}>
                  <SelectTrigger id="new-user-period">
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map((period) => (
                      <SelectItem key={period} value={period}>
                        {period}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-user-institution">Instituição *</Label>
                <Select value={newUserInstitution} onValueChange={setNewUserInstitution}>
                  <SelectTrigger id="new-user-institution">
                    <SelectValue placeholder="Selecione a instituição" />
                  </SelectTrigger>
                  <SelectContent>
                    {institutions.map((institution) => (
                      <SelectItem key={institution} value={institution}>
                        {institution}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={creatingUser} className="cursor-pointer">
              Cancelar
            </Button>
            <Button onClick={confirmCreateUser} disabled={creatingUser} className="cursor-pointer">
              {creatingUser ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Cadastrar Usuário'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Edite as informações do usuário {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {editError && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {editError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-user-name">Nome *</Label>
                <Input
                  id="edit-user-name"
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-user-email">Email</Label>
                <Input
                  id="edit-user-email"
                  type="email"
                  value={selectedUser?.email || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  O email não pode ser alterado
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-user-period">Período *</Label>
                <Select value={editUserPeriod} onValueChange={setEditUserPeriod}>
                  <SelectTrigger id="edit-user-period">
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map((period) => (
                      <SelectItem key={period} value={period}>
                        {period}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-user-institution">Instituição *</Label>
                <Select value={editUserInstitution} onValueChange={setEditUserInstitution}>
                  <SelectTrigger id="edit-user-institution">
                    <SelectValue placeholder="Selecione a instituição" />
                  </SelectTrigger>
                  <SelectContent>
                    {institutions.map((institution) => (
                      <SelectItem key={institution} value={institution}>
                        {institution}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-user-role">Permissão *</Label>
                <Select value={editUserRole} onValueChange={(value: any) => setEditUserRole(value)}>
                  <SelectTrigger id="edit-user-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aluno">Aluno</SelectItem>
                    <SelectItem value="admin_questoes">Admin de Questões</SelectItem>
                    <SelectItem value="admin_master">Admin Master</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-lg bg-warning/10 p-3 text-sm text-warning-foreground">
              <p className="font-medium text-white">Atenção</p>
              <p className="text-xs text-white">
                Alterar a permissão de um usuário modifica suas visões e acessos no sistema. O
                usuário precisará fazer logout e login novamente para que as alterações
                tenham efeito.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={editingUser} className="cursor-pointer">
              Cancelar
            </Button>
            <Button onClick={confirmEditUser} disabled={editingUser} className="cursor-pointer">
              {editingUser ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

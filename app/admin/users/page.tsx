'use client'

import { AdminLayout } from '@/components/admin/admin-layout'
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
import { Search, Eye, Shield, CheckCircle, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Label } from '@/components/ui/label'

// Mock data - replace with real Firestore queries
const mockUsers = [
  {
    id: '1',
    name: 'João Silva',
    email: 'joao@exemplo.com',
    period: '5º Período',
    role: 'aluno',
    plan: 'monthly',
    planExpiresAt: new Date('2025-02-15'),
    status: 'active',
    createdAt: new Date('2024-01-10'),
  },
  {
    id: '2',
    name: 'Maria Santos',
    email: 'maria@exemplo.com',
    period: 'Formado',
    role: 'aluno',
    plan: 'semester',
    planExpiresAt: new Date('2025-06-30'),
    status: 'active',
    createdAt: new Date('2024-03-20'),
  },
  {
    id: '3',
    name: 'Carlos Oliveira',
    email: 'carlos@exemplo.com',
    period: '8º Período',
    role: 'aluno',
    plan: null,
    planExpiresAt: null,
    status: 'expired',
    createdAt: new Date('2024-05-05'),
  },
  {
    id: '4',
    name: 'Ana Costa',
    email: 'ana@exemplo.com',
    period: '3º Período',
    role: 'admin_questoes',
    plan: null,
    planExpiresAt: null,
    status: 'active',
    createdAt: new Date('2024-02-14'),
  },
]

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [showGrantDialog, setShowGrantDialog] = useState(false)
  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [grantPlan, setGrantPlan] = useState<'monthly' | 'semester'>('monthly')
  const [newRole, setNewRole] = useState<string>('')

  const handleViewDetails = (user: any) => {
    setSelectedUser(user)
    setShowDetailsDialog(true)
  }

  const handleGrantSubscription = (user: any) => {
    setSelectedUser(user)
    setShowGrantDialog(true)
  }

  const handleChangeRole = (user: any) => {
    setSelectedUser(user)
    setNewRole(user.role)
    setShowRoleDialog(true)
  }

  const confirmGrantSubscription = async () => {
    // TODO: Implement Firestore update
    console.log('Granting subscription:', {
      userId: selectedUser.id,
      plan: grantPlan,
    })
    setShowGrantDialog(false)
  }

  const confirmChangeRole = async () => {
    // TODO: Implement Cloud Function call to update custom claims
    console.log('Changing role:', {
      userId: selectedUser.id,
      newRole: newRole,
    })
    setShowRoleDialog(false)
  }

  const getStatusBadge = (status: string) => {
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

  const formatDate = (date: Date | null) => {
    if (!date) return '-'
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date)
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie os usuários e suas assinaturas
          </p>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle>Buscar Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockUsers.map((user) => (
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
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(user)}
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          Ver
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGrantSubscription(user)}
                        >
                          Liberar Acesso
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleChangeRole(user)}
                        >
                          <Shield className="mr-1 h-4 w-4" />
                          Role
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
                  <p className="text-sm font-medium text-muted-foreground">Role</p>
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
                  {getStatusBadge(selectedUser.status)}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Cadastro em
                  </p>
                  <p className="text-sm">{formatDate(selectedUser.createdAt)}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
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
            <Button variant="outline" onClick={() => setShowGrantDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmGrantSubscription}>Confirmar Liberação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Role do Usuário</DialogTitle>
            <DialogDescription>
              Modifique as permissões de {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user-role">Role</Label>
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
              <p className="font-medium">Atenção</p>
              <p className="text-xs">
                Alterar o role de um usuário modifica suas permissões no sistema. O
                usuário precisará fazer logout e login novamente para as alterações
                terem efeito.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmChangeRole}>Confirmar Alteração</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}

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
import { Search, Eye, CheckCircle, Clock, ExternalLink } from 'lucide-react'
import { useState } from 'react'

// Mock data - replace with real Firestore queries
const mockReports = [
  {
    id: '1',
    questionId: 'q123',
    questionText: 'Paciente de 45 anos, hipertenso...',
    userId: 'u456',
    userName: 'João Silva',
    userEmail: 'joao@exemplo.com',
    texto: 'A alternativa marcada como correta não condiz com o gabarito oficial da prova REVALIDA 2023.',
    imagemUrl: null,
    status: 'pendente',
    createdAt: new Date('2025-01-15T10:30:00'),
  },
  {
    id: '2',
    questionId: 'q789',
    questionText: 'Criança de 3 anos com febre alta...',
    userId: 'u789',
    userName: 'Maria Santos',
    userEmail: 'maria@exemplo.com',
    texto: 'O comentário do gabarito está incompleto e não explica adequadamente o raciocínio clínico.',
    imagemUrl: 'https://example.com/screenshot.jpg',
    status: 'pendente',
    createdAt: new Date('2025-01-14T15:45:00'),
  },
  {
    id: '3',
    questionId: 'q456',
    questionText: 'Gestante de 32 semanas com pressão...',
    userId: 'u123',
    userName: 'Carlos Oliveira',
    userEmail: 'carlos@exemplo.com',
    texto: 'Erro de digitação na alternativa C: "hipotensão" deveria ser "hipertensão".',
    imagemUrl: null,
    status: 'resolvido',
    createdAt: new Date('2025-01-10T09:20:00'),
    resolvedAt: new Date('2025-01-12T14:00:00'),
    resolvedBy: 'Admin Master',
  },
]

export default function ReportsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedReport, setSelectedReport] = useState<any>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)

  const handleViewReport = (report: any) => {
    setSelectedReport(report)
    setShowDetailsDialog(true)
  }

  const handleMarkAsResolved = async () => {
    // TODO: Update report status in Firestore
    console.log('Marking as resolved:', selectedReport.id)
    setShowDetailsDialog(false)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return (
          <Badge variant="secondary" className="bg-warning/10 text-warning">
            <Clock className="mr-1 h-3 w-3" />
            Pendente
          </Badge>
        )
      case 'resolvido':
        return (
          <Badge variant="secondary" className="bg-success/10 text-success">
            <CheckCircle className="mr-1 h-3 w-3" />
            Resolvido
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const filteredReports = mockReports.filter((report) => {
    const matchesSearch =
      report.texto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.questionText.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || report.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Gerencie os erros reportados pelos usuários
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Reports</CardTitle>
              <Badge variant="outline">{mockReports.length}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockReports.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                {mockReports.filter((r) => r.status === 'pendente').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolvidos</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {mockReports.filter((r) => r.status === 'resolvido').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por texto, usuário ou questão..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="resolvido">Resolvidos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Reports Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Questão</TableHead>
                  <TableHead>Reportado por</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="max-w-xs">
                      <p className="truncate text-sm font-medium">
                        {report.questionText}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ID: {report.questionId}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{report.userName}</p>
                      <p className="text-xs text-muted-foreground">
                        {report.userEmail}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="truncate text-sm">{report.texto}</p>
                      {report.imagemUrl && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          📎 Contém anexo
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(report.createdAt)}
                    </TableCell>
                    <TableCell>{getStatusBadge(report.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewReport(report)}
                      >
                        <Eye className="mr-1 h-4 w-4" />
                        Ver Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Report Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Report</DialogTitle>
            <DialogDescription>
              Informações completas sobre o erro reportado
            </DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-6">
              {/* Report Info */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Status do Report
                  </p>
                  <div className="mt-1">{getStatusBadge(selectedReport.status)}</div>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Data do Report
                  </p>
                  <p className="mt-1 text-sm">{formatDate(selectedReport.createdAt)}</p>
                </div>

                {selectedReport.resolvedAt && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Resolvido em
                    </p>
                    <p className="mt-1 text-sm">
                      {formatDate(selectedReport.resolvedAt)} por{' '}
                      {selectedReport.resolvedBy}
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <h4 className="mb-2 font-semibold">Informações do Usuário</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Nome</p>
                    <p className="text-sm">{selectedReport.userName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="text-sm">{selectedReport.userEmail}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="mb-2 font-semibold">Questão Reportada</h4>
                <div className="rounded-lg bg-muted p-4">
                  <p className="mb-2 text-sm text-muted-foreground">
                    ID: {selectedReport.questionId}
                  </p>
                  <p className="text-sm">{selectedReport.questionText}</p>
                  <Button variant="link" size="sm" className="mt-2 h-auto p-0" asChild>
                    <a
                      href={`/admin/questions/${selectedReport.questionId}/edit`}
                      target="_blank"
                    >
                      Editar Questão
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="mb-2 font-semibold">Descrição do Problema</h4>
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm">{selectedReport.texto}</p>
                </div>
              </div>

              {selectedReport.imagemUrl && (
                <div className="border-t pt-4">
                  <h4 className="mb-2 font-semibold">Anexo</h4>
                  <div className="rounded-lg border bg-muted p-4">
                    <a
                      href={selectedReport.imagemUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      Ver imagem anexada
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Fechar
            </Button>
            {selectedReport?.status === 'pendente' && (
              <Button onClick={handleMarkAsResolved}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Marcar como Resolvido
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}

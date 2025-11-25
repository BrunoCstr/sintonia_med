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
import { Search, Eye, CheckCircle, Clock, ExternalLink, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { Report } from '@/lib/types'

export default function ReportsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedReport, setSelectedReport] = useState<any>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    pendentes: 0,
    resolvidos: 0,
  })

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/reports', {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar reports')
      }

      const data = await response.json()
      setReports(data.reports || [])
      setStats({
        total: data.total || 0,
        pendentes: data.pendentes || 0,
        resolvidos: data.resolvidos || 0,
      })
    } catch (error) {
      console.error('Erro ao carregar reports:', error)
      alert('Erro ao carregar reports. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleViewReport = (report: any) => {
    setSelectedReport(report)
    setShowDetailsDialog(true)
  }

  const handleMarkAsResolved = async () => {
    if (!selectedReport) return

    setUpdatingStatus(true)

    try {
      const newStatus = selectedReport.status === 'pendente' ? 'resolvido' : 'pendente'

      const response = await fetch(`/api/admin/reports/${selectedReport.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao atualizar status')
      }

      const data = await response.json()
      
      // Atualizar report na lista
      setReports((prev) =>
        prev.map((r) => (r.id === selectedReport.id ? data.report : r))
      )

      // Atualizar report selecionado
      setSelectedReport(data.report)

      // Atualizar estatísticas
      await loadReports()

      if (newStatus === 'resolvido') {
        alert('Report marcado como resolvido!')
      } else {
        alert('Report marcado como pendente!')
      }
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error)
      alert(error.message || 'Erro ao atualizar status. Tente novamente.')
    } finally {
      setUpdatingStatus(false)
    }
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

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date)
    } catch (error) {
      return dateString
    }
  }

  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      report.texto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.questionText.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || report.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <>
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
              <Badge variant="outline">{stats.total}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                {stats.pendentes}
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
                {stats.resolvidos}
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
          <CardContent className="px-6 py-0">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Nenhum report encontrado
              </div>
            ) : (
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
            )}
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
                      {selectedReport.resolvedBy || 'Admin'}
                    </p>
                  </div>
                )}

                {selectedReport.tipos && selectedReport.tipos.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Tipos de Problema
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {selectedReport.tipos.map((tipo: string, index: number) => (
                        <Badge key={index} variant="outline">
                          {tipo}
                        </Badge>
                      ))}
                    </div>
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
                  <div className="space-y-2">
                    <div className="rounded-lg border bg-muted p-2">
                      <img
                        src={selectedReport.imagemUrl}
                        alt="Anexo do report"
                        className="max-h-64 w-full rounded object-contain"
                      />
                    </div>
                    <a
                      href={selectedReport.imagemUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      Abrir imagem em nova aba
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
            {selectedReport && (
              <Button
                onClick={handleMarkAsResolved}
                disabled={updatingStatus}
              >
                {updatingStatus ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Atualizando...
                  </>
                ) : selectedReport.status === 'pendente' ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Marcar como Resolvido
                  </>
                ) : (
                  <>
                    <Clock className="mr-2 h-4 w-4" />
                    Marcar como Pendente
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

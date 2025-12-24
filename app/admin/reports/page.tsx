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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  Eye, 
  CheckCircle, 
  Clock, 
  Loader2, 
  Archive, 
  ArchiveRestore, 
  Trash2,
  AlertTriangle 
} from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Report } from '@/lib/types'
import { DataTablePagination } from '@/components/data-table-pagination'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function ReportsPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [reports, setReports] = useState<any[]>([])
  const [archivedReports, setArchivedReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingArchived, setLoadingArchived] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [archivedCurrentPage, setArchivedCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(15)
  const [archivedItemsPerPage, setArchivedItemsPerPage] = useState(15)
  const [activeTab, setActiveTab] = useState('active')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    pendentes: 0,
    resolvidos: 0,
  })

  useEffect(() => {
    loadReports()
  }, [])

  useEffect(() => {
    if (activeTab === 'archived' && archivedReports.length === 0) {
      loadArchivedReports()
    }
  }, [activeTab])

  const loadReports = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/reports?archived=false', {
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

  const loadArchivedReports = async () => {
    try {
      setLoadingArchived(true)
      const response = await fetch('/api/admin/reports?archived=true', {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar reports arquivados')
      }

      const data = await response.json()
      setArchivedReports(data.reports || [])
    } catch (error) {
      console.error('Erro ao carregar reports arquivados:', error)
      alert('Erro ao carregar reports arquivados. Tente novamente.')
    } finally {
      setLoadingArchived(false)
    }
  }

  const handleArchive = async (reportId: string) => {
    try {
      setActionLoading(reportId)
      const response = await fetch(`/api/admin/reports/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ archived: true }),
      })

      if (!response.ok) {
        throw new Error('Erro ao arquivar report')
      }

      // Atualizar listas
      const archivedReport = reports.find(r => r.id === reportId)
      if (archivedReport) {
        setReports(prev => prev.filter(r => r.id !== reportId))
        setArchivedReports(prev => [{ ...archivedReport, archived: true }, ...prev])
        setStats(prev => ({
          ...prev,
          total: prev.total - 1,
          pendentes: archivedReport.status === 'pendente' ? prev.pendentes - 1 : prev.pendentes,
          resolvidos: archivedReport.status === 'resolvido' ? prev.resolvidos - 1 : prev.resolvidos,
        }))
      }
    } catch (error) {
      console.error('Erro ao arquivar report:', error)
      alert('Erro ao arquivar report. Tente novamente.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleUnarchive = async (reportId: string) => {
    try {
      setActionLoading(reportId)
      const response = await fetch(`/api/admin/reports/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ archived: false }),
      })

      if (!response.ok) {
        throw new Error('Erro ao desarquivar report')
      }

      // Atualizar listas
      const unarchivedReport = archivedReports.find(r => r.id === reportId)
      if (unarchivedReport) {
        setArchivedReports(prev => prev.filter(r => r.id !== reportId))
        setReports(prev => [{ ...unarchivedReport, archived: false }, ...prev])
        setStats(prev => ({
          ...prev,
          total: prev.total + 1,
          pendentes: unarchivedReport.status === 'pendente' ? prev.pendentes + 1 : prev.pendentes,
          resolvidos: unarchivedReport.status === 'resolvido' ? prev.resolvidos + 1 : prev.resolvidos,
        }))
      }
    } catch (error) {
      console.error('Erro ao desarquivar report:', error)
      alert('Erro ao desarquivar report. Tente novamente.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (reportId: string) => {
    try {
      setActionLoading(reportId)
      const response = await fetch(`/api/admin/reports/${reportId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Erro ao excluir report')
      }

      // Remover da lista de arquivados
      setArchivedReports(prev => prev.filter(r => r.id !== reportId))
      setDeleteConfirmId(null)
    } catch (error) {
      console.error('Erro ao excluir report:', error)
      alert('Erro ao excluir report. Tente novamente.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleViewReport = (report: any) => {
    router.push(`/admin/reports/${report.id}`)
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

  const stripImagesFromHtml = (html: string) => {
    // Remove tags de imagem do HTML
    return html.replace(/<img[^>]*>/gi, '')
  }

  // Filtrar reports ativos
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const questionText = report.questionId ? report.questionText : 'Suporte'
      const matchesSearch =
        report.texto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (questionText && questionText.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesStatus = statusFilter === 'all' || report.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [reports, searchTerm, statusFilter])

  // Filtrar reports arquivados
  const filteredArchivedReports = useMemo(() => {
    return archivedReports.filter((report) => {
      const questionText = report.questionId ? report.questionText : 'Suporte'
      const matchesSearch =
        report.texto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (questionText && questionText.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesStatus = statusFilter === 'all' || report.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [archivedReports, searchTerm, statusFilter])

  // Paginar os resultados ativos
  const paginatedReports = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredReports.slice(startIndex, endIndex)
  }, [filteredReports, currentPage, itemsPerPage])

  // Paginar os resultados arquivados
  const paginatedArchivedReports = useMemo(() => {
    const startIndex = (archivedCurrentPage - 1) * archivedItemsPerPage
    const endIndex = startIndex + archivedItemsPerPage
    return filteredArchivedReports.slice(startIndex, endIndex)
  }, [filteredArchivedReports, archivedCurrentPage, archivedItemsPerPage])

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage)
  const archivedTotalPages = Math.ceil(filteredArchivedReports.length / archivedItemsPerPage)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
    setArchivedCurrentPage(1)
  }, [searchTerm, statusFilter])

  const renderReportsTable = (
    reportsList: any[], 
    isArchived: boolean,
    currentPageValue: number,
    totalPagesValue: number,
    itemsPerPageValue: number,
    totalItems: number,
    onPageChange: (page: number) => void,
    onItemsPerPageChange: (items: number) => void,
    isLoading: boolean
  ) => (
    <Card>
      <CardContent className="px-6 py-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : reportsList.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            {isArchived ? 'Nenhum report arquivado' : 'Nenhum report encontrado'}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Reportado por</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportsList.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="max-w-xs">
                    <p className="truncate text-sm font-medium">
                      {report.questionId ? report.questionText : 'Suporte'}
                    </p>
                    {report.questionId && (
                      <p className="text-xs text-muted-foreground">
                        ID: {report.questionId}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{report.userName}</p>
                    <p className="text-xs text-muted-foreground">
                      {report.userEmail}
                    </p>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <div 
                      className="prose prose-sm max-w-none text-sm line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: stripImagesFromHtml(report.texto) }}
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    />
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
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        className="cursor-pointer"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewReport(report)}
                      >
                        <Eye className="mr-1 h-4 w-4" />
                        Ver
                      </Button>
                      {isArchived ? (
                        <>
                          <Button
                            className="cursor-pointer"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnarchive(report.id)}
                            disabled={actionLoading === report.id}
                          >
                            {actionLoading === report.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <ArchiveRestore className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            className="cursor-pointer text-destructive hover:text-destructive"
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirmId(report.id)}
                            disabled={actionLoading === report.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          className="cursor-pointer"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleArchive(report.id)}
                          disabled={actionLoading === report.id}
                        >
                          {actionLoading === report.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Archive className="h-4 w-4" />
                          )}
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
                currentPage={currentPageValue}
                totalPages={totalPagesValue}
                itemsPerPage={itemsPerPageValue}
                totalItems={totalItems}
                onPageChange={onPageChange}
                onItemsPerPageChange={onItemsPerPageChange}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )

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

        {/* Tabs for Active/Archived */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="active" className="cursor-pointer">
              Ativos
            </TabsTrigger>
            <TabsTrigger value="archived" className="cursor-pointer">
              <Archive className="mr-2 h-4 w-4" />
              Arquivados
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4">
            {renderReportsTable(
              paginatedReports,
              false,
              currentPage,
              totalPages,
              itemsPerPage,
              filteredReports.length,
              setCurrentPage,
              setItemsPerPage,
              loading
            )}
          </TabsContent>

          <TabsContent value="archived" className="mt-4">
            {renderReportsTable(
              paginatedArchivedReports,
              true,
              archivedCurrentPage,
              archivedTotalPages,
              archivedItemsPerPage,
              filteredArchivedReports.length,
              setArchivedCurrentPage,
              setArchivedItemsPerPage,
              loadingArchived
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Excluir Report Permanentemente
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O report será excluído permanentemente
              do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              {actionLoading === deleteConfirmId ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style jsx global>{`
        .prose img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 0.5rem 0;
        }
        .prose p {
          margin: 0.25rem 0;
        }
        .prose p:first-child {
          margin-top: 0;
        }
        .prose p:last-child {
          margin-bottom: 0;
        }
      `}</style>
    </>
  )
}

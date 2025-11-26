'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, CheckCircle, Clock, ExternalLink, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function ReportDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const reportId = params.id as string

  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    loadReport()
  }, [reportId])

  const loadReport = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/reports/${reportId}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        if (response.status === 404) {
          router.push('/admin/reports')
          return
        }
        throw new Error('Erro ao carregar report')
      }

      const data = await response.json()
      setReport(data.report)
    } catch (error) {
      console.error('Erro ao carregar report:', error)
      alert('Erro ao carregar report. Tente novamente.')
      router.push('/admin/reports')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsResolved = async () => {
    if (!report) return

    setUpdatingStatus(true)

    try {
      const newStatus = report.status === 'pendente' ? 'resolvido' : 'pendente'

      const response = await fetch(`/api/admin/reports/${report.id}`, {
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
      setReport(data.report)

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Report não encontrado</p>
          <Link href="/admin/reports">
            <Button variant="outline" className="mt-4 cursor-pointer">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para Reports
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/reports">
            <Button variant="ghost" size="sm" className="mb-4 cursor-pointer">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para Reports
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Detalhes do Report</h1>
          <p className="text-muted-foreground">
            Informações completas sobre o erro reportado
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(report.status)}
          <Button
          className="cursor-pointer"
            onClick={handleMarkAsResolved}
            disabled={updatingStatus}
            variant={report.status === 'pendente' ? 'default' : 'outline'}
          >
            {updatingStatus ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Atualizando...
              </>
            ) : report.status === 'pendente' ? (
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
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Informações do Report */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Status do Report
              </p>
              <div className="mt-1">{getStatusBadge(report.status)}</div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Data do Report
              </p>
              <p className="mt-1 text-sm">{formatDate(report.createdAt)}</p>
            </div>

            {report.resolvedAt && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Resolvido em
                </p>
                <p className="mt-1 text-sm">
                  {formatDate(report.resolvedAt)} por{' '}
                  {report.resolvedBy || 'Admin'}
                </p>
              </div>
            )}

            {report.tipos && report.tipos.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Tipos de Problema
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {report.tipos.map((tipo: string, index: number) => (
                    <Badge key={index} variant="outline">
                      {tipo}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informações do Usuário */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Usuário</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Nome</p>
              <p className="mt-1 text-sm">{report.userName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="mt-1 text-sm">{report.userEmail}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Questão Reportada */}
      <Card>
        <CardHeader>
          <CardTitle>Questão Reportada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <p className="mb-2 text-sm text-muted-foreground">
              ID: {report.questionId}
            </p>
            <p className="text-sm whitespace-pre-wrap break-words">
              {report.questionText}
            </p>
          </div>
          <Button variant="outline" size="sm" asChild className="cursor-pointer">
            <a
              href={`/admin/questions/${report.questionId}/edit`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Editar Questão
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Descrição do Problema */}
      <Card>
        <CardHeader>
          <CardTitle>Descrição do Problema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm whitespace-pre-wrap break-words">
              {report.texto}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Anexo */}
      {report.imagemUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Anexo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted p-4">
              <img
                src={report.imagemUrl}
                alt="Anexo do report"
                className="max-h-96 w-full rounded object-contain"
              />
            </div>
            <a
              href={report.imagemUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              Abrir imagem em nova aba
              <ExternalLink className="h-4 w-4" />
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


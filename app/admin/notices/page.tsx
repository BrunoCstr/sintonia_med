'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
  AlertCircle,
  Bell
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRole } from '@/lib/hooks/use-role'
import type { Notice } from '@/lib/types'

export default function NoticesPage() {
  const { isAdminMaster } = useRole()
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  
  // Form states
  const [formTitulo, setFormTitulo] = useState('')
  const [formMensagem, setFormMensagem] = useState('')
  const [formAtivo, setFormAtivo] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isAdminMaster) {
      fetchNotices()
    }
  }, [isAdminMaster])

  const fetchNotices = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/notices', {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Erro ao buscar avisos')
      }

      const data = await response.json()
      if (data.success) {
        setNotices(data.notices || [])
      }
    } catch (err: any) {
      console.error('Erro ao buscar avisos:', err)
      alert('Erro ao carregar avisos')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormTitulo('')
    setFormMensagem('')
    setFormAtivo(false)
    setError('')
    setSelectedNotice(null)
  }

  const handleCreate = () => {
    resetForm()
    setShowCreateDialog(true)
  }

  const handleEdit = (notice: Notice) => {
    setFormTitulo(notice.titulo)
    setFormMensagem(notice.mensagem)
    setFormAtivo(notice.ativo)
    setSelectedNotice(notice)
    setShowEditDialog(true)
  }

  const handleSave = async () => {
    if (!formTitulo.trim() || !formMensagem.trim()) {
      setError('Título e mensagem são obrigatórios')
      return
    }

    try {
      setSaving(true)
      setError('')

      const noticeData = {
        titulo: formTitulo.trim(),
        mensagem: formMensagem.trim(),
        ativo: formAtivo,
      }

      const url = selectedNotice 
        ? `/api/admin/notices/${selectedNotice.id}`
        : '/api/admin/notices'
      
      const method = selectedNotice ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(noticeData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao salvar aviso')
      }

      setShowCreateDialog(false)
      setShowEditDialog(false)
      resetForm()
      await fetchNotices()
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar aviso')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleAtivo = async (notice: Notice) => {
    try {
      setActionLoading(notice.id)
      const response = await fetch(`/api/admin/notices/${notice.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ ativo: !notice.ativo }),
      })

      if (!response.ok) {
        throw new Error('Erro ao alterar status do aviso')
      }

      await fetchNotices()
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status do aviso')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      setActionLoading(id)
      const response = await fetch(`/api/admin/notices/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Erro ao excluir aviso')
      }

      setDeleteConfirmId(null)
      await fetchNotices()
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir aviso')
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Extrair texto limpo do HTML para preview
  const getTextFromHtml = (html: string, maxLength: number = 100) => {
    if (typeof window === 'undefined') return '' // SSR safety
    try {
      const div = document.createElement('div')
      div.innerHTML = html
      const text = div.textContent || div.innerText || ''
      return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
    } catch {
      // Fallback: remover tags HTML com regex simples
      const text = html.replace(/<[^>]*>/g, '')
      return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
    }
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

  const activeNotice = notices.find(n => n.ativo)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciar Avisos</h1>
          <p className="text-muted-foreground">
            Crie e gerencie avisos exibidos aos usuários
          </p>
        </div>
        <Button onClick={handleCreate} className="cursor-pointer">
          <Plus className="mr-2 h-4 w-4" />
          Novo Aviso
        </Button>
      </div>

      {/* Aviso Ativo Atual */}
      {activeNotice && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Aviso Ativo Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">{activeNotice.titulo}</h3>
              <div 
                className="text-muted-foreground prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: activeNotice.mensagem }}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Criado em: {formatDate(activeNotice.createdAt)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informação sobre apenas um aviso ativo */}
      <Card className="border-yellow-500/50 bg-yellow-500/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Apenas um aviso pode estar ativo por vez</p>
              <p className="text-xs text-muted-foreground mt-1">
                Ao ativar um aviso, todos os outros serão automaticamente desativados. 
                O aviso ativo será exibido como popup para todos os usuários ao fazer login.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Avisos */}
      <Card>
        <CardHeader>
          <CardTitle>Avisos Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : notices.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Nenhum aviso cadastrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado por</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notices.map((notice) => (
                  <TableRow key={notice.id}>
                    <TableCell className="font-medium max-w-md">
                      <div className="truncate">{notice.titulo}</div>
                      <div className="text-xs text-muted-foreground truncate mt-1">
                        {getTextFromHtml(notice.mensagem, 100)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {notice.ativo ? (
                        <Badge variant="default">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="mr-1 h-3 w-3" />
                          Inativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {notice.createdByName || 'Desconhecido'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(notice.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          className="cursor-pointer"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleAtivo(notice)}
                          disabled={actionLoading === notice.id}
                          title={notice.ativo ? 'Desativar' : 'Ativar'}
                        >
                          {actionLoading === notice.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : notice.ativo ? (
                            <XCircle className="h-4 w-4" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          className="cursor-pointer"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(notice)}
                          disabled={actionLoading === notice.id}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          className="cursor-pointer text-destructive hover:text-destructive"
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirmId(notice.id)}
                          disabled={actionLoading === notice.id}
                          title="Excluir"
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

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog || showEditDialog} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false)
          setShowEditDialog(false)
          resetForm()
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedNotice ? 'Editar Aviso' : 'Novo Aviso'}
            </DialogTitle>
            <DialogDescription>
              {selectedNotice 
                ? 'Atualize as informações do aviso'
                : 'Preencha os dados para criar um novo aviso'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                value={formTitulo}
                onChange={(e) => setFormTitulo(e.target.value)}
                placeholder="Digite o título do aviso"
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formTitulo.length}/100 caracteres
              </p>
            </div>

            <div>
              <Label htmlFor="mensagem">Mensagem *</Label>
              <RichTextEditor
                value={formMensagem}
                onChange={setFormMensagem}
                placeholder="Digite a mensagem do aviso. Você pode adicionar formatação, imagens e links."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use a barra de ferramentas para formatar o texto, adicionar imagens e links
              </p>
            </div>

            <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/50">
              <Switch
                id="ativo"
                checked={formAtivo}
                onCheckedChange={setFormAtivo}
              />
              <div>
                <Label htmlFor="ativo" className="cursor-pointer">Aviso ativo</Label>
                <p className="text-xs text-muted-foreground">
                  Ao ativar, este aviso será exibido aos usuários e os outros serão desativados
                </p>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              className="cursor-pointer"
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false)
                setShowEditDialog(false)
                resetForm()
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="cursor-pointer">
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Aviso</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O aviso será excluído permanentemente do sistema.
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
    </div>
  )
}


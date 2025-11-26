'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { MedicalArea } from '@/lib/types'

export default function MedicalAreasPage() {
  const [areas, setAreas] = useState<MedicalArea[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingArea, setEditingArea] = useState<MedicalArea | null>(null)
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    ativo: true,
  })

  useEffect(() => {
    loadAreas()
  }, [])

  const loadAreas = async () => {
    try {
      const response = await fetch('/api/admin/medical-areas')
      if (!response.ok) {
        throw new Error('Erro ao carregar áreas médicas')
      }

      const data = await response.json()
      setAreas(data.areas || [])
    } catch (error) {
      console.error('Erro ao carregar áreas médicas:', error)
      alert('Erro ao carregar áreas médicas')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (area?: MedicalArea) => {
    if (area) {
      setEditingArea(area)
      setFormData({
        nome: area.nome,
        descricao: area.descricao || '',
        ativo: area.ativo,
      })
    } else {
      setEditingArea(null)
      setFormData({
        nome: '',
        descricao: '',
        ativo: true,
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingArea(null)
    setFormData({
      nome: '',
      descricao: '',
      ativo: true,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.nome.trim()) {
      alert('O nome da área é obrigatório')
      return
    }

    try {
      if (editingArea) {
        // Atualizar área existente
        const response = await fetch(`/api/admin/medical-areas/${editingArea.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Erro ao atualizar área médica')
        }
      } else {
        // Criar nova área
        const response = await fetch('/api/admin/medical-areas', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Erro ao criar área médica')
        }
      }

      handleCloseDialog()
      loadAreas()
    } catch (error: any) {
      console.error('Erro ao salvar área médica:', error)
      alert(error.message || 'Erro ao salvar área médica')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta área médica?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/medical-areas/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao excluir área médica')
      }

      loadAreas()
    } catch (error: any) {
      console.error('Erro ao excluir área médica:', error)
      alert(error.message || 'Erro ao excluir área médica')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Áreas da Medicina</h1>
          <p className="text-muted-foreground">
            Gerencie as áreas médicas disponíveis no sistema
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="cursor-pointer">
          <Plus className="mr-2 h-4 w-4" />
          Nova Área
        </Button>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingArea ? 'Editar Área Médica' : 'Nova Área Médica'}
                </DialogTitle>
                <DialogDescription>
                  {editingArea
                    ? 'Atualize as informações da área médica'
                    : 'Adicione uma nova área médica ao sistema'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">
                    Nome <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) =>
                      setFormData({ ...formData, nome: e.target.value })
                    }
                    placeholder="Ex: Cardiologia"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição (opcional)</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) =>
                      setFormData({ ...formData, descricao: e.target.value })
                    }
                    placeholder="Descrição da área médica"
                    rows={3}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="ativo"
                    checked={formData.ativo}
                    onChange={(e) =>
                      setFormData({ ...formData, ativo: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="ativo" className="cursor-pointer">
                    Área ativa
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button className="cursor-pointer" type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button type="submit" className="cursor-pointer">
                  {editingArea ? 'Salvar Alterações' : 'Criar Área'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Areas Table */}
      <Card>
        <CardContent className="px-6 py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : areas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhuma área médica cadastrada
                  </TableCell>
                </TableRow>
              ) : (
                areas.map((area) => (
                  <TableRow key={area.id}>
                    <TableCell className="font-medium">{area.nome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {area.descricao || '-'}
                    </TableCell>
                    <TableCell>
                      {area.ativo ? (
                        <Badge variant="secondary" className="bg-success/10 text-success">
                          Ativa
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground">
                          Inativa
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                        className="cursor-pointer"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(area)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                        className="cursor-pointer"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(area.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}


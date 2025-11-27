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
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import type { MedicalArea, Materia } from '@/lib/types'
import { DataTablePagination } from '@/components/data-table-pagination'

export default function MedicalAreasPage() {
  const [areas, setAreas] = useState<MedicalArea[]>([])
  const [materias, setMaterias] = useState<Record<string, Materia[]>>({})
  const [expandedSistemas, setExpandedSistemas] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(15)

  // Paginar as áreas
  const paginatedAreas = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return areas.slice(startIndex, endIndex)
  }, [areas, currentPage, itemsPerPage])

  const totalPages = Math.ceil(areas.length / itemsPerPage)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isMateriaDialogOpen, setIsMateriaDialogOpen] = useState(false)
  const [editingArea, setEditingArea] = useState<MedicalArea | null>(null)
  const [editingMateria, setEditingMateria] = useState<Materia | null>(null)
  const [selectedSistemaId, setSelectedSistemaId] = useState<string>('')
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    ativo: true,
  })
  const [materiaFormData, setMateriaFormData] = useState({
    nome: '',
    ativo: true,
  })

  useEffect(() => {
    loadAreas()
  }, [])

  const loadAreas = async () => {
    try {
      const response = await fetch('/api/admin/medical-areas')
      if (!response.ok) {
        throw new Error('Erro ao carregar sistemas')
      }

      const data = await response.json()
      setAreas(data.areas || [])
      
      // Carregar matérias para cada sistema
      const materiasMap: Record<string, Materia[]> = {}
      for (const area of data.areas || []) {
        try {
          const materiasResponse = await fetch(`/api/admin/materias?sistemaId=${area.id}`)
          if (materiasResponse.ok) {
            const materiasData = await materiasResponse.json()
            materiasMap[area.id] = materiasData.materias || []
          }
        } catch (error) {
          console.error(`Erro ao carregar matérias do sistema ${area.nome}:`, error)
          materiasMap[area.id] = []
        }
      }
      setMaterias(materiasMap)
    } catch (error) {
      console.error('Erro ao carregar sistemas:', error)
      alert('Erro ao carregar sistemas')
    } finally {
      setLoading(false)
    }
  }
  
  const toggleExpandSistema = (sistemaId: string) => {
    setExpandedSistemas(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sistemaId)) {
        newSet.delete(sistemaId)
      } else {
        newSet.add(sistemaId)
      }
      return newSet
    })
  }
  
  const handleOpenMateriaDialog = (sistemaId: string, materia?: Materia) => {
    setSelectedSistemaId(sistemaId)
    if (materia) {
      setEditingMateria(materia)
      setMateriaFormData({
        nome: materia.nome,
        ativo: materia.ativo,
      })
    } else {
      setEditingMateria(null)
      setMateriaFormData({
        nome: '',
        ativo: true,
      })
    }
    setIsMateriaDialogOpen(true)
  }
  
  const handleCloseMateriaDialog = () => {
    setIsMateriaDialogOpen(false)
    setEditingMateria(null)
    setSelectedSistemaId('')
    setMateriaFormData({
      nome: '',
      ativo: true,
    })
  }
  
  const handleSubmitMateria = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!materiaFormData.nome.trim()) {
      alert('O nome da matéria é obrigatório')
      return
    }

    try {
      if (editingMateria) {
        // Atualizar matéria existente
        const response = await fetch(`/api/admin/materias/${editingMateria.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(materiaFormData),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Erro ao atualizar matéria')
        }
      } else {
        // Criar nova matéria
        const response = await fetch('/api/admin/materias', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...materiaFormData,
            sistemaId: selectedSistemaId,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Erro ao criar matéria')
        }
      }

      handleCloseMateriaDialog()
      loadAreas()
    } catch (error: any) {
      console.error('Erro ao salvar matéria:', error)
      alert(error.message || 'Erro ao salvar matéria')
    }
  }
  
  const handleDeleteMateria = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta matéria?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/materias/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao excluir matéria')
      }

      loadAreas()
    } catch (error: any) {
      console.error('Erro ao excluir matéria:', error)
      alert(error.message || 'Erro ao excluir matéria')
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
      alert('O nome do sistema é obrigatório')
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
          throw new Error(error.error || 'Erro ao atualizar sistema')
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
          throw new Error(error.error || 'Erro ao criar sistema')
        }
      }

      handleCloseDialog()
      loadAreas()
    } catch (error: any) {
      console.error('Erro ao salvar área médica:', error)
      alert(error.message || 'Erro ao salvar sistema')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este sistema?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/medical-areas/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao excluir sistema')
      }

      loadAreas()
    } catch (error: any) {
      console.error('Erro ao excluir sistema:', error)
      alert(error.message || 'Erro ao excluir sistema')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sistemas</h1>
          <p className="text-muted-foreground">
            Gerencie os sistemas e suas matérias (subdivisões) disponíveis no sistema
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="cursor-pointer">
          <Plus className="mr-2 h-4 w-4" />
          Novo Sistema
        </Button>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingArea ? 'Editar Sistema' : 'Novo Sistema'}
                </DialogTitle>
                <DialogDescription>
                  {editingArea
                    ? 'Atualize as informações do sistema'
                    : 'Adicione um novo sistema ao sistema'}
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
                    placeholder="Ex: Cardio"
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
                    placeholder="Descrição do sistema"
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
                    Sistema ativo
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button className="cursor-pointer" type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button type="submit" className="cursor-pointer">
                  {editingArea ? 'Salvar Alterações' : 'Criar Sistema'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* Dialog para Matérias */}
        <Dialog open={isMateriaDialogOpen} onOpenChange={setIsMateriaDialogOpen}>
          <DialogContent>
            <form onSubmit={handleSubmitMateria}>
              <DialogHeader>
                <DialogTitle>
                  {editingMateria ? 'Editar Matéria' : 'Nova Matéria'}
                </DialogTitle>
                <DialogDescription>
                  {editingMateria
                    ? 'Atualize as informações da matéria'
                    : 'Adicione uma nova matéria (subdivisão) ao sistema'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="materia-nome">
                    Nome <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="materia-nome"
                    value={materiaFormData.nome}
                    onChange={(e) =>
                      setMateriaFormData({ ...materiaFormData, nome: e.target.value })
                    }
                    placeholder="Ex: Síndrome Coronariana Aguda"
                    required
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="materia-ativo"
                    checked={materiaFormData.ativo}
                    onChange={(e) =>
                      setMateriaFormData({ ...materiaFormData, ativo: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="materia-ativo" className="cursor-pointer">
                    Matéria ativa
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button className="cursor-pointer" type="button" variant="outline" onClick={handleCloseMateriaDialog}>
                  Cancelar
                </Button>
                <Button type="submit" className="cursor-pointer">
                  {editingMateria ? 'Salvar Alterações' : 'Criar Matéria'}
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
                <TableHead className="w-12"></TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : areas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum sistema cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {paginatedAreas.map((area) => {
                  const isExpanded = expandedSistemas.has(area.id)
                  const sistemaMaterias = materias[area.id] || []
                  return (
                    <>
                      <TableRow key={area.id}>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 cursor-pointer"
                            onClick={() => toggleExpandSistema(area.id)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">{area.nome}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {area.descricao || '-'}
                        </TableCell>
                        <TableCell>
                          {area.ativo ? (
                            <Badge variant="secondary" className="bg-success/10 text-success">
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-muted text-muted-foreground">
                              Inativo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              className="cursor-pointer"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenMateriaDialog(area.id)}
                              title="Adicionar matéria"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
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
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={5} className="bg-muted/30">
                            <div className="space-y-2 py-4">
                              <div className="flex items-center justify-between px-4">
                                <h4 className="text-sm font-semibold">Matérias (Subdivisões)</h4>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenMateriaDialog(area.id)}
                                  className="cursor-pointer"
                                >
                                  <Plus className="mr-2 h-3 w-3" />
                                  Adicionar Matéria
                                </Button>
                              </div>
                              {sistemaMaterias.length === 0 ? (
                                <p className="px-4 text-sm text-muted-foreground">
                                  Nenhuma matéria cadastrada. Clique em "Adicionar Matéria" para criar uma.
                                </p>
                              ) : (
                                <div className="space-y-1 px-4">
                                  {sistemaMaterias.map((materia) => (
                                    <div
                                      key={materia.id}
                                      className="flex items-center justify-between rounded border p-2"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm">{materia.nome}</span>
                                        {materia.ativo ? (
                                          <Badge variant="secondary" className="bg-success/10 text-success text-xs">
                                            Ativa
                                          </Badge>
                                        ) : (
                                          <Badge variant="secondary" className="bg-muted text-muted-foreground text-xs">
                                            Inativa
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex gap-1">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 cursor-pointer"
                                          onClick={() => handleOpenMateriaDialog(area.id, materia)}
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 cursor-pointer"
                                          onClick={() => handleDeleteMateria(materia.id)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )
                  })
                  }
                  {areas.length > itemsPerPage && (
                    <TableRow>
                      <TableCell colSpan={5} className="p-0">
                        <div className="border-t px-6 py-4">
                          <DataTablePagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            itemsPerPage={itemsPerPage}
                            totalItems={areas.length}
                            onPageChange={setCurrentPage}
                            onItemsPerPageChange={setItemsPerPage}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}


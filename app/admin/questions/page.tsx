'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Pencil, Archive, Eye } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

// Mock data - replace with real Firestore queries
const mockQuestions = [
  {
    id: '1',
    enunciado: 'Paciente de 45 anos, hipertenso, apresenta dor torácica...',
    area: 'Cardiologia',
    subarea: 'Síndrome Coronariana Aguda',
    dificuldade: 'medio',
    tipo: 'REVALIDA',
    ativo: true,
  },
  {
    id: '2',
    enunciado: 'Criança de 3 anos com febre alta e manchas vermelhas...',
    area: 'Pediatria',
    subarea: 'Doenças Exantemáticas',
    dificuldade: 'facil',
    tipo: 'Residência',
    ativo: true,
  },
  {
    id: '3',
    enunciado: 'Gestante de 32 semanas com pressão arterial elevada...',
    area: 'Ginecologia e Obstetrícia',
    subarea: 'Pré-eclâmpsia',
    dificuldade: 'dificil',
    tipo: 'ENARE',
    ativo: false,
  },
]

export default function QuestionsListPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [areaFilter, setAreaFilter] = useState('all')
  const [dificuldadeFilter, setDificuldadeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const getDifficultyColor = (dificuldade: string) => {
    switch (dificuldade) {
      case 'facil':
        return 'bg-success/10 text-success'
      case 'medio':
        return 'bg-warning/10 text-warning'
      case 'dificil':
        return 'bg-destructive/10 text-destructive'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  const getDifficultyLabel = (dificuldade: string) => {
    switch (dificuldade) {
      case 'facil':
        return 'Fácil'
      case 'medio':
        return 'Médio'
      case 'dificil':
        return 'Difícil'
      default:
        return dificuldade
    }
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Questões</h1>
            <p className="text-muted-foreground">
              Gerencie o banco de questões do sistema
            </p>
          </div>
          <Button asChild>
            <Link href="/admin/questions/new">
              <Plus className="mr-2 h-4 w-4" />
              Nova Questão
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar questão..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={areaFilter} onValueChange={setAreaFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Área" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as áreas</SelectItem>
                  <SelectItem value="cardiologia">Cardiologia</SelectItem>
                  <SelectItem value="pediatria">Pediatria</SelectItem>
                  <SelectItem value="ginecologia">Ginecologia e Obstetrícia</SelectItem>
                  <SelectItem value="clinica">Clínica Médica</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dificuldadeFilter} onValueChange={setDificuldadeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Dificuldade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="facil">Fácil</SelectItem>
                  <SelectItem value="medio">Médio</SelectItem>
                  <SelectItem value="dificil">Difícil</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ativo">Ativas</SelectItem>
                  <SelectItem value="inativo">Arquivadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Questions Table */}
        <Card>
          <CardContent className="px-6 py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Enunciado</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Subárea</TableHead>
                  <TableHead>Dificuldade</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockQuestions.map((question) => (
                  <TableRow key={question.id}>
                    <TableCell className="max-w-md">
                      <p className="truncate font-medium">
                        {question.enunciado}
                      </p>
                    </TableCell>
                    <TableCell>{question.area}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {question.subarea}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={getDifficultyColor(question.dificuldade)}
                      >
                        {getDifficultyLabel(question.dificuldade)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{question.tipo}</Badge>
                    </TableCell>
                    <TableCell>
                      {question.ativo ? (
                        <Badge variant="secondary" className="bg-success/10 text-success">
                          Ativa
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground">
                          Arquivada
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/admin/questions/${question.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/admin/questions/${question.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Archive className="h-4 w-4" />
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
  )
}

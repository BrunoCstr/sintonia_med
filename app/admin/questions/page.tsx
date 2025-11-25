"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Archive, Eye, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import type { Question, MedicalArea } from "@/lib/types";
import { Label } from "@/components/ui/label";

export default function QuestionsListPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [areaFilter, setAreaFilter] = useState("all");
  const [dificuldadeFilter, setDificuldadeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [medicalAreas, setMedicalAreas] = useState<MedicalArea[]>([]);
  const [loading, setLoading] = useState(true);

  const getDifficultyColor = (dificuldade: string) => {
    switch (dificuldade) {
      case "facil":
        return "bg-success/10 text-success";
      case "medio":
        return "bg-warning/10 text-warning";
      case "dificil":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getDifficultyLabel = (dificuldade: string) => {
    switch (dificuldade) {
      case "facil":
        return "Fácil";
      case "medio":
        return "Médio";
      case "dificil":
        return "Difícil";
      default:
        return dificuldade;
    }
  };

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const response = await fetch("/api/admin/questions");
        if (!response.ok) {
          throw new Error("Erro ao carregar questões");
        }

        const data = await response.json();
        setQuestions(data.questions || []);
      } catch (error) {
        console.error("Erro ao carregar questões:", error);
        alert("Erro ao carregar questões");
      } finally {
        setLoading(false);
      }
    };

    const loadMedicalAreas = async () => {
      try {
        const response = await fetch("/api/admin/medical-areas");
        if (!response.ok) {
          throw new Error("Erro ao carregar áreas médicas");
        }

        const data = await response.json();
        // Filtrar apenas áreas ativas
        const activeAreas = (data.areas || []).filter(
          (area: MedicalArea) => area.ativo
        );
        setMedicalAreas(activeAreas);
      } catch (error) {
        console.error("Erro ao carregar áreas médicas:", error);
      }
    };

    loadQuestions();
    loadMedicalAreas();
  }, []);

  const handleArchive = async (id: string, currentStatus: boolean) => {
    if (
      !confirm(`Deseja ${currentStatus ? "arquivar" : "ativar"} esta questão?`)
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/questions/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ativo: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error("Erro ao atualizar questão");
      }

      // Atualizar lista local
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? { ...q, ativo: !currentStatus } : q))
      );
    } catch (error) {
      console.error("Erro ao arquivar questão:", error);
      alert("Erro ao arquivar questão");
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Tem certeza que deseja excluir esta questão permanentemente?\n\nEsta ação também excluirá a questão do histórico de todos os usuários e não pode ser desfeita."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/questions/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao excluir questão");
      }

      const data = await response.json();

      // Remover da lista local
      setQuestions((prev) => prev.filter((q) => q.id !== id));

      alert(
        `Questão excluída com sucesso!\n\n${
          data.deletedFromHistory || 0
        } registro(s) removido(s) do histórico de usuários.`
      );
    } catch (error: any) {
      console.error("Erro ao excluir questão:", error);
      alert(error.message || "Erro ao excluir questão");
    }
  };

  // Filtrar questões
  const filteredQuestions = questions.filter((question) => {
    // Filtro de busca
    if (
      searchTerm &&
      !question.enunciado.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }

    // Filtro de área
    if (areaFilter !== "all" && question.area !== areaFilter) {
      return false;
    }

    // Filtro de dificuldade
    if (
      dificuldadeFilter !== "all" &&
      question.dificuldade !== dificuldadeFilter
    ) {
      return false;
    }

    // Filtro de status
    if (statusFilter === "ativo" && !question.ativo) {
      return false;
    }
    if (statusFilter === "inativo" && question.ativo) {
      return false;
    }

    return true;
  });

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
          <div className="grid gap-2 md:grid-cols-4">
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
                {medicalAreas.map((area) => (
                  <SelectItem key={area.id} value={area.nome}>
                    {area.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={dificuldadeFilter}
              onValueChange={setDificuldadeFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Dificuldade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as dificuldades</SelectItem>
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
                <SelectItem value="all">Todos os Status</SelectItem>
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
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredQuestions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Nenhuma questão encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredQuestions.map((question) => (
                  <TableRow key={question.id}>
                    <TableCell className="max-w-md">
                      <p className="truncate font-medium">
                        {question.enunciado}
                      </p>
                    </TableCell>
                    <TableCell className="capitalize">
                      {question.area}
                    </TableCell>
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
                        <Badge
                          variant="secondary"
                          className="bg-success/10 text-success"
                        >
                          Ativa
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-muted text-muted-foreground"
                        >
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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            handleArchive(question.id, question.ativo)
                          }
                          title={question.ativo ? "Arquivar" : "Ativar"}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(question.id)}
                          title="Excluir permanentemente"
                          className="text-destructive hover:text-destructive"
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
  );
}

'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Pencil, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import type { Question } from '@/lib/types'

export default function ViewQuestionPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [question, setQuestion] = useState<Question | null>(null)

  useEffect(() => {
    const loadQuestion = async () => {
      try {
        const response = await fetch(`/api/admin/questions/${params.id}`)
        if (!response.ok) {
          if (response.status === 404) {
            alert('Questão não encontrada')
            router.push('/admin/questions')
            return
          }
          throw new Error('Erro ao carregar questão')
        }

        const data = await response.json()
        setQuestion(data.question)
      } catch (error) {
        console.error('Erro ao carregar questão:', error)
        alert('Erro ao carregar questão')
        router.push('/admin/questions')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      loadQuestion()
    }
  }, [params.id, router])

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

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!question) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/questions">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Questão não encontrada</h1>
          </div>
        </div>
      </div>
    )
  }

  const alternativas = [
    { letter: 'A', text: question.alternativaA },
    { letter: 'B', text: question.alternativaB },
    { letter: 'C', text: question.alternativaC },
    { letter: 'D', text: question.alternativaD },
    { letter: 'E', text: question.alternativaE },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/questions">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Visualizar Questão</h1>
            <p className="text-muted-foreground">
              Detalhes completos da questão
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/admin/questions/${question.id}/edit`}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar Questão
          </Link>
        </Button>
      </div>

      {/* Question Statement */}
      <Card>
        <CardHeader>
          <CardTitle>Enunciado</CardTitle>
          <CardDescription>
            Texto completo da questão
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {question.enunciado}
            </p>
          </div>
          
          {question.imagemUrl && (
            <div className="relative h-64 w-full overflow-hidden rounded-lg border">
              <Image
                src={question.imagemUrl}
                alt="Imagem da questão"
                fill
                className="object-contain"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alternatives */}
      <Card>
        <CardHeader>
          <CardTitle>Alternativas</CardTitle>
          <CardDescription>
            Todas as opções de resposta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {alternativas.map((alt) => (
            <div
              key={alt.letter}
              className={`flex items-start gap-3 rounded-lg border p-4 ${
                alt.letter === question.alternativaCorreta
                  ? 'border-primary bg-primary/5'
                  : 'bg-muted/50'
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-semibold ${
                  alt.letter === question.alternativaCorreta
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {alt.letter}
              </div>
              <div className="flex-1">
                <p className="text-sm leading-relaxed">{alt.text}</p>
              </div>
              {alt.letter === question.alternativaCorreta && (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Commentary */}
      <Card>
        <CardHeader>
          <CardTitle>Comentário do Gabarito</CardTitle>
          <CardDescription>
            Explicação da resposta correta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {question.comentarioGabarito}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Adicionais</CardTitle>
          <CardDescription>
            Classificação e categorização da questão
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Área</p>
              <p className="text-sm capitalize">{question.area}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Subárea</p>
              <p className="text-sm">{question.subarea}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Dificuldade</p>
              <Badge
                variant="secondary"
                className={getDifficultyColor(question.dificuldade)}
              >
                {getDifficultyLabel(question.dificuldade)}
              </Badge>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Tipo de Prova</p>
              <Badge variant="outline">{question.tipo}</Badge>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              {question.ativo ? (
                <Badge variant="secondary" className="bg-success/10 text-success">
                  Ativa
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-muted text-muted-foreground">
                  Arquivada
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">ID</p>
              <p className="font-mono text-xs text-muted-foreground">{question.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" asChild>
          <Link href="/admin/questions">Voltar para Lista</Link>
        </Button>
        <Button asChild>
          <Link href={`/admin/questions/${question.id}/edit`}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar Questão
          </Link>
        </Button>
      </div>
    </div>
  )
}




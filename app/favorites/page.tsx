'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
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
import { Star, Archive, Trash2, ChevronDown, ChevronUp, Lock, Loader2, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { usePremium } from '@/lib/hooks/use-premium'
import Image from 'next/image'

interface FavoriteQuestion {
  id: string
  questionId: string
  question: any
  personalComment: string
  archived: boolean
  createdAt: string
  updatedAt: string
}

export default function FavoritesPage() {
  const { user, loading: authLoading } = useAuth()
  const { isPremium } = usePremium()
  const router = useRouter()
  const [favorites, setFavorites] = useState<FavoriteQuestion[]>([])
  const [archivedFavorites, setArchivedFavorites] = useState<FavoriteQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set())
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [commentText, setCommentText] = useState<string>('')
  const [showArchiveDialog, setShowArchiveDialog] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'favorites' | 'archived'>('favorites')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
      return
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      loadFavorites()
    }
  }, [user])

  const loadFavorites = async () => {
    try {
      setLoading(true)
      const [favoritesResponse, archivedResponse] = await Promise.all([
        fetch('/api/user/favorites', { credentials: 'include' }),
        fetch('/api/user/favorites/archived', { credentials: 'include' }),
      ])

      if (favoritesResponse.ok) {
        const favoritesData = await favoritesResponse.json()
        setFavorites(favoritesData.favorites || [])
      }

      if (archivedResponse.ok) {
        const archivedData = await archivedResponse.json()
        setArchivedFavorites(archivedData.favorites || [])
      }
    } catch (error) {
      console.error('Erro ao carregar favoritos:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleQuestion = (id: string) => {
    setExpandedQuestions((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
        setEditingComment(null)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const handleEditComment = (favorite: FavoriteQuestion) => {
    setEditingComment(favorite.id)
    setCommentText(favorite.personalComment || '')
  }

  const handleSaveComment = async (favoriteId: string) => {
    try {
      const response = await fetch(`/api/user/favorites/${favoriteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ personalComment: commentText }),
      })

      if (response.ok) {
        await loadFavorites()
        setEditingComment(null)
        setCommentText('')
      }
    } catch (error) {
      console.error('Erro ao salvar comentário:', error)
    }
  }

  const handleArchive = async (favoriteId: string) => {
    try {
      const response = await fetch(`/api/user/favorites/${favoriteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ archived: true }),
      })

      if (response.ok) {
        await loadFavorites()
        setShowArchiveDialog(null)
      }
    } catch (error) {
      console.error('Erro ao arquivar:', error)
    }
  }

  const handleDelete = async (favoriteId: string) => {
    try {
      const response = await fetch(`/api/user/favorites/${favoriteId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        await loadFavorites()
        setShowDeleteDialog(null)
      }
    } catch (error) {
      console.error('Erro ao deletar:', error)
    }
  }

  const renderQuestion = (favorite: FavoriteQuestion, isArchived: boolean = false) => {
    const question = favorite.question
    const isExpanded = expandedQuestions.has(favorite.id)
    const isEditingComment = editingComment === favorite.id

    return (
      <Card key={favorite.id} className="w-full max-w-full overflow-hidden">
        <CardHeader className="w-full max-w-full">
          <div className="flex items-start justify-between gap-4 w-full max-w-full">
            <div className="flex items-start gap-3 flex-1 min-w-0 w-full max-w-full overflow-hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              </div>
              <div className="flex-1 min-w-0 w-full max-w-full overflow-hidden">
                <div
                  className="prose prose-sm max-w-none break-words text-base leading-relaxed w-full max-w-full overflow-wrap-anywhere cursor-pointer"
                  style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                  onClick={() => toggleQuestion(favorite.id)}
                  dangerouslySetInnerHTML={{ __html: question.text }}
                />
                {question.imagemUrl && (
                  <div className="relative mt-3 h-48 w-full overflow-hidden rounded-lg border">
                    <Image
                      src={question.imagemUrl}
                      alt="Questão"
                      fill
                      className="object-contain"
                    />
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {question.subject}
                  </span>
                  {question.period && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {question.period}
                    </span>
                  )}
                  {question.isOfficial && (
                    <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                      Oficial
                    </span>
                  )}
                  {isArchived && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      Arquivada
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleQuestion(favorite.id)}
                className="cursor-pointer"
              >
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="space-y-4 pt-0">
            {/* Alternatives */}
            <div className="space-y-2">
              {question.alternatives?.map((alt: string, altIndex: number) => {
                const isCorrectAnswer = altIndex === question.correctAnswer
                const letter = String.fromCharCode(65 + altIndex)

                return (
                  <div
                    key={altIndex}
                    className={cn(
                      'rounded-lg border-2 p-3',
                      isCorrectAnswer && 'border-success bg-success/5'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold',
                          isCorrectAnswer && 'border-success bg-success text-success-foreground'
                        )}
                      >
                        {letter}
                      </div>
                      <div className="min-w-0 flex-1 w-full max-w-full overflow-hidden">
                        <p
                          className="break-words whitespace-normal text-sm overflow-wrap-anywhere"
                          style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                        >
                          {alt}
                        </p>
                        {isCorrectAnswer && (
                          <p className="mt-1 text-xs text-success">Resposta correta</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Explanation */}
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="mb-2 flex items-center gap-2 font-semibold">
                Gabarito Comentado
                {!isPremium && (
                  <Badge variant="secondary">
                    <Lock className="mr-1 h-3 w-3" />
                    Premium
                  </Badge>
                )}
              </h4>
              {isPremium ? (
                <div
                  className="prose prose-sm max-w-none break-words text-sm leading-relaxed text-muted-foreground"
                  dangerouslySetInnerHTML={{
                    __html: question.comentarioGabarito || question.explanation || '',
                  }}
                />
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 bg-background/50 p-6 text-center">
                    <Lock className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
                    <h5 className="mb-2 font-semibold">Gabarito Comentado Premium</h5>
                    <p className="mb-4 text-sm text-muted-foreground">
                      Assine um plano premium para ter acesso ao gabarito comentado completo!
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Personal Comment */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-semibold">Meu Comentário</h4>
              </div>
              {isEditingComment ? (
                <div className="space-y-2">
                  <Textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Adicione um comentário pessoal sobre esta questão..."
                    rows={4}
                    className="w-full"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSaveComment(favorite.id)}
                      className="cursor-pointer"
                    >
                      Salvar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingComment(null)
                        setCommentText('')
                      }}
                      className="cursor-pointer"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {favorite.personalComment ? (
                    <div className="rounded-lg border p-3 bg-muted/30">
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {favorite.personalComment}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 p-4 text-center">
                      <p className="text-sm text-muted-foreground mb-2">
                        Nenhum comentário pessoal adicionado
                      </p>
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditComment(favorite)}
                    className="cursor-pointer"
                  >
                    {favorite.personalComment ? 'Editar Comentário' : 'Adicionar Comentário'}
                  </Button>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {!isArchived ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowArchiveDialog(favorite.id)}
                  className="cursor-pointer"
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Arquivar
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      fetch(`/api/user/favorites/${favorite.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ archived: false }),
                      }).then(() => loadFavorites())
                    }}
                    className="cursor-pointer"
                  >
                    Desarquivar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteDialog(favorite.id)}
                    className="cursor-pointer"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Deletar
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    )
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Star className="h-8 w-8 fill-yellow-400 text-yellow-400" />
            Questões Favoritadas
          </h1>
          <p className="text-muted-foreground mt-2">
            Revise questões importantes e adicione seus próprios comentários
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <Button
            variant="ghost"
            onClick={() => setActiveTab('favorites')}
            className={cn(
              'cursor-pointer rounded-none border-b-2 border-transparent',
              activeTab === 'favorites' && 'border-primary text-primary'
            )}
          >
            Favoritas ({favorites.length})
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('archived')}
            className={cn(
              'cursor-pointer rounded-none border-b-2 border-transparent',
              activeTab === 'archived' && 'border-primary text-primary'
            )}
          >
            Arquivadas ({archivedFavorites.length})
          </Button>
        </div>

        {/* Content */}
        {activeTab === 'favorites' ? (
          favorites.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Star className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-xl font-semibold mb-2">Nenhuma questão favoritada</h3>
                <p className="text-muted-foreground mb-4">
                  Você ainda não favoritou nenhuma questão. Ao revisar seus simulados,
                  clique na estrela para favoritar questões importantes.
                </p>
                <Button onClick={() => router.push('/generator')} className="cursor-pointer">
                  Gerar Novo Simulado
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {favorites.map((favorite) => renderQuestion(favorite, false))}
            </div>
          )
        ) : (
          archivedFavorites.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Archive className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-xl font-semibold mb-2">Nenhuma questão arquivada</h3>
                <p className="text-muted-foreground">
                  Questões arquivadas aparecerão aqui. Você pode arquivar questões favoritadas
                  para organizá-las melhor.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {archivedFavorites.map((favorite) => renderQuestion(favorite, true))}
            </div>
          )
        )}

        {/* Archive Dialog */}
        <AlertDialog open={showArchiveDialog !== null} onOpenChange={(open) => !open && setShowArchiveDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Arquivar questão?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta questão será movida para a aba de arquivadas. Você poderá desarquivá-la ou deletá-la depois.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="cursor-pointer">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => showArchiveDialog && handleArchive(showArchiveDialog)}
                className="cursor-pointer"
              >
                Arquivar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Dialog */}
        <AlertDialog open={showDeleteDialog !== null} onOpenChange={(open) => !open && setShowDeleteDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deletar questão arquivada?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. A questão será permanentemente removida dos seus favoritos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="cursor-pointer">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => showDeleteDialog && handleDelete(showDeleteDialog)}
                className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Deletar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  )
}

'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, Save, Upload, X } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import type { MedicalArea } from '@/lib/types'

export default function EditQuestionPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null)
  const [medicalAreas, setMedicalAreas] = useState<MedicalArea[]>([])
  const [formData, setFormData] = useState({
    enunciado: '',
    imagemUrl: '',
    alternativaA: '',
    alternativaB: '',
    alternativaC: '',
    alternativaD: '',
    alternativaE: '',
    alternativaCorreta: '',
    comentarioGabarito: '',
    area: '',
    subarea: '',
    dificuldade: '',
    tipo: '',
    oficial: false,
  })

  useEffect(() => {
    const loadQuestion = async () => {
      try {
        const response = await fetch(`/api/admin/questions/${params.id}`)
        if (!response.ok) {
          throw new Error('Erro ao carregar questão')
        }

        const data = await response.json()
        const question = data.question

        setFormData({
          enunciado: question.enunciado || '',
          imagemUrl: question.imagemUrl || '',
          alternativaA: question.alternativaA || '',
          alternativaB: question.alternativaB || '',
          alternativaC: question.alternativaC || '',
          alternativaD: question.alternativaD || '',
          alternativaE: question.alternativaE || '',
          alternativaCorreta: question.alternativaCorreta || '',
          comentarioGabarito: question.comentarioGabarito || '',
          area: question.area || '',
          subarea: question.subarea || '',
          dificuldade: question.dificuldade || '',
          tipo: question.tipo || '',
          oficial: question.oficial || false,
        })

        if (question.imagemUrl) {
          setImagePreview(question.imagemUrl)
          setOriginalImageUrl(question.imagemUrl)
        }
      } catch (error) {
        console.error('Erro ao carregar questão:', error)
        alert('Erro ao carregar questão')
        router.push('/admin/questions')
      } finally {
        setLoadingData(false)
      }
    }

    const loadMedicalAreas = async () => {
      try {
        const response = await fetch('/api/admin/medical-areas')
        if (!response.ok) {
          throw new Error('Erro ao carregar áreas médicas')
        }

        const data = await response.json()
        // Filtrar apenas áreas ativas
        const activeAreas = (data.areas || []).filter((area: MedicalArea) => area.ativo)
        setMedicalAreas(activeAreas)
      } catch (error) {
        console.error('Erro ao carregar áreas médicas:', error)
      }
    }

    loadQuestion()
    loadMedicalAreas()
  }, [params.id, router])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem válida')
      return
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB')
      return
    }

    // Armazenar arquivo para upload posterior (ao salvar)
    setSelectedImageFile(file)

    // Criar preview local
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setImagePreview(null)
    setSelectedImageFile(null)
    setFormData({ ...formData, imagemUrl: '' })
    // Não limpar originalImageUrl aqui - será usado para deletar do Storage ao salvar
  }

  const validateForm = (): string | null => {
    // Validar enunciado
    if (!formData.enunciado.trim()) {
      return 'O enunciado é obrigatório'
    }

    // Validar alternativas
    const alternativas = ['alternativaA', 'alternativaB', 'alternativaC', 'alternativaD', 'alternativaE']
    for (const alt of alternativas) {
      if (!formData[alt as keyof typeof formData]?.toString().trim()) {
        return `A alternativa ${alt.replace('alternativa', '')} é obrigatória`
      }
    }

    // Validar alternativa correta
    if (!formData.alternativaCorreta || !['A', 'B', 'C', 'D', 'E'].includes(formData.alternativaCorreta)) {
      return 'Selecione a alternativa correta'
    }

    // Validar comentário do gabarito
    if (!formData.comentarioGabarito.trim()) {
      return 'O comentário do gabarito é obrigatório'
    }

    // Validar área
    if (!formData.area.trim()) {
      return 'A área é obrigatória'
    }

    // Validar subárea
    if (!formData.subarea.trim()) {
      return 'A subárea é obrigatória'
    }

    // Validar dificuldade
    if (!formData.dificuldade || !['facil', 'medio', 'dificil'].includes(formData.dificuldade)) {
      return 'A dificuldade é obrigatória'
    }

    // Validar tipo
    if (!formData.tipo.trim()) {
      return 'O tipo de prova é obrigatório'
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validar formulário
    const validationError = validateForm()
    if (validationError) {
      alert(validationError)
      return
    }

    setLoading(true)

    try {
      // Se houver nova imagem selecionada, fazer upload primeiro com o ID da questão
      let imagemUrl = formData.imagemUrl
      
      if (selectedImageFile && params.id) {
        setUploadingImage(true)
        try {
          const uploadFormData = new FormData()
          uploadFormData.append('file', selectedImageFile)
          uploadFormData.append('questionId', params.id as string)

          const uploadResponse = await fetch('/api/admin/questions/upload-image', {
            method: 'POST',
            body: uploadFormData,
          })

          if (!uploadResponse.ok) {
            const error = await uploadResponse.json()
            throw new Error(error.error || 'Erro ao fazer upload da imagem')
          }

          const uploadData = await uploadResponse.json()
          imagemUrl = uploadData.url
        } catch (error: any) {
          console.error('Erro ao fazer upload:', error)
          alert(error.message || 'Erro ao fazer upload da imagem')
          setLoading(false)
          setUploadingImage(false)
          return
        } finally {
          setUploadingImage(false)
        }
      }

      // Atualizar questão com a URL da imagem
      const response = await fetch(`/api/admin/questions/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          imagemUrl,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao atualizar questão')
      }

      router.push('/admin/questions')
    } catch (error: any) {
      console.error('Erro ao atualizar questão:', error)
      alert(error.message || 'Erro ao atualizar questão')
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/questions">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Editar Questão</h1>
            <p className="text-muted-foreground">
              Atualize as informações da questão
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Question Statement */}
          <Card>
            <CardHeader>
              <CardTitle>Enunciado <span className="text-destructive">*</span></CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={formData.enunciado}
                onChange={(e) =>
                  setFormData({ ...formData, enunciado: e.target.value })
                }
                rows={6}
                required
              />
              
              {/* Image Upload */}
              <div className="space-y-2">
                <Label htmlFor="imagem">Imagem (opcional)</Label>
                {imagePreview || formData.imagemUrl ? (
                  <div className="relative">
                    <div className="relative h-64 w-full overflow-hidden rounded-lg border">
                      <Image
                        src={imagePreview || formData.imagemUrl}
                        alt="Preview"
                        fill
                        className="object-contain"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleRemoveImage}
                      className="mt-2"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Remover Imagem
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <Label
                      htmlFor="imagem"
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed p-4 hover:bg-accent"
                    >
                      <Upload className="h-5 w-5" />
                      <span>Fazer upload de imagem</span>
                    </Label>
                    <input
                      id="imagem"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                    {uploadingImage && (
                      <span className="text-sm text-muted-foreground">Enviando...</span>
                    )}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: 5MB
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Alternatives */}
          <Card>
            <CardHeader>
              <CardTitle>Alternativas <span className="text-destructive">*</span></CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {['A', 'B', 'C', 'D', 'E'].map((letter) => (
                <div key={letter} className="space-y-2">
                  <Label htmlFor={`alternativa${letter}`}>
                    Alternativa {letter} <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id={`alternativa${letter}`}
                    value={formData[`alternativa${letter}` as keyof typeof formData]}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        [`alternativa${letter}`]: e.target.value,
                      })
                    }
                    rows={2}
                    required
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Correct Answer */}
          <Card>
            <CardHeader>
              <CardTitle>Alternativa Correta <span className="text-destructive">*</span></CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={formData.alternativaCorreta}
                onValueChange={(value) =>
                  setFormData({ ...formData, alternativaCorreta: value })
                }
                required
              >
                <div className="flex gap-4">
                  {['A', 'B', 'C', 'D', 'E'].map((letter) => (
                    <div key={letter} className="flex items-center space-x-2">
                      <RadioGroupItem value={letter} id={`correct-${letter}`} />
                      <Label htmlFor={`correct-${letter}`}>{letter}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Commentary */}
          <Card>
            <CardHeader>
              <CardTitle>Comentário do Gabarito <span className="text-destructive">*</span></CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.comentarioGabarito}
                onChange={(e) =>
                  setFormData({ ...formData, comentarioGabarito: e.target.value })
                }
                rows={4}
                required
              />
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Adicionais</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="area">Área <span className="text-destructive">*</span></Label>
                <Select
                  value={formData.area}
                  onValueChange={(value) =>
                    setFormData({ ...formData, area: value })
                  }
                  required
                >
                  <SelectTrigger id="area">
                    <SelectValue placeholder="Selecione a área" />
                  </SelectTrigger>
                  <SelectContent>
                    {medicalAreas.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        Nenhuma área disponível
                      </div>
                    ) : (
                      medicalAreas.map((area) => (
                        <SelectItem key={area.id} value={area.nome}>
                          {area.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subarea">Subárea <span className="text-destructive">*</span></Label>
                <Input
                  id="subarea"
                  value={formData.subarea}
                  onChange={(e) =>
                    setFormData({ ...formData, subarea: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dificuldade">Dificuldade <span className="text-destructive">*</span></Label>
                <Select
                  value={formData.dificuldade}
                  onValueChange={(value) =>
                    setFormData({ ...formData, dificuldade: value })
                  }
                  required
                >
                  <SelectTrigger id="dificuldade">
                    <SelectValue placeholder="Selecione a dificuldade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="facil">Fácil</SelectItem>
                    <SelectItem value="medio">Médio</SelectItem>
                    <SelectItem value="dificil">Difícil</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Prova <span className="text-destructive">*</span></Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) =>
                    setFormData({ ...formData, tipo: value })
                  }
                  required
                >
                  <SelectTrigger id="tipo">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REVALIDA">REVALIDA</SelectItem>
                    <SelectItem value="ENARE">ENARE</SelectItem>
                    <SelectItem value="Residência">Residência Médica</SelectItem>
                    <SelectItem value="Concurso">Concurso Público</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="oficial">Questão Oficial</Label>
                  <p className="text-sm text-muted-foreground">
                    Marque se esta é uma questão de prova oficial
                  </p>
                </div>
                <Switch
                  id="oficial"
                  checked={formData.oficial}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, oficial: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/questions">Cancelar</Link>
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </div>
  )
}

'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
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
import { ArrowLeft, Save, Upload, X, Edit } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { MedicalArea, Materia } from '@/lib/types'
import { ImageEditorDialog } from '@/components/ui/image-editor-dialog'

export default function NewQuestionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [imageForEditor, setImageForEditor] = useState<string | null>(null)
  const [medicalAreas, setMedicalAreas] = useState<MedicalArea[]>([])
  const [materias, setMaterias] = useState<Materia[]>([])
  const [loadingMaterias, setLoadingMaterias] = useState(false)
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
    disciplina: '',
    dificuldade: '',
    period: '',
    oficial: false,
  })

  useEffect(() => {
    const loadMedicalAreas = async () => {
      try {
        const response = await fetch('/api/admin/medical-areas')
        if (!response.ok) {
          throw new Error('Erro ao carregar sistemas')
        }

        const data = await response.json()
        // Filtrar apenas áreas ativas
        const activeAreas = (data.areas || []).filter((area: MedicalArea) => area.ativo)
        setMedicalAreas(activeAreas)
      } catch (error) {
        console.error('Erro ao carregar sistemas:', error)
      }
    }

    loadMedicalAreas()
  }, [])

  // Filtrar sistemas baseado no período selecionado
  const filteredMedicalAreas = useMemo(() => {
    if (!formData.period || formData.period === 'Todos os períodos') {
      return medicalAreas
    }
    return medicalAreas.filter((area) => area.periodo === formData.period)
  }, [medicalAreas, formData.period])

  // Carregar matérias quando o sistema for selecionado
  const [previousArea, setPreviousArea] = useState<string>('')
  useEffect(() => {
    const loadMaterias = async () => {
      if (!formData.area) {
        setMaterias([])
        setPreviousArea('')
        return
      }

      // Encontrar o ID do sistema selecionado pelo nome
      const selectedSistema = medicalAreas.find((area) => area.nome === formData.area)
      if (!selectedSistema) {
        setMaterias([])
        setPreviousArea('')
        return
      }

      // Se o sistema mudou, limpar a matéria selecionada
      if (previousArea && previousArea !== formData.area) {
        setFormData((prev) => ({ ...prev, subarea: '' }))
      }

      setLoadingMaterias(true)
      try {
        const response = await fetch(`/api/admin/materias?sistemaId=${selectedSistema.id}`)
        if (!response.ok) {
          throw new Error('Erro ao carregar matérias')
        }

        const data = await response.json()
        setMaterias(data.materias || [])
        setPreviousArea(formData.area)
      } catch (error) {
        console.error('Erro ao carregar matérias:', error)
        setMaterias([])
      } finally {
        setLoadingMaterias(false)
      }
    }

    loadMaterias()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.area, medicalAreas.length])

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

    // Criar preview local e abrir editor
    const reader = new FileReader()
    reader.onloadend = () => {
      const imageSrc = reader.result as string
      setImageForEditor(imageSrc)
      setEditorOpen(true)
    }
    reader.readAsDataURL(file)
  }

  const handleImageEditorSave = (editedFile: File) => {
    setSelectedImageFile(editedFile)
    
    // Criar preview da imagem editada
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(editedFile)
    
    setEditorOpen(false)
    setImageForEditor(null)
  }

  const handleRemoveImage = () => {
    setImagePreview(null)
    setSelectedImageFile(null)
    setFormData({ ...formData, imagemUrl: '' })
  }

  // Função helper para verificar se HTML está vazio
  const isHtmlEmpty = (html: string): boolean => {
    if (!html) return true
    // Remove tags HTML e espaços em branco
    const textContent = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
    return textContent.length === 0
  }

  const validateForm = (): string | null => {
    // Validar enunciado
    if (!formData.enunciado.trim()) {
      return 'O enunciado é obrigatório'
    }

    // Validar alternativas (A, B, C, D são obrigatórias, E é opcional)
    const alternativasObrigatorias = ['alternativaA', 'alternativaB', 'alternativaC', 'alternativaD']
    for (const alt of alternativasObrigatorias) {
      if (!formData[alt as keyof typeof formData]?.toString().trim()) {
        return `A alternativa ${alt.replace('alternativa', '')} é obrigatória`
      }
    }

    // Validar alternativa correta (E só pode ser selecionada se estiver preenchida)
    const alternativasValidas = formData.alternativaE?.trim() 
      ? ['A', 'B', 'C', 'D', 'E'] 
      : ['A', 'B', 'C', 'D']
    
    if (!formData.alternativaCorreta || !alternativasValidas.includes(formData.alternativaCorreta)) {
      return 'Selecione a alternativa correta'
    }

    // Validar comentário do gabarito
    if (isHtmlEmpty(formData.comentarioGabarito)) {
      return 'O comentário do gabarito é obrigatório'
    }

    // Validar sistema
    if (!formData.area.trim()) {
      return 'O sistema é obrigatório'
    }

    // Validar matéria
    if (!formData.subarea.trim()) {
      return 'A matéria é obrigatória'
    }

    // Validar dificuldade
    if (!formData.dificuldade || !['facil', 'medio', 'dificil'].includes(formData.dificuldade)) {
      return 'A dificuldade é obrigatória'
    }

    // Validar período
    if (!formData.period.trim()) {
      return 'O período é obrigatório'
    }

    // Validar disciplina
    if (!formData.disciplina || formData.disciplina === 'none' || !['SOI', 'HAM', 'IESC', 'CI'].includes(formData.disciplina)) {
      return 'A disciplina é obrigatória'
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
      // Criar questão primeiro para obter o ID
      const createResponse = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          imagemUrl: '', // Criar sem imagem primeiro
        }),
      })

      if (!createResponse.ok) {
        const error = await createResponse.json()
        throw new Error(error.error || 'Erro ao criar questão')
      }

      const createData = await createResponse.json()
      const questionId = createData.id || createData.question?.id

      // Se houver imagem selecionada, fazer upload com o ID da questão
      let imagemUrl = ''
      
      if (selectedImageFile && questionId) {
        setUploadingImage(true)
        try {
          const uploadFormData = new FormData()
          uploadFormData.append('file', selectedImageFile)
          uploadFormData.append('questionId', questionId)

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

          // Atualizar questão com a URL da imagem
          const updateResponse = await fetch(`/api/admin/questions/${questionId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              imagemUrl,
            }),
          })

          if (!updateResponse.ok) {
            const error = await updateResponse.json()
            throw new Error(error.error || 'Erro ao atualizar questão com imagem')
          }
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

      router.push('/admin/questions')
    } catch (error: any) {
      console.error('Erro ao criar questão:', error)
      alert(error.message || 'Erro ao criar questão')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="cursor-pointer">
            <Link href="/admin/questions">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Nova Questão</h1>
            <p className="text-muted-foreground">
              Adicione uma nova questão ao banco de dados
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Question Statement */}
          <Card>
            <CardHeader>
              <CardTitle>Enunciado <span className="text-destructive">*</span></CardTitle>
              <CardDescription>
                Digite o texto completo da questão
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RichTextEditor
                value={formData.enunciado}
                onChange={(value) =>
                  setFormData({ ...formData, enunciado: value })
                }
                placeholder="Ex: Paciente de 45 anos, hipertenso, apresenta dor torácica..."
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
                    <div className="mt-2 flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setImageForEditor(imagePreview || formData.imagemUrl)
                          setEditorOpen(true)
                        }}
                        className="cursor-pointer"
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Editar Imagem
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={handleRemoveImage}
                        className="cursor-pointer"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Remover Imagem
                      </Button>
                    </div>
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
                  Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: 5MB. Você poderá editar a imagem após o upload.
                </p>
              </div>
              
              {/* Image Editor Dialog */}
              <ImageEditorDialog
                open={editorOpen}
                onOpenChange={setEditorOpen}
                imageSrc={imageForEditor}
                onSave={handleImageEditorSave}
              />
            </CardContent>
          </Card>

          {/* Alternatives */}
          <Card>
            <CardHeader>
              <CardTitle>Alternativas <span className="text-destructive">*</span></CardTitle>
              <CardDescription>
                Digite as alternativas da questão (A, B, C, D são obrigatórias, E é opcional)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {['A', 'B', 'C', 'D', 'E'].map((letter) => (
                <div key={letter} className="space-y-2">
                  <Label htmlFor={`alternativa${letter}`}>
                    Alternativa {letter} {letter !== 'E' && <span className="text-destructive">*</span>}
                  </Label>
                  <Textarea
                    id={`alternativa${letter}`}
                    placeholder={`Texto da alternativa ${letter}`}
                    value={(formData[`alternativa${letter}` as keyof typeof formData] as string) || ''}
                    onChange={(e) => {
                      const newValue = e.target.value
                      // Se a alternativa E foi removida e estava selecionada como correta, limpar a seleção
                      if (letter === 'E' && !newValue.trim() && formData.alternativaCorreta === 'E') {
                        setFormData({
                          ...formData,
                          [`alternativa${letter}`]: newValue,
                          alternativaCorreta: '',
                        })
                      } else {
                        setFormData({
                          ...formData,
                          [`alternativa${letter}`]: newValue,
                        })
                      }
                    }}
                    rows={2}
                    required={letter !== 'E'}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Correct Answer */}
          <Card>
            <CardHeader>
              <CardTitle>Alternativa Correta <span className="text-destructive">*</span></CardTitle>
              <CardDescription>
                Selecione qual é a alternativa correta
              </CardDescription>
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
                  {['A', 'B', 'C', 'D', 'E'].filter((letter) => 
                    letter !== 'E' || formData.alternativaE?.trim()
                  ).map((letter) => (
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
              <CardDescription>
                Explique o raciocínio da resposta correta. Você pode formatar o texto, adicionar imagens e links.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RichTextEditor
                value={formData.comentarioGabarito}
                onChange={(value) =>
                  setFormData({ ...formData, comentarioGabarito: value })
                }
                placeholder="Ex: A alternativa correta é A porque..."
              />
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
            <CardContent className="grid gap-4 md:grid-cols-2">
              {/* 1. Período */}
              <div className="space-y-2">
                <Label htmlFor="period">Período <span className="text-destructive">*</span></Label>
                <Select
                  value={formData.period}
                  onValueChange={(value) => {
                    // Se o sistema selecionado não corresponder ao novo período, limpar o sistema e a matéria
                    const selectedSistema = medicalAreas.find((area) => area.nome === formData.area)
                    if (selectedSistema && value !== 'Todos os períodos' && selectedSistema.periodo !== value) {
                      setFormData({ ...formData, period: value, area: '', subarea: '' })
                    } else {
                      setFormData({ ...formData, period: value })
                    }
                  }}
                  required
                >
                  <SelectTrigger id="period">
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos os períodos">Todos os períodos</SelectItem>
                    <SelectItem value="1º Período">1º Período</SelectItem>
                    <SelectItem value="2º Período">2º Período</SelectItem>
                    <SelectItem value="3º Período">3º Período</SelectItem>
                    <SelectItem value="4º Período">4º Período</SelectItem>
                    <SelectItem value="5º Período">5º Período</SelectItem>
                    <SelectItem value="6º Período">6º Período</SelectItem>
                    <SelectItem value="7º Período">7º Período</SelectItem>
                    <SelectItem value="8º Período">8º Período</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 2. Disciplina */}
              <div className="space-y-2">
                <Label htmlFor="disciplina">Disciplina <span className="text-destructive">*</span></Label>
                <Select
                  value={formData.disciplina}
                  onValueChange={(value) =>
                    setFormData({ ...formData, disciplina: value })
                  }
                  required
                >
                  <SelectTrigger id="disciplina">
                    <SelectValue placeholder="Selecione a disciplina" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SOI">SOI</SelectItem>
                    <SelectItem value="HAM">HAM</SelectItem>
                    <SelectItem value="IESC">IESC</SelectItem>
                    <SelectItem value="CI">CI</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 3. Sistema */}
              <div className="space-y-2">
                <Label htmlFor="area">Sistema <span className="text-destructive">*</span></Label>
                <Select
                  value={formData.area}
                  onValueChange={(value) => {
                    const selectedSistema = medicalAreas.find((area) => area.nome === value)
                    // Se não houver período selecionado, preencher automaticamente com o período do sistema
                    if (selectedSistema && (!formData.period || formData.period === '')) {
                      setFormData({ ...formData, area: value, period: selectedSistema.periodo })
                    } else {
                      setFormData({ ...formData, area: value })
                    }
                  }}
                  required
                >
                  <SelectTrigger id="area">
                    <SelectValue placeholder="Selecione o sistema" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredMedicalAreas.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        {formData.period && formData.period !== 'Todos os períodos'
                          ? `Nenhum sistema disponível para ${formData.period}`
                          : 'Nenhum sistema disponível'}
                      </div>
                    ) : (
                      filteredMedicalAreas.map((area) => (
                        <SelectItem key={area.id} value={area.nome}>
                          {area.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* 4. Matéria */}
              <div className="space-y-2">
                <Label htmlFor="subarea">Matéria <span className="text-destructive">*</span></Label>
                <Select
                  value={formData.subarea}
                  onValueChange={(value) =>
                    setFormData({ ...formData, subarea: value })
                  }
                  disabled={!formData.area || loadingMaterias}
                  required
                >
                  <SelectTrigger id="subarea">
                    <SelectValue 
                      placeholder={
                        !formData.area 
                          ? "Selecione primeiro o sistema" 
                        : loadingMaterias 
                          ? "Carregando matérias..." 
                          : "Selecione a matéria"
                      } 
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {materias.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        {!formData.area 
                          ? "Selecione um sistema primeiro" 
                          : "Nenhuma matéria disponível"}
                      </div>
                    ) : (
                      materias.map((materia) => (
                        <SelectItem key={materia.id} value={materia.nome}>
                          {materia.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* 5. Dificuldade */}
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

              {/* 6. Questão Oficial */}
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
            <Button type="button" variant="outline" asChild className="cursor-pointer">
              <Link href="/admin/questions">Cancelar</Link>
            </Button>
            <Button type="submit" disabled={loading} className="cursor-pointer">
              <Save className="mr-2 h-4 w-4" />
              {loading ? 'Salvando...' : 'Salvar Questão'}
            </Button>
          </div>
        </form>
      </div>
  )
}

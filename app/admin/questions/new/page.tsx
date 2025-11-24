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
import { ArrowLeft, Save, Upload, X } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function NewQuestionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
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
  })

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setUploadingImage(true)

    try {
      // Criar preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)

      // Fazer upload
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)

      const response = await fetch('/api/admin/questions/upload-image', {
        method: 'POST',
        body: uploadFormData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao fazer upload da imagem')
      }

      const data = await response.json()
      setFormData({ ...formData, imagemUrl: data.url })
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error)
      alert(error.message || 'Erro ao fazer upload da imagem')
      setImagePreview(null)
    } finally {
      setUploadingImage(false)
    }
  }

  const handleRemoveImage = () => {
    setImagePreview(null)
    setFormData({ ...formData, imagemUrl: '' })
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
      const response = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao criar questão')
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
          <Button variant="ghost" size="icon" asChild>
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
              <Textarea
                placeholder="Ex: Paciente de 45 anos, hipertenso, apresenta dor torácica..."
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
              <CardDescription>
                Digite as cinco alternativas da questão
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {['A', 'B', 'C', 'D', 'E'].map((letter) => (
                <div key={letter} className="space-y-2">
                  <Label htmlFor={`alternativa${letter}`}>
                    Alternativa {letter} <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id={`alternativa${letter}`}
                    placeholder={`Texto da alternativa ${letter}`}
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
              <CardDescription>
                Explique o raciocínio da resposta correta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Ex: A alternativa correta é A porque..."
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
              <CardDescription>
                Classificação e categorização da questão
              </CardDescription>
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
                    <SelectItem value="cardiologia">Cardiologia</SelectItem>
                    <SelectItem value="pediatria">Pediatria</SelectItem>
                    <SelectItem value="ginecologia">
                      Ginecologia e Obstetrícia
                    </SelectItem>
                    <SelectItem value="clinica">Clínica Médica</SelectItem>
                    <SelectItem value="cirurgia">Cirurgia</SelectItem>
                    <SelectItem value="psiquiatria">Psiquiatria</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subarea">Subárea <span className="text-destructive">*</span></Label>
                <Input
                  id="subarea"
                  placeholder="Ex: Síndrome Coronariana Aguda"
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
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/questions">Cancelar</Link>
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? 'Salvando...' : 'Salvar Questão'}
            </Button>
          </div>
        </form>
      </div>
  )
}

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
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function EditQuestionPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [formData, setFormData] = useState({
    enunciado: '',
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

  useEffect(() => {
    // TODO: Load question data from Firestore
    // Mock data loading
    setTimeout(() => {
      setFormData({
        enunciado: 'Paciente de 45 anos, hipertenso, apresenta dor torácica...',
        alternativaA: 'Infarto agudo do miocárdio',
        alternativaB: 'Angina estável',
        alternativaC: 'Pericardite',
        alternativaD: 'Embolia pulmonar',
        alternativaE: 'Dissecção de aorta',
        alternativaCorreta: 'A',
        comentarioGabarito: 'A alternativa correta é A porque...',
        area: 'cardiologia',
        subarea: 'Síndrome Coronariana Aguda',
        dificuldade: 'medio',
        tipo: 'REVALIDA',
      })
      setLoadingData(false)
    }, 500)
  }, [params.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // TODO: Update question in Firestore
    console.log('Updating question:', params.id, formData)

    await new Promise((resolve) => setTimeout(resolve, 1000))

    setLoading(false)
    router.push('/admin/questions')
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
              <CardTitle>Enunciado</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.enunciado}
                onChange={(e) =>
                  setFormData({ ...formData, enunciado: e.target.value })
                }
                rows={6}
                required
              />
            </CardContent>
          </Card>

          {/* Alternatives */}
          <Card>
            <CardHeader>
              <CardTitle>Alternativas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {['A', 'B', 'C', 'D', 'E'].map((letter) => (
                <div key={letter} className="space-y-2">
                  <Label htmlFor={`alternativa${letter}`}>
                    Alternativa {letter}
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
              <CardTitle>Alternativa Correta</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={formData.alternativaCorreta}
                onValueChange={(value) =>
                  setFormData({ ...formData, alternativaCorreta: value })
                }
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
              <CardTitle>Comentário do Gabarito</CardTitle>
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
                <Label htmlFor="area">Área</Label>
                <Select
                  value={formData.area}
                  onValueChange={(value) =>
                    setFormData({ ...formData, area: value })
                  }
                >
                  <SelectTrigger id="area">
                    <SelectValue />
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
                <Label htmlFor="subarea">Subárea</Label>
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
                <Label htmlFor="dificuldade">Dificuldade</Label>
                <Select
                  value={formData.dificuldade}
                  onValueChange={(value) =>
                    setFormData({ ...formData, dificuldade: value })
                  }
                >
                  <SelectTrigger id="dificuldade">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="facil">Fácil</SelectItem>
                    <SelectItem value="medio">Médio</SelectItem>
                    <SelectItem value="dificil">Difícil</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Prova</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) =>
                    setFormData({ ...formData, tipo: value })
                  }
                >
                  <SelectTrigger id="tipo">
                    <SelectValue />
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
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </div>
  )
}

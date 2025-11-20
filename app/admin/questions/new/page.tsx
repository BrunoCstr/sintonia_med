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
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewQuestionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // TODO: Add Firestore logic to create question
    console.log('Creating question:', formData)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setLoading(false)
    router.push('/admin/questions')
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
              <CardTitle>Enunciado</CardTitle>
              <CardDescription>
                Digite o texto completo da questão
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Ex: Paciente de 45 anos, hipertenso, apresenta dor torácica..."
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
              <CardDescription>
                Digite as cinco alternativas da questão
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {['A', 'B', 'C', 'D', 'E'].map((letter) => (
                <div key={letter} className="space-y-2">
                  <Label htmlFor={`alternativa${letter}`}>
                    Alternativa {letter}
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
              <CardTitle>Alternativa Correta</CardTitle>
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
              <CardTitle>Comentário do Gabarito</CardTitle>
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
                <Label htmlFor="area">Área</Label>
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
                <Label htmlFor="subarea">Subárea</Label>
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
                <Label htmlFor="dificuldade">Dificuldade</Label>
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
                <Label htmlFor="tipo">Tipo de Prova</Label>
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

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from '@/lib/theme-provider'

const periods = [
  '1º Período',
  '2º Período',
  '3º Período',
  '4º Período',
  '5º Período',
  '6º Período',
  '7º Período',
  '8º Período',
  'Formado',
]

const institutions = [
  'UNIGRANRIO – Duque de Caxias, RJ',
  'UNIGRANRIO – Barra da Tijuca, RJ',
  'AFYA – Itaperuna, RJ (UNIREDENTOR)',
  'AFYA – Contagem, MG',
  'AFYA – Ipatinga, MG (UNIVAÇO)',
  'AFYA – Itajubá, MG (FMIT)',
  'AFYA – Montes Claros, MG (UNIFIPMOC)',
  'AFYA – São João del-Rei, MG (UNIPTAN)',
  'AFYA – Paraíba, PB',
  'AFYA – Teresina, PI',
  'AFYA – Parnaíba, PI (IESVAP)',
  'AFYA – Abaetetuba, PA',
  'AFYA – Marabá, PA (FACIMPA)',
  'AFYA – Redenção, PA (FESAR)',
  'AFYA – Bragança, PA',
  'AFYA – Guanambi, BA',
  'AFYA – Itabuna, BA',
  'AFYA – Salvador (UNIDOM), BA',
  'AFYA – Jaboatão dos Guararapes, PE',
  'AFYA – Garanhuns, PE',
  'AFYA – Maceió, AL',
  'AFYA – Itacoatiara, AM',
  'AFYA – Manacapuru, AM',
  'AFYA – Ji-Paraná, RO',
  'AFYA – Porto Velho, RO',
  'AFYA – Palmas, TO',
  'AFYA – Porto Nacional, TO',
  'AFYA – Santa Inês, MA',
  'AFYA – Vitória da Conquista, BA',
  'AFYA – Cruzeiro do Sul, AC',
  'AFYA – Araguaína, TO (UNITPAC)',
  'AFYA – Pato Branco, PR',
  'Nenhuma das opções listada',
]

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [period, setPeriod] = useState('')
  const [institution, setInstitution] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [touched, setTouched] = useState({ period: false, institution: false })
  const { signUp } = useAuth()
  const { theme } = useTheme()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setTouched({ period: true, institution: true })

    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    if (!period) {
      setError('Selecione seu período')
      return
    }

    if (!institution) {
      setError('Selecione sua instituição')
      return
    }

    setLoading(true)

    try {
      await signUp(email, password, name, period, institution)
      // Mostrar mensagem de sucesso e redirecionar
      router.push('/auth/login?message=account-created')
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Este email já está em uso')
      } else if (err.message && err.message.includes('Limite de tentativas')) {
        setError(err.message)
      } else {
        // Para outros erros, mostrar mensagem genérica
        setError(err.message || 'Erro ao criar conta. Tente novamente.')
        console.error('Erro ao criar conta:', err)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4 py-12">
      <div className="w-full max-w-md">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>

        <Card>
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4">
              <Image 
                src={theme === 'light' ? "/logo-sintoniamed-light.png" : "/logo-sintoniamed-dark.png"} 
                alt="SintoniaMed" 
                width={280}
                height={70}
                className="h-16 w-auto"
              />
            </div>
            <CardTitle className="text-2xl">Criar conta</CardTitle>
            <CardDescription>
              Crie sua conta e comece a estudar hoje mesmo
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">
                  Nome completo <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="institution">
                  Onde você estuda? <span className="text-destructive">*</span>
                </Label>
                <Select 
                  value={institution} 
                  onValueChange={(value) => {
                    setInstitution(value)
                    setTouched(prev => ({ ...prev, institution: true }))
                  }} 
                  disabled={loading}
                  required
                >
                  <SelectTrigger 
                    id="institution"
                    className={touched.institution && !institution ? 'border-destructive focus:ring-destructive' : ''}
                  >
                    <SelectValue placeholder="Selecione sua instituição" />
                  </SelectTrigger>
                  <SelectContent>
                    {institutions.map((inst) => (
                      <SelectItem key={inst} value={inst}>
                        {inst}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {touched.institution && !institution && (
                  <p className="text-sm text-destructive">Selecione sua instituição</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="period">
                  Período <span className="text-destructive">*</span>
                </Label>
                <Select 
                  value={period} 
                  onValueChange={(value) => {
                    setPeriod(value)
                    setTouched(prev => ({ ...prev, period: true }))
                  }} 
                  disabled={loading}
                  required
                >
                  <SelectTrigger 
                    id="period"
                    className={touched.period && !period ? 'border-destructive focus:ring-destructive' : ''}
                  >
                    <SelectValue placeholder="Selecione seu período" />
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {touched.period && !period && (
                  <p className="text-sm text-destructive">Selecione seu período</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  Senha <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  Confirmar senha <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Digite a senha novamente"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4 mt-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Criando conta...' : 'Criar conta'}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                Já tem uma conta?{' '}
                <Link href="/auth/login" className="text-primary hover:underline">
                  Entrar
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}

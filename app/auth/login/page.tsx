'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from '@/lib/theme-provider'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showResendEmail, setShowResendEmail] = useState(false)
  const [resendingEmail, setResendingEmail] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const { signIn, resendVerificationEmail } = useAuth()
  const { theme } = useTheme()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'
  const accountCreated = searchParams.get('message') === 'account-created'
  const accountCreatedNoEmail = searchParams.get('message') === 'account-created-no-email'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setShowResendEmail(false)
    setResendSuccess(false)
    setLoading(true)

    try {
      await signIn(email, password)
      router.push(redirect)
    } catch (err: any) {
      // Tratar erro específico de e-mail não verificado
      if (err.code === 'auth/email-not-verified') {
        setError(err.message || 'Por favor, verifique seu e-mail antes de fazer login.')
        setShowResendEmail(true)
      } else if (err.code === 'auth/user-disabled') {
        setError('Sua conta foi desativada. Entre em contato com o administrador para mais informações.')
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Email ou senha incorretos. Tente novamente.')
      } else if (err.code === 'auth/too-many-requests') {
        setError('Muitas tentativas de login. Aguarde alguns minutos e tente novamente.')
      } else if (err.code === 'auth/invalid-email') {
        setError('Email inválido. Verifique e tente novamente.')
      } else {
        setError('Erro ao fazer login. Tente novamente.')
      }
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleResendEmail = async () => {
    if (!email) {
      setError('Por favor, insira seu e-mail primeiro.')
      return
    }

    if (!password) {
      setError('Por favor, digite sua senha para reenviar o e-mail de verificação.')
      return
    }

    setResendingEmail(true)
    setResendSuccess(false)
    setError('')

    try {
      // Fazer login temporário para enviar o e-mail
      const { signInWithEmailAndPassword, sendEmailVerification, signOut } = await import('firebase/auth')
      const { auth } = await import('@/lib/firebase')
      
      try {
        // Fazer login temporário
        const userCredential = await signInWithEmailAndPassword(auth, email, password)
        
        if (!userCredential.user.emailVerified) {
          // Enviar e-mail de verificação usando Client SDK
          await sendEmailVerification(userCredential.user, {
            url: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/login`,
            handleCodeInApp: false,
          })
          
          console.log('✅ E-mail de verificação enviado com sucesso')
          
          // Fazer logout após enviar o e-mail
          await signOut(auth)
          
          setResendSuccess(true)
          setError('')
        } else {
          // E-mail já verificado
          await signOut(auth)
          setError('E-mail já está verificado. Você pode fazer login normalmente.')
        }
      } catch (loginError: any) {
        // Se o login falhar, mostrar erro específico
        if (loginError.code === 'auth/user-not-found' || loginError.code === 'auth/wrong-password' || loginError.code === 'auth/invalid-credential') {
          setError('Email ou senha incorretos. Verifique e tente novamente.')
        } else if (loginError.code === 'auth/user-disabled') {
          setError('Sua conta foi desativada. Entre em contato com o administrador.')
        } else {
          setError(`Erro ao fazer login temporário: ${loginError.message || 'Tente novamente.'}`)
        }
        console.error('Erro ao fazer login temporário:', loginError)
      }
    } catch (err: any) {
      console.error('Erro ao importar módulos:', err)
      setError('Erro ao reenviar e-mail. Tente novamente.')
    } finally {
      setResendingEmail(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4 py-12">
      <div className="w-full max-w-md">
        <Button variant="ghost" asChild className="mb-4 cursor-pointer">
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
                className="h-24 w-auto"
              />
            </div>
            <CardTitle className="text-2xl">Entrar no SintoniaMed</CardTitle>
            <CardDescription>
              Entre com seu email e senha para acessar sua conta
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {accountCreated && (
                <div className="rounded-lg bg-success/10 p-3 text-sm text-success">
                  Conta criada com sucesso! Verifique seu e-mail para ativar sua conta. O e-mail de verificação foi enviado para sua caixa de entrada.
                </div>
              )}

              {accountCreatedNoEmail && (
                <div className="rounded-lg bg-warning/10 p-3 text-sm text-warning border border-warning/20">
                  <p className="font-semibold mb-1">Conta criada com sucesso!</p>
                  <p className="mb-2">Porém, não foi possível enviar o e-mail de verificação automaticamente.</p>
                  <p>Por favor, use o botão abaixo para reenviar o e-mail de verificação.</p>
                </div>
              )}

              {error && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {resendSuccess && (
                <div className="rounded-lg bg-success/10 p-3 text-sm text-success">
                  E-mail de verificação reenviado com sucesso! Verifique sua caixa de entrada e spam.
                </div>
              )}

              {showResendEmail && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                  <p className="text-sm text-foreground">
                    Seu e-mail ainda não foi verificado. {password ? 'Clique no botão abaixo para reenviar o e-mail de verificação usando sua senha.' : 'Digite sua senha acima e clique no botão abaixo para reenviar o e-mail de verificação.'}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResendEmail}
                    disabled={resendingEmail || !password}
                    className="w-full cursor-pointer"
                  >
                    {resendingEmail ? 'Enviando...' : password ? 'Reenviar E-mail de Verificação' : 'Digite sua senha primeiro'}
                  </Button>
                  {!password && (
                    <p className="text-xs text-muted-foreground text-center">
                      💡 Digite sua senha no campo acima para habilitar o botão
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
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
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute cursor-pointer right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="text-right">
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Esqueceu a senha?
                </Link>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full cursor-pointer" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                Não tem uma conta?{' '}
                <Link href="/auth/register" className="text-primary hover:underline">
                  Criar conta
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>}>
      <LoginForm />
    </Suspense>
  )
}

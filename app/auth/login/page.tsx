'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Eye, EyeOff, Shield } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from '@/lib/theme-provider'
import { auth } from '@/lib/firebase'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showResendEmail, setShowResendEmail] = useState(false)
  const [resendingEmail, setResendingEmail] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  
  // Estados para 2FA
  const [requires2FA, setRequires2FA] = useState(false)
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [verifying2FA, setVerifying2FA] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  
  const { signIn, resendVerificationEmail } = useAuth()
  const { theme } = useTheme()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'
  const accountCreated = searchParams.get('message') === 'account-created'
  const accountCreatedNoEmail = searchParams.get('message') === 'account-created-no-email'

  const check2FAStatus = async (uid: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/admin/two-factor?requesterUid=${uid}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        return false
      }

      const data = await response.json()
      return data.enabled === true
    } catch (error) {
      console.error('Erro ao verificar status do 2FA:', error)
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setShowResendEmail(false)
    setResendSuccess(false)
    setLoading(true)
    setRequires2FA(false)
    setTwoFactorCode('')

    // Limpar qualquer cookie de 2FA pendente residual de um login anterior
    // Isso evita que um login novo seja bloqueado por um 2FA pendente antigo
    try {
      await fetch('/api/auth/set-2fa-pending', {
        method: 'DELETE',
        credentials: 'include',
      })
    } catch (error) {
      // Ignorar erro - é apenas uma limpeza preventiva
    }

    try {
      await signIn(email, password)
      
      // Verificar se o usuário tem 2FA ativado
      const currentUser = auth.currentUser
      if (currentUser) {
        const has2FA = await check2FAStatus(currentUser.uid)
        
        if (has2FA) {
          // Definir cookie de 2FA pendente para bloquear acesso até verificação
          // Isso corrige a vulnerabilidade de bypass via botão voltar do navegador
          try {
            await fetch('/api/auth/set-2fa-pending', {
              method: 'POST',
              credentials: 'include',
            })
          } catch (error) {
            console.error('Erro ao definir cookie 2FA pendente:', error)
          }
          
          // Requer código 2FA
          setUserId(currentUser.uid)
          setRequires2FA(true)
          setLoading(false)
          return
        }
      }

      // Se não tem 2FA ou não é admin, continuar normalmente
      // Marcar que o usuário acabou de fazer login para mostrar o dialog de planos
      // Limpar flag anterior para garantir que aparece mesmo se já viu antes
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('plansWelcomeShown')
        sessionStorage.setItem('justLoggedIn', 'true')
      }
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

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !twoFactorCode) {
      setError('Por favor, insira o código de autenticação de dois fatores.')
      return
    }

    setVerifying2FA(true)
    setError('')

    try {
      const response = await fetch('/api/admin/two-factor/verify', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: userId,
          code: twoFactorCode,
        }),
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json()
        // Fazer logout se o código estiver incorreto
        await auth.signOut()
        // Remover cookie de 2FA pendente
        try {
          await fetch('/api/auth/set-2fa-pending', {
            method: 'DELETE',
            credentials: 'include',
          })
        } catch (error) {
          console.error('Erro ao remover cookie 2FA pendente:', error)
        }
        throw new Error(errorData.error || 'Código inválido')
      }

      // Código válido - remover cookie de 2FA pendente antes de continuar
      try {
        await fetch('/api/auth/set-2fa-pending', {
          method: 'DELETE',
          credentials: 'include',
        })
      } catch (error) {
        console.error('Erro ao remover cookie 2FA pendente:', error)
      }

      // Código válido, continuar com o login
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('plansWelcomeShown')
        sessionStorage.setItem('justLoggedIn', 'true')
      }
      router.push(redirect)
    } catch (err: any) {
      // Garantir logout em caso de erro
      try {
        await auth.signOut()
      } catch (signOutError) {
        console.error('Erro ao fazer logout:', signOutError)
      }
      // Remover cookie de 2FA pendente
      try {
        await fetch('/api/auth/set-2fa-pending', {
          method: 'DELETE',
          credentials: 'include',
        })
      } catch (error) {
        console.error('Erro ao remover cookie 2FA pendente:', error)
      }
      setError(err.message || 'Código inválido. Verifique e tente novamente.')
      setTwoFactorCode('')
      setRequires2FA(false)
      setUserId(null)
    } finally {
      setVerifying2FA(false)
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

          <form onSubmit={requires2FA ? handle2FASubmit : handleSubmit}>
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

              {requires2FA ? (
                <>
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      <p className="text-sm font-medium text-foreground">
                        Autenticação de Dois Fatores
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Sua conta está protegida com autenticação de dois fatores. 
                      Insira o código de 6 dígitos do seu aplicativo autenticador.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="twoFactorCode">Código de Autenticação</Label>
                    <Input
                      id="twoFactorCode"
                      type="text"
                      placeholder="000000"
                      value={twoFactorCode}
                      onChange={(e) => {
                        // Permitir apenas números e limitar a 6 dígitos
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                        setTwoFactorCode(value)
                      }}
                      required
                      disabled={verifying2FA}
                      maxLength={6}
                      className="text-center mb-5 text-2xl tracking-widest font-mono"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoFocus
                    />
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button 
                type="submit" 
                className="w-full cursor-pointer" 
                disabled={loading || verifying2FA || (requires2FA && twoFactorCode.length !== 6)}
              >
                {loading ? 'Entrando...' : verifying2FA ? 'Verificando...' : requires2FA ? 'Verificar Código' : 'Entrar'}
              </Button>
              
              {requires2FA && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={async () => {
                    // Fazer logout e voltar para o formulário de login
                    await auth.signOut()
                    // Remover cookie de 2FA pendente
                    try {
                      await fetch('/api/auth/set-2fa-pending', {
                        method: 'DELETE',
                        credentials: 'include',
                      })
                    } catch (error) {
                      console.error('Erro ao remover cookie 2FA pendente:', error)
                    }
                    setRequires2FA(false)
                    setTwoFactorCode('')
                    setUserId(null)
                    setError('')
                  }}
                  className="w-full cursor-pointer"
                  disabled={verifying2FA}
                >
                  Voltar
                </Button>
              )}

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

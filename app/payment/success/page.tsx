'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'

function PaymentSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refreshUserProfile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<'success' | 'pending' | 'error'>('success')
  const [isFreeAccess, setIsFreeAccess] = useState(false)

  useEffect(() => {
    const paymentId = searchParams.get('payment_id')
    const statusParam = searchParams.get('status')
    const freeAccessParam = searchParams.get('free_access')

    if (statusParam === 'approved') {
      setStatus('success')
    } else if (statusParam === 'pending') {
      setStatus('pending')
    } else {
      setStatus('error')
    }

    // Verificar se foi acesso gratuito via cupom
    if (freeAccessParam === 'true') {
      setIsFreeAccess(true)
    }

    // Atualizar o perfil do usuário para refletir o novo plano
    const updateProfile = async () => {
      try {
        // Aguardar um pouco para garantir que o webhook foi processado (se não for free access)
        if (freeAccessParam !== 'true') {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
        
        // Atualizar o perfil do usuário no contexto
        await refreshUserProfile()
      } catch (error) {
        console.error('Erro ao atualizar perfil:', error)
      } finally {
        setLoading(false)
      }
    }

    updateProfile()
  }, [searchParams, refreshUserProfile])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Processando pagamento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <Card className="border-2">
          <CardHeader className="text-center">
            {status === 'success' && (
              <>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle className="h-10 w-10 text-success" />
                </div>
                <CardTitle className="text-2xl">
                  {isFreeAccess ? 'Cupom Aplicado com Sucesso!' : 'Pagamento Aprovado!'}
                </CardTitle>
                <CardDescription className="text-base">
                  {isFreeAccess 
                    ? 'Seu cupom de 100% de desconto foi aplicado e sua assinatura foi ativada' 
                    : 'Sua assinatura foi ativada com sucesso'}
                </CardDescription>
              </>
            )}
            {status === 'pending' && (
              <>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warning/10">
                  <Loader2 className="h-10 w-10 animate-spin text-warning" />
                </div>
                <CardTitle className="text-2xl">Pagamento Pendente</CardTitle>
                <CardDescription className="text-base">
                  Seu pagamento está sendo processado. Você receberá um email quando for aprovado.
                </CardDescription>
              </>
            )}
            {status === 'error' && (
              <>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                  <CheckCircle className="h-10 w-10 text-destructive" />
                </div>
                <CardTitle className="text-2xl">Pagamento Não Aprovado</CardTitle>
                <CardDescription className="text-base">
                  Não foi possível processar seu pagamento. Tente novamente.
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            {status === 'success' && (
              <>
                <p className="text-muted-foreground">
                  Você já pode acessar todas as funcionalidades do SintoniaMed!
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <Button asChild className="cursor-pointer">
                    <Link href="/dashboard">Ir para Dashboard</Link>
                  </Button>
                  <Button variant="outline" asChild className="cursor-pointer">
                    <Link href="/profile">Ver Minha Assinatura</Link>
                  </Button>
                </div>
              </>
            )}
            {status === 'pending' && (
              <>
                <p className="text-muted-foreground">
                  Aguarde a confirmação do pagamento. Você receberá um email quando tudo estiver pronto.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <Button asChild className="cursor-pointer">
                    <Link href="/dashboard">Ir para Dashboard</Link>
                  </Button>
                  <Button variant="outline" asChild className="cursor-pointer">
                    <Link href="/plans">Voltar para Planos</Link>
                  </Button>
                </div>
              </>
            )}
            {status === 'error' && (
              <>
                <p className="text-muted-foreground">
                  Se o problema persistir, entre em contato com o suporte.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <Button asChild className="cursor-pointer">
                    <Link href="/plans">Tentar Novamente</Link>
                  </Button>
                  <Button variant="outline" asChild className="cursor-pointer">
                    <Link href="/dashboard">Ir para Dashboard</Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}


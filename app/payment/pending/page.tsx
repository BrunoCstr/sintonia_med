'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function PaymentPendingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Aguardar um pouco para garantir que o webhook foi processado
    setTimeout(() => {
      setLoading(false)
    }, 2000)
  }, [])

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
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warning/10">
              <Loader2 className="h-10 w-10 animate-spin text-warning" />
            </div>
            <CardTitle className="text-2xl">Pagamento Pendente</CardTitle>
            <CardDescription className="text-base">
              Seu pagamento está sendo processado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              Aguarde a confirmação do pagamento. Você receberá um email quando tudo estiver pronto.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button asChild className="cursor-pointer">
                <Link href="/dashboard">Ir para Dashboard</Link>
              </Button>
              <Button variant="outline" asChild className="cursor-pointer">
                <Link href="/profile">Ver Status da Assinatura</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


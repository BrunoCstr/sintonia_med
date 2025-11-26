'use client'

import { Suspense, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { XCircle } from 'lucide-react'
import Link from 'next/link'

const friendlyStatusTitle: Record<string, string> = {
  rejected: 'Pagamento Rejeitado',
  cancelled: 'Pagamento Cancelado',
  pending: 'Pagamento Pendente',
}

function PaymentFailureContent() {
  const searchParams = useSearchParams()
  const status = searchParams.get('status') || 'rejected'
  const messageFromQuery = searchParams.get('message')

  const description = useMemo(() => {
    if (messageFromQuery) {
      return messageFromQuery
    }
    switch (status) {
      case 'pending':
        return 'Seu pagamento ainda está sendo processado. Você receberá um email quando houver uma atualização.'
      case 'cancelled':
        return 'O pagamento foi cancelado antes da conclusão.'
      default:
        return 'O pagamento foi rejeitado ou não pôde ser processado.'
    }
  }, [messageFromQuery, status])

  const title = friendlyStatusTitle[status] || 'Pagamento Não Concluído'

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/30">
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <Card className="border-2">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-10 w-10 text-destructive" />
            </div>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription className="text-base">{description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">Não se preocupe, você pode tentar novamente a qualquer momento.</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button asChild className="cursor-pointer">
                <Link href="/plans">Escolher Plano Novamente</Link>
              </Button>
              <Button variant="outline" asChild className="cursor-pointer">
                <Link href="/dashboard">Ir para Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function PaymentFailurePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-linear-to-b from-background to-muted/30">
        <div className="container mx-auto max-w-2xl px-4 py-12">
          <Card className="border-2">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <XCircle className="h-10 w-10 text-destructive" />
              </div>
              <CardTitle className="text-2xl">Carregando...</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>
    }>
      <PaymentFailureContent />
    </Suspense>
  )
}


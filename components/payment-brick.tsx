'use client'

import { useEffect, useState } from 'react'
import { initMercadoPago, Payment } from '@mercadopago/sdk-react'
import { Loader2 } from 'lucide-react'

interface PaymentBrickProps {
  publicKey: string
  preferenceId: string
  amount: number
  onPaymentSuccess: (paymentId: string, status: string) => void
  onPaymentError: (error: PaymentErrorInfo) => void
  onReady?: () => void
}

export interface PaymentErrorInfo {
  message: string
  status?: string
  statusDetail?: string
  paymentId?: string
}

// Gerar uma chave única para forçar re-renderização do Payment Brick
let brickInstanceCounter = 0

export function PaymentBrick({
  publicKey,
  preferenceId,
  amount,
  onPaymentSuccess,
  onPaymentError,
  onReady,
}: PaymentBrickProps) {
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  // Usar uma chave única para forçar re-renderização completa do Payment Brick
  const [brickKey, setBrickKey] = useState(() => {
    brickInstanceCounter++
    return `payment-brick-${brickInstanceCounter}-${Date.now()}`
  })

  useEffect(() => {
    // Verificar se a public key está disponível
    if (!publicKey || publicKey.trim() === '') {
      setError('Chave pública do Mercado Pago não configurada. Verifique a variável NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY no arquivo .env.local')
      return
    }

    let mounted = true

    const initializeSDK = async () => {
      try {
        // Inicializar Mercado Pago SDK
        // initMercadoPago inicializa o SDK globalmente
        initMercadoPago(publicKey, { locale: 'pt-BR' })
        
        // Aguardar um pouco para garantir que o SDK foi inicializado
        await new Promise(resolve => setTimeout(resolve, 300))
        
        if (mounted) {
          setIsReady(true)
          if (onReady) {
            onReady()
          }
        }
      } catch (err) {
        console.error('Erro ao inicializar Mercado Pago:', err)
        if (mounted) {
          setError('Erro ao inicializar checkout do Mercado Pago')
        }
      }
    }

    initializeSDK()

    // Gerar nova chave quando o preferenceId mudar para forçar novo brick
    setBrickKey(`payment-brick-${brickInstanceCounter}-${Date.now()}`)

    return () => {
      mounted = false
    }
  }, [publicKey, onReady, preferenceId])

  const onSubmit = async (param: any) => {
    try {
      const { formData } = param
      if (!formData) {
        throw new Error('Dados do formulário de pagamento não recebidos')
      }

      // Processar pagamento no servidor
      const response = await fetch('/api/payment/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          formData,
          preferenceId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorInfo: PaymentErrorInfo = {
          message: data.error || data.message || 'Erro ao processar pagamento',
          status: data.status,
          statusDetail: data.statusDetail,
          paymentId: data.paymentId,
        }
        throw errorInfo
      }

      // Verificar se o pagamento foi realmente aprovado
      if (data.success && data.status === 'approved') {
        // Chamar callback de sucesso apenas se aprovado
        onPaymentSuccess(data.paymentId, data.status)
      } else {
        // Pagamento não aprovado - tratar como erro
        const errorInfo: PaymentErrorInfo = {
          message: data.message || 'Pagamento não aprovado.',
          status: data.status,
          statusDetail: data.statusDetail,
          paymentId: data.paymentId,
        }
        throw errorInfo
      }
    } catch (err: any) {
      console.error('Erro ao processar pagamento:', err)
      const paymentError: PaymentErrorInfo = {
        message: err?.message || err?.error || 'Erro ao processar pagamento',
        status: err?.status,
        statusDetail: err?.statusDetail,
        paymentId: err?.paymentId,
      }
      setError(paymentError.message)
      onPaymentError(paymentError)
    }
  }

  const onError = (error: any) => {
    console.error('Erro no Brick:', error)
    setError('Erro no checkout')
    onPaymentError(error)
  }

  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 p-4 text-destructive">
        {error}
      </div>
    )
  }

  if (!publicKey || !isReady) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Carregando checkout...</span>
      </div>
    )
  }

  return (
    <div className="w-full">
      <Payment
        key={brickKey}
        initialization={{
          amount,
        }}
        onSubmit={onSubmit}
        onError={onError}
        customization={{
          paymentMethods: {
            creditCard: 'all',
            debitCard: 'all',
            ticket: 'all',
            bankTransfer: ['pix'],
          },
          visual: {
            style: {
              theme: 'dark' as const,
            },
          },
        }}
        locale="pt-BR"
      />
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export type PixQrData = {
  paymentId: string
  qrCode?: string | null
  qrCodeBase64?: string | null
  ticketUrl?: string | null
}

interface PixPaymentQrProps {
  data: PixQrData
  onBackToMethods?: () => void
  onConfirmed?: (paymentId: string) => void
}

export function PixPaymentQr({ data, onBackToMethods, onConfirmed }: PixPaymentQrProps) {
  const qrImageSrc = useMemo(() => {
    if (!data.qrCodeBase64) return null
    // MP costuma devolver PNG em base64 (sem prefixo data:)
    return `data:image/png;base64,${data.qrCodeBase64}`
  }, [data.qrCodeBase64])

  const [checking, setChecking] = useState(false)
  const [lastStatus, setLastStatus] = useState<string | null>(null)

  const canCopy = Boolean(data.qrCode && data.qrCode.trim().length > 0)

  const handleCopy = async () => {
    if (!data.qrCode) return
    try {
      await navigator.clipboard.writeText(data.qrCode)
      toast.success('Código PIX copiado!', { duration: 2500 })
    } catch (e) {
      console.error('Erro ao copiar código PIX:', e)
      toast.error('Não foi possível copiar. Copie manualmente.', { duration: 3500 })
    }
  }

  const checkStatus = async () => {
    setChecking(true)
    try {
      const res = await fetch(`/api/payment/status?payment_id=${encodeURIComponent(data.paymentId)}`, {
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json?.error || 'Erro ao verificar pagamento')
      }

      const status = json?.status as string | undefined
      setLastStatus(status || null)

      if (status === 'approved') {
        toast.success('Pagamento confirmado! Liberando acesso...', { duration: 3000 })
        onConfirmed?.(data.paymentId)
      }
    } catch (e: any) {
      console.error('Erro ao verificar status do PIX:', e)
      toast.error(e?.message || 'Não foi possível verificar o pagamento', { duration: 3500 })
    } finally {
      setChecking(false)
    }
  }

  // Polling leve: ajuda quando o webhook demora ou falha
  useEffect(() => {
    let interval: any
    // checa rápido nos primeiros segundos e depois a cada 5s
    checkStatus()
    interval = setInterval(() => {
      checkStatus()
    }, 5000)

    return () => {
      if (interval) clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.paymentId])

  return (
    <Card className="border-2">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Pague com PIX</CardTitle>
        <CardDescription>
          Escaneie o QR Code no app do seu banco ou copie o código “PIX copia e cola”.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {qrImageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrImageSrc}
            alt="QR Code PIX"
            className="mx-auto w-64 max-w-full rounded-md border bg-white p-2"
          />
        ) : (
          <div className="rounded-md border p-4 text-center text-sm text-muted-foreground">
            Não foi possível carregar a imagem do QR Code. Use o “copia e cola” abaixo (ou o link do ticket, se disponível).
          </div>
        )}

        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              readOnly
              value={data.qrCode || ''}
              placeholder="Código PIX (copia e cola)"
              className="font-mono text-xs"
            />
            <Button onClick={handleCopy} disabled={!canCopy} className="cursor-pointer">
              Copiar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Após o pagamento, a confirmação pode levar alguns instantes.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Status atual: <span className="font-medium">{lastStatus || 'aguardando'}</span>
            </p>
            <Button
              variant="secondary"
              onClick={checkStatus}
              disabled={checking}
              className="cursor-pointer"
            >
              {checking ? 'Verificando...' : 'Já paguei (verificar)'}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          {onBackToMethods ? (
            <Button variant="outline" onClick={onBackToMethods} className="cursor-pointer">
              Voltar e escolher outro método
            </Button>
          ) : (
            <span />
          )}

          {data.ticketUrl ? (
            <Button asChild variant="secondary" className="cursor-pointer">
              <a href={data.ticketUrl} target="_blank" rel="noreferrer">
                Abrir ticket do Mercado Pago
              </a>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}


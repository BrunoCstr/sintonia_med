/**
 * Componente para exibir após envio de e-mail de verificação
 * Melhora a experiência do usuário durante a espera
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Mail, Clock, AlertTriangle, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface EmailSentNoticeProps {
  email: string
  onResend?: () => Promise<void>
}

export function EmailSentNotice({ email, onResend }: EmailSentNoticeProps) {
  const [isResending, setIsResending] = useState(false)

  const handleResend = async () => {
    if (!onResend) return

    setIsResending(true)
    try {
      await onResend()
      toast.success('E-mail reenviado com sucesso! Verifique sua caixa de entrada.')
    } catch (error) {
      toast.error('Erro ao reenviar e-mail. Tente novamente em alguns minutos.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">E-mail Enviado com Sucesso!</CardTitle>
          <CardDescription className="text-base">
            Enviamos um link de verificação para:
            <br />
            <span className="font-semibold text-foreground">{email}</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Instruções principais */}
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertTitle>Verifique sua caixa de entrada</AlertTitle>
            <AlertDescription>
              Clique no link no e-mail para ativar sua conta e começar a usar o SintoniaMed.
            </AlertDescription>
          </Alert>

          {/* Aviso de tempo */}
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertTitle>O e-mail pode levar alguns minutos</AlertTitle>
            <AlertDescription>
              Normalmente o e-mail chega em 1-3 minutos, mas pode demorar até 5 minutos
              dependendo do seu provedor de e-mail.
            </AlertDescription>
          </Alert>

          {/* Checklist de verificação */}
          <div className="rounded-lg border p-4 space-y-3">
            <h4 className="font-semibold text-sm">📋 Não recebeu o e-mail? Verifique:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="font-bold text-foreground mt-0.5">1.</span>
                <span>
                  <strong className="text-foreground">Pasta de SPAM/Lixo Eletrônico</strong> - 
                  O e-mail pode ter sido filtrado. Procure por "SintoniaMed".
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-foreground mt-0.5">2.</span>
                <span>
                  <strong className="text-foreground">E-mail correto</strong> - 
                  Verifique se o endereço {email} está correto.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-foreground mt-0.5">3.</span>
                <span>
                  <strong className="text-foreground">Aguarde 5 minutos</strong> - 
                  Alguns provedores podem demorar um pouco mais.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-foreground mt-0.5">4.</span>
                <span>
                  <strong className="text-foreground">Filtros de e-mail</strong> - 
                  Verifique se não há regras bloqueando e-mails do SintoniaMed.
                </span>
              </li>
            </ul>
          </div>

          {/* Dica Pro */}
          <Alert variant="default" className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-900 dark:text-blue-100">💡 Dica</AlertTitle>
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              Para evitar que e-mails futuros caiam em spam, adicione nosso endereço aos seus contatos
              e marque o e-mail como "Não é spam" se encontrar na pasta de lixo eletrônico.
            </AlertDescription>
          </Alert>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          {/* Botão de reenviar */}
          {onResend && (
            <Button
              onClick={handleResend}
              disabled={isResending}
              variant="outline"
              className="w-full"
            >
              {isResending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Reenviando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reenviar E-mail de Verificação
                </>
              )}
            </Button>
          )}

          <p className="text-xs text-center text-muted-foreground">
            Ainda com problemas? Entre em contato com nosso suporte.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

/**
 * EXEMPLO DE USO:
 * 
 * // Na página de registro após criar conta:
 * 
 * import { EmailSentNotice } from '@/components/email-sent-notice'
 * 
 * export default function RegisterSuccessPage() {
 *   const { email } = useSearchParams() // ou state
 * 
 *   const handleResend = async () => {
 *     const response = await fetch('/api/auth/resend-verification', {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify({ email }),
 *     })
 * 
 *     if (!response.ok) {
 *       throw new Error('Falha ao reenviar e-mail')
 *     }
 *   }
 * 
 *   return <EmailSentNotice email={email} onResend={handleResend} />
 * }
 */



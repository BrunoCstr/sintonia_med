'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useAuth } from '@/lib/auth-context'
import { Shield, ShieldCheck, ShieldOff, Copy, Check, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface TwoFactorStatus {
  enabled: boolean
  secret: string | null
  hasSecret: boolean
}

export function TwoFactorSettings() {
  const { user } = useAuth()
  const [status, setStatus] = useState<TwoFactorStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [enabling, setEnabling] = useState(false)
  const [disabling, setDisabling] = useState(false)
  
  // Estados para o dialog de configuração
  const [showSetupDialog, setShowSetupDialog] = useState(false)
  const [showDisableDialog, setShowDisableDialog] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchStatus()
    }
  }, [user])

  const fetchStatus = async () => {
    if (!user) return

    try {
      setLoading(true)
      const response = await fetch(`/api/admin/two-factor?requesterUid=${user.uid}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Erro ao buscar status do 2FA')
      }

      const data = await response.json()
      setStatus(data)
    } catch (error: any) {
      console.error('Erro ao buscar status:', error)
      toast.error('Erro ao carregar status do 2FA')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateSecret = async () => {
    if (!user) return

    try {
      setGenerating(true)
      const response = await fetch('/api/admin/two-factor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requesterUid: user.uid,
          action: 'generate',
        }),
        credentials: 'include',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao gerar secret')
      }

      const data = await response.json()
      setSecret(data.secret)
      setQrCodeUrl(data.otpAuthUrl)
      setShowSetupDialog(true)
      toast.success('Secret gerado com sucesso!')
    } catch (error: any) {
      console.error('Erro ao gerar secret:', error)
      toast.error(error.message || 'Erro ao gerar secret')
    } finally {
      setGenerating(false)
    }
  }

  const handleEnable = async () => {
    if (!user || !secret || !verificationCode) {
      toast.error('Preencha o código de verificação')
      return
    }

    try {
      setEnabling(true)
      const response = await fetch('/api/admin/two-factor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requesterUid: user.uid,
          action: 'enable',
          code: verificationCode,
          secret: secret,
        }),
        credentials: 'include',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao ativar 2FA')
      }

      const data = await response.json()
      setBackupCodes(data.backupCodes)
      setShowSetupDialog(false)
      setShowBackupCodes(true)
      setVerificationCode('')
      await fetchStatus()
      toast.success('2FA ativado com sucesso!')
    } catch (error: any) {
      console.error('Erro ao ativar 2FA:', error)
      const errorMessage = error.message || 'Erro ao ativar 2FA'
      
      // Se for erro de código inválido, dar dicas úteis
      if (errorMessage.includes('Código inválido')) {
        toast.error(errorMessage, {
          description: 'Dica: Certifique-se de usar o código mais recente do seu aplicativo autenticador. Os códigos expiram a cada 30 segundos.',
          duration: 6000,
        })
      } else {
        toast.error(errorMessage)
      }
    } finally {
      setEnabling(false)
    }
  }

  const handleDisable = async () => {
    if (!user) return

    try {
      setDisabling(true)
      const response = await fetch('/api/admin/two-factor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requesterUid: user.uid,
          action: 'disable',
        }),
        credentials: 'include',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao desativar 2FA')
      }

      setShowDisableDialog(false)
      await fetchStatus()
      toast.success('2FA desativado com sucesso')
    } catch (error: any) {
      console.error('Erro ao desativar 2FA:', error)
      toast.error(error.message || 'Erro ao desativar 2FA')
    } finally {
      setDisabling(false)
    }
  }

  const copyToClipboard = (text: string, codeId: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCode(codeId)
    toast.success('Código copiado!')
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const generateQRCode = (otpAuthUrl: string) => {
    // Usar um serviço de QR Code online
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpAuthUrl)}`
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Autenticação de Dois Fatores
          </CardTitle>
          <CardDescription>
            Proteja sua conta com autenticação de dois fatores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Autenticação de Dois Fatores
          </CardTitle>
          <CardDescription>
            Proteja sua conta administrativa com autenticação de dois fatores
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="2fa-toggle" className="text-base">
                Status do 2FA
              </Label>
              <p className="text-sm text-muted-foreground">
                {status?.enabled
                  ? 'Autenticação de dois fatores está ativa'
                  : 'Autenticação de dois fatores está desativada'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {status?.enabled ? (
                <ShieldCheck className="h-5 w-5 text-green-500" />
              ) : (
                <ShieldOff className="h-5 w-5 text-muted-foreground" />
              )}
              <Switch
                id="2fa-toggle"
                checked={status?.enabled || false}
                onCheckedChange={(checked) => {
                  if (checked && !status?.enabled) {
                    // Se não tem secret, gerar um novo
                    if (!status?.hasSecret) {
                      handleGenerateSecret()
                    } else {
                      // Se já tem secret mas não está ativado, mostrar dialog para reativar
                      // Por enquanto, vamos gerar um novo secret se não estiver ativado
                      handleGenerateSecret()
                    }
                  } else if (!checked && status?.enabled) {
                    setShowDisableDialog(true)
                  }
                }}
                disabled={generating || enabling || disabling}
              />
            </div>
          </div>

          {!status?.enabled && (
            <div className="rounded-lg border border-dashed p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">2FA não está ativado</p>
                  <p className="text-sm text-muted-foreground">
                    Ative a autenticação de dois fatores para proteger sua conta administrativa.
                    Você precisará de um aplicativo autenticador como Google Authenticator ou Authy.
                  </p>
                </div>
              </div>
            </div>
          )}

          {status?.enabled && (
            <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    2FA está ativo
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Sua conta está protegida com autenticação de dois fatores.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de configuração inicial */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Configurar Autenticação de Dois Fatores</DialogTitle>
            <DialogDescription>
              Escaneie o QR Code com seu aplicativo autenticador e insira o código gerado para ativar o 2FA.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {qrCodeUrl && (
              <div className="flex flex-col items-center gap-4">
                <div className="border rounded-lg p-4 bg-white">
                  <img
                    src={generateQRCode(qrCodeUrl)}
                    alt="QR Code para 2FA"
                    className="w-48 h-48"
                  />
                </div>
                {secret && (
                  <div className="w-full space-y-2">
                    <Label>Ou insira manualmente este código:</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={secret}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(secret, 'secret')}
                      >
                        {copiedCode === 'secret' ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
                <div className="w-full space-y-2">
                  <Label htmlFor="verification-code">Código de Verificação</Label>
                  <Input
                    id="verification-code"
                    value={verificationCode}
                    onChange={(e) => {
                      // Permitir apenas números e limitar a 6 dígitos
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                      setVerificationCode(value)
                    }}
                    placeholder="000000"
                    maxLength={6}
                    className="text-center text-2xl tracking-widest font-mono"
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                  <p className="text-xs text-muted-foreground">
                    Insira o código de 6 dígitos do seu aplicativo autenticador
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSetupDialog(false)
                setVerificationCode('')
                setSecret(null)
                setQrCodeUrl(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEnable}
              disabled={!verificationCode || verificationCode.length !== 6 || enabling}
            >
              {enabling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Ativando...
                </>
              ) : (
                'Ativar 2FA'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de códigos de backup */}
      <Dialog open={showBackupCodes} onOpenChange={setShowBackupCodes}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Códigos de Backup</DialogTitle>
            <DialogDescription>
              Guarde estes códigos em um local seguro. Eles podem ser usados para acessar sua conta caso você perca acesso ao seu aplicativo autenticador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border p-4 bg-muted/50">
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded bg-background border"
                  >
                    <code className="text-sm font-mono">{code}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(code, `backup-${index}`)}
                    >
                      {copiedCode === `backup-${index}` ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900 p-3">
              <p className="text-sm text-yellow-900 dark:text-yellow-100">
                <strong>Importante:</strong> Estes códigos só serão mostrados uma vez. Certifique-se de salvá-los em um local seguro.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowBackupCodes(false)}>
              Entendi, salvei os códigos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação para desativar */}
      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar Autenticação de Dois Fatores?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desativar a autenticação de dois fatores? Isso tornará sua conta menos segura.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisable}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {disabling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Desativando...
                </>
              ) : (
                'Desativar 2FA'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}


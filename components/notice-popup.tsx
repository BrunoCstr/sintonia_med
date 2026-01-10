'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Bell } from 'lucide-react'

interface Notice {
  id: string
  titulo: string
  mensagem: string
  createdAt: string
  lastActivatedAt?: string
}

export function NoticePopup() {
  const [notice, setNotice] = useState<Notice | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dontShowAgain, setDontShowAgain] = useState(false)

  useEffect(() => {
    fetchActiveNotice()
  }, [])

  const fetchActiveNotice = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/notices/active', {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Erro ao buscar aviso ativo')
      }

      const data = await response.json()
      
      if (data.success && data.notice) {
        const activeNotice = data.notice
        
        // Criar chave única baseada no ID + timestamp de ativação
        // Isso garante que quando um aviso é reativado, ele seja tratado como novo
        const noticeKey = `${activeNotice.id}_${activeNotice.lastActivatedAt || activeNotice.createdAt}`
        
        // Verificar se o usuário marcou para não ver este aviso permanentemente
        const permanentHidden = getPermanentHiddenNotices()
        if (permanentHidden[noticeKey]) {
          return // Não mostrar se foi marcado como permanentemente oculto
        }
        
        // Verificar se o usuário já viu esta versão do aviso nesta sessão
        const sessionNotices = getSessionNotices()
        
        if (!sessionNotices[noticeKey]) {
          setNotice({ ...activeNotice, id: noticeKey })
          setOpen(true)
        }
      }
    } catch (err: any) {
      console.error('Erro ao buscar aviso ativo:', err)
    } finally {
      setLoading(false)
    }
  }

  // SessionStorage - para controle de exibição nesta sessão
  const getSessionNotices = (): Record<string, boolean> => {
    try {
      const stored = sessionStorage.getItem('hiddenNotices')
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  }

  const setSessionNotices = (hiddenNotices: Record<string, boolean>) => {
    try {
      sessionStorage.setItem('hiddenNotices', JSON.stringify(hiddenNotices))
    } catch (err) {
      console.error('Erro ao salvar aviso da sessão:', err)
    }
  }

  // LocalStorage - para controle permanente (quando usuário marca para não ver mais)
  const getPermanentHiddenNotices = (): Record<string, boolean> => {
    try {
      const stored = localStorage.getItem('permanentHiddenNotices')
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  }

  const setPermanentHiddenNotices = (hiddenNotices: Record<string, boolean>) => {
    try {
      localStorage.setItem('permanentHiddenNotices', JSON.stringify(hiddenNotices))
    } catch (err) {
      console.error('Erro ao salvar aviso permanente:', err)
    }
  }

  const handleClose = () => {
    if (notice) {
      // Se marcou para não mostrar mais, salvar permanentemente
      if (dontShowAgain) {
        const permanentHidden = getPermanentHiddenNotices()
        permanentHidden[notice.id] = true
        setPermanentHiddenNotices(permanentHidden)
      }
      
      // Sempre marcar como visto nesta sessão
      const sessionNotices = getSessionNotices()
      sessionNotices[notice.id] = true
      setSessionNotices(sessionNotices)
    }
    setOpen(false)
  }

  if (loading || !notice) {
    return null
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              {notice.titulo}
            </DialogTitle>
          </DialogHeader>
          
        <div className="py-4">
          <div 
            className="notice-content text-foreground prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: notice.mensagem }}
          />
        </div>

          <DialogFooter className="flex-col gap-3 sm:flex-col">
            <div className="flex items-center gap-2 w-full">
              <Checkbox
                id="dont-show-again"
                checked={dontShowAgain}
                onCheckedChange={(checked) => setDontShowAgain(checked === true)}
              />
              <Label 
                htmlFor="dont-show-again" 
                className="text-sm font-normal cursor-pointer"
              >
                Não mostrar este aviso novamente
              </Label>
            </div>
            
            <Button onClick={handleClose} className="w-full cursor-pointer">
              Entendi
            </Button>
            
            <p className="text-xs text-muted-foreground text-center w-full">
              {dontShowAgain 
                ? 'Este aviso não será mais exibido para você' 
                : 'Este aviso não será exibido novamente nesta sessão'}
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .notice-content p {
          margin: 0.5rem 0;
        }
        .notice-content p:first-child {
          margin-top: 0;
        }
        .notice-content p:last-child {
          margin-bottom: 0;
        }
        .notice-content h1,
        .notice-content h2,
        .notice-content h3 {
          font-weight: bold;
          margin: 1rem 0 0.5rem 0;
        }
        .notice-content h1 {
          font-size: 1.5rem;
        }
        .notice-content h2 {
          font-size: 1.25rem;
        }
        .notice-content h3 {
          font-size: 1.125rem;
        }
        .notice-content ul,
        .notice-content ol {
          margin: 0.5rem 0;
          padding-left: 1.5rem;
        }
        .notice-content ul {
          list-style-type: disc;
        }
        .notice-content ol {
          list-style-type: decimal;
        }
        .notice-content img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 0.5rem 0;
        }
        .notice-content a {
          color: hsl(var(--primary));
          text-decoration: underline;
        }
        .notice-content a:hover {
          opacity: 0.8;
        }
        .notice-content strong {
          font-weight: bold;
        }
        .notice-content em {
          font-style: italic;
        }
        .notice-content u {
          text-decoration: underline;
        }
      `}</style>
    </>
  )
}


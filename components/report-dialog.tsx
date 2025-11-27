'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RichTextEditor } from '@/components/ui/rich-text-editor'

interface ReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  questionId?: string | null
  onSubmitSuccess?: () => void
}

export function ReportDialog({ open, onOpenChange, questionId, onSubmitSuccess }: ReportDialogProps) {
  const [reportTypes, setReportTypes] = useState<string[]>([])
  const [reportDescription, setReportDescription] = useState('')
  const [reportFile, setReportFile] = useState<File | null>(null)
  const [reportFilePreview, setReportFilePreview] = useState<string | null>(null)
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem válida')
      return
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB')
      return
    }

    setReportFile(file)

    // Criar preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setReportFilePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const removeFile = () => {
    setReportFile(null)
    setReportFilePreview(null)
  }

  const handleClose = () => {
    // Limpar formulário ao fechar
    setReportTypes([])
    setReportDescription('')
    setReportFile(null)
    setReportFilePreview(null)
    onOpenChange(false)
  }

  const submitReport = async () => {
    // Para bugs gerais (sem questionId), não exigir tipos
    const needsTypes = questionId !== null && questionId !== undefined
    if (needsTypes && reportTypes.length === 0) {
      alert('Por favor, selecione pelo menos um tipo de problema')
      return
    }

    if (!reportDescription.trim()) {
      alert('Por favor, preencha a descrição do problema')
      return
    }

    setIsSubmittingReport(true)

    try {
      const formData = new FormData()
      if (questionId) {
        formData.append('questionId', questionId)
      }
      formData.append('texto', reportDescription)
      if (reportTypes.length > 0) {
        formData.append('tipos', JSON.stringify(reportTypes))
      }

      if (reportFile) {
        formData.append('file', reportFile)
      }

      const response = await fetch('/api/reports', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao enviar relatório')
      }

      const data = await response.json()
      console.log('Report enviado com sucesso:', data)

      // Limpar formulário
      setReportTypes([])
      setReportDescription('')
      setReportFile(null)
      setReportFilePreview(null)
      handleClose()

      alert('Relatório enviado com sucesso! Agradecemos sua contribuição.')
      
      if (onSubmitSuccess) {
        onSubmitSuccess()
      }
    } catch (error: any) {
      console.error('Erro ao enviar report:', error)
      alert(error.message || 'Erro ao enviar relatório. Tente novamente.')
    } finally {
      setIsSubmittingReport(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {questionId ? 'Relatar Problema' : 'Reportar Bug'}
          </DialogTitle>
          <DialogDescription>
            {questionId
              ? 'Encontrou algum erro nesta questão? Nos ajude a melhorar!'
              : 'Encontrou algum bug ou problema na aplicação? Nos ajude a melhorar!'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {questionId && (
            <div className="space-y-3">
              <Label>Tipo de problema</Label>
              {[
                'Duas alternativas corretas',
                'Gabarito trocado',
                'Sem coerência resposta-texto',
                'Outro',
              ].map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={type}
                    checked={reportTypes.includes(type)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setReportTypes((prev) => [...prev, type])
                      } else {
                        setReportTypes((prev) => prev.filter((t) => t !== type))
                      }
                    }}
                  />
                  <label htmlFor={type} className="text-sm leading-none cursor-pointer">
                    {type}
                  </label>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">
              {questionId ? 'Descrição do problema' : 'Descrição do bug'}
            </Label>
            <RichTextEditor
              value={reportDescription}
              onChange={setReportDescription}
              placeholder={questionId ? 'Descreva o problema encontrado...' : 'Descreva o bug encontrado...'}
              className="min-h-[200px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">Anexar imagem (opcional)</Label>
            <div className="space-y-2">
              {reportFilePreview ? (
                <div className="relative rounded-lg border p-2">
                  <img
                    src={reportFilePreview}
                    alt="Preview"
                    className="max-h-32 w-full object-contain"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                    className="absolute right-2 top-2 cursor-pointer"
                  >
                    Remover
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    id="file"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="cursor-pointer"
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Formatos aceitos: JPG, PNG, GIF (máximo 5MB)
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="cursor-pointer">
            Cancelar
          </Button>
          <Button
            className="cursor-pointer"
            onClick={submitReport}
            disabled={
              (questionId !== null && questionId !== undefined && reportTypes.length === 0) ||
              !reportDescription.trim() ||
              isSubmittingReport
            }
          >
            {isSubmittingReport ? 'Enviando...' : 'Enviar Relatório'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


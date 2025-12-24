'use client'

import { useState, useCallback, useEffect } from 'react'
import Cropper from 'react-easy-crop'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { RotateCw, ZoomIn, ZoomOut, Move, Crop, Check, X, Maximize2 } from 'lucide-react'
import Image from 'next/image'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { getCroppedImg, getRotatedImage, resizeImageToDimensions, type CropArea } from '@/lib/image-utils'

interface ImageEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageSrc: string | null
  onSave: (editedImageFile: File) => void
  aspectRatio?: number
}

export function ImageEditorDialog({
  open,
  onOpenChange,
  imageSrc,
  onSave,
  aspectRatio,
}: ImageEditorDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewMode, setPreviewMode] = useState<'editor' | 'preview'>('editor')
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [previewDimensions, setPreviewDimensions] = useState<{ width: number; height: number } | null>(null)
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)
  const [targetWidth, setTargetWidth] = useState<number>(0)
  const [targetHeight, setTargetHeight] = useState<number>(0)
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true)
  const [resizedImageSrc, setResizedImageSrc] = useState<string | null>(null)

  const generatePreview = useCallback(async () => {
    if (!imageSrc) return
    
    try {
      // Usar imagem redimensionada se houver, senão usar a original
      let baseImage = resizedImageSrc || imageSrc
      
      // Primeiro aplicar rotação se necessário
      let imageToProcess = baseImage
      if (rotation !== 0) {
        imageToProcess = await getRotatedImage(baseImage, rotation)
      }
      
      // Se tiver crop, aplicar. Senão, usar a imagem processada inteira
      if (croppedAreaPixels) {
        const croppedImage = await getCroppedImg(
          imageToProcess,
          croppedAreaPixels,
          0
        )
        setPreviewImage(croppedImage)
      } else {
        // Sem crop, usar a imagem como está (redimensionada/rotacionada)
        setPreviewImage(imageToProcess)
      }
    } catch (error) {
      console.error('Erro ao gerar preview:', error)
    }
  }, [imageSrc, resizedImageSrc, croppedAreaPixels, rotation])

  // Calcular dimensões do preview quando a imagem mudar
  useEffect(() => {
    if (previewImage) {
      const img = new window.Image()
      img.onload = () => {
        setPreviewDimensions({ width: img.width, height: img.height })
      }
      img.src = previewImage
    }
  }, [previewImage])

  const onCropComplete = useCallback(
    (croppedArea: CropArea, croppedAreaPixels: CropArea) => {
      setCroppedAreaPixels(croppedAreaPixels)
    },
    []
  )

  // Atualizar preview quando mudar para modo preview
  useEffect(() => {
    if (previewMode === 'preview') {
      generatePreview()
    }
  }, [previewMode, generatePreview])

  // Carregar dimensões da imagem quando ela mudar
  useEffect(() => {
    if (imageSrc) {
      const img = new window.Image()
      img.onload = () => {
        setImageDimensions({ width: img.width, height: img.height })
        setTargetWidth(img.width)
        setTargetHeight(img.height)
        setResizedImageSrc(null)
      }
      img.src = imageSrc
      
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setRotation(0)
      setPreviewImage(null)
      setPreviewMode('editor')
    }
  }, [imageSrc])

  // Removido o useEffect de manter proporção - agora é feito diretamente nos inputs

  // Aplicar redimensionamento quando largura ou altura mudarem (com debounce)
  useEffect(() => {
    if (!imageSrc || !imageDimensions || targetWidth <= 0 || targetHeight <= 0) return

    const hasChanged = targetWidth !== imageDimensions.width || targetHeight !== imageDimensions.height
    if (!hasChanged) {
      setResizedImageSrc(null)
      return
    }

    // Debounce para evitar muitas chamadas
    const timeoutId = setTimeout(() => {
      resizeImageToDimensions(imageSrc, targetWidth, targetHeight)
        .then((resized) => {
          setResizedImageSrc(resized)
          // Resetar crop quando redimensionar para evitar problemas de coordenadas
          setCrop({ x: 0, y: 0 })
          setCroppedAreaPixels(null)
        })
        .catch((error) => {
          console.error('Erro ao redimensionar imagem:', error)
        })
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [targetWidth, targetHeight, imageSrc, imageDimensions])

  const handleSave = useCallback(async () => {
    if (!imageSrc) return

    setIsProcessing(true)
    try {
      // Usar imagem redimensionada se houver, senão usar a original
      let baseImage = resizedImageSrc || imageSrc
      
      // Primeiro aplicar rotação se necessário
      let processedImage = baseImage
      if (rotation !== 0) {
        processedImage = await getRotatedImage(baseImage, rotation)
      }

      // Aplicar crop se houver
      let finalImage = processedImage
      if (croppedAreaPixels) {
        finalImage = await getCroppedImg(
          processedImage,
          croppedAreaPixels,
          0
        )
      }

      // Converter para File
      const response = await fetch(finalImage)
      const blob = await response.blob()
      const file = new File([blob], 'edited-image.jpg', { type: 'image/jpeg' })

      onSave(file)
      onOpenChange(false)
    } catch (error) {
      console.error('Erro ao processar imagem:', error)
      alert('Erro ao processar imagem. Tente novamente.')
    } finally {
      setIsProcessing(false)
    }
  }, [imageSrc, resizedImageSrc, croppedAreaPixels, rotation, onSave, onOpenChange])

  const handleReset = () => {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
    setPreviewImage(null)
    setPreviewDimensions(null)
    if (imageDimensions) {
      setTargetWidth(imageDimensions.width)
      setTargetHeight(imageDimensions.height)
    }
    setResizedImageSrc(null)
  }

  if (!imageSrc) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Imagem</DialogTitle>
          <DialogDescription>
            Corte, redimensione e rotacione a imagem. Use a pré-visualização para ver como ela aparecerá no enunciado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tabs para alternar entre editor e preview */}
          <div className="flex gap-2 border-b">
            <button
              onClick={() => setPreviewMode('editor')}
              className={`px-4 py-2 font-medium transition-colors ${
                previewMode === 'editor'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Editor
            </button>
            <button
              onClick={() => {
                setPreviewMode('preview')
                generatePreview()
              }}
              className={`px-4 py-2 font-medium transition-colors ${
                previewMode === 'preview'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Pré-visualização do Enunciado
            </button>
          </div>

          {previewMode === 'editor' ? (
            <>
              {/* Editor de Imagem */}
              <div className="relative w-full h-[400px] bg-black rounded-lg overflow-hidden">
                <Cropper
                  image={resizedImageSrc || imageSrc}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={aspectRatio}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onRotationChange={setRotation}
                  onCropComplete={onCropComplete}
                  cropShape="rect"
                  showGrid={true}
                />
              </div>

              {/* Controles */}
              <div className="space-y-4">
                {/* Zoom */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ZoomIn className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Zoom</span>
                    <span className="text-sm text-muted-foreground ml-auto">
                      {Math.round(zoom * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[zoom]}
                    onValueChange={(value) => setZoom(value[0])}
                    min={1}
                    max={3}
                    step={0.1}
                  />
                </div>

                {/* Rotação */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <RotateCw className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Rotação</span>
                    <span className="text-sm text-muted-foreground ml-auto">
                      {rotation}°
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Slider
                      value={[rotation]}
                      onValueChange={(value) => setRotation(value[0])}
                      min={0}
                      max={360}
                      step={1}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setRotation((prev) => (prev + 90) % 360)}
                      className="h-8 w-8 p-0"
                      title="Rotacionar 90°"
                    >
                      <RotateCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Dimensões */}
                {imageDimensions && (
                  <div className="space-y-3 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Maximize2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Dimensões</span>
                        {resizedImageSrc && (
                          <span className="text-xs text-primary">(Redimensionada)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="maintain-ratio" className="text-xs text-muted-foreground cursor-pointer">
                          Manter proporção
                        </Label>
                        <Switch
                          id="maintain-ratio"
                          checked={maintainAspectRatio}
                          onCheckedChange={setMaintainAspectRatio}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="width" className="text-xs">Largura (px)</Label>
                        <Input
                          id="width"
                          type="number"
                          value={targetWidth}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0
                            if (value > 0) {
                              setTargetWidth(value)
                              // Se manter proporção estiver ativo, atualizar altura automaticamente
                              if (maintainAspectRatio && imageDimensions) {
                                const ratio = imageDimensions.height / imageDimensions.width
                                setTargetHeight(Math.round(value * ratio))
                              }
                            }
                          }}
                          min={1}
                          className="h-9"
                        />
                        {imageDimensions && (
                          <p className="text-xs text-muted-foreground">
                            Original: {imageDimensions.width}px
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="height" className="text-xs">Altura (px)</Label>
                        <Input
                          id="height"
                          type="number"
                          value={targetHeight}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0
                            if (value > 0) {
                              setTargetHeight(value)
                              // Se manter proporção estiver ativo, atualizar largura automaticamente
                              if (maintainAspectRatio && imageDimensions) {
                                const ratio = imageDimensions.width / imageDimensions.height
                                setTargetWidth(Math.round(value * ratio))
                              }
                            }
                          }}
                          min={1}
                          className="h-9"
                        />
                        {imageDimensions && (
                          <p className="text-xs text-muted-foreground">
                            Original: {imageDimensions.height}px
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Botão Reset */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  className="w-full"
                >
                  <X className="mr-2 h-4 w-4" />
                  Redefinir
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Pré-visualização do Enunciado */}
              <div className="space-y-4">
                {/* Informações da imagem */}
                {previewDimensions && (
                  <div className="flex items-center gap-4 p-3 bg-primary/10 rounded-lg">
                    <Maximize2 className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        Dimensões finais: {previewDimensions.width} × {previewDimensions.height} pixels
                      </p>
                      {imageDimensions && (
                        <p className="text-xs text-muted-foreground">
                          Original: {imageDimensions.width} × {imageDimensions.height} pixels
                          {(previewDimensions.width !== imageDimensions.width || previewDimensions.height !== imageDimensions.height) && (
                            <span className="ml-2 text-primary font-medium">
                              ({previewDimensions.width > imageDimensions.width ? '↑' : '↓'} 
                              {Math.abs(Math.round((previewDimensions.width / imageDimensions.width - 1) * 100))}% largura, 
                              {previewDimensions.height > imageDimensions.height ? '↑' : '↓'} 
                              {Math.abs(Math.round((previewDimensions.height / imageDimensions.height - 1) * 100))}% altura)
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="rounded-lg border bg-muted/50 p-4">
                  <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
                    Pré-visualização do Enunciado
                  </h3>
                  <div className="bg-background rounded-lg p-4 space-y-3">
                    <div className="prose prose-sm max-w-none text-sm leading-relaxed">
                      <p className="text-muted-foreground">
                        Este é um exemplo de como o enunciado aparecerá com a imagem abaixo.
                      </p>
                    </div>
                    {previewImage && (
                      <div className="overflow-auto max-h-[400px] rounded-lg border bg-white dark:bg-zinc-900">
                        <div className="p-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={previewImage}
                            alt="Preview"
                            className="max-w-full h-auto rounded"
                            style={{ 
                              maxWidth: '100%',
                              width: previewDimensions ? `${Math.min(previewDimensions.width, 800)}px` : 'auto'
                            }}
                          />
                        </div>
                      </div>
                    )}
                    {!previewImage && (
                      <div className="flex items-center justify-center h-32 rounded-lg border border-dashed text-muted-foreground">
                        Gerando pré-visualização...
                      </div>
                    )}
                    <div className="prose prose-sm max-w-none text-sm leading-relaxed">
                      <p className="text-muted-foreground">
                        A imagem será exibida acima do texto do enunciado.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Visualização em tamanho real */}
                {previewDimensions && previewDimensions.width > 800 && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      ⚠️ A imagem é maior que 800px de largura. No enunciado, ela será ajustada para caber na tela.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Processando...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Salvar Imagem
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


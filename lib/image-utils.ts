/**
 * Utilitários para manipulação de imagens
 */

export interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Cria uma imagem rotacionada
 */
export async function getRotatedImage(
  imageSrc: string,
  rotation: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new window.Image()
    image.crossOrigin = 'anonymous'
    image.src = imageSrc
    image.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Não foi possível criar contexto do canvas'))
        return
      }

      // Ajustar tamanho do canvas para a rotação
      if (rotation === 90 || rotation === 270) {
        canvas.width = image.height
        canvas.height = image.width
      } else {
        canvas.width = image.width
        canvas.height = image.height
      }

      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.drawImage(image, -image.width / 2, -image.height / 2)

      resolve(canvas.toDataURL('image/jpeg'))
    }
    image.onerror = reject
  })
}

/**
 * Cria uma imagem cortada a partir da área especificada
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: CropArea,
  rotation = 0
): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new window.Image()
    image.crossOrigin = 'anonymous'
    image.src = imageSrc
    image.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Não foi possível criar contexto do canvas'))
        return
      }

      // Se a imagem já foi rotacionada, apenas fazer o crop
      // (a rotação já foi aplicada antes de chamar esta função)
      const cropX = pixelCrop.x
      const cropY = pixelCrop.y
      const cropWidth = pixelCrop.width
      const cropHeight = pixelCrop.height

      canvas.width = cropWidth
      canvas.height = cropHeight

      ctx.drawImage(
        image,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight
      )

      resolve(canvas.toDataURL('image/jpeg', 0.9))
    }
    image.onerror = reject
  })
}

/**
 * Redimensiona uma imagem para um tamanho máximo
 */
export async function resizeImage(
  file: File,
  maxWidth: number,
  maxHeight: number
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let width = img.width
        let height = img.height

        // Calcular novo tamanho mantendo proporção
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = width * ratio
          height = height * ratio
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Não foi possível criar contexto do canvas'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Erro ao criar blob'))
              return
            }
            const resizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            })
            resolve(resizedFile)
          },
          file.type,
          0.9
        )
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Redimensiona uma imagem para dimensões específicas (pode distorcer a imagem)
 */
export async function resizeImageToDimensions(
  imageSrc: string,
  width: number,
  height: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new window.Image()
    image.crossOrigin = 'anonymous'
    image.src = imageSrc
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Não foi possível criar contexto do canvas'))
        return
      }

      ctx.drawImage(image, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', 0.9))
    }
    image.onerror = reject
  })
}


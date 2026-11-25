function resize(source: CanvasImageSource, width: number, height: number, max: number, quality: number) {
  if (!width || !height) throw new Error('No se pudo leer la imagen.')
  const scale = Math.min(1, max / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('No se pudo procesar la imagen.')
  context.fillStyle = '#fff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', quality)
}

export function capture(video: HTMLVideoElement) {
  return resize(video, video.videoWidth, video.videoHeight, 1024, 0.8)
}

export function resizeImage(url: string, max = 1024, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      try {
        resolve(resize(image, image.naturalWidth, image.naturalHeight, max, quality))
      } catch (error) {
        reject(error)
      }
    }
    image.onerror = () => reject(new Error('No se pudo abrir la imagen. Prueba con otro archivo.'))
    image.src = url
  })
}

export async function readImage(file: File) {
  if (!file.type.startsWith('image/')) throw new Error('Selecciona un archivo de imagen.')
  const url = URL.createObjectURL(file)
  try {
    return await resizeImage(url)
  } finally {
    URL.revokeObjectURL(url)
  }
}

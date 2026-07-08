export function compressImageDataUrl(dataUrl: string, maxDimension = 480, quality = 0.72): Promise<string> {
  return new Promise(resolve => {
    if (typeof window === 'undefined') {
      resolve(dataUrl)
      return
    }

    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight))
      const width = Math.round(img.naturalWidth * scale)
      const height = Math.round(img.naturalHeight * scale)

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) {
        resolve(dataUrl)
        return
      }

      context.drawImage(img, 0, 0, width, height)
      try {
        resolve(canvas.toDataURL('image/jpeg', quality))
      } catch {
        resolve(dataUrl)
      }
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

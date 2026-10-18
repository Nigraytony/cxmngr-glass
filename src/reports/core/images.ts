// Image loading/conversion helpers for jsPDF reports. Lifted from the most
// complete of the previously copy-pasted versions (equipmentReport.ts).

export type ImageFormat = 'JPEG' | 'PNG' | 'WEBP' | 'GIF' | 'SVG'

export type LoadedImage = {
  dataUrl?: string
  format?: ImageFormat
  width?: number
  height?: number
}

export function mimeToFormat(mime?: string | null): ImageFormat | undefined {
  if (!mime) return undefined
  const m = mime.toLowerCase()
  if (m.includes('png')) return 'PNG'
  if (m.includes('jpeg') || m.includes('jpg')) return 'JPEG'
  if (m.includes('webp')) return 'WEBP'
  if (m.includes('gif')) return 'GIF'
  if (m.includes('svg')) return 'SVG'
  return undefined
}

export async function convertDataUrlToJpeg(dataUrl: string, quality = 0.92): Promise<string | null> {
  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('img load fail'))
      img.src = dataUrl
    })
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth || img.width
    canvas.height = img.naturalHeight || img.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0)
    return canvas.toDataURL('image/jpeg', quality)
  } catch (e) {
    return null
  }
}

export function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth || img.width || 0, height: img.naturalHeight || img.height || 0 })
    img.onerror = () => resolve({ width: 0, height: 0 })
    img.src = dataUrl
  })
}

/**
 * Load an image from a data URL or fetchable URL into a jsPDF-ready
 * { dataUrl, format, width, height }. WEBP/SVG (and unknown formats) are
 * converted to JPEG since jsPDF can't embed them. Never throws; returns {}
 * on failure so a missing image just doesn't render.
 */
export async function loadImage(src?: string): Promise<LoadedImage> {
  try {
    if (!src) return {}
    let dataUrl: string | undefined
    let format: ImageFormat | undefined

    if (src.startsWith('data:')) {
      const mime = src.slice(5, src.indexOf(';'))
      format = mimeToFormat(mime)
      if (format === 'WEBP' || (mime && mime.toLowerCase().includes('svg'))) {
        const conv = await convertDataUrlToJpeg(src)
        if (conv) {
          dataUrl = conv
          format = 'JPEG'
        }
      }
      if (!dataUrl) dataUrl = src
    } else {
      const res = await fetch(src)
      if (!res.ok) return {}
      const blob = await res.blob()
      const rawDataUrl: string = await new Promise(resolve => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.readAsDataURL(blob)
      })
      format = blob.type ? mimeToFormat(blob.type) : undefined
      if (!format || format === 'WEBP' || blob.type.toLowerCase().includes('svg')) {
        const conv = await convertDataUrlToJpeg(rawDataUrl)
        if (conv) {
          dataUrl = conv
          format = 'JPEG'
        } else {
          dataUrl = rawDataUrl
        }
      } else {
        dataUrl = rawDataUrl
      }
    }

    if (!dataUrl) return {}

    const dims = await getImageDimensions(dataUrl)
    return {
      dataUrl,
      format,
      width: dims.width || undefined,
      height: dims.height || undefined,
    }
  } catch (e) {
    return {}
  }
}

/** Try several sources in order; first one that loads wins. */
export async function loadFirstAvailable(srcs: string[]): Promise<LoadedImage> {
  for (const s of srcs) {
    const img = await loadImage(s)
    if (img?.dataUrl) return img
  }
  return {}
}

/** Scale an image to a target height preserving aspect ratio, capped at maxW. */
export function fitImageToHeight(img: LoadedImage, targetH: number, maxW?: number, fallbackW?: number) {
  const w = img?.width || 0
  const h = img?.height || 0
  if (w > 0 && h > 0) {
    const ratio = w / h
    let outH = targetH
    let outW = targetH * ratio
    if (maxW && outW > maxW) {
      outW = maxW
      outH = outW / ratio
    }
    return { w: outW, h: outH }
  }
  return { w: fallbackW || (maxW || targetH), h: targetH }
}

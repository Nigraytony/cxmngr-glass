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

/**
 * Load a PHOTO for report embedding: applies EXIF orientation (the browser
 * decodes it; jsPDF would otherwise embed the raw sideways bytes), downscales
 * to `maxEdge` on the long edge and re-encodes as JPEG. This is what keeps
 * phone photos upright and reports emailable (~20 MB -> ~2 MB). Use loadImage
 * for logos/graphics, which must keep transparency and exact pixels.
 */
export async function loadPhoto(src?: string, opts: { maxEdge?: number; quality?: number } = {}): Promise<LoadedImage> {
  const maxEdge = opts.maxEdge ?? 1600
  const quality = opts.quality ?? 0.8
  try {
    if (!src) return {}
    // Normalize to a data URL first (remote fetches avoid canvas CORS taint).
    let dataUrl = src
    if (!src.startsWith('data:')) {
      const res = await fetch(src)
      if (!res.ok) return {}
      const blob = await res.blob()
      dataUrl = await new Promise<string>(resolve => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.readAsDataURL(blob)
      })
    }
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('img load fail'))
      img.src = dataUrl
    })
    // naturalWidth/Height and drawImage honor EXIF orientation in Chromium.
    const w0 = img.naturalWidth || img.width
    const h0 = img.naturalHeight || img.height
    if (!w0 || !h0) return loadImage(src)
    const scale = Math.min(1, maxEdge / Math.max(w0, h0))
    const w = Math.max(1, Math.round(w0 * scale))
    const h = Math.max(1, Math.round(h0 * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return loadImage(src)
    ctx.fillStyle = '#ffffff' // JPEG has no alpha channel
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)
    return { dataUrl: canvas.toDataURL('image/jpeg', quality), format: 'JPEG', width: w, height: h }
  } catch (e) {
    return loadImage(src)
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

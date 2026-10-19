// One way to name and hand a finished report to the user.
import type { jsPDF } from 'jspdf'

/** Lowercase kebab slug for filenames ("AHU 1 / Lobby" -> "ahu-1-lobby"). */
export function slugify(name?: string): string {
  return String(name || '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

/** YYYY-MM-DD, the one date format report filenames use. */
export function dateStamp(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10)
}

/** Join slug parts + date stamp into "part-part-YYYY-MM-DD.ext" (empty parts dropped). */
export function reportFileName(parts: Array<string | undefined>, ext = 'pdf'): string {
  const slugs = parts.map(slugify).filter(Boolean)
  return `${[...slugs, dateStamp()].join('-')}.${ext}`
}

/**
 * Open the blank delivery tab. Must be called synchronously inside the user's
 * click (before any await) or popup blockers eat it; pass the result to
 * deliverPdf after the report is generated.
 */
export function openDeliveryWindow(): Window | null {
  try { return window.open('', '_blank') } catch (e) { return null }
}

function saveBlob(blob: Blob, fname: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fname
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** Show a finished PDF blob in the delivery tab, falling back to a direct save. */
export function deliverBlob(blob: Blob, fname: string, dlWin?: Window | null): void {
  try {
    if (dlWin) {
      const url = URL.createObjectURL(blob)
      try { dlWin.document.title = fname } catch (e) { /* ignore cross-window access errors */ }
      dlWin.location.href = url
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } else {
      saveBlob(blob, fname)
    }
  } catch (e) {
    saveBlob(blob, fname)
  }
}

/** Deliver a jsPDF doc. */
export function deliverPdf(doc: jsPDF, fname: string, dlWin?: Window | null): void {
  let blob: Blob
  try { blob = doc.output('blob') as Blob } catch (e) { doc.save(fname); return }
  deliverBlob(blob, fname, dlWin)
}

/** Deliver raw PDF bytes (e.g. after a pdf-lib merge). */
export function deliverPdfBytes(bytes: ArrayBuffer | Uint8Array, fname: string, dlWin?: Window | null): void {
  deliverBlob(new Blob([bytes as any], { type: 'application/pdf' }), fname, dlWin)
}

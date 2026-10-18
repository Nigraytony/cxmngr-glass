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

/** Show the finished PDF in the delivery tab, falling back to a direct save. */
export function deliverPdf(doc: jsPDF, fname: string, dlWin?: Window | null): void {
  try {
    if (dlWin) {
      const blob = doc.output('blob') as Blob
      const url = URL.createObjectURL(blob)
      try { dlWin.document.title = fname } catch (e) { /* ignore cross-window access errors */ }
      dlWin.location.href = url
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } else {
      doc.save(fname)
    }
  } catch (e) {
    doc.save(fname)
  }
}

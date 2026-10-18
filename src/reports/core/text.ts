// Text helpers for jsPDF reports. Lifted from the previously copy-pasted
// versions in equipmentReport / oprWorkshopReport / IssuePdfReport.
import type { jsPDF } from 'jspdf'

/** Strip HTML to plain text, collapsing whitespace. */
export function htmlToText(html: any): string {
  if (!html) return ''
  try {
    const tmp = document.createElement('div')
    tmp.innerHTML = String(html)
    const t = (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim()
    return t
  } catch (e) {
    return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  }
}

/** Replace smart quotes/dashes and collapse whitespace to avoid glyph/spacing issues in PDFs. */
export function normalizePdfText(v?: string): string {
  if (!v) return ''
  return String(v)
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function splitText(doc: jsPDF, text: string, maxWidth: number): string[] {
  try { return doc.splitTextToSize(text, maxWidth) as unknown as string[] } catch (e) { return [text] }
}

/** Some jsPDF builds default to a nonzero char space after font embedding; reset it. */
export function setZeroCharSpace(doc: jsPDF): void {
  try {
    const fn = (doc as any).setCharSpace
    if (typeof fn === 'function') fn.call(doc, 0)
  } catch (e) { /* ignore */ }
}

/** Locale date for display. Treats bare YYYY-MM-DD as a local date, not UTC midnight. */
export function formatDate(v?: string): string {
  const raw = String(v || '').trim()
  if (!raw) return ''
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return new Date(`${raw}T00:00:00`).toLocaleDateString()
    }
    return new Date(raw).toLocaleDateString()
  } catch (e) {
    return raw
  }
}

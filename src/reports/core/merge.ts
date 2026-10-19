// pdf-lib merging: append a record's PDF attachments to a generated report.
// Lifted from equipmentReport.ts; ActivityEdit's ~10 inline copies migrate
// here in Phase 2/3.

function isPdfAttachment(a: any): boolean {
  const type = String(a?.type || '').toLowerCase()
  const name = String(a?.filename || a?.url || '').toLowerCase()
  const ext = name.split('?')[0].split('#')[0].split('.').pop() || ''
  const dataIsPdf = typeof a?.data === 'string' && a.data.startsWith('data:application/pdf')
  return type.includes('pdf') || ext === 'pdf' || dataIsPdf
}

/** The attachment's PDF bytes: inline data URL or fetched (with credentials). */
async function attachmentPdfBytes(a: any): Promise<ArrayBuffer | null> {
  const dataStr = typeof a?.data === 'string' ? a.data : ''
  if (dataStr.startsWith('data:application/pdf')) {
    const base64 = dataStr.split(',')[1] || ''
    const bin = atob(base64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return bytes.buffer
  }
  const url = String(a?.url || '')
  if (!url) return null
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) return null
  return res.arrayBuffer()
}

/**
 * Insert each PDF attachment's pages into `baseBytes` AFTER 1-based page
 * `afterPage` (so the section order the user chose is honored). An
 * `afterPage` at or past the end appends. Non-PDF attachments are ignored;
 * fetch/parse failures skip that attachment. Returns the original bytes when
 * there is nothing to merge or merging fails entirely.
 */
export async function insertPdfAttachmentsAt(baseBytes: ArrayBuffer, attachments: any[], afterPage: number): Promise<ArrayBuffer> {
  try {
    const pdfAtts = (Array.isArray(attachments) ? attachments : []).filter(isPdfAttachment)
    if (!pdfAtts.length) return baseBytes
    const { PDFDocument } = await import('pdf-lib')
    const merged = await PDFDocument.load(baseBytes)
    let at = Math.min(Math.max(0, Math.floor(afterPage)), merged.getPageCount())
    for (const a of pdfAtts) {
      try {
        const buf = await attachmentPdfBytes(a)
        if (!buf) continue
        const attPdf = await PDFDocument.load(buf)
        const pages = await merged.copyPages(attPdf, attPdf.getPageIndices())
        for (const p of pages) {
          if (at >= merged.getPageCount()) merged.addPage(p)
          else merged.insertPage(at, p)
          at++
        }
      } catch (e) {
        /* skip unloadable attachment */
      }
    }
    const out = await merged.save()
    return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer
  } catch (e) {
    return baseBytes
  }
}

/** Append each PDF attachment's pages at the end of `baseBytes`. */
export async function appendPdfAttachments(baseBytes: ArrayBuffer, attachments: any[]): Promise<ArrayBuffer> {
  return insertPdfAttachmentsAt(baseBytes, attachments, Number.MAX_SAFE_INTEGER)
}

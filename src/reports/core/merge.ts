// pdf-lib merging: append a record's PDF attachments to a generated report.
// Lifted from equipmentReport.ts; ActivityEdit's ~10 inline copies migrate
// here in Phase 2/3.

function isPdfAttachment(a: any): boolean {
  const type = String(a?.type || '').toLowerCase()
  const name = String(a?.filename || a?.url || '').toLowerCase()
  const ext = name.split('?')[0].split('#')[0].split('.').pop() || ''
  return type.includes('pdf') || ext === 'pdf'
}

/**
 * Append each PDF attachment's pages to `baseBytes`. Non-PDF attachments are
 * ignored; fetch/parse failures skip that attachment. Returns the original
 * bytes when there is nothing to merge or merging fails entirely.
 */
export async function appendPdfAttachments(baseBytes: ArrayBuffer, attachments: any[]): Promise<ArrayBuffer> {
  try {
    const pdfAtts = (Array.isArray(attachments) ? attachments : []).filter(isPdfAttachment)
    if (!pdfAtts.length) return baseBytes
    const { PDFDocument } = await import('pdf-lib')
    const merged = await PDFDocument.load(baseBytes)
    for (const a of pdfAtts) {
      const url = String(a?.url || '')
      if (!url) continue
      try {
        const res = await fetch(url)
        if (!res.ok) continue
        const buf = await res.arrayBuffer()
        const attPdf = await PDFDocument.load(buf)
        const pages = await merged.copyPages(attPdf, attPdf.getPageIndices())
        pages.forEach((p: any) => merged.addPage(p))
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

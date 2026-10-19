// Shared report cover page (lifted from the OPR Workshop report, the best of
// the four previous cover implementations). Draws on the CURRENT page; the
// caller reserves/selects the page (doc.setPage) before calling.
import { fitImageToHeight, loadImage, type LoadedImage } from './images'
import { normalizePdfText, splitText } from './text'
import { SANS } from './tokens'

export interface CoverPageData {
  title: string
  subtitle?: string
  /** Small gray context line under the subtitle (e.g. "name • date • location"). */
  metaLine?: string
  byLine?: string
  /** Large centered cover image (jumbotron). */
  imageDataUrl?: string
  leftLogo?: LoadedImage
  rightLogo?: LoadedImage
}

export async function drawCoverPage(
  doc: any,
  frame: { margin: number; pageWidth: number; pageHeight: number },
  data: CoverPageData,
): Promise<void> {
  const { margin, pageWidth, pageHeight } = frame
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, pageWidth, pageHeight, 'F')

  // Logos (top row)
  const logoH = 14
  let logoRowH = 0
  try {
    if (data.leftLogo?.dataUrl) {
      const dim = fitImageToHeight(data.leftLogo, logoH, 45, 38)
      doc.addImage(data.leftLogo.dataUrl, data.leftLogo.format || 'PNG', margin, margin, dim.w, dim.h)
      logoRowH = Math.max(logoRowH, dim.h)
    }
  } catch (e) { /* ignore */ }
  try {
    if (data.rightLogo?.dataUrl) {
      const dim = fitImageToHeight(data.rightLogo, logoH, 45, 38)
      doc.addImage(data.rightLogo.dataUrl, data.rightLogo.format || 'PNG', pageWidth - margin - dim.w, margin, dim.w, dim.h)
      logoRowH = Math.max(logoRowH, dim.h)
    }
  } catch (e) { /* ignore */ }

  let cy = margin + (logoRowH || logoH) + 16
  doc.setFont(SANS, 'bold')
  doc.setFontSize(26)
  const title = normalizePdfText(data.title || 'Report')
  doc.text(splitText(doc, title, pageWidth - margin * 2), pageWidth / 2, cy, { align: 'center' })
  cy += 16

  doc.setFont(SANS, 'normal')
  doc.setFontSize(14)
  const subtitle = normalizePdfText(data.subtitle || '')
  if (subtitle) {
    doc.text(splitText(doc, subtitle, pageWidth - margin * 2), pageWidth / 2, cy, { align: 'center' })
    cy += 10
  }

  const meta = normalizePdfText(data.metaLine || '')
  if (meta) {
    doc.setFontSize(11)
    doc.setTextColor(80)
    doc.text(splitText(doc, meta, pageWidth - margin * 2), pageWidth / 2, cy, { align: 'center' })
    doc.setTextColor(0)
    cy += 12
  }

  // Cover image
  if (data.imageDataUrl) {
    const coverImg = await loadImage(data.imageDataUrl)
    if (coverImg?.dataUrl) {
      try {
        const maxW = pageWidth - margin * 2
        const maxH = 120
        const dim = fitImageToHeight(coverImg, maxH, maxW, maxW)
        const x = (pageWidth - dim.w) / 2
        const yImg = Math.min(pageHeight - 70 - dim.h, cy + 8)
        doc.addImage(coverImg.dataUrl, coverImg.format || 'PNG', x, yImg, dim.w, dim.h)
      } catch (e) { /* ignore */ }
    }
  }

  const by = normalizePdfText(data.byLine || '')
  if (by) {
    doc.setFont(SANS, 'normal')
    doc.setFontSize(12)
    doc.text(by, pageWidth / 2, pageHeight - 40, { align: 'center' })
  }
}

// Shared report cover page — Phase 8 "slate band" design (locked with Tony
// 2026-10-22): logos up top, a full-bleed dark slate title band with the
// title in white over an emerald rule, the project image framed below, and
// a structured meta block anchored at the bottom. Draws on the CURRENT page;
// the caller reserves/selects the page (doc.setPage) before calling.
import { fitImageToHeight, loadPhoto, type LoadedImage } from './images'
import { normalizePdfText, splitText } from './text'
import { COLORS, SANS } from './tokens'

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

const rgb = (c: readonly number[]) => [c[0], c[1], c[2]] as [number, number, number]

export async function drawCoverPage(
  doc: any,
  frame: { margin: number; pageWidth: number; pageHeight: number },
  data: CoverPageData,
): Promise<void> {
  const { margin, pageWidth, pageHeight } = frame
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, pageWidth, pageHeight, 'F')

  // Logos (top row)
  const logoH = 15
  let logoRowH = 0
  try {
    if (data.leftLogo?.dataUrl) {
      const dim = fitImageToHeight(data.leftLogo, logoH, 48, 40)
      doc.addImage(data.leftLogo.dataUrl, data.leftLogo.format || 'PNG', margin, margin + 2, dim.w, dim.h)
      logoRowH = Math.max(logoRowH, dim.h)
    }
  } catch (e) { /* ignore */ }
  try {
    if (data.rightLogo?.dataUrl) {
      const dim = fitImageToHeight(data.rightLogo, logoH, 48, 40)
      doc.addImage(data.rightLogo.dataUrl, data.rightLogo.format || 'PNG', pageWidth - margin - dim.w, margin + 2, dim.w, dim.h)
      logoRowH = Math.max(logoRowH, dim.h)
    }
  } catch (e) { /* ignore */ }

  // ---- Slate title band (full bleed) ------------------------------------
  const title = normalizePdfText(data.title || 'Report')
  const subtitle = normalizePdfText(data.subtitle || '')
  doc.setFont(SANS, 'bold')
  doc.setFontSize(27)
  const titleLines: string[] = splitText(doc, title, pageWidth - margin * 2 - 6)
  doc.setFont(SANS, 'normal')
  doc.setFontSize(13.5)
  const subtitleLines: string[] = subtitle ? splitText(doc, subtitle, pageWidth - margin * 2 - 6) : []

  const titleLineH = 11.5
  const subLineH = 7
  const padTop = 15
  const padBottom = 14
  const ruleGap = 7.5 // title block -> emerald rule -> subtitle
  const bandY = Math.max(margin + (logoRowH || logoH) + 22, 64)
  const bandH =
    padTop + titleLines.length * titleLineH +
    (subtitleLines.length ? ruleGap + 4 + subtitleLines.length * subLineH : 4) +
    padBottom

  doc.setFillColor(...rgb(COLORS.accent))
  doc.rect(0, bandY, pageWidth, bandH, 'F')

  let cy = bandY + padTop + 4 // baseline of the first title line
  doc.setTextColor(255, 255, 255)
  doc.setFont(SANS, 'bold')
  doc.setFontSize(27)
  for (const line of titleLines) {
    doc.text(line, margin, cy)
    cy += titleLineH
  }
  cy -= titleLineH - 2

  // Emerald rule under the title
  doc.setFillColor(...rgb(COLORS.brand))
  doc.rect(margin, cy + 2.2, 30, 1.4, 'F')

  if (subtitleLines.length) {
    cy += ruleGap + 4.5
    doc.setFont(SANS, 'normal')
    doc.setFontSize(13.5)
    doc.setTextColor(226, 232, 240) // slate-200 on the slate band
    for (const line of subtitleLines) {
      doc.text(line, margin, cy)
      cy += subLineH
    }
  }
  doc.setTextColor(...rgb(COLORS.text))

  // ---- Cover image (framed, below the band) ------------------------------
  const bottomBlockTop = pageHeight - 46
  if (data.imageDataUrl) {
    const coverImg = await loadPhoto(data.imageDataUrl)
    if (coverImg?.dataUrl) {
      try {
        const maxW = pageWidth - margin * 2
        const availableH = bottomBlockTop - (bandY + bandH) - 20
        const maxH = Math.max(40, Math.min(110, availableH))
        const dim = fitImageToHeight(coverImg, maxH, maxW, maxW)
        const x = (pageWidth - dim.w) / 2
        const yImg = bandY + bandH + 12
        doc.addImage(coverImg.dataUrl, coverImg.format || 'PNG', x, yImg, dim.w, dim.h)
        doc.setDrawColor(...rgb(COLORS.hairline))
        doc.setLineWidth(0.3)
        doc.rect(x, yImg, dim.w, dim.h, 'S')
      } catch (e) { /* ignore */ }
    }
  }

  // ---- Bottom meta block --------------------------------------------------
  const by = normalizePdfText(data.byLine || '')
  const meta = normalizePdfText(data.metaLine || '')
  if (by || meta) {
    let my = bottomBlockTop
    doc.setFillColor(...rgb(COLORS.brand))
    doc.rect(margin, my - 0.45, 16, 0.9, 'F')
    doc.setDrawColor(...rgb(COLORS.hairline))
    doc.setLineWidth(0.2)
    doc.line(margin + 18, my, pageWidth - margin, my)
    my += 7
    if (by) {
      doc.setFont(SANS, 'bold')
      doc.setFontSize(11.5)
      doc.setTextColor(...rgb(COLORS.heading))
      doc.text(splitText(doc, by, pageWidth - margin * 2), margin, my)
      my += 6.5
    }
    if (meta) {
      doc.setFont(SANS, 'normal')
      doc.setFontSize(10)
      doc.setTextColor(...rgb(COLORS.muted))
      doc.text(splitText(doc, meta, pageWidth - margin * 2), margin, my)
    }
    doc.setTextColor(...rgb(COLORS.text))
  }
}

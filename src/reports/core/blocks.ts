// Shared drawing blocks for kit reports (extracted from the Activity report
// renderer so the Issue Detail report and future reports reuse ONE style):
// severity palette, chips, brand section headings, the auto-height facts
// grid, and the captioned photo grid. All coordinates in mm on a ReportDoc.
import type { ReportDoc } from './frame'
import { COLORS, MONO, SANS } from './tokens'
import { fitImageToHeight, loadPhoto } from './images'
import { normalizePdfText, splitText } from './text'

export type ChipStyle = { text: [number, number, number]; bg: [number, number, number] }

export const SEV_STYLE: Record<'High' | 'Medium' | 'Low', ChipStyle> = {
  High: { text: [185, 28, 28], bg: [254, 226, 226] },
  Medium: { text: [180, 83, 9], bg: [254, 243, 199] },
  Low: { text: [71, 85, 105], bg: [241, 245, 249] },
}
/** Solid red chip for CRITICAL (white text on red). */
export const CRITICAL_STYLE: ChipStyle = { text: [255, 255, 255], bg: [185, 28, 28] }
export const GREEN_STYLE: ChipStyle = { text: [21, 128, 61], bg: [209, 250, 229] }
export const ACCENT_REF: [number, number, number] = [180, 83, 9]
export const GREEN: [number, number, number] = [21, 128, 61]
export const RED: [number, number, number] = [185, 28, 28]

const c = (t: readonly number[]) => [t[0], t[1], t[2]] as [number, number, number]
const ink = (doc: any, t: readonly number[]) => doc.setTextColor(t[0], t[1], t[2])

/** Filled rounded chip; returns its width. */
export function chip(doc: any, x: number, yTop: number, label: string, style: ChipStyle, size = 7): number {
  doc.setFont(SANS, 'bold')
  doc.setFontSize(size)
  const w = doc.getTextWidth(label) + 3.6
  const h = size * 0.55 + 1.8
  doc.setFillColor(...style.bg)
  doc.roundedRect(x, yTop, w, h, 1, 1, 'F')
  doc.setTextColor(...style.text)
  doc.text(label, x + 1.8, yTop + h - 1.3)
  ink(doc, COLORS.text)
  doc.setFont(SANS, 'normal')
  return w
}

/** Outlined chip (e.g. the OPEN status); returns its width. */
export function outlineChip(doc: any, x: number, yTop: number, label: string, color: [number, number, number] = c(COLORS.heading), size = 7): number {
  doc.setFont(SANS, 'bold')
  doc.setFontSize(size)
  const w = doc.getTextWidth(label) + 3.6
  const h = size * 0.55 + 1.8
  doc.setDrawColor(...color)
  doc.setLineWidth(0.35)
  doc.roundedRect(x, yTop, w, h, 1, 1, 'S')
  doc.setTextColor(...color)
  doc.text(label, x + 1.8, yTop + h - 1.3)
  ink(doc, COLORS.text)
  doc.setFont(SANS, 'normal')
  return w
}

/** Brand section heading: slate title + emerald tick + hairline, advances rd.y. */
export function drawBrandHeading(rd: ReportDoc, text: string, rightNote?: string, size = 15): void {
  const doc = rd.doc as any
  rd.ensureSpace(60) // headings never start at the very bottom of a page
  if (rd.y > rd.headerBottomY + 1) rd.y += 4
  doc.setFont(SANS, 'bold')
  doc.setFontSize(size)
  ink(doc, COLORS.heading)
  doc.text(normalizePdfText(text), rd.margin, rd.y)
  if (rightNote) {
    doc.setFont(SANS, 'normal')
    doc.setFontSize(8.5)
    ink(doc, COLORS.muted)
    doc.text(normalizePdfText(rightNote), rd.pageWidth - rd.margin, rd.y, { align: 'right' })
  }
  doc.setFillColor(...c(COLORS.brand))
  doc.rect(rd.margin, rd.y + 2.6, 16, 1, 'F')
  doc.setDrawColor(...c(COLORS.hairline))
  doc.setLineWidth(0.2)
  doc.line(rd.margin + 18, rd.y + 3.1, rd.pageWidth - rd.margin, rd.y + 3.1)
  rd.y += 10
  doc.setFont(SANS, 'normal')
  doc.setFontSize(9.5)
  ink(doc, COLORS.text)
}

export interface FactCell {
  label: string
  value: string
  mono?: boolean
  bold?: boolean
  /** Extra color for the value (e.g. red for overdue). */
  color?: [number, number, number]
}

/**
 * Bordered label/value grid with AUTO row heights: values wrap inside their
 * own cell and can never overlap the next row. Cells with empty values are
 * skipped and the grid reflows. Advances rd.y.
 */
export function drawFactsGrid(rd: ReportDoc, cells: FactCell[], cols = 3): void {
  const doc = rd.doc as any
  const filled = cells.filter(cel => String(cel.value || '').trim())
  if (!filled.length) return
  const cellW = rd.contentWidth / cols
  for (let rowStart = 0; rowStart < filled.length; rowStart += cols) {
    const row = filled.slice(rowStart, rowStart + cols)
    // measure the row height from the tallest wrapped value
    let maxLines = 1
    const wrapped = row.map((cel) => {
      doc.setFont(cel.mono ? MONO : SANS, cel.bold === false ? 'normal' : 'bold')
      doc.setFontSize(9.2)
      const lines = splitText(doc, normalizePdfText(cel.value), cellW - 6)
      maxLines = Math.max(maxLines, lines.length)
      return lines
    })
    const rowH = 4.5 + maxLines * 4.2 + 2.2
    if (rd.y + rowH > rd.bottomLimit) rd.newPage()
    const top = rd.y
    row.forEach((cel, i) => {
      const x = rd.margin + i * cellW
      doc.setDrawColor(...c(COLORS.hairline))
      doc.setLineWidth(0.2)
      doc.rect(x, top, cellW, rowH, 'S')
      doc.setFont(SANS, 'normal')
      doc.setFontSize(7.5)
      ink(doc, COLORS.muted)
      doc.text(normalizePdfText(cel.label), x + 3, top + 4)
      doc.setFont(cel.mono ? MONO : SANS, cel.bold === false ? 'normal' : 'bold')
      doc.setFontSize(9.2)
      ink(doc, cel.color || c(COLORS.heading))
      wrapped[i].forEach((l: string, li: number) => doc.text(l, x + 3, top + 8.6 + li * 4.2))
    })
    ink(doc, COLORS.text)
    doc.setFont(SANS, 'normal')
    rd.y = top + rowH
  }
  rd.y += 4
}

export interface GridPhoto {
  dataUrl: string
  caption?: string
  /** Chips rendered after the Fig. number: [label, style]. */
  chips?: Array<{ label: string; style: ChipStyle; mono?: boolean }>
}

/**
 * Captioned photo grid (figures numbered from figStart). Keeps image +
 * caption together; photos run through loadPhoto (EXIF + compression).
 * Advances rd.y and returns the next figure number.
 */
export async function drawPhotoGrid(
  rd: ReportDoc,
  photos: GridPhoto[],
  opts: { cols?: number; figStart?: number; maxH?: number } = {},
): Promise<number> {
  const doc = rd.doc as any
  const cols = opts.cols ?? 2
  const figStart = opts.figStart ?? 1
  const maxH = opts.maxH ?? 58
  const gap = 6
  const cellW = (rd.contentWidth - gap * (cols - 1)) / cols
  let col = 0
  let rowTop = rd.y
  let rowMaxH = 0
  let fig = figStart
  for (let i = 0; i < photos.length; i++) {
    const p = photos[i]
    const img = await loadPhoto(p.dataUrl)
    if (!img.dataUrl) continue
    const dim = fitImageToHeight(img, maxH, cellW, cellW)
    doc.setFontSize(8.5)
    const capLines = p.caption ? splitText(doc, normalizePdfText(p.caption), cellW).slice(0, 3) : []
    const cellH = dim.h + 6 + capLines.length * 4 + 4
    if (col === 0 && rowTop + cellH > rd.bottomLimit) {
      rd.newPage()
      rowTop = rd.y
    }
    const x = rd.margin + col * (cellW + gap)
    doc.addImage(img.dataUrl, 'JPEG', x, rowTop, dim.w, dim.h)
    doc.setDrawColor(...c(COLORS.hairline))
    doc.setLineWidth(0.2)
    doc.rect(x, rowTop, dim.w, dim.h, 'S')
    let cy = rowTop + dim.h + 4.5
    doc.setFont(SANS, 'bold')
    doc.setFontSize(8.8)
    ink(doc, COLORS.heading)
    const figLabel = `Fig. ${fig}`
    doc.text(figLabel, x, cy)
    let chipX = x + doc.getTextWidth(figLabel) + 2.5
    for (const ch of (p.chips || []).slice(0, 4)) {
      chipX += chip(doc, chipX, cy - 3.4, ch.label, ch.style, 6.6) + 1.6
    }
    doc.setFont(SANS, 'normal')
    ink(doc, COLORS.text)
    cy += 4.4
    doc.setFontSize(8.5)
    for (const l of capLines) { doc.text(l, x, cy); cy += 4 }
    fig++
    rowMaxH = Math.max(rowMaxH, cellH)
    if (col === cols - 1 || i === photos.length - 1) {
      rowTop += rowMaxH + 4
      rowMaxH = 0
      rd.y = rowTop
      col = 0
    } else {
      col++
    }
  }
  rd.y = rowTop + (rowMaxH ? rowMaxH + 4 : 0)
  return fig
}

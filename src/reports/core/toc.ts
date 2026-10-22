// Shared table-of-contents builder (lifted from the OPR Workshop report).
// Pattern: estimate how many pages the TOC needs, reserve them up front so
// content page numbers are correct, collect TocEntry rows while rendering
// content, then draw the TOC back onto the reserved pages.
// Phase 8 look: slate heading with an emerald tick, bold top-level entries,
// dotted leaders out to the page numbers.
import { normalizePdfText, splitText } from './text'
import { COLORS, SANS } from './tokens'

export type TocEntry = {
  title: string
  /** Page number PRINTED in the TOC (final position, after any PDF merges). */
  pageNo: number
  indent: number
  /**
   * Page the link annotation targets, as numbered in THIS jsPDF document
   * (pre-merge). Links bind to the page object, so they stay correct after
   * pdf-lib inserts pages ahead of it. Defaults to pageNo.
   */
  linkPageNo?: number
}

export interface TocFrame {
  margin: number
  pageWidth: number
  pageHeight: number
  /** Y where TOC content starts on each TOC page (below the page header). */
  startY?: number
  bottomLimit?: number
}

const LINE_H = 6.4
const ENTRY_SIZE = 10.5
const PAGE_NO_W = 14

function setEntryFont(doc: any, indent: number): void {
  doc.setFont(SANS, indent === 0 ? 'bold' : 'normal')
  doc.setFontSize(ENTRY_SIZE)
}

/** Conservative page-count estimate for reserving TOC pages up front. */
export function estimateTocPages(doc: any, titles: Array<{ title: string; indent: number }>, frame: TocFrame): number {
  const startY = frame.startY ?? 44
  const bottomLimit = frame.bottomLimit ?? (frame.pageHeight - 26)
  const linesPerPage = Math.max(10, Math.floor((bottomLimit - startY) / LINE_H))
  const tocW = frame.pageWidth - frame.margin * 2 - PAGE_NO_W - 4
  let lines = 3 // "Table of Contents" heading + rule + spacing
  for (const t of titles) {
    setEntryFont(doc, t.indent)
    const indentW = t.indent * 5
    const entryW = Math.max(40, tocW - indentW)
    lines += Math.max(1, splitText(doc, normalizePdfText(t.title), entryW).length)
  }
  return Math.max(1, Math.ceil(lines / linesPerPage))
}

/**
 * Draw the TOC onto the reserved pages, starting at page `startPage`.
 * `drawPageHeader` draws the branded header on the current page (called for
 * every TOC page). Returns the number of the last TOC page used.
 */
export function drawToc(
  doc: any,
  entries: TocEntry[],
  opts: TocFrame & { startPage: number; drawPageHeader: () => void },
): number {
  const startY = opts.startY ?? 44
  const bottomLimit = opts.bottomLimit ?? (opts.pageHeight - 26)
  const tocW = opts.pageWidth - opts.margin * 2 - PAGE_NO_W - 4

  let tocPageNo = opts.startPage
  doc.setPage(tocPageNo)
  opts.drawPageHeader()
  let ty = startY
  const heading = (continued: boolean) => {
    doc.setFont(SANS, 'bold')
    doc.setFontSize(15)
    doc.setTextColor(COLORS.heading[0], COLORS.heading[1], COLORS.heading[2])
    doc.text(continued ? 'Table of Contents (cont.)' : 'Table of Contents', opts.margin, ty)
    doc.setFillColor(COLORS.brand[0], COLORS.brand[1], COLORS.brand[2])
    doc.rect(opts.margin, ty + 2.6, 16, 1, 'F')
    doc.setDrawColor(COLORS.hairline[0], COLORS.hairline[1], COLORS.hairline[2])
    doc.setLineWidth(0.2)
    doc.line(opts.margin + 18, ty + 3.1, opts.pageWidth - opts.margin, ty + 3.1)
    ty += 12.5
  }
  const nextTocPage = () => {
    tocPageNo++
    doc.setPage(tocPageNo)
    opts.drawPageHeader()
    ty = startY
    heading(true)
  }
  heading(false)

  for (const e of entries) {
    const indentX = e.indent * 5
    const entryW = Math.max(40, tocW - indentX)
    setEntryFont(doc, e.indent)
    const lines = splitText(doc, normalizePdfText(e.title), entryW)
    if (ty + lines.length * LINE_H > bottomLimit) nextTocPage()
    setEntryFont(doc, e.indent)
    const ink = e.indent === 0 ? COLORS.heading : COLORS.text
    doc.setTextColor(ink[0], ink[1], ink[2])
    // First line with a dotted leader out to the page number on the right
    doc.text(lines[0] || '', opts.margin + indentX, ty)
    doc.text(String(e.pageNo), opts.pageWidth - opts.margin, ty, { align: 'right' })
    try {
      const textEnd = opts.margin + indentX + doc.getTextWidth(lines[0] || '')
      const leaderStart = textEnd + 2.5
      const leaderEnd = opts.pageWidth - opts.margin - PAGE_NO_W + 6
      if (leaderEnd - leaderStart > 6) {
        doc.setDrawColor(COLORS.hairline[0], COLORS.hairline[1], COLORS.hairline[2])
        doc.setLineWidth(0.3)
        doc.setLineDashPattern([0.4, 1.5], 0)
        doc.line(leaderStart, ty - 1, leaderEnd, ty - 1)
        doc.setLineDashPattern([], 0)
      }
    } catch (err) { /* leader dots are decoration only */ }
    doc.link(opts.margin + indentX, ty - 4.2, opts.pageWidth - opts.margin * 2 - indentX, 5.4, {
      pageNumber: e.linkPageNo ?? e.pageNo,
    })
    ty += LINE_H
    for (let i = 1; i < lines.length; i++) {
      if (ty + LINE_H > bottomLimit) nextTocPage()
      doc.text(lines[i] || '', opts.margin + indentX + 3, ty)
      ty += LINE_H
    }
  }
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2])
  return tocPageNo
}

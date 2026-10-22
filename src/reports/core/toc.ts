// Shared table-of-contents builder (lifted from the OPR Workshop report).
// Pattern: estimate how many pages the TOC needs, reserve them up front so
// content page numbers are correct, collect TocEntry rows while rendering
// content, then draw the TOC back onto the reserved pages.
import { normalizePdfText, splitText } from './text'
import { SANS } from './tokens'

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

const LINE_H = 6

/** Conservative page-count estimate for reserving TOC pages up front. */
export function estimateTocPages(doc: any, titles: Array<{ title: string; indent: number }>, frame: TocFrame): number {
  const startY = frame.startY ?? 44
  const bottomLimit = frame.bottomLimit ?? (frame.pageHeight - 26)
  const linesPerPage = Math.max(10, Math.floor((bottomLimit - startY) / LINE_H))
  doc.setFont(SANS, 'normal')
  doc.setFontSize(11)
  const tocW = frame.pageWidth - frame.margin * 2 - 18
  let lines = 2 // "Table of Contents" + spacing
  for (const t of titles) {
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
  const tocW = opts.pageWidth - opts.margin * 2 - 18

  let tocPageNo = opts.startPage
  doc.setPage(tocPageNo)
  opts.drawPageHeader()
  let ty = startY
  const heading = (continued: boolean) => {
    doc.setFont(SANS, 'bold')
    doc.setFontSize(14)
    doc.text(continued ? 'Table of Contents (cont.)' : 'Table of Contents', opts.margin, ty)
    ty += 10
    doc.setFont(SANS, 'normal')
    doc.setFontSize(11)
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
    const lines = splitText(doc, normalizePdfText(e.title), entryW)
    if (ty + lines.length * LINE_H > bottomLimit) nextTocPage()
    // First line with the page number on the right, the whole row clickable
    doc.text(lines[0] || '', opts.margin + indentX, ty)
    doc.text(String(e.pageNo), opts.pageWidth - opts.margin, ty, { align: 'right' })
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
  return tocPageNo
}

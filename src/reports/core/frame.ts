// The report frame: branded header/footer drawing (moved from utils/pdfBranding)
// and ReportDoc, the class every jsPDF report draws inside. ReportDoc owns the
// doc, margins, fonts, logos, pagination and footer stamping, so report
// definitions only lay out content and never call doc.addPage() directly.
import { jsPDF } from 'jspdf'
import { ensureReportFonts } from './fonts'
import { COLORS, SANS, setColor } from './tokens'
import { fitImageToHeight, loadFirstAvailable, loadImage, type LoadedImage } from './images'
import { setZeroCharSpace } from './text'

/**
 * Logos must never render stretched: if the browser-side measurement in
 * loadImage didn't yield intrinsic dimensions, fall back to jsPDF's own
 * header parsing; an image we still can't measure is skipped entirely.
 */
function measuredLogo(doc: any, img?: LoadedImage): LoadedImage | null {
  if (!img?.dataUrl) return null
  if (img.width && img.height) return img
  try {
    const p = doc.getImageProperties(img.dataUrl)
    if (p?.width && p?.height) return { ...img, width: p.width, height: p.height }
  } catch (e) { /* ignore */ }
  return null
}

export function drawBrandedHeader(
  doc: any,
  opts: {
    margin: number
    pageWidth: number
    title: string
    leftLogo?: LoadedImage
    rightLogo?: LoadedImage
    logoH?: number
    maxLogoW?: number
    titleFontSize?: number
    setTitleFont?: () => void
  }
) {
  const logoH = typeof opts.logoH === 'number' ? opts.logoH : 12
  const maxLogoW = typeof opts.maxLogoW === 'number' ? opts.maxLogoW : logoH * 3
  let logoBlockH = 0

  try {
    const leftLogo = measuredLogo(doc, opts.leftLogo)
    if (leftLogo?.dataUrl) {
      const dim = fitImageToHeight(leftLogo, logoH, maxLogoW, maxLogoW)
      doc.addImage(leftLogo.dataUrl, leftLogo.format || 'PNG', opts.margin, opts.margin, dim.w, dim.h)
      logoBlockH = Math.max(logoBlockH, dim.h)
    }
  } catch (e) { /* ignore */ }

  try {
    const rightLogo = measuredLogo(doc, opts.rightLogo)
    if (rightLogo?.dataUrl) {
      const dim = fitImageToHeight(rightLogo, logoH, maxLogoW, maxLogoW)
      doc.addImage(rightLogo.dataUrl, rightLogo.format || 'PNG', opts.pageWidth - opts.margin - dim.w, opts.margin, dim.w, dim.h)
      logoBlockH = Math.max(logoBlockH, dim.h)
    }
  } catch (e) { /* ignore */ }

  if (opts.setTitleFont) opts.setTitleFont()
  if (typeof opts.titleFontSize === 'number') doc.setFontSize(opts.titleFontSize)

  // Title sits vertically centered between the two logos; content follows
  // right under the logo row. A title too wide for the space between the
  // logos drops below them instead of overlapping.
  const rowH = logoBlockH || logoH
  const betweenLogosW = opts.pageWidth - 2 * (opts.margin + maxLogoW + 4)
  let titleW = betweenLogosW
  try { titleW = doc.getTextWidth(opts.title) } catch (e) { /* ignore */ }
  let titleY: number
  let ruleY: number
  if (titleW <= betweenLogosW) {
    titleY = opts.margin + rowH / 2 + 2
    ruleY = opts.margin + rowH + 3.5
  } else {
    titleY = opts.margin + rowH + 6
    ruleY = titleY + 3.5
  }
  setColor(doc, 'heading')
  doc.text(opts.title, opts.pageWidth / 2, titleY, { align: 'center' })
  setColor(doc, 'text')

  // Hairline under the header with a short emerald brand tick on the left.
  const tickW = 16
  doc.setFillColor(COLORS.brand[0], COLORS.brand[1], COLORS.brand[2])
  doc.rect(opts.margin, ruleY - 0.45, tickW, 0.9, 'F')
  doc.setDrawColor(COLORS.hairline[0], COLORS.hairline[1], COLORS.hairline[2])
  doc.setLineWidth(0.2)
  doc.line(opts.margin + tickW + 2, ruleY, opts.pageWidth - opts.margin, ruleY)

  return { nextY: ruleY + 5.5 }
}

export function drawBrandedFooter(
  doc: any,
  opts: {
    margin: number
    pageWidth: number
    pageHeight: number
    pageNo: number | string
    pageDate?: string
    footerLogo?: LoadedImage
    leftLabel: string
    setBold?: () => void
    setNormal?: () => void
  }
) {
  const footerY = opts.pageHeight - 10
  // Mirror of the page header: emerald tick + slate hairline.
  const tickW = 16
  doc.setFillColor(COLORS.brand[0], COLORS.brand[1], COLORS.brand[2])
  doc.rect(opts.margin, footerY - 6.45, tickW, 0.9, 'F')
  doc.setDrawColor(COLORS.hairline[0], COLORS.hairline[1], COLORS.hairline[2])
  doc.setLineWidth(0.2)
  doc.line(opts.margin + tickW + 2, footerY - 6, opts.pageWidth - opts.margin, footerY - 6)

  try {
    const footerLogo = measuredLogo(doc, opts.footerLogo)
    if (footerLogo?.dataUrl) {
      const lh = 5.5
      const dim = fitImageToHeight(footerLogo, lh, 14, 12)
      doc.addImage(footerLogo.dataUrl, footerLogo.format || 'PNG', opts.margin, footerY - dim.h, dim.w, dim.h)
      const brandX = opts.margin + dim.w + 2
      if (opts.setBold) opts.setBold()
      doc.setFontSize(8)
      setColor(doc, 'heading')
      doc.text('cxma', brandX, footerY - 2)
      const tw = typeof doc.getTextWidth === 'function' ? doc.getTextWidth('cxma') : 10
      setColor(doc, 'muted')
      if (opts.setNormal) opts.setNormal()
      doc.text(opts.leftLabel, brandX + tw + 3, footerY - 2)
    } else {
      if (opts.setBold) opts.setBold()
      doc.setFontSize(8)
      setColor(doc, 'heading')
      doc.text('cxma', opts.margin, footerY - 2)
      setColor(doc, 'muted')
      if (opts.setNormal) opts.setNormal()
      doc.text(opts.leftLabel, opts.margin + 14, footerY - 2)
    }
  } catch (e) { /* ignore */ }

  if (opts.setNormal) opts.setNormal()
  doc.setFontSize(8)
  setColor(doc, 'muted')
  doc.text(String(opts.pageNo), opts.pageWidth / 2, footerY - 2, { align: 'center' })
  if (opts.pageDate) {
    try { doc.text(String(opts.pageDate), opts.pageWidth - opts.margin, footerY - 2, { align: 'right' }) } catch (e) { /* ignore */ }
  }
  setColor(doc, 'text')
}

export interface ReportDocOptions {
  /** Centered running-header title. Change per section with setTitle(). */
  title: string
  /** Footer left label, next to the cxma brand mark (e.g. "AHU-1 Report"). */
  footerLabel: string
  /** Project record supplying the client logo + commissioning agent logo. */
  project?: any
  orientation?: 'portrait' | 'landscape'
  margin?: number
  logoH?: number
  maxLogoW?: number
  titleFontSize?: number
  /** Draw the branded header on page 1 (default true). Pass false when the
   *  report draws a custom cover/first page (e.g. the Activity report). */
  firstPageHeader?: boolean
  /** Print the page number in the footer (default true). Pass false when the
   *  document is merged with appendices and numbers are stamped post-merge. */
  pageNumbers?: boolean
  /** Print the date on the footer's right edge (default true). */
  footerDate?: boolean
}

export class ReportDoc {
  readonly doc: jsPDF
  readonly margin: number
  readonly pageWidth: number
  readonly pageHeight: number
  /** Content must stay above this; ensureSpace() enforces it. */
  readonly bottomLimit: number
  /** Current draw cursor. Definitions advance it as they draw. */
  y = 0

  private title: string
  private readonly footerLabel: string
  private readonly pageNumbers: boolean
  private readonly footerDate: boolean
  private readonly logoH: number
  private readonly maxLogoW: number
  private readonly titleFontSize: number
  private leftLogo: LoadedImage = {}
  private rightLogo: LoadedImage = {}
  private footerLogo: LoadedImage = {}
  private finished = false
  private lastHeaderNextY: number | null = null

  private constructor(doc: jsPDF, opts: ReportDocOptions) {
    this.doc = doc
    this.title = opts.title
    this.footerLabel = opts.footerLabel
    this.pageNumbers = opts.pageNumbers !== false
    this.footerDate = opts.footerDate !== false
    this.margin = typeof opts.margin === 'number' ? opts.margin : 12
    this.logoH = typeof opts.logoH === 'number' ? opts.logoH : 12
    this.maxLogoW = typeof opts.maxLogoW === 'number' ? opts.maxLogoW : 36
    this.titleFontSize = typeof opts.titleFontSize === 'number' ? opts.titleFontSize : 16
    this.pageWidth = doc.internal.pageSize.getWidth()
    this.pageHeight = doc.internal.pageSize.getHeight()
    this.bottomLimit = this.pageHeight - 26
  }

  /** Create the doc, embed fonts, load logos, and draw the first page header. */
  static async create(opts: ReportDocOptions): Promise<ReportDoc> {
    // US Letter everywhere (locked with Tony 2026-10-22): projects are US-based
    // and the Puppeteer Final Report is already Letter. Layouts are margin-
    // relative, so they reflow to the 216x279mm page automatically.
    const doc = new jsPDF({ unit: 'mm', format: 'letter', orientation: opts.orientation || 'portrait' })
    await ensureReportFonts(doc)
    setColor(doc, 'text')
    setZeroCharSpace(doc)
    const rd = new ReportDoc(doc, opts)
    rd.leftLogo = await loadImage(opts.project?.logo)
    rd.rightLogo = await loadImage(opts.project?.commissioning_agent?.logo)
    rd.footerLogo = await loadFirstAvailable(['/brand/logo-2.png', '/brand/logo-2.svg', '/brand/logo.png', '/brand/logo.svg'])
    if (opts.firstPageHeader !== false) rd.drawHeader()
    else rd.y = rd.margin
    return rd
  }

  /** The project logos the frame loaded (for custom first pages/covers). */
  get logos(): { left: LoadedImage; right: LoadedImage } {
    return { left: this.leftLogo, right: this.rightLogo }
  }

  get contentWidth(): number {
    return this.pageWidth - this.margin * 2
  }

  get pageNo(): number {
    try { return (this.doc as any).getCurrentPageInfo().pageNumber } catch (e) { return this.doc.getNumberOfPages() }
  }

  /** Update the running-header title for pages created from now on. */
  setTitle(title: string): void {
    this.title = title
  }

  /** Where content starts below the branded header (for renderers like autotable that add their own pages). */
  get headerBottomY(): number {
    return this.lastHeaderNextY ?? (this.margin + this.logoH + 8)
  }

  /** Redraw the branded header on the current page (for pages added outside newPage()). */
  drawHeaderOnCurrentPage(): void {
    this.drawHeader()
  }

  private drawHeader(): void {
    const prevFont = (this.doc as any).getFont ? (this.doc as any).getFont() : { fontName: SANS, fontStyle: 'normal' }
    const prevSize = (this.doc as any).getFontSize ? (this.doc as any).getFontSize() : 9
    const res = drawBrandedHeader(this.doc, {
      margin: this.margin,
      pageWidth: this.pageWidth,
      title: this.title,
      leftLogo: this.leftLogo,
      rightLogo: this.rightLogo,
      logoH: this.logoH,
      maxLogoW: this.maxLogoW,
      titleFontSize: this.titleFontSize,
      setTitleFont: () => this.doc.setFont(SANS, 'bold'),
    })
    this.y = res.nextY
    this.lastHeaderNextY = res.nextY
    this.doc.setFont((prevFont as any).fontName || SANS, (prevFont as any).fontStyle || 'normal')
    this.doc.setFontSize(prevSize)
  }

  /** Start a new page with the branded header; cursor moves below it. */
  newPage(): void {
    this.doc.addPage()
    setZeroCharSpace(this.doc)
    this.drawHeader()
  }

  /** Page-break if `h` mm won't fit above the footer. Returns true if it broke. */
  ensureSpace(h: number): boolean {
    if (this.y + h > this.bottomLimit) {
      this.newPage()
      return true
    }
    return false
  }

  sectionGap(gap = 6): void {
    this.ensureSpace(gap)
    this.y += gap
  }

  /**
   * Stamp the branded footer (page number, date, label) on every page.
   * Called automatically by output(); safe to call more than once.
   */
  finish(): jsPDF {
    if (!this.finished) {
      this.finished = true
      const pageDate = new Date().toLocaleDateString()
      const total = this.doc.getNumberOfPages()
      for (let p = 1; p <= total; p++) {
        this.doc.setPage(p)
        drawBrandedFooter(this.doc, {
          margin: this.margin,
          pageWidth: this.pageWidth,
          pageHeight: this.pageHeight,
          pageNo: this.pageNumbers ? p : '',
          pageDate: this.footerDate ? pageDate : undefined,
          footerLogo: this.footerLogo,
          leftLabel: this.footerLabel,
          setBold: () => this.doc.setFont(SANS, 'bold'),
          setNormal: () => this.doc.setFont(SANS, 'normal'),
        })
      }
      this.doc.setPage(total)
    }
    return this.doc
  }

  output(): ArrayBuffer {
    this.finish()
    return this.doc.output('arraybuffer') as ArrayBuffer
  }
}

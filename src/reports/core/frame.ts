// The report frame: branded header/footer drawing (moved from utils/pdfBranding)
// and ReportDoc, the class every jsPDF report draws inside. ReportDoc owns the
// doc, margins, fonts, logos, pagination and footer stamping, so report
// definitions only lay out content and never call doc.addPage() directly.
import { jsPDF } from 'jspdf'
import { ensureReportFonts } from './fonts'
import { SANS, setColor } from './tokens'
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
  const titleY = opts.margin + (logoBlockH || logoH) + 6
  doc.text(opts.title, opts.pageWidth / 2, titleY, { align: 'center' })

  return { nextY: titleY + 14 }
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
  doc.setDrawColor(180, 180, 180)
  doc.line(opts.margin, footerY - 6, opts.pageWidth - opts.margin, footerY - 6)

  try {
    const footerLogo = measuredLogo(doc, opts.footerLogo)
    if (footerLogo?.dataUrl) {
      const lh = 5.5
      const dim = fitImageToHeight(footerLogo, lh, 14, 12)
      doc.addImage(footerLogo.dataUrl, footerLogo.format || 'PNG', opts.margin, footerY - dim.h, dim.w, dim.h)
      const brandX = opts.margin + dim.w + 2
      if (opts.setBold) opts.setBold()
      doc.setFontSize(8)
      doc.text('cxma', brandX, footerY - 2)
      const tw = typeof doc.getTextWidth === 'function' ? doc.getTextWidth('cxma') : 10
      doc.text(opts.leftLabel, brandX + tw + 3, footerY - 2)
    } else {
      doc.setFillColor(220, 220, 220)
      doc.rect(opts.margin, footerY - 5.5, 8, 5, 'F')
      if (opts.setBold) opts.setBold()
      doc.setFontSize(8)
      doc.text('cxma', opts.margin + 10, footerY - 2)
      doc.text(opts.leftLabel, opts.margin + 24, footerY - 2)
    }
  } catch (e) { /* ignore */ }

  if (opts.setNormal) opts.setNormal()
  doc.setFontSize(8)
  doc.text(String(opts.pageNo), opts.pageWidth / 2, footerY - 2, { align: 'center' })
  if (opts.pageDate) {
    try { doc.text(String(opts.pageDate), opts.pageWidth - opts.margin, footerY - 2, { align: 'right' }) } catch (e) { /* ignore */ }
  }
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
  private readonly logoH: number
  private readonly maxLogoW: number
  private readonly titleFontSize: number
  private leftLogo: LoadedImage = {}
  private rightLogo: LoadedImage = {}
  private footerLogo: LoadedImage = {}
  private finished = false

  private constructor(doc: jsPDF, opts: ReportDocOptions) {
    this.doc = doc
    this.title = opts.title
    this.footerLabel = opts.footerLabel
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
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: opts.orientation || 'portrait' })
    await ensureReportFonts(doc)
    setColor(doc, 'text')
    setZeroCharSpace(doc)
    const rd = new ReportDoc(doc, opts)
    rd.leftLogo = await loadImage(opts.project?.logo)
    rd.rightLogo = await loadImage(opts.project?.commissioning_agent?.logo)
    rd.footerLogo = await loadFirstAvailable(['/brand/logo-2.png', '/brand/logo-2.svg', '/brand/logo.png', '/brand/logo.svg'])
    rd.drawHeader()
    return rd
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
          pageNo: p,
          pageDate,
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

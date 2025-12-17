export type PdfImage = {
  dataUrl?: string
  format?: string
  width?: number
  height?: number
}

export function fitImageToHeight(img: PdfImage, targetH: number, maxW?: number, fallbackW?: number) {
  const w = img?.width || 0
  const h = img?.height || 0
  if (w > 0 && h > 0) {
    const ratio = w / h
    let outH = targetH
    let outW = targetH * ratio
    if (maxW && outW > maxW) {
      outW = maxW
      outH = outW / ratio
    }
    return { w: outW, h: outH }
  }
  return { w: fallbackW || (maxW || targetH), h: targetH }
}

export function drawBrandedHeader(
  doc: any,
  opts: {
    margin: number
    pageWidth: number
    title: string
    leftLogo?: PdfImage
    rightLogo?: PdfImage
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
    if (opts.leftLogo?.dataUrl) {
      const dim = fitImageToHeight(opts.leftLogo, logoH, maxLogoW, maxLogoW)
      doc.addImage(opts.leftLogo.dataUrl, opts.leftLogo.format || 'PNG', opts.margin, opts.margin, dim.w, dim.h)
      logoBlockH = Math.max(logoBlockH, dim.h)
    }
  } catch (e) { /* ignore */ }

  try {
    if (opts.rightLogo?.dataUrl) {
      const dim = fitImageToHeight(opts.rightLogo, logoH, maxLogoW, maxLogoW)
      doc.addImage(opts.rightLogo.dataUrl, opts.rightLogo.format || 'PNG', opts.pageWidth - opts.margin - dim.w, opts.margin, dim.w, dim.h)
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
    footerLogo?: PdfImage
    leftLabel: string
    setBold?: () => void
    setNormal?: () => void
  }
) {
  const footerY = opts.pageHeight - 10
  doc.setDrawColor(180, 180, 180)
  doc.line(opts.margin, footerY - 6, opts.pageWidth - opts.margin, footerY - 6)

  try {
    if (opts.footerLogo?.dataUrl) {
      const lh = 5.5
      const dim = fitImageToHeight(opts.footerLogo, lh, 14, 12)
      doc.addImage(opts.footerLogo.dataUrl, opts.footerLogo.format || 'PNG', opts.margin, footerY - lh, dim.w, lh)
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


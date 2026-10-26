// Issue Detail report PDF renderer (target: issue-mockup.pdf). Page 1 is a
// standalone issue sheet the assigned contractor can act on: title block
// with priority/status chips and the overdue line, life-safety band, facts
// grid, condition, required action, photo evidence. Page 2 carries the
// contractor response, CxA verification (fill-in blocks when not yet
// recorded — printed on purpose), plain-language history, comments and the
// distribution line. Closed + verified issues show the verification on
// page 1 and skip the fill-ins.
import { ReportDoc } from '../../core/frame'
import { COLORS, MONO, SANS } from '../../core/tokens'
import { normalizePdfText, splitText } from '../../core/text'
import { stampPageXofY } from '../../core/merge'
import { fitImageToHeight } from '../../core/images'
import {
  CRITICAL_STYLE, GREEN, GREEN_STYLE, RED, SEV_STYLE,
  chip, drawPhotoGrid, drawFactsGrid, outlineChip,
} from '../../core/blocks'
import type { IssueReportModel } from './model'

const c = (t: readonly number[]) => [t[0], t[1], t[2]] as [number, number, number]

export async function generateIssueDetailPdf(model: IssueReportModel, opts: { project?: any; sections?: Record<string, boolean> } = {}): Promise<Uint8Array> {
  // Section toggles (IssueEdit's report-sections menu); everything on by default.
  const on = (k: string) => opts.sections?.[k] !== false
  const rd = await ReportDoc.create({
    title: model.runningTitle,
    footerLabel: model.footerLabel,
    project: opts.project,
    firstPageHeader: false,
    pageNumbers: false, // stamped as "Page X of Y" post-render
    footerDate: false,
    titleFontSize: 10,
  })
  const doc = rd.doc as any
  const margin = rd.margin
  const contentW = rd.contentWidth
  const pageW = rd.pageWidth
  const setInk = (t: readonly number[]) => doc.setTextColor(t[0], t[1], t[2])
  const hairline = () => { doc.setDrawColor(...c(COLORS.hairline)); doc.setLineWidth(0.2) }

  const subHeading = (text: string, rightNote?: string) => {
    rd.ensureSpace(16)
    doc.setFont(SANS, 'bold'); doc.setFontSize(12.5); setInk(COLORS.heading)
    doc.text(text, margin, rd.y)
    if (rightNote) {
      doc.setFont(SANS, 'normal'); doc.setFontSize(8.3); setInk(COLORS.muted)
      doc.text(normalizePdfText(rightNote), pageW - margin, rd.y, { align: 'right' })
    }
    rd.y += 6
    doc.setFont(SANS, 'normal'); doc.setFontSize(10); setInk(COLORS.text)
  }
  const bodyText = (text: string, size = 10, lineH = 4.9) => {
    doc.setFont(SANS, 'normal'); doc.setFontSize(size); setInk(COLORS.text)
    for (const l of splitText(doc, normalizePdfText(text), contentW)) {
      rd.ensureSpace(lineH)
      doc.text(l, margin, rd.y)
      rd.y += lineH
    }
  }
  const ruledLine = (x: number, w: number, y: number) => {
    doc.setDrawColor(...c(COLORS.muted)); doc.setLineWidth(0.2)
    doc.line(x, y, x + w, y)
  }

  const priorityStyle = model.closed && model.verified
    ? GREEN_STYLE
    : model.priority === 'Critical' ? CRITICAL_STYLE : SEV_STYLE[model.priority === 'High' ? 'High' : model.priority === 'Medium' ? 'Medium' : 'Low']

  // =====================================================================
  // Page 1 — header, title block, facts, condition, action, photos
  // =====================================================================
  {
    let y = margin + 2
    const logos = rd.logos
    const logoH = 12
    let rowH = logoH
    try {
      if (logos.left?.dataUrl) {
        const dim = fitImageToHeight(logos.left, logoH, 36, 30)
        doc.addImage(logos.left.dataUrl, logos.left.format || 'PNG', margin, y, dim.w, dim.h)
        const tx = margin + dim.w + 3
        doc.setFont(SANS, 'bold'); doc.setFontSize(10); setInk(COLORS.heading)
        doc.text(normalizePdfText(model.projectName), tx, y + 4.5)
        doc.setFont(SANS, 'normal'); doc.setFontSize(8); setInk(COLORS.muted)
        doc.text(normalizePdfText([model.clientName, model.projectNo ? `Project ${model.projectNo}` : ''].filter(Boolean).join(' · ')), tx, y + 8.8)
        rowH = Math.max(rowH, dim.h)
      } else {
        doc.setFont(SANS, 'bold'); doc.setFontSize(10.5); setInk(COLORS.heading)
        doc.text(normalizePdfText(model.projectName), margin, y + 4.5)
        doc.setFont(SANS, 'normal'); doc.setFontSize(8); setInk(COLORS.muted)
        doc.text(normalizePdfText([model.clientName, model.projectNo ? `Project ${model.projectNo}` : ''].filter(Boolean).join(' · ')), margin, y + 8.8)
      }
    } catch (e) { /* ignore */ }
    try {
      if (logos.right?.dataUrl) {
        const dim = fitImageToHeight(logos.right, logoH, 36, 30)
        doc.addImage(logos.right.dataUrl, logos.right.format || 'PNG', pageW - margin - dim.w, y, dim.w, dim.h)
        doc.setFont(SANS, 'normal'); doc.setFontSize(7.5); setInk(COLORS.muted)
        doc.text('Commissioning Authority', pageW - margin, y + logoH + 3.5, { align: 'right' })
        rowH = Math.max(rowH, dim.h)
      }
    } catch (e) { /* ignore */ }
    y += rowH + 7
    doc.setDrawColor(...c(COLORS.accent)); doc.setLineWidth(0.6)
    doc.line(margin, y, pageW - margin, y)
    y += 8

    // Eyebrow
    doc.setFont(SANS, 'bold'); doc.setFontSize(8.6); setInk(COLORS.brand)
    try { doc.setCharSpace(0.5) } catch (e) { /* older jspdf */ }
    doc.text(normalizePdfText(model.eyebrow), margin, y)
    try { doc.setCharSpace(0) } catch (e) { /* ignore */ }
    y += 7.5

    // Title: "#13" mono + title, chips + due line on the right
    const chipsW = 58
    const titleW = contentW - chipsW - 4
    doc.setFont(MONO, 'normal'); doc.setFontSize(17); setInk(COLORS.muted)
    const numText = `#${model.number}`
    const numW = doc.getTextWidth(numText + ' ')
    doc.text(numText, margin, y)
    doc.setFont(SANS, 'bold'); doc.setFontSize(17); setInk(COLORS.heading)
    const titleLines = splitText(doc, normalizePdfText(model.title), titleW - numW)
    titleLines.forEach((l: string, i: number) => {
      doc.text(l, margin + (i === 0 ? numW : 0), y)
      if (i < titleLines.length - 1) y += 7.6
    })
    // chips at the top right
    {
      const chipY = y - 5.2 - (titleLines.length - 1) * 7.6
      doc.setFont(SANS, 'bold'); doc.setFontSize(7.5)
      const pLabel = model.closed && model.verified ? 'CLOSED' : model.priority.toUpperCase()
      const pw = doc.getTextWidth(pLabel) + 3.6
      const statusLabel = model.closed && model.verified ? '' : model.statusLabel
      const stW = statusLabel ? doc.getTextWidth(statusLabel) + 3.6 : 0
      let cx = pageW - margin - pw - (stW ? stW + 2.5 : 0)
      cx += chip(doc, cx, chipY, pLabel, priorityStyle, 7.5) + 2.5
      if (statusLabel) outlineChip(doc, cx, chipY, statusLabel, c(COLORS.heading), 7.5)
      if (model.dueLine) {
        doc.setFont(SANS, 'bold'); doc.setFontSize(8.6)
        if (model.dueLine.red) doc.setTextColor(...RED); else setInk(COLORS.muted)
        doc.text(normalizePdfText(model.dueLine.text), pageW - margin, chipY + 9.6, { align: 'right' })
        setInk(COLORS.text)
      }
    }
    y += 7

    // Life-safety band
    if (model.lifeSafetyNote) {
      doc.setFontSize(9.3)
      const label = 'Life safety. '
      doc.setFont(SANS, 'bold')
      const labelW = doc.getTextWidth(label)
      doc.setFont(SANS, 'normal')
      const lines = splitText(doc, normalizePdfText(model.lifeSafetyNote), contentW - labelW - 10)
      const bandH = Math.max(8.5, lines.length * 4.6 + 4)
      doc.setFillColor(254, 226, 226)
      doc.rect(margin, y, contentW, bandH, 'F')
      doc.setFont(SANS, 'bold'); doc.setTextColor(...RED)
      doc.text(label, margin + 4, y + 5.6)
      doc.setFont(SANS, 'normal'); doc.setTextColor(127, 29, 29)
      lines.forEach((l: string, i: number) => doc.text(l, margin + 4 + (i === 0 ? labelW : 0), y + 5.6 + i * 4.6))
      setInk(COLORS.text)
      y += bandH + 5
    } else {
      y += 2
    }
    rd.y = y

    drawFactsGrid(rd, model.facts, 3)
    rd.y += 4 // breathing room between the facts grid and the first section

    if (on('condition') && model.condition) {
      subHeading('Condition observed')
      bodyText(model.condition)
      rd.y += 4
    }

    if (on('requiredAction') && model.requiredAction.length) {
      subHeading('Required action')
      doc.setFontSize(10)
      if (model.requiredAction.length === 1) {
        bodyText(model.requiredAction[0])
      } else {
        model.requiredAction.forEach((item, i) => {
          const lines = splitText(doc, normalizePdfText(item), contentW - 8)
          rd.ensureSpace(lines.length * 4.9 + 1)
          doc.setFont(SANS, 'bold'); setInk(COLORS.heading)
          doc.text(`${i + 1}.`, margin + 1, rd.y)
          doc.setFont(SANS, 'normal'); setInk(COLORS.text)
          lines.forEach((l: string) => { doc.text(l, margin + 7, rd.y); rd.y += 4.9 })
          rd.y += 1
        })
      }
      if (model.referenceLine) {
        rd.ensureSpace(5)
        doc.setFontSize(8.5); setInk(COLORS.muted)
        for (const l of splitText(doc, normalizePdfText(`Reference: ${model.referenceLine}`), contentW)) {
          doc.text(l, margin, rd.y); rd.y += 4.2
        }
        setInk(COLORS.text)
      }
      rd.y += 4
    }

    // Related OPR items (owner requirements this deficiency violates).
    if (on('oprItems') && model.oprItems.length) {
      subHeading('Related OPR items')
      doc.setFontSize(9.5)
      for (const o of model.oprItems) {
        const prefix = o.ref ? `${o.ref}  ` : ''
        doc.setFont(MONO, 'normal'); setInk(COLORS.muted)
        const prefW = prefix ? doc.getTextWidth(prefix) : 0
        const text = o.text + (o.category ? ` · ${o.category}` : '')
        doc.setFont(SANS, 'normal')
        const lines = splitText(doc, normalizePdfText(text), contentW - prefW)
        rd.ensureSpace(lines.length * 4.6 + 2)
        if (prefix) {
          doc.setFont(MONO, 'normal')
          doc.text(prefix, margin, rd.y)
          doc.setFont(SANS, 'normal')
        }
        setInk(COLORS.text)
        for (const l of lines) {
          doc.text(l, margin + prefW, rd.y)
          rd.y += 4.6
        }
        rd.y += 1.2
      }
      rd.y += 3
    }

    // Verification moves to page 1 for closed + verified issues.
    if (on('verification') && model.closed && model.verified && model.verification) {
      subHeading('CxA verification')
      doc.setFont(SANS, 'bold'); doc.setFontSize(10); doc.setTextColor(...GREEN)
      rd.ensureSpace(6)
      doc.text(normalizePdfText(model.verification.outcomeLabel), margin, rd.y)
      rd.y += 5.2
      doc.setFont(SANS, 'normal'); setInk(COLORS.text)
      if (model.verification.notes) bodyText(model.verification.notes, 9.5, 4.6)
      doc.setFontSize(8.5); setInk(COLORS.muted)
      rd.ensureSpace(5)
      doc.text(normalizePdfText([`Verified by ${model.verification.verifiedBy || '—'}`, model.verification.verifiedDate].filter(Boolean).join(' · ')), margin, rd.y)
      rd.y += 6
      setInk(COLORS.text)
    }

    if (on('photos') && model.photos.length) {
      subHeading('Photos', model.photosNote)
      await drawPhotoGrid(rd, model.photos, { cols: 3, figStart: 1, maxH: 45 })
    }
  }

  // =====================================================================
  // Page 2 — response, verification, history, comments, distribution.
  // Disabled or empty sections are skipped; no page 2 when nothing remains.
  // =====================================================================
  const respWanted = on('response') && (!!model.response || !(model.closed && model.verified))
  const verWanted = on('verification') && !(model.closed && model.verified)
  const histWanted = on('history') && model.history.length > 0
  const comWanted = on('comments') && model.comments.length > 0
  const distWanted = on('distribution') && !!model.distribution
  if (respWanted || verWanted || histWanted || comWanted || distWanted) rd.newPage()

  // Contractor response
  if (respWanted) {
  subHeading('Contractor response')
  if (model.response) {
    bodyText(model.response.correctiveAction)
    doc.setFontSize(8.5); setInk(COLORS.muted)
    rd.ensureSpace(5)
    doc.text(normalizePdfText([
      model.response.completedDate ? `Completed ${model.response.completedDate}` : '',
      model.response.respondedBy ? `By ${model.response.respondedBy}` : '',
    ].filter(Boolean).join(' · ') || 'Recorded in cxma'), margin, rd.y)
    rd.y += 7
    setInk(COLORS.text)
  } else {
    doc.setFontSize(8.5); setInk(COLORS.muted)
    doc.text('To be completed by the assigned party and returned to the CxA, or entered directly in cxma.', margin, rd.y)
    rd.y += 5
    const boxTop = rd.y
    const boxH = 46
    hairline(); doc.rect(margin, boxTop, contentW, boxH, 'S')
    doc.setFontSize(8.5); setInk(COLORS.muted)
    doc.text('Corrective action taken', margin + 4, boxTop + 6)
    for (let i = 0; i < 3; i++) ruledLine(margin + 4, contentW - 8, boxTop + 13 + i * 7)
    const thirdW = (contentW - 8) / 3
    hairline(); doc.line(margin, boxTop + 34, pageW - margin, boxTop + 34)
    const labels = ['Date completed', 'Name · company', 'Signature']
    labels.forEach((lb, i) => {
      const x = margin + 4 + i * thirdW
      doc.text(lb, x, boxTop + 39)
      ruledLine(x, thirdW - 8, boxTop + 44)
      if (i > 0) { hairline(); doc.line(margin + i * thirdW, boxTop + 34, margin + i * thirdW, boxTop + boxH) }
    })
    setInk(COLORS.text)
    rd.y = boxTop + boxH + 8
  }
  }

  // CxA verification (page 2 unless already shown on page 1)
  if (verWanted) {
    subHeading('CxA verification')
    if (model.verification) {
      doc.setFont(SANS, 'bold'); doc.setFontSize(10); setInk(COLORS.heading)
      rd.ensureSpace(6)
      doc.text(normalizePdfText(model.verification.outcomeLabel), margin, rd.y)
      rd.y += 5.2
      doc.setFont(SANS, 'normal'); setInk(COLORS.text)
      if (model.verification.notes) bodyText(model.verification.notes, 9.5, 4.6)
      doc.setFontSize(8.5); setInk(COLORS.muted)
      rd.ensureSpace(5)
      doc.text(normalizePdfText([`Verified by ${model.verification.verifiedBy || '—'}`, model.verification.verifiedDate].filter(Boolean).join(' · ')), margin, rd.y)
      rd.y += 7
      setInk(COLORS.text)
    } else {
      const boxTop = rd.y
      const boxH = 46
      hairline(); doc.rect(margin, boxTop, contentW, boxH, 'S')
      // checkbox row
      const options = ['Verified, issue closed', 'Not resolved, remains open', 'Accepted by Owner as-is']
      doc.setFontSize(9); setInk(COLORS.text)
      let cx = margin + 4
      for (const opt of options) {
        doc.setDrawColor(...c(COLORS.heading)); doc.setLineWidth(0.3)
        doc.rect(cx, boxTop + 3.4, 3.4, 3.4, 'S')
        doc.text(opt, cx + 5, boxTop + 6.3)
        cx += 5 + doc.getTextWidth(opt) + 10
      }
      hairline(); doc.line(margin, boxTop + 10, pageW - margin, boxTop + 10)
      doc.setFontSize(8.5); setInk(COLORS.muted)
      doc.text('Verification notes / back-check', margin + 4, boxTop + 15)
      ruledLine(margin + 4, contentW - 8, boxTop + 21)
      ruledLine(margin + 4, contentW - 8, boxTop + 27)
      hairline(); doc.line(margin, boxTop + 31, pageW - margin, boxTop + 31)
      const halfW = (contentW - 8) / 2
      doc.text('Verified by', margin + 4, boxTop + 36)
      ruledLine(margin + 4, halfW - 8, boxTop + 42)
      hairline(); doc.line(margin + halfW, boxTop + 31, margin + halfW, boxTop + boxH)
      doc.text('Date', margin + halfW + 4, boxTop + 36)
      ruledLine(margin + halfW + 4, halfW - 8, boxTop + 42)
      setInk(COLORS.text)
      rd.y = boxTop + boxH + 8
    }
  }

  // History
  if (histWanted) {
    subHeading('History')
    doc.setFontSize(8.3); setInk(COLORS.muted)
    for (const l of splitText(doc, 'Plain-language summary of the change log. Repeated edits within an hour are combined; saves with no changes are hidden.', contentW)) {
      doc.text(l, margin, rd.y); rd.y += 4
    }
    rd.y += 2
    setInk(COLORS.text)
    const dateW = 30
    const byW = 28
    const textW = contentW - dateW - byW - 6
    for (const h of model.history) {
      doc.setFont(SANS, h.bold ? 'bold' : 'normal'); doc.setFontSize(9)
      const lines = splitText(doc, normalizePdfText(h.text), textW)
      if (rd.y + lines.length * 4.4 + 7.4 > rd.bottomLimit) rd.newPage()
      const top = rd.y
      doc.setFont(SANS, h.red ? 'bold' : 'normal'); doc.setFontSize(8.5)
      if (h.red) doc.setTextColor(...RED); else setInk(COLORS.muted)
      doc.text(normalizePdfText(h.date), margin, top)
      doc.setFont(SANS, h.bold ? 'bold' : 'normal'); doc.setFontSize(9)
      if (h.red) doc.setTextColor(...RED); else setInk(h.bold ? c(COLORS.heading) : c(COLORS.text))
      lines.forEach((l: string, i: number) => doc.text(l, margin + dateW, top + i * 4.4))
      doc.setFont(SANS, 'normal'); doc.setFontSize(8.5); setInk(COLORS.muted)
      doc.text(normalizePdfText(h.by), pageW - margin, top, { align: 'right' })
      setInk(COLORS.text)
      // The separator sits clear below the row's LAST wrapped line, with
      // padding before the next row so it never clips ascenders.
      const lastBaseline = top + (lines.length - 1) * 4.4
      const ruleY = lastBaseline + 2.6
      hairline(); doc.line(margin, ruleY, pageW - margin, ruleY)
      rd.y = ruleY + 4.8
    }
    rd.y += 3
  }

  // Comments
  if (comWanted) {
    subHeading('Comments')
    for (const cm of model.comments) {
      doc.setFont(SANS, 'bold'); doc.setFontSize(9); setInk(COLORS.heading)
      rd.ensureSpace(10)
      doc.text(normalizePdfText([cm.author || 'Comment', cm.date].filter(Boolean).join(' · ')), margin, rd.y)
      rd.y += 4.6
      doc.setFont(SANS, 'normal'); doc.setFontSize(9.3); setInk(COLORS.text)
      for (const l of splitText(doc, normalizePdfText(cm.text), contentW - 2)) {
        rd.ensureSpace(4.6)
        doc.text(l, margin + 1, rd.y)
        rd.y += 4.6
      }
      rd.y += 3
    }
  }

  // Distribution
  if (distWanted) {
    rd.ensureSpace(12)
    rd.y += 2
    doc.setFont(SANS, 'bold'); doc.setFontSize(9); setInk(COLORS.heading)
    doc.text('Distribution', margin, rd.y)
    doc.setFont(SANS, 'normal'); doc.setFontSize(9); setInk(COLORS.text)
    const dx = margin + 28
    for (const l of splitText(doc, normalizePdfText(model.distribution), contentW - 28)) {
      doc.text(l, dx, rd.y)
      rd.y += 4.6
    }
  }

  const bytes = rd.output()
  return stampPageXofY(bytes)
}

// Activity report PDF renderer (Stage 1 redesign — docs/activity_report_redesign.md).
// Renders the mockup's six-section structure from the view-model in model.ts
// on the shared report kit: custom cover+summary page, meeting minutes,
// issues log, equipment status matrix, photo log, attendance & sign-off.
// Equipment detail ships as an optional merged appendix; continuous
// "Page X of Y" is stamped post-merge via core/merge.stampPageXofY.
import { ReportDoc } from '../../core/frame'
import { COLORS, MONO, SANS } from '../../core/tokens'
import { fitImageToHeight, loadPhoto } from '../../core/images'
import { normalizePdfText, splitText } from '../../core/text'
import { drawTable } from '../../core/table'
import { stampPageXofY } from '../../core/merge'
import type { ActivityReportModel, PhotoVM, SeverityBucket } from './model'

export interface ActivityPdfOptions {
  project?: any
  sections?: { minutes?: boolean; issues?: boolean; equipment?: boolean; photos?: boolean }
  /** Max photos in the in-body photo log (default 6). */
  photoLogLimit?: number
  /** Render the full photo set as an in-document appendix (default: when more photos exist than the log shows). */
  includePhotoAppendix?: boolean
  /** Pre-generated full equipment report PDFs, merged after the core report (Appendix B). */
  equipmentAppendixBytes?: ArrayBuffer[]
  /** Raw PDF attachments appended at the very end. */
  attachmentsPdfBytes?: ArrayBuffer[]
}

const SEV_STYLE: Record<SeverityBucket, { text: [number, number, number]; bg: [number, number, number] }> = {
  High: { text: [185, 28, 28], bg: [254, 226, 226] },
  Medium: { text: [180, 83, 9], bg: [254, 243, 199] },
  Low: { text: [71, 85, 105], bg: [241, 245, 249] },
}
const ACCENT_REF: [number, number, number] = [180, 83, 9]
const GREEN: [number, number, number] = [21, 128, 61]

const c = (t: readonly number[]) => [t[0], t[1], t[2]] as [number, number, number]

export async function generateActivityReportPdf(model: ActivityReportModel, opts: ActivityPdfOptions = {}): Promise<Uint8Array> {
  const rd = await ReportDoc.create({
    title: model.runningTitle,
    footerLabel: model.footerLabel,
    project: opts.project,
    firstPageHeader: false,
    pageNumbers: false, // stamped post-merge for a continuous count
    footerDate: false,
    titleFontSize: 11,
  })
  const doc = rd.doc as any
  const margin = rd.margin
  const contentW = rd.contentWidth
  const pageW = rd.pageWidth
  const on = (k: keyof NonNullable<ActivityPdfOptions['sections']>) => opts.sections?.[k] !== false

  const setInk = (t: readonly number[]) => doc.setTextColor(t[0], t[1], t[2])
  const hairline = () => { doc.setDrawColor(...c(COLORS.hairline)); doc.setLineWidth(0.2) }

  let sectionNo = 0
  const sectionHeading = (text: string, rightNote?: string) => {
    sectionNo++
    rd.ensureSpace(60) // short sections never start at the very bottom
    if (rd.y > rd.headerBottomY + 1) rd.y += 4
    doc.setFont(SANS, 'bold'); doc.setFontSize(15)
    setInk(COLORS.heading)
    doc.text(`${sectionNo}. ${text}`, margin, rd.y)
    if (rightNote) {
      doc.setFont(SANS, 'normal'); doc.setFontSize(8.5)
      setInk(COLORS.muted)
      doc.text(normalizePdfText(rightNote), pageW - margin, rd.y, { align: 'right' })
    }
    doc.setFillColor(...c(COLORS.brand))
    doc.rect(margin, rd.y + 2.6, 16, 1, 'F')
    hairline()
    doc.line(margin + 18, rd.y + 3.1, pageW - margin, rd.y + 3.1)
    rd.y += 10
    doc.setFont(SANS, 'normal'); doc.setFontSize(9.5)
    setInk(COLORS.text)
  }

  const subHeading = (text: string) => {
    rd.ensureSpace(14)
    doc.setFont(SANS, 'bold'); doc.setFontSize(11)
    setInk(COLORS.heading)
    doc.text(text, margin, rd.y)
    rd.y += 6
    doc.setFont(SANS, 'normal'); doc.setFontSize(9.5)
    setInk(COLORS.text)
  }

  const chip = (x: number, yTop: number, label: string, style: { text: [number, number, number]; bg: [number, number, number] }, size = 7): number => {
    doc.setFont(SANS, 'bold'); doc.setFontSize(size)
    const w = doc.getTextWidth(label) + 3.6
    const h = size * 0.55 + 1.8
    doc.setFillColor(...style.bg)
    doc.roundedRect(x, yTop, w, h, 1, 1, 'F')
    doc.setTextColor(...style.text)
    doc.text(label, x + 1.8, yTop + h - 1.3)
    setInk(COLORS.text)
    doc.setFont(SANS, 'normal')
    return w
  }

  // =====================================================================
  // Page 1 — cover + summary
  // =====================================================================
  {
    let y = margin + 2
    const logos = rd.logos
    const logoH = 13
    try {
      if (logos.left?.dataUrl) {
        const dim = fitImageToHeight(logos.left, logoH, 40, 34)
        doc.addImage(logos.left.dataUrl, logos.left.format || 'PNG', margin, y, dim.w, dim.h)
        doc.setFont(SANS, 'bold'); doc.setFontSize(9.5); setInk(COLORS.heading)
        doc.text(normalizePdfText(String(opts.project?.client || '')), margin + dim.w + 3, y + 5)
        doc.setFont(SANS, 'normal'); doc.setFontSize(8); setInk(COLORS.muted)
        doc.text('Owner', margin + dim.w + 3, y + 9.5)
      }
    } catch (e) { /* ignore */ }
    try {
      if (logos.right?.dataUrl) {
        const dim = fitImageToHeight(logos.right, logoH, 40, 34)
        doc.addImage(logos.right.dataUrl, logos.right.format || 'PNG', pageW - margin - dim.w, y, dim.w, dim.h)
        doc.setFont(SANS, 'normal'); doc.setFontSize(8); setInk(COLORS.muted)
        doc.text('Commissioning Authority', pageW - margin, y + logoH + 4, { align: 'right' })
      }
    } catch (e) { /* ignore */ }
    y += logoH + 7
    doc.setDrawColor(...c(COLORS.accent)); doc.setLineWidth(0.7)
    doc.line(margin, y, pageW - margin, y)
    y += 9

    doc.setFont(SANS, 'bold'); doc.setFontSize(9)
    setInk(COLORS.brand)
    try { doc.setCharSpace(0.5) } catch (e) { /* older jspdf */ }
    doc.text(normalizePdfText(model.eyebrow), margin, y)
    try { doc.setCharSpace(0) } catch (e) { /* ignore */ }
    y += 8

    doc.setFontSize(21); setInk(COLORS.heading)
    const titleLines = splitText(doc, normalizePdfText(model.title), contentW)
    for (const l of titleLines) { doc.text(l, margin, y); y += 9 }
    doc.setFont(SANS, 'normal'); doc.setFontSize(10.5); setInk(COLORS.muted)
    for (const l of splitText(doc, normalizePdfText(model.subtitle), contentW)) { doc.text(l, margin, y); y += 5.5 }
    y += 3
    setInk(COLORS.text)

    // Hero photo + caption (Fig. 1)
    if (model.heroPhoto) {
      const img = await loadPhoto(model.heroPhoto.dataUrl)
      if (img.dataUrl) {
        const dim = fitImageToHeight(img, 78, contentW, contentW)
        const x = margin + (contentW - dim.w) / 2
        doc.addImage(img.dataUrl, 'JPEG', x, y, dim.w, dim.h)
        hairline(); doc.rect(x, y, dim.w, dim.h, 'S')
        y += dim.h + 4.5
        if (model.heroPhoto.caption) {
          doc.setFontSize(8.5); setInk(COLORS.muted)
          for (const l of splitText(doc, normalizePdfText(`Fig. 1 — ${model.heroPhoto.caption}`), contentW)) { doc.text(l, margin, y); y += 4.2 }
          setInk(COLORS.text)
        }
        y += 3
      }
    }

    // Metadata strip
    {
      const cellW = contentW / model.metaStrip.length
      const cellH = 15
      hairline()
      model.metaStrip.forEach((m, i) => {
        const x = margin + i * cellW
        doc.rect(x, y, cellW, cellH, 'S')
        doc.setFont(SANS, 'normal'); doc.setFontSize(7.5); setInk(COLORS.muted)
        doc.text(m.label, x + 2.5, y + 4.5)
        doc.setFont(m.mono ? MONO : SANS, m.mono ? 'normal' : 'bold'); doc.setFontSize(8.6); setInk(COLORS.heading)
        const vLines = splitText(doc, normalizePdfText(m.value), cellW - 5)
        vLines.slice(0, 2).forEach((l: string, k: number) => doc.text(l, x + 2.5, y + 9 + k * 4))
      })
      doc.setFont(SANS, 'normal'); setInk(COLORS.text)
      y += cellH + 5
    }

    // KPI tiles
    if (model.kpis.length) {
      const gap = 4
      const tileW = (contentW - gap * (model.kpis.length - 1)) / model.kpis.length
      const tileH = 18
      model.kpis.forEach((k, i) => {
        const x = margin + i * (tileW + gap)
        doc.setFillColor(...(k.warn ? [254, 243, 199] as [number, number, number] : c(COLORS.zebra)))
        doc.rect(x, y, tileW, tileH, 'F')
        doc.setFont(SANS, 'bold'); doc.setFontSize(15)
        if (k.warn) doc.setTextColor(...ACCENT_REF); else setInk(COLORS.heading)
        doc.text(k.value, x + 3, y + 8.5)
        doc.setFont(SANS, 'normal'); doc.setFontSize(7.6); setInk(COLORS.muted)
        for (const l of splitText(doc, k.label, tileW - 6).slice(0, 2)) { doc.text(l, x + 3, y + 13); break }
      })
      setInk(COLORS.text)
      y += tileH + 7
    }

    // Next site visit (when scheduled)
    if (model.nextVisit) {
      doc.setFont(SANS, 'normal'); doc.setFontSize(9); setInk(COLORS.muted)
      doc.text(normalizePdfText(`Next site visit: ${model.nextVisit}`), margin, y)
      setInk(COLORS.text)
      y += 7
    }

    // Summary of findings (Stage 2 field; renders when present)
    if (model.summaryItems.length) {
      doc.setFont(SANS, 'bold'); doc.setFontSize(12); setInk(COLORS.heading)
      doc.text('Summary of findings', margin, y)
      y += 6.5
      doc.setFont(SANS, 'normal'); doc.setFontSize(9.8); setInk(COLORS.text)
      model.summaryItems.forEach((item, i) => {
        const lines = splitText(doc, normalizePdfText(item), contentW - 8)
        doc.setFont(SANS, 'bold')
        doc.text(`${i + 1}.`, margin + 1, y)
        doc.setFont(SANS, 'normal')
        for (const l of lines) { doc.text(l, margin + 7, y); y += 5 }
        y += 1.5
      })
    }
    rd.y = y
    sectionNo = 1 // the cover is section 1
  }

  // =====================================================================
  // 2. Meeting minutes
  // =====================================================================
  if (on('minutes') && model.sessions.length) {
    rd.newPage()
    sectionHeading('Meeting minutes')
    const railW = 42
    const bodyX = margin + railW + 4
    const bodyW = contentW - railW - 4
    for (let s = 0; s < model.sessions.length; s++) {
      const sess = model.sessions[s]
      rd.ensureSpace(18)
      const topY = rd.y
      // left rail
      doc.setFont(SANS, 'bold'); doc.setFontSize(10); setInk(COLORS.heading)
      let railY = topY
      for (const l of splitText(doc, normalizePdfText(sess.name), railW)) { doc.text(l, margin, railY); railY += 4.6 }
      doc.setFont(SANS, 'normal'); doc.setFontSize(8.3); setInk(COLORS.muted)
      for (const m of sess.meta) {
        for (const l of splitText(doc, normalizePdfText(m), railW)) { doc.text(l, margin, railY); railY += 4 }
      }
      setInk(COLORS.text)
      // bullets
      let by = topY
      doc.setFontSize(9.5)
      for (const b of sess.bullets) {
        const leadW = b.lead ? (doc.setFont(SANS, 'bold'), doc.getTextWidth(b.lead + ' ')) : 0
        doc.setFont(SANS, 'normal')
        const full = (b.lead ? b.lead + ' ' : '') + b.text
        const lines = splitText(doc, normalizePdfText(full), bodyW - 4)
        const extra = (b.ref ? 1 : 0)
        if (by + (lines.length + extra) * 4.8 > rd.bottomLimit) {
          rd.newPage()
          by = rd.y
        }
        doc.text('•', bodyX, by)
        lines.forEach((l: string, li: number) => {
          if (li === 0 && b.lead) {
            doc.setFont(SANS, 'bold')
            doc.text(b.lead, bodyX + 4, by)
            doc.setFont(SANS, 'normal')
            doc.text(l.slice(b.lead.length).trimStart(), bodyX + 4 + leadW, by)
          } else {
            doc.text(l, bodyX + 4, by)
          }
          by += 4.8
        })
        if (b.closed) {
          doc.setFont(SANS, 'bold'); doc.setTextColor(...GREEN)
          doc.text('Closed', bodyX + 4, by)
          doc.setFont(SANS, 'normal'); setInk(COLORS.text)
          by += 4.8
        }
        if (b.ref) {
          doc.setFont(SANS, 'bold'); doc.setTextColor(...ACCENT_REF); doc.setFontSize(8.8)
          doc.text(normalizePdfText(b.ref), bodyX + 4, by)
          doc.setFont(SANS, 'normal'); doc.setFontSize(9.5); setInk(COLORS.text)
          by += 4.8
        }
        by += 1
      }
      rd.y = Math.max(railY, by) + 3
      if (s < model.sessions.length - 1) {
        hairline()
        doc.line(margin, rd.y, pageW - margin, rd.y)
        rd.y += 5
      }
    }
  }

  // ---- Action items (Stage 2) — rides with the minutes section, or stands
  // alone when there are no sessions.
  if (model.actionItems.length) {
    if (!(on('minutes') && model.sessions.length)) {
      rd.newPage()
      sectionHeading('Action items')
    } else {
      rd.y += 3
      subHeading('Action items')
    }
    const cols = { id: 13, owner: 32, due: 26, ref: 18 }
    const actionW = contentW - cols.id - cols.owner - cols.due - cols.ref
    const headRow = () => {
      doc.setFillColor(...c(COLORS.accent))
      doc.rect(margin, rd.y, contentW, 7, 'F')
      doc.setFont(SANS, 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255)
      let hx = margin + 2
      doc.text('ID', hx, rd.y + 4.8); hx += cols.id
      doc.text('ACTION', hx, rd.y + 4.8); hx += actionW
      doc.text('OWNER', hx, rd.y + 4.8); hx += cols.owner
      doc.text('DUE', hx, rd.y + 4.8); hx += cols.due
      doc.text('REF', hx, rd.y + 4.8)
      rd.y += 9
      doc.setFont(SANS, 'normal'); setInk(COLORS.text)
    }
    headRow()
    for (const ai of model.actionItems) {
      doc.setFontSize(8.8)
      const actionLines = splitText(doc, normalizePdfText(ai.action), actionW - 4)
      const ownerLines = splitText(doc, normalizePdfText(ai.owner || '—'), cols.owner - 3)
      const dueLines = splitText(doc, normalizePdfText(ai.due || '—'), cols.due - 3)
      const refLines = splitText(doc, normalizePdfText(ai.ref), cols.ref - 2)
      const rowH = Math.max(7, Math.max(actionLines.length, ownerLines.length, dueLines.length, refLines.length) * 4.2 + 3)
      if (rd.y + rowH > rd.bottomLimit) { rd.newPage(); headRow() }
      const top = rd.y
      let x = margin + 2
      doc.setFont(MONO, 'normal'); setInk(ai.done ? COLORS.muted : COLORS.heading)
      doc.text(ai.id, x, top + 4); x += cols.id
      doc.setFont(SANS, 'normal'); setInk(ai.done ? COLORS.muted : COLORS.text)
      actionLines.forEach((l: string, i: number) => doc.text(l, x, top + 4 + i * 4.2)); x += actionW
      ownerLines.forEach((l: string, i: number) => doc.text(l, x, top + 4 + i * 4.2)); x += cols.owner
      dueLines.forEach((l: string, i: number) => doc.text(l, x, top + 4 + i * 4.2)); x += cols.due
      setInk(COLORS.muted)
      refLines.forEach((l: string, i: number) => doc.text(l, x, top + 4 + i * 4.2))
      setInk(COLORS.text)
      rd.y = top + rowH
      hairline(); doc.line(margin, rd.y, pageW - margin, rd.y)
      rd.y += 1.5
    }
    rd.y += 4
  }

  // =====================================================================
  // 3. Issues log
  // =====================================================================
  if (on('issues') && (model.issues.length || model.observations.length)) {
    rd.newPage()
    const cts = model.issueCounts
    const note = [
      cts.high ? `${cts.high} High` : '', cts.medium ? `${cts.medium} Medium` : '', cts.low ? `${cts.low} Low` : '',
    ].filter(Boolean).join('   ') + (cts.fromWalk || cts.fromChecklists ? `   · ${cts.fromWalk} from site walk, ${cts.fromChecklists} from checklists` : '')
    sectionHeading('Issues log', note)
    doc.setFontSize(8.5); setInk(COLORS.muted)
    for (const l of splitText(doc, 'All open issues on equipment in this activity’s scope, plus issues linked directly to the activity. Full history in the project issues log.', contentW)) {
      doc.text(l, margin, rd.y); rd.y += 4
    }
    rd.y += 3
    setInk(COLORS.text)

    const leftW = 22
    const thumbW = 30
    const midX = margin + leftW
    for (const iss of model.issues) {
      const hasThumb = !!iss.photoSrc && !iss.sameAs
      const midW = contentW - leftW - (hasThumb ? thumbW + 4 : 0)
      doc.setFont(SANS, 'bold'); doc.setFontSize(10)
      const titleTxt = [iss.tag, iss.title].filter(Boolean).join(' · ')
      const titleLines = splitText(doc, normalizePdfText(titleTxt), midW)
      doc.setFont(SANS, 'normal'); doc.setFontSize(9.3)
      const descLines = splitText(doc, normalizePdfText(iss.description), midW)
      const fixLines = iss.recommendation ? splitText(doc, normalizePdfText('Fix: ' + iss.recommendation), midW) : []
      doc.setFontSize(8.3)
      const metaLines = splitText(doc, normalizePdfText(iss.metaLine), midW)
      const textH = titleLines.length * 4.6 + descLines.length * 4.4 + fixLines.length * 4.4 + metaLines.length * 3.8 + 4
      const rowH = Math.max(textH, hasThumb ? 26 : 0, 14)
      if (rd.y + rowH + 4 > rd.bottomLimit) rd.newPage()
      const top = rd.y

      // left: number, chip, status
      doc.setFont(MONO, 'normal'); doc.setFontSize(10.5); setInk(COLORS.heading)
      doc.text(`#${iss.number}`, margin, top + 3.5)
      chip(margin, top + 6, iss.severity.toUpperCase(), SEV_STYLE[iss.severity])
      doc.setFont(SANS, 'normal'); doc.setFontSize(8); setInk(COLORS.muted)
      doc.text(iss.status, margin, top + 15)
      setInk(COLORS.text)

      // middle
      let ty = top + 3.5
      doc.setFont(SANS, 'bold'); doc.setFontSize(10); setInk(COLORS.heading)
      for (const l of titleLines) { doc.text(l, midX, ty); ty += 4.6 }
      doc.setFont(SANS, 'normal'); doc.setFontSize(9.3); setInk(COLORS.text)
      for (const l of descLines) { doc.text(l, midX, ty); ty += 4.4 }
      if (fixLines.length) {
        fixLines.forEach((l: string, li: number) => {
          if (li === 0) {
            doc.setFont(SANS, 'bold')
            doc.text('Fix:', midX, ty)
            doc.setFont(SANS, 'normal')
            doc.text(l.replace(/^Fix:\s*/, ''), midX + doc.getTextWidth('Fix: ') + 0.5, ty)
          } else doc.text(l, midX, ty)
          ty += 4.4
        })
      }
      doc.setFontSize(8.3); setInk(COLORS.muted)
      for (const l of metaLines) { doc.text(l, midX, ty); ty += 3.8 }
      setInk(COLORS.text)

      // thumbnail
      if (hasThumb) {
        try {
          const img = await loadPhoto(iss.photoSrc, { maxEdge: 480 })
          if (img.dataUrl) {
            const dim = fitImageToHeight(img, 24, thumbW, thumbW)
            const tx = pageW - margin - dim.w
            doc.addImage(img.dataUrl, 'JPEG', tx, top, dim.w, dim.h)
            hairline(); doc.rect(tx, top, dim.w, dim.h, 'S')
          }
        } catch (e) { /* ignore */ }
      }

      rd.y = top + rowH + 2
      hairline()
      doc.line(margin, rd.y, pageW - margin, rd.y)
      rd.y += 4.5
    }

    if (model.observations.length) {
      const obsLines: string[][] = model.observations.map(o => splitText(doc, normalizePdfText(o), contentW - 8))
      const boxH = 7 + obsLines.reduce((a, l) => a + l.length * 4.4 + 1.5, 0) + 2
      if (rd.y + boxH > rd.bottomLimit) rd.newPage()
      doc.setFillColor(...c(COLORS.zebra))
      doc.rect(margin, rd.y, contentW, boxH, 'F')
      hairline(); doc.rect(margin, rd.y, contentW, boxH, 'S')
      let oy = rd.y + 5.5
      doc.setFont(SANS, 'bold'); doc.setFontSize(9.3); setInk(COLORS.heading)
      doc.text('Observation (not a deficiency)', margin + 4, oy)
      oy += 5
      doc.setFont(SANS, 'normal'); doc.setFontSize(9); setInk(COLORS.text)
      for (const lines of obsLines) {
        for (const l of lines) { doc.text(l, margin + 4, oy); oy += 4.4 }
        oy += 1.5
      }
      rd.y += boxH + 4
    }
  }

  // =====================================================================
  // 4. Equipment status
  // =====================================================================
  if (on('equipment') && model.equipmentRows.length) {
    rd.newPage()
    sectionHeading('Equipment status')
    doc.setFontSize(8.5); setInk(COLORS.muted)
    doc.text('Prefunctional checklist (PFC) progress as of this visit.' + (opts.equipmentAppendixBytes?.length ? ' Full equipment detail is in the appendix.' : ''), margin, rd.y)
    rd.y += 6
    setInk(COLORS.text)

    const cols = { tag: 24, name: 52, make: 38, bar: 26, pfc: 16, fpt: 14 }
    const issuesX = pageW - margin - 12
    const headRow = () => {
      doc.setFillColor(...c(COLORS.accent))
      doc.rect(margin, rd.y, contentW, 7, 'F')
      doc.setFont(SANS, 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255)
      let hx = margin + 2
      doc.text('TAG', hx, rd.y + 4.8); hx += cols.tag
      doc.text('EQUIPMENT', hx, rd.y + 4.8); hx += cols.name
      doc.text('MAKE / MODEL', hx, rd.y + 4.8); hx += cols.make
      doc.text('PFC COMPLETE', hx, rd.y + 4.8)
      doc.text('FPT', hx + cols.bar + cols.pfc, rd.y + 4.8)
      doc.text('ISSUES', pageW - margin - 2, rd.y + 4.8, { align: 'right' })
      rd.y += 9
      doc.setFont(SANS, 'normal'); setInk(COLORS.text)
    }
    headRow()
    for (const row of model.equipmentRows) {
      doc.setFontSize(8.8)
      const nameLines = splitText(doc, normalizePdfText(row.name || '—'), cols.name - 3)
      const makeLines = splitText(doc, normalizePdfText(row.makeModel || '—'), cols.make - 3)
      const rowH = Math.max(7.5, Math.max(nameLines.length, makeLines.length) * 4.2 + 3)
      if (rd.y + rowH > rd.bottomLimit) { rd.newPage(); headRow() }
      const top = rd.y
      let x = margin + 2
      doc.setFont(MONO, 'normal'); doc.setFontSize(8.8); setInk(COLORS.heading)
      doc.text(row.tag || '—', x, top + 4); x += cols.tag
      doc.setFont(SANS, 'normal'); setInk(COLORS.text)
      nameLines.forEach((l: string, i: number) => doc.text(l, x, top + 4 + i * 4.2)); x += cols.name
      setInk(COLORS.muted)
      makeLines.forEach((l: string, i: number) => doc.text(l, x, top + 4 + i * 4.2)); x += cols.make
      setInk(COLORS.text)
      // PFC progress bar + counts
      if (row.pfcTotal > 0) {
        const frac = row.pfcDone / row.pfcTotal
        doc.setFillColor(226, 232, 240)
        doc.rect(x, top + 1.4, cols.bar - 4, 2.6, 'F')
        const fill: [number, number, number] = frac < 0.6 ? ACCENT_REF : c(COLORS.brand)
        doc.setFillColor(...fill)
        doc.rect(x, top + 1.4, Math.max(0.8, (cols.bar - 4) * Math.min(1, frac)), 2.6, 'F')
        doc.setFontSize(8.8)
        doc.text(`${row.pfcDone}/${row.pfcTotal}`, x + cols.bar, top + 4)
      } else {
        doc.text('—', x + cols.bar, top + 4)
      }
      x += cols.bar + cols.pfc
      doc.text(row.fptTotal > 0 ? `${row.fptDone}/${row.fptTotal}` : '—', x, top + 4)
      // issues count, colored by worst severity
      doc.setFont(SANS, 'bold')
      if (row.openIssues > 0) doc.setTextColor(...SEV_STYLE[row.worstSeverity || 'Low'].text)
      else setInk(COLORS.muted)
      doc.text(String(row.openIssues), issuesX + 10, top + 4, { align: 'right' })
      doc.setFont(SANS, 'normal'); setInk(COLORS.text)
      rd.y = top + rowH
      hairline(); doc.line(margin, rd.y, pageW - margin, rd.y)
      rd.y += 1.5
    }
    rd.y += 5

    if (model.remainingByTrade.length) {
      subHeading('Remaining PFC items by trade')
      doc.setFontSize(9)
      for (const t of model.remainingByTrade) {
        const shown = t.items.slice(0, 6)
        const suffix = t.count > shown.length ? ` · +${t.count - shown.length} more` : ''
        const text = `${t.trade} (${t.count}) — ${shown.join('; ')}${suffix}`
        const lines = splitText(doc, normalizePdfText(text), contentW)
        rd.ensureSpace(lines.length * 4.4 + 2)
        lines.forEach((l: string, i: number) => {
          if (i === 0) {
            doc.setFont(SANS, 'bold')
            const lead = `${t.trade} (${t.count}) — `
            doc.text(lead, margin, rd.y)
            doc.setFont(SANS, 'normal')
            doc.text(l.slice(lead.length), margin + doc.getTextWidth(lead), rd.y)
          } else {
            doc.text(l, margin, rd.y)
          }
          rd.y += 4.4
        })
        rd.y += 2
      }
    }
  }

  // =====================================================================
  // 5. Photo log
  // =====================================================================
  const photoLimit = opts.photoLogLimit ?? 6
  const logPhotos = model.photos.slice(model.heroPhoto ? 1 : 0, (model.heroPhoto ? 1 : 0) + photoLimit)
  const appendixPhotos = model.photos.slice(model.heroPhoto ? 1 : 0)
  const wantPhotoAppendix = opts.includePhotoAppendix ?? (appendixPhotos.length > logPhotos.length)
  const figStart = model.heroPhoto ? 2 : 1

  const drawPhotoGrid = async (photos: PhotoVM[], startFig: number) => {
    const gap = 6
    const cellW = (contentW - gap) / 2
    let col = 0
    let rowTop = rd.y
    let rowMaxH = 0
    for (let i = 0; i < photos.length; i++) {
      const p = photos[i]
      const img = await loadPhoto(p.dataUrl)
      if (!img.dataUrl) continue
      const dim = fitImageToHeight(img, 58, cellW, cellW)
      doc.setFontSize(8.5)
      const capLines = p.caption ? splitText(doc, normalizePdfText(p.caption), cellW).slice(0, 3) : []
      const cellH = dim.h + 6 + capLines.length * 4 + 4
      if (col === 0 && rowTop + cellH > rd.bottomLimit) {
        rd.newPage()
        rowTop = rd.y
      }
      const x = margin + col * (cellW + gap)
      doc.addImage(img.dataUrl, 'JPEG', x, rowTop, dim.w, dim.h)
      hairline(); doc.rect(x, rowTop, dim.w, dim.h, 'S')
      let cy = rowTop + dim.h + 4.5
      doc.setFont(SANS, 'bold'); doc.setFontSize(8.8); setInk(COLORS.heading)
      const figLabel = `Fig. ${startFig + i}`
      doc.text(figLabel, x, cy)
      // Equipment tag + linked-issue chips after the figure number (Stage 2 meta)
      let chipX = x + doc.getTextWidth(figLabel) + 2.5
      for (const t of (p.tags || []).slice(0, 3)) {
        chipX += chip(chipX, cy - 3.4, t, { text: c(COLORS.heading), bg: c(COLORS.zebra) }, 6.6) + 1.6
      }
      for (const r of (p.issueRefs || []).slice(0, 3)) {
        chipX += chip(chipX, cy - 3.4, r, SEV_STYLE.High, 6.6) + 1.6
      }
      doc.setFont(SANS, 'normal'); setInk(COLORS.text)
      cy += 4.4
      doc.setFontSize(8.5)
      for (const l of capLines) { doc.text(l, x, cy); cy += 4 }
      rowMaxH = Math.max(rowMaxH, cellH)
      if (col === 1 || i === photos.length - 1) {
        rowTop += rowMaxH + 4
        rowMaxH = 0
        rd.y = rowTop
      }
      col = col === 1 ? 0 : col + 1
    }
    rd.y = rowTop + (rowMaxH ? rowMaxH + 4 : 0)
  }

  if (on('photos') && logPhotos.length) {
    rd.newPage()
    sectionHeading('Photo log', wantPhotoAppendix ? `${logPhotos.length} of ${appendixPhotos.length} photos shown · full set in the appendix` : undefined)
    await drawPhotoGrid(logPhotos, figStart)
  }

  // =====================================================================
  // 6. Attendance, appendices, revision & sign-off
  // =====================================================================
  {
    rd.newPage()
    if (model.attendees.length) {
      sectionHeading('Attendance & distribution')
      doc.setFontSize(8.5); setInk(COLORS.muted)
      doc.text('● present · ○ distribution only', margin, rd.y)
      rd.y += 6
      setInk(COLORS.text)
      const colW = (contentW - 8) / 2
      const half = Math.ceil(model.attendees.length / 2)
      const colsArr = [model.attendees.slice(0, half), model.attendees.slice(half)]
      const topY = rd.y
      let maxY = topY
      colsArr.forEach((list, ci) => {
        const x = margin + ci * (colW + 8)
        let ay = topY
        for (const a of list) {
          const nameTxt = `${a.present ? '●' : '○'}  ${a.name}`
          doc.setFont(SANS, a.present ? 'bold' : 'normal'); doc.setFontSize(9.3)
          if (!a.present) setInk(COLORS.muted); else setInk(COLORS.heading)
          doc.text(normalizePdfText(nameTxt), x, ay)
          doc.setFont(SANS, 'normal'); doc.setFontSize(8.3); setInk(COLORS.muted)
          const orgLines = splitText(doc, normalizePdfText(a.org || ''), colW - 44)
          orgLines.slice(0, 2).forEach((l: string, li: number) => doc.text(l, x + 44, ay + li * 3.8))
          const rowH = Math.max(1, orgLines.slice(0, 2).length) * 3.8 + 2.6
          ay += rowH
          hairline(); doc.line(x, ay - 1.8, x + colW, ay - 1.8)
        }
        maxY = Math.max(maxY, ay)
      })
      setInk(COLORS.text)
      rd.y = maxY + 6
    } else {
      sectionNo++
    }

    // Appendices list
    const appendixList: Array<{ letter: string; label: string; note: string }> = []
    if (opts.equipmentAppendixBytes?.length) appendixList.push({ letter: 'A', label: 'Equipment reports — checklists, tests and detail per unit', note: `${opts.equipmentAppendixBytes.length} report${opts.equipmentAppendixBytes.length === 1 ? '' : 's'}` })
    if (wantPhotoAppendix) appendixList.push({ letter: appendixList.length ? 'B' : 'A', label: 'Complete photo set with captions', note: `${appendixPhotos.length} photos` })
    if (appendixList.length) {
      subHeading('Appendices')
      for (const a of appendixList) {
        rd.ensureSpace(8)
        doc.setFont(SANS, 'bold'); doc.setFontSize(9.3); setInk(COLORS.heading)
        doc.text(a.letter, margin + 1, rd.y)
        doc.setFont(SANS, 'normal'); setInk(COLORS.text)
        doc.text(normalizePdfText(a.label), margin + 8, rd.y)
        doc.setFontSize(8.5); setInk(COLORS.muted)
        doc.text(a.note, pageW - margin, rd.y, { align: 'right' })
        setInk(COLORS.text); doc.setFontSize(9.3)
        rd.y += 3
        hairline(); doc.line(margin, rd.y, pageW - margin, rd.y)
        rd.y += 5
      }
      rd.y += 2
    }

    // Revision & sign-off
    subHeading('Revision & sign-off')
    drawTable(rd, {
      columns: [
        { key: 'rev', label: 'Rev', weight: 0.6 },
        { key: 'date', label: 'Date', weight: 1.2 },
        { key: 'description', label: 'Description', weight: 3.4 },
        { key: 'by', label: 'By', weight: 1.2 },
      ],
      rows: model.revisionRows,
    })
    rd.y += 14
    rd.ensureSpace(20)
    const sigW = (contentW - 12) / 2
    const sigY = rd.y + 8
    const sig = (x: number, who: string) => {
      doc.setDrawColor(...c(COLORS.heading)); doc.setLineWidth(0.3)
      doc.line(x, sigY, x + sigW, sigY)
      doc.setFont(SANS, 'bold'); doc.setFontSize(9); setInk(COLORS.heading)
      doc.text(normalizePdfText(who), x, sigY + 4.5)
      doc.setFont(SANS, 'normal'); doc.setFontSize(8); setInk(COLORS.muted)
      doc.text('Date', x, sigY + 8.5)
      setInk(COLORS.text)
    }
    sig(margin, model.preparedBy ? `Prepared by — ${model.preparedBy}` : 'Prepared by')
    sig(margin + sigW + 12, model.reviewedBy ? `Reviewed by — ${model.reviewedBy}` : 'Reviewed by')
    rd.y = sigY + 12
  }

  // =====================================================================
  // In-document photo appendix, then merge equipment/attachment PDFs and
  // stamp continuous page numbers.
  // =====================================================================
  if (wantPhotoAppendix && appendixPhotos.length) {
    rd.newPage()
    doc.setFont(SANS, 'bold'); doc.setFontSize(15); setInk(COLORS.heading)
    doc.text('Appendix — Complete photo set', margin, rd.y)
    doc.setFillColor(...c(COLORS.brand))
    doc.rect(margin, rd.y + 2.6, 16, 1, 'F')
    hairline(); doc.line(margin + 18, rd.y + 3.1, pageW - margin, rd.y + 3.1)
    rd.y += 10
    doc.setFont(SANS, 'normal'); doc.setFontSize(9.5); setInk(COLORS.text)
    await drawPhotoGrid(appendixPhotos, figStart)
  }

  let bytes: ArrayBuffer = rd.output()

  const mergeList = [...(opts.equipmentAppendixBytes || []), ...(opts.attachmentsPdfBytes || [])]
  if (mergeList.length) {
    try {
      const { PDFDocument } = await import('pdf-lib')
      const merged = await PDFDocument.load(bytes)
      for (const b of mergeList) {
        try {
          const pdf = await PDFDocument.load(b)
          const pages = await merged.copyPages(pdf, pdf.getPageIndices())
          pages.forEach((p: any) => merged.addPage(p))
        } catch (e) { /* skip unloadable */ }
      }
      bytes = (await merged.save()).buffer as ArrayBuffer
    } catch (e) { /* keep core report */ }
  }

  return stampPageXofY(bytes)
}

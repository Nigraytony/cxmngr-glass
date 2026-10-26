// Issue Sheets — the compact batch report (issues-compact-mockup.pdf): the
// card deck you hand a contractor. Portrait, 3–4 cards per page, a card
// NEVER splits across pages. Each card: priority-colored top border,
// number + title, chips (priority/status/overdue/life-safety/from-checklist),
// clamped Condition/Action lines, a muted meta line, and the first photo as
// a right-side thumbnail with a "+N more photos" note.
import http from '../../../utils/http'
import { ReportDoc } from '../../core/frame'
import { COLORS, MONO, SANS } from '../../core/tokens'
import { normalizePdfText, splitText } from '../../core/text'
import { fitImageToHeight, loadPhoto } from '../../core/images'
import { stampPageXofY } from '../../core/merge'
import { deliverPdfBytes, reportFileName } from '../../core/deliver'
import { CRITICAL_STYLE, GREEN_STYLE, RED, SEV_STYLE, chip, outlineChip } from '../../core/blocks'
import { daysPast, formatDateOnly } from '../../core/dates'
import { formatPerson, plainText, priorityBucket, shortCompany, type PriorityKey } from './model'

const c = (t: readonly number[]) => [t[0], t[1], t[2]] as [number, number, number]
const PRIORITY_BAR: Record<PriorityKey, [number, number, number]> = {
  Critical: [185, 28, 28],
  High: [220, 38, 38],
  Medium: [217, 119, 6],
  Low: [148, 163, 184],
}

interface CardVM {
  number: string
  title: string
  priority: PriorityKey
  closed: boolean
  statusLabel: string
  overdue: string | null
  lifeSafety: boolean
  checklistChip: string
  condition: string
  action: string
  meta: string
  sameCondition: string
  photo?: string
  morePhotos: number
}

/** "Nigel Gray (Energy Management Consulting, LLC.)" -> "N. Gray". */
function initials(raw: any): string {
  const s = formatPerson(raw).split('·')[0].trim()
  if (!s) return ''
  const parts = s.split(/\s+/)
  if (parts.length === 1) return parts[0]
  return `${parts[0][0]}. ${parts[parts.length - 1]}`
}

function buildCard(i: any, shortMap: Record<string, string>, now: Date, sameOf: Map<string, string[]>): CardVM {
  const priority = priorityBucket(i?.severity || i?.priority)
  const closed = ['closed', 'cancelled'].includes(String(i?.status || '').toLowerCase())
  const days = daysPast(i?.dueDate, now)
  let overdue: string | null = null
  if (closed) overdue = i?.closedDate ? `Closed ${formatDateOnly(i.closedDate)}` : null
  else if (days !== null && days > 0) overdue = `Overdue ${days} day${days === 1 ? '' : 's'}`

  const fromChecklist = String(i?.origin || '').toLowerCase() === 'checklist' || /^checklist\b/i.test(String(i?.title || '')) || String(i?.type || '').toLowerCase() === 'checklist'
  const title = plainText(i?.title).replace(/^Checklist:\s*/i, '')

  const metaBits = [
    i?.tag ? String(i.tag) : '',
    plainText(i?.location),
    plainText(i?.system),
    i?.dateFound ? `Found ${formatDateOnly(i.dateFound)}${i?.foundBy ? ` by ${initials(i.foundBy)}` : ''}` : '',
    i?.dueDate ? `Due ${formatDateOnly(i.dueDate)}` : '',
    i?.assignedTo ? formatPerson(i.assignedTo, shortMap) : '',
  ].filter(Boolean)

  const id = String(i?.id || i?._id || '')
  const same = sameOf.get(id)

  // Thumbnail + count resolved by the gather (Azure docs photos + legacy
  // base64 subdocs); stashed on the row as _photoSrc/_photoCount.
  const photoSrc: string | undefined = i?._photoSrc || undefined
  const photoCount: number = typeof i?._photoCount === 'number' ? i._photoCount : 0
  return {
    number: i?.number != null ? `#${i.number}` : '',
    title,
    priority,
    closed,
    statusLabel: closed ? 'CLOSED' : String(i?.status || 'Open').toUpperCase(),
    overdue,
    lifeSafety: !!i?.lifeSafety,
    checklistChip: fromChecklist ? `From checklist${i?.tag ? `: ${i.tag} PFC` : ''}` : '',
    condition: plainText(i?.description),
    action: plainText(i?.recommendation),
    meta: metaBits.join(' · '),
    sameCondition: same && same.length ? `Same condition: ${same.join(', ')}` : '',
    photo: photoSrc,
    morePhotos: Math.max(0, photoCount - 1),
  }
}

export interface IssueSheetsOptions {
  /** Plain-words filter scope shown in the running header (e.g. "Assigned to BoldAir · Open"). */
  scopeLine?: string
}

export async function generateIssueSheetsReport(issuesLike: any[], project: any, opts: IssueSheetsOptions = {}): Promise<void> {
  const now = new Date()
  const statusAsOf = now.toLocaleDateString('en-US')
  const shortMap: Record<string, string> = (project?.reportSettings && project.reportSettings.companyShortNames) || {}

  // Full records plus each issue's photos: Azure docs photos (where uploads
  // live now) win; legacy base64 subdocs are the fallback. Only the FIRST
  // photo downloads — the card shows one thumbnail and a "+N more" count.
  const { listAzureIssuePhotoFiles, downloadDocFileDataUrl } = await import('./report')
  const projectId = String(project?._id || project?.id || issuesLike[0]?.projectId || '')
  const full: any[] = []
  for (const row of issuesLike) {
    const id = String(row?.id || row?._id || '')
    let rec: any = row
    if (id) {
      try {
        const res = await http.get(`/api/issues/${id}`)
        if (res.data && typeof res.data === 'object') rec = res.data
      } catch (e) { /* light row fallback */ }
    }
    try {
      const azure = id ? await listAzureIssuePhotoFiles(projectId, id) : []
      const legacy: any[] = (Array.isArray(rec?.photos) ? rec.photos : []).filter((p: any) => p && (p.data || p.url))
      rec._photoCount = azure.length + legacy.length
      if (azure.length) rec._photoSrc = await downloadDocFileDataUrl(projectId, azure[0].id)
      if (!rec._photoSrc && legacy[0]) rec._photoSrc = String(legacy[0].data || legacy[0].url)
    } catch (e) { /* card just has no thumbnail */ }
    full.push(rec)
  }

  // Sort: priority (Critical first) then due date ascending; closed last.
  const rank: Record<PriorityKey, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 }
  full.sort((a, b) => {
    const ca = ['closed', 'cancelled'].includes(String(a?.status || '').toLowerCase()) ? 1 : 0
    const cb = ['closed', 'cancelled'].includes(String(b?.status || '').toLowerCase()) ? 1 : 0
    if (ca !== cb) return ca - cb
    const pa = rank[priorityBucket(a?.severity || a?.priority)]
    const pb = rank[priorityBucket(b?.severity || b?.priority)]
    if (pa !== pb) return pa - pb
    return String(a?.dueDate || '9999').localeCompare(String(b?.dueDate || '9999'))
  })

  // Same-condition groups by normalized description (first keeps the refs).
  const byDesc = new Map<string, any[]>()
  for (const i of full) {
    const key = plainText(i?.description).toLowerCase().replace(/\s+/g, ' ')
    if (key.length > 20) byDesc.set(key, [...(byDesc.get(key) || []), i])
  }
  const sameOf = new Map<string, string[]>()
  for (const group of byDesc.values()) {
    if (group.length < 2) continue
    const [first, ...rest] = group
    sameOf.set(String(first?.id || first?._id || ''), rest.map((r: any) => `#${r?.number ?? '?'}${r?.tag ? ` ${r.tag}` : ''}`))
  }

  const cards: CardVM[] = full.map(i => buildCard(i, shortMap, now, sameOf))

  const projectName = String(project?.name || '')
  const rd = await ReportDoc.create({
    title: [projectName, 'Issue Sheets', opts.scopeLine || ''].filter(Boolean).join(' · '),
    footerLabel: `Issue Sheets · ${cards.length} issue${cards.length === 1 ? '' : 's'} · Status as of ${statusAsOf} · cards never split across pages`,
    project,
    pageNumbers: false,
    footerDate: false,
    titleFontSize: 10,
  })
  const doc = rd.doc as any
  const margin = rd.margin
  const contentW = rd.contentWidth
  const setInk = (t: readonly number[]) => doc.setTextColor(t[0], t[1], t[2])
  const hairline = () => { doc.setDrawColor(...c(COLORS.hairline)); doc.setLineWidth(0.2) }

  const PAD = 4
  const THUMB_W = 40
  const clamp = (text: string, width: number, maxLines: number, size: number): string[] => {
    doc.setFont(SANS, 'normal'); doc.setFontSize(size)
    let lines: string[] = splitText(doc, normalizePdfText(text), width)
    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines)
      lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + ' …'
    }
    return lines
  }

  for (const card of cards) {
    const img = card.photo ? await loadPhoto(card.photo, { maxEdge: 640 }) : null
    const hasThumb = !!img?.dataUrl
    const textW = contentW - PAD * 2 - (hasThumb ? THUMB_W + 5 : 0)

    // ---- measure ---------------------------------------------------------
    doc.setFont(SANS, 'bold'); doc.setFontSize(11.5)
    const titleLines = splitText(doc, normalizePdfText(`${card.number} ${card.title}`), textW).slice(0, 2)
    const condLines = card.condition ? clamp(`Condition: ${card.condition}`, textW, 3, 9.3) : []
    const actLines = card.action ? clamp(`Action: ${card.action}`, textW, 3, 9.3) : []
    doc.setFontSize(8.3)
    const metaText = [card.meta, card.sameCondition].filter(Boolean).join(' · ')
    const metaLines = splitText(doc, normalizePdfText(metaText), contentW - PAD * 2).slice(0, 2)
    const textH = 4 + titleLines.length * 5.2 + 5.5 // title + chips row
      + (condLines.length ? condLines.length * 4.4 + 1.5 : 0)
      + (actLines.length ? actLines.length * 4.4 + 1.5 : 0)
      + metaLines.length * 3.9 + 3
    const thumbH = hasThumb ? Math.min(30, fitImageToHeight(img!, 30, THUMB_W, THUMB_W).h) + (card.morePhotos ? 4.5 : 0) + 6 : 0
    const cardH = Math.max(textH, thumbH) + PAD * 2

    if (rd.y + cardH + 2 > rd.bottomLimit) rd.newPage()
    const top = rd.y

    // ---- frame -----------------------------------------------------------
    hairline(); doc.rect(margin, top, contentW, cardH, 'S')
    doc.setFillColor(...PRIORITY_BAR[card.priority])
    doc.rect(margin, top, contentW, 1.1, 'F')

    // ---- text column ------------------------------------------------------
    const tx = margin + PAD
    let y = top + PAD + 4
    doc.setFontSize(11.5)
    for (const l of titleLines) {
      // mono number + bold title on the first line
      if (l === titleLines[0] && card.number) {
        doc.setFont(MONO, 'normal'); setInk(COLORS.muted)
        doc.text(card.number, tx, y)
        const numW = doc.getTextWidth(card.number + ' ')
        doc.setFont(SANS, 'bold'); setInk(COLORS.heading)
        doc.text(l.slice(card.number.length).trimStart(), tx + numW, y)
      } else {
        doc.setFont(SANS, 'bold'); setInk(COLORS.heading)
        doc.text(l, tx, y)
      }
      y += 5.2
    }
    // chips row
    let cx = tx
    cx += chip(doc, cx, y - 3.2, card.closed ? 'CLOSED' : card.priority.toUpperCase(), card.closed ? GREEN_STYLE : (card.priority === 'Critical' ? CRITICAL_STYLE : SEV_STYLE[card.priority === 'High' ? 'High' : card.priority === 'Medium' ? 'Medium' : 'Low']), 6.8) + 2
    if (!card.closed) cx += outlineChip(doc, cx, y - 3.2, card.statusLabel, c(COLORS.heading), 6.8) + 2
    doc.setFont(SANS, 'bold'); doc.setFontSize(8.3)
    if (card.overdue) {
      if (!card.closed) doc.setTextColor(...RED); else setInk(COLORS.muted)
      doc.text(card.overdue, cx + 1, y)
      cx += doc.getTextWidth(card.overdue) + 4
    }
    if (card.lifeSafety) {
      cx += 1 + chip(doc, cx, y - 3.2, 'Life safety', SEV_STYLE.High, 6.8) + 2
    }
    if (card.checklistChip) {
      doc.setFont(SANS, 'normal'); setInk(COLORS.muted)
      doc.text(normalizePdfText(`· ${card.checklistChip}`), cx + 1, y)
    }
    setInk(COLORS.text)
    y += 5.5

    // Lines were wrapped WITH their "Label: " prefix; the first line redraws
    // the label bold over the same position (same approach as the PDF's Fix:).
    const lead = (label: string, lines: string[]) => {
      if (!lines.length) return
      doc.setFontSize(9.3)
      lines.forEach((l, li) => {
        if (li === 0) {
          doc.setFont(SANS, 'bold'); setInk(COLORS.heading)
          doc.text(`${label}:`, tx, y)
          doc.setFont(SANS, 'normal'); setInk(COLORS.text)
          doc.text(l.replace(new RegExp(`^${label}:\\s*`), ''), tx + doc.getTextWidth(`${label}: `) + 0.5, y)
        } else {
          doc.text(l, tx, y)
        }
        y += 4.4
      })
      y += 1.5
    }
    lead('Condition', condLines)
    lead('Action', actLines)

    doc.setFont(SANS, 'normal'); doc.setFontSize(8.3); setInk(COLORS.muted)
    for (const l of metaLines) {
      // equipment tag leads the meta line in mono, like the mockup
      doc.text(l, tx, y)
      y += 3.9
    }
    setInk(COLORS.text)

    // ---- thumbnail --------------------------------------------------------
    if (hasThumb) {
      const dim = fitImageToHeight(img!, 30, THUMB_W, THUMB_W)
      const ix = margin + contentW - PAD - dim.w
      doc.addImage(img!.dataUrl, 'JPEG', ix, top + PAD, dim.w, dim.h)
      hairline(); doc.rect(ix, top + PAD, dim.w, dim.h, 'S')
      if (card.morePhotos > 0) {
        doc.setFontSize(7.6); setInk(COLORS.muted)
        doc.text(`+${card.morePhotos} more photo${card.morePhotos === 1 ? '' : 's'}`, ix, top + PAD + dim.h + 3.6)
        setInk(COLORS.text)
      }
    }

    rd.y = top + cardH + 4
  }

  const bytes = await stampPageXofY(rd.output())
  deliverPdfBytes(bytes, reportFileName([projectName, 'issue-sheets']))
}

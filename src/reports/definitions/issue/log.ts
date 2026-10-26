// Issues Log — the landscape batch table for OAC meetings (Batch-Log mockup).
// Summary band (open count, red overdue tile, open-by-priority stacked bar,
// open-by-responsible with red Unassigned), a plain-words filter line, then
// the table: # / Equipment / Issue (bold + gray summary line) / Priority
// chip / Responsible / Due / Status, sorted priority → due with closed last,
// repeated headers, rows never split, pale-red tint for unassigned/no-due.
import { ReportDoc } from '../../core/frame'
import { COLORS, MONO, SANS } from '../../core/tokens'
import { normalizePdfText, splitText } from '../../core/text'
import { stampPageXofY } from '../../core/merge'
import { deliverPdfBytes, reportFileName } from '../../core/deliver'
import { CRITICAL_STYLE, RED, SEV_STYLE, chip } from '../../core/blocks'
import { daysPast, formatDateOnly } from '../../core/dates'
import { formatPerson, plainText, priorityBucket, shortCompany, type PriorityKey } from './model'

const c = (t: readonly number[]) => [t[0], t[1], t[2]] as [number, number, number]
const PRIORITY_COLOR: Record<PriorityKey, [number, number, number]> = {
  Critical: [185, 28, 28],
  High: [220, 38, 38],
  Medium: [217, 119, 6],
  Low: [148, 163, 184],
}
const rank: Record<PriorityKey, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 }
const isClosed = (i: any) => ['closed', 'cancelled'].includes(String(i?.status || '').toLowerCase())

/** "R. Frost · BoldAir" from "Randy Frost (BoldAir)". */
function shortPerson(raw: any, map: Record<string, string>): string {
  const full = formatPerson(raw, map)
  if (!full) return ''
  const [name, co] = full.split('·').map(s => s.trim())
  const parts = (name || '').split(/\s+/)
  const short = parts.length > 1 ? `${parts[0][0]}. ${parts[parts.length - 1]}` : name
  return [short, co].filter(Boolean).join(' · ')
}

/** One-line gray summary: Issue.summary when present, else first sentence. */
function summaryLine(i: any): string {
  const s = plainText(i?.summary)
  if (s) return s.slice(0, 90)
  const desc = plainText(i?.description)
  if (!desc) return ''
  const first = desc.split(/(?<=[.!?])\s+/)[0] || desc
  return first.length > 90 ? first.slice(0, 87).replace(/\s*\S*$/, '') + '…' : first
}

export interface IssuesLogOptions {
  /** Column keys beyond the defaults (location, system, type, foundBy, dateFound). */
  columns?: string[]
  groupBy?: 'none' | 'responsible' | 'system' | 'equipment' | 'priority'
  closedLast?: boolean
  summaryBand?: boolean
  /** Plain-words filter + sort statement under the summary band. */
  filterLine?: string
}

export async function generateIssuesLogReport(issuesLike: any[], project: any, opts: IssuesLogOptions = {}): Promise<void> {
  const now = new Date()
  const statusAsOf = now.toLocaleDateString('en-US')
  const shortMap: Record<string, string> = (project?.reportSettings && project.reportSettings.companyShortNames) || {}
  const issues = issuesLike.slice()

  // ---- sort: priority → due date, closed last (default on) ---------------
  const closedLast = opts.closedLast !== false
  issues.sort((a, b) => {
    if (closedLast) {
      const ca = isClosed(a) ? 1 : 0
      const cb = isClosed(b) ? 1 : 0
      if (ca !== cb) return ca - cb
    }
    const pa = rank[priorityBucket(a?.severity || a?.priority)]
    const pb = rank[priorityBucket(b?.severity || b?.priority)]
    if (pa !== pb) return pa - pb
    return String(a?.dueDate || '9999').localeCompare(String(b?.dueDate || '9999'))
  })

  // ---- same-condition notes (by normalized description) ------------------
  const byDesc = new Map<string, any[]>()
  for (const i of issues) {
    const key = plainText(i?.description).toLowerCase().replace(/\s+/g, ' ')
    if (key.length > 20) byDesc.set(key, [...(byDesc.get(key) || []), i])
  }
  const sameNote = new Map<string, string>()
  for (const group of byDesc.values()) {
    if (group.length < 2) continue
    const [first, ...rest] = group
    sameNote.set(String(first?.id || first?._id || ''), `Same condition: ${rest.map((r: any) => `#${r?.number ?? '?'}${r?.tag ? ` ${r.tag}` : ''}`).join(', ')}`)
  }

  // ---- stats for the summary band ----------------------------------------
  const open = issues.filter(i => !isClosed(i))
  const overdue = open.filter(i => (daysPast(i?.dueDate, now) ?? -1) > 0)
  const byPriority: Record<PriorityKey, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 }
  for (const i of open) byPriority[priorityBucket(i?.severity || i?.priority)]++
  const byParty = new Map<string, number>()
  for (const i of open) {
    const who = plainText(i?.assignedTo || i?.responsible_person)
    const m = who.match(/\(([^)]+)\)\s*$/)
    const key = who ? shortCompany(m ? m[1] : who.split('·').pop() || who, shortMap) : 'Unassigned'
    byParty.set(key, (byParty.get(key) || 0) + 1)
  }

  const projectName = String(project?.name || '')
  const rd = await ReportDoc.create({
    title: [projectName, 'Issues Log'].filter(Boolean).join(' · '),
    footerLabel: `Issues Log · ${issues.length} issue${issues.length === 1 ? '' : 's'} · Status as of ${statusAsOf}`,
    project,
    orientation: 'landscape',
    pageNumbers: false,
    footerDate: false,
    titleFontSize: 12,
  })
  const doc = rd.doc as any
  const margin = rd.margin
  const contentW = rd.contentWidth
  const pageW = rd.pageWidth
  const setInk = (t: readonly number[]) => doc.setTextColor(t[0], t[1], t[2])
  const hairline = () => { doc.setDrawColor(...c(COLORS.hairline)); doc.setLineWidth(0.2) }

  // ---- summary band -------------------------------------------------------
  if (opts.summaryBand !== false) {
    const tileH = 16
    const gap = 4
    const tileW = (contentW - gap * 3) / 4
    const tile = (x: number, fill: [number, number, number], big: string, bigColor: [number, number, number], label: string) => {
      doc.setFillColor(...fill)
      doc.rect(x, rd.y, tileW, tileH, 'F')
      doc.setFont(SANS, 'bold'); doc.setFontSize(13); doc.setTextColor(...bigColor)
      doc.text(big, x + 3, rd.y + 7.5)
      doc.setFont(SANS, 'normal'); doc.setFontSize(7.4); setInk(COLORS.muted)
      doc.text(label, x + 3, rd.y + 12.5)
    }
    tile(margin, c(COLORS.zebra), `${open.length} of ${issues.length}`, c(COLORS.heading), 'Open issues')
    tile(margin + tileW + gap, [254, 226, 226], String(overdue.length), RED, 'Overdue')
    // open by priority: stacked bar + counts
    {
      const x = margin + (tileW + gap) * 2
      doc.setFillColor(...c(COLORS.zebra))
      doc.rect(x, rd.y, tileW, tileH, 'F')
      const total = Math.max(1, open.length)
      let bx = x + 3
      const barW = tileW - 6
      const keys: PriorityKey[] = ['Critical', 'High', 'Medium', 'Low']
      for (const k of keys) {
        const w = (byPriority[k] / total) * barW
        if (w > 0.1) {
          doc.setFillColor(...PRIORITY_COLOR[k])
          doc.rect(bx, rd.y + 3, w, 2.6, 'F')
          bx += w
        }
      }
      doc.setFont(SANS, 'normal'); doc.setFontSize(7.2); setInk(COLORS.text)
      doc.text(keys.map(k => `${k[0]} ${byPriority[k]}`).join('   '), x + 3, rd.y + 9.8)
      doc.setFontSize(7.4); setInk(COLORS.muted)
      doc.text('Open by priority', x + 3, rd.y + 13.6)
    }
    // open by responsible party
    {
      const x = margin + (tileW + gap) * 3
      doc.setFillColor(...c(COLORS.zebra))
      doc.rect(x, rd.y, tileW, tileH, 'F')
      const entries = [...byParty.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
      doc.setFont(SANS, 'normal'); doc.setFontSize(7.2)
      let px = x + 3
      for (const [who, n] of entries) {
        const seg = `${who} ${n}`
        if (who === 'Unassigned') doc.setTextColor(...RED); else setInk(COLORS.text)
        doc.text(seg, px, rd.y + 6.5)
        px += doc.getTextWidth(seg + '   ')
      }
      doc.setFontSize(7.4); setInk(COLORS.muted)
      doc.text('Open by responsible party', x + 3, rd.y + 12.5)
    }
    setInk(COLORS.text)
    rd.y += tileH + 4
  }

  if (opts.filterLine) {
    doc.setFont(SANS, 'normal'); doc.setFontSize(8); setInk(COLORS.muted)
    doc.text(normalizePdfText(`Filter: ${opts.filterLine}`), margin, rd.y)
    setInk(COLORS.text)
    rd.y += 5
  }

  // ---- table --------------------------------------------------------------
  type ColKey = 'number' | 'tag' | 'issue' | 'priority' | 'responsible' | 'due' | 'status' | 'location' | 'system' | 'type' | 'foundBy' | 'dateFound'
  const extra = new Set((opts.columns || []).map(String))
  const cols: Array<{ key: ColKey; label: string; w: number }> = [
    { key: 'number', label: '#', w: 10 },
    { key: 'tag', label: 'EQUIPMENT', w: 24 },
    { key: 'issue', label: 'ISSUE', w: 0 }, // flexes
    { key: 'priority', label: 'PRIORITY', w: 22 },
    ...(extra.has('type') ? [{ key: 'type' as ColKey, label: 'TYPE', w: 22 }] : []),
    ...(extra.has('location') ? [{ key: 'location' as ColKey, label: 'LOCATION', w: 28 }] : []),
    ...(extra.has('system') ? [{ key: 'system' as ColKey, label: 'SYSTEM', w: 20 }] : []),
    ...(extra.has('foundBy') ? [{ key: 'foundBy' as ColKey, label: 'FOUND BY', w: 26 }] : []),
    ...(extra.has('dateFound') ? [{ key: 'dateFound' as ColKey, label: 'FOUND', w: 18 }] : []),
    { key: 'responsible', label: 'RESPONSIBLE', w: 34 },
    { key: 'due', label: 'DUE', w: 18 },
    { key: 'status', label: 'STATUS', w: 24 },
  ]
  const fixedW = cols.reduce((a, col) => a + col.w, 0)
  const issueW = Math.max(50, contentW - fixedW)
  const colX: number[] = []
  {
    let x = margin
    for (const col of cols) {
      colX.push(x)
      x += col.key === 'issue' ? issueW : col.w
    }
  }

  const headRow = () => {
    doc.setFillColor(...c(COLORS.accent))
    doc.rect(margin, rd.y, contentW, 6.5, 'F')
    doc.setFont(SANS, 'bold'); doc.setFontSize(7.6); doc.setTextColor(255, 255, 255)
    cols.forEach((col, i) => doc.text(col.label, colX[i] + 1.5, rd.y + 4.4))
    rd.y += 8
    doc.setFont(SANS, 'normal'); setInk(COLORS.text)
  }

  const groupKeyOf = (i: any): string => {
    switch (opts.groupBy) {
      case 'responsible': return shortPerson(i?.assignedTo || i?.responsible_person, shortMap) || 'Unassigned'
      case 'system': return plainText(i?.system) || '(no system)'
      case 'equipment': return plainText(i?.tag) || '(no equipment)'
      case 'priority': return priorityBucket(i?.severity || i?.priority)
      default: return ''
    }
  }

  headRow()
  let currentGroup: string | null = null
  for (const i of issues) {
    const id = String(i?.id || i?._id || '')
    const closed = isClosed(i)
    const pr = priorityBucket(i?.severity || i?.priority)
    const days = daysPast(i?.dueDate, now)
    const assigned = plainText(i?.assignedTo || i?.responsible_person)
    const tinted = !closed && (!assigned || !i?.dueDate)

    // group heading
    if (opts.groupBy && opts.groupBy !== 'none') {
      const g = groupKeyOf(i)
      if (g !== currentGroup) {
        currentGroup = g
        if (rd.y + 14 > rd.bottomLimit) { rd.newPage(); headRow() }
        doc.setFont(SANS, 'bold'); doc.setFontSize(9); setInk(COLORS.heading)
        const count = issues.filter(x => groupKeyOf(x) === g).length
        doc.text(normalizePdfText(`${g} · ${count}`), margin, rd.y + 2)
        rd.y += 5.5
        hairline(); doc.line(margin, rd.y - 1.5, pageW - margin, rd.y - 1.5)
        doc.setFont(SANS, 'normal'); setInk(COLORS.text)
      }
    }

    // measure the row
    doc.setFont(SANS, 'bold'); doc.setFontSize(8.6)
    const titleLines = splitText(doc, normalizePdfText(plainText(i?.title).replace(/^Checklist:\s*/i, '')), issueW - 3)
    doc.setFont(SANS, 'normal'); doc.setFontSize(7.6)
    const sumText = [summaryLine(i), sameNote.get(id)].filter(Boolean).join(' · ')
    const sumLines = sumText ? splitText(doc, normalizePdfText(sumText), issueW - 3).slice(0, 2) : []
    const rowH = Math.max(7.5, 2.5 + titleLines.length * 3.9 + sumLines.length * 3.3 + 2)
    if (rd.y + rowH > rd.bottomLimit) { rd.newPage(); headRow(); currentGroup = opts.groupBy && opts.groupBy !== 'none' ? currentGroup : null }
    const top = rd.y

    if (tinted) {
      doc.setFillColor(254, 242, 242)
      doc.rect(margin, top - 1.2, contentW, rowH, 'F')
    }

    const cell = (idx: number, text: string, o: { mono?: boolean; bold?: boolean; color?: [number, number, number]; size?: number } = {}) => {
      if (!text) return
      doc.setFont(o.mono ? MONO : SANS, o.bold ? 'bold' : 'normal')
      doc.setFontSize(o.size ?? 8.2)
      if (o.color) doc.setTextColor(...o.color); else setInk(COLORS.text)
      const w = (cols[idx].key === 'issue' ? issueW : cols[idx].w) - 3
      const lines = splitText(doc, normalizePdfText(text), w)
      lines.slice(0, 2).forEach((l: string, li: number) => doc.text(l, colX[idx] + 1.5, top + 2.8 + li * 3.6))
      setInk(COLORS.text)
    }

    cols.forEach((col, idx) => {
      switch (col.key) {
        case 'number': cell(idx, i?.number != null ? `#${i.number}` : '', { mono: true, color: c(COLORS.heading) }); break
        case 'tag': cell(idx, plainText(i?.tag), { mono: true }); break
        case 'issue': {
          doc.setFont(SANS, 'bold'); doc.setFontSize(8.6); setInk(COLORS.heading)
          titleLines.forEach((l: string, li: number) => doc.text(l, colX[idx] + 1.5, top + 2.8 + li * 3.9))
          doc.setFont(SANS, 'normal'); doc.setFontSize(7.6); setInk(COLORS.muted)
          sumLines.forEach((l: string, li: number) => doc.text(l, colX[idx] + 1.5, top + 2.8 + titleLines.length * 3.9 + 0.6 + li * 3.3))
          setInk(COLORS.text)
          break
        }
        case 'priority':
          chip(doc, colX[idx] + 1.5, top, pr.toUpperCase(), pr === 'Critical' ? CRITICAL_STYLE : SEV_STYLE[pr === 'High' ? 'High' : pr === 'Medium' ? 'Medium' : 'Low'], 6.4)
          break
        case 'type': cell(idx, plainText(i?.type)); break
        case 'location': cell(idx, plainText(i?.location)); break
        case 'system': cell(idx, plainText(i?.system)); break
        case 'foundBy': cell(idx, shortPerson(i?.foundBy, shortMap)); break
        case 'dateFound': cell(idx, formatDateOnly(i?.dateFound)); break
        case 'responsible': cell(idx, shortPerson(i?.assignedTo || i?.responsible_person, shortMap) || '—', assigned ? {} : { color: RED, bold: true }); break
        case 'due': cell(idx, formatDateOnly(i?.dueDate) || '—'); break
        case 'status': {
          if (closed) cell(idx, `Closed ${formatDateOnly(i?.closedDate)}`.trim(), { color: c(COLORS.muted) })
          else if (days !== null && days > 0) cell(idx, `Overdue ${days}d`, { color: RED, bold: true })
          else if (days !== null) cell(idx, days === 0 ? 'Due today' : `Due in ${-days}d`)
          else cell(idx, 'Open · no due', { color: RED })
          break
        }
      }
    })

    rd.y = top + rowH
    hairline(); doc.line(margin, rd.y - 1.2, pageW - margin, rd.y - 1.2)
  }

  const bytes = await stampPageXofY(rd.output())
  deliverPdfBytes(bytes, reportFileName([projectName, 'issues-log']))
}

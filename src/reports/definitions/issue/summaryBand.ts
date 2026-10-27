// The Issues analytic summary band (Batch-Log mockup): four tiles — open
// count, red overdue tile, open-by-priority stacked bar, open-by-responsible
// with Unassigned in red. Shared by the Issues Log, Issue Sheets and the
// Full Detail batch cover so every batch report opens with the same picture.
import type { ReportDoc } from '../../core/frame'
import { COLORS, SANS } from '../../core/tokens'
import { RED } from '../../core/blocks'
import { daysPast } from '../../core/dates'
import { plainText, priorityBucket, shortCompany, type PriorityKey } from './model'

const c = (t: readonly number[]) => [t[0], t[1], t[2]] as [number, number, number]
const PRIORITY_COLOR: Record<PriorityKey, [number, number, number]> = {
  Critical: [185, 28, 28],
  High: [220, 38, 38],
  Medium: [217, 119, 6],
  Low: [148, 163, 184],
}
const isClosed = (i: any) => ['closed', 'cancelled'].includes(String(i?.status || '').toLowerCase())

/** Draw the band at rd.y across the content width (works in portrait and
 *  landscape — tiles size themselves from rd.contentWidth) and advance rd.y. */
export function drawIssuesSummaryBand(rd: ReportDoc, issues: any[], shortMap: Record<string, string>, now: Date = new Date()): void {
  const doc = rd.doc as any
  const margin = rd.margin
  const contentW = rd.contentWidth
  const setInk = (t: readonly number[]) => doc.setTextColor(t[0], t[1], t[2])

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
  // open by responsible party — stop before an entry would overflow its tile
  // (portrait tiles are narrower than the landscape Log's)
  {
    const x = margin + (tileW + gap) * 3
    doc.setFillColor(...c(COLORS.zebra))
    doc.rect(x, rd.y, tileW, tileH, 'F')
    const entries = [...byParty.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
    doc.setFont(SANS, 'normal'); doc.setFontSize(7.2)
    let px = x + 3
    let shown = 0
    for (const [who, n] of entries) {
      const seg = `${who} ${n}`
      if (shown > 0 && px + doc.getTextWidth(seg) > x + tileW - 3) break
      if (who === 'Unassigned') doc.setTextColor(...RED); else setInk(COLORS.text)
      doc.text(seg, px, rd.y + 6.5)
      px += doc.getTextWidth(seg + '   ')
      shown++
    }
    doc.setFontSize(7.4); setInk(COLORS.muted)
    doc.text('Open by responsible party', x + 3, rd.y + 12.5)
  }
  setInk(COLORS.text)
  rd.y += tileH + 4
}

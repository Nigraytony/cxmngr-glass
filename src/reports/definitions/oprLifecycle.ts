// OPR Item Lifecycle report (Phase 6): every OPR item from origin to
// completion — category, workshop rank/score, status, and the verification
// evidence trail (OprLinkEvaluation records: where it was checked, against
// what, with what result). Summary table first, then the per-item detail.
import { ReportDoc } from '../core/frame'
import { drawTable } from '../core/table'
import { deliverPdf, openDeliveryWindow, reportFileName } from '../core/deliver'
import { formatDate, normalizePdfText, splitText } from '../core/text'
import { SANS } from '../core/tokens'

export interface OprLifecycleOptions {
  project: any
  items: any[]
  categoriesById: Record<string, any>
  /** OprLinkEvaluation rows grouped by oprItemId. */
  evaluationsByItemId: Record<string, any[]>
}

type VerdictState = 'verified' | 'fail' | 'partial' | 'na' | 'unverified'

function verdictFor(evals: any[]): { state: VerdictState; label: string } {
  const list = Array.isArray(evals) ? evals : []
  if (!list.length) return { state: 'unverified', label: 'Unverified' }
  const c: Record<string, number> = { pass: 0, fail: 0, na: 0, unverified: 0 }
  for (const e of list) {
    const s = String(e?.status || 'unverified')
    if (c[s] !== undefined) c[s]++
    else c.unverified++
  }
  if (c.fail > 0) return { state: 'fail', label: `Fail (${c.fail} failing)` }
  if (c.pass > 0 && c.unverified === 0) return { state: 'verified', label: 'Verified' }
  if (c.pass > 0) return { state: 'partial', label: `Partial (${c.pass}/${list.length} pass)` }
  if (c.na === list.length) return { state: 'na', label: 'N/A' }
  return { state: 'unverified', label: 'Unverified' }
}

function categoryName(categoriesById: Record<string, any>, id: any): string {
  const c = id ? categoriesById[String(id)] : null
  return c ? String(c.name || '') : ''
}

function lastEvaluatedAt(evals: any[]): string {
  let latest = ''
  for (const e of (evals || [])) {
    const d = String(e?.evaluatedAt || e?.updatedAt || '')
    if (d && (!latest || d > latest)) latest = d
  }
  return latest
}

export async function generateOprLifecyclePdf(opts: OprLifecycleOptions): Promise<void> {
  const items = Array.isArray(opts.items) ? opts.items : []
  if (!items.length) return
  const dlWin = openDeliveryWindow()
  const projName = String(opts.project?.name || '')
  const rd = await ReportDoc.create({
    title: projName ? `${projName} - OPR Lifecycle` : 'OPR Lifecycle',
    footerLabel: 'OPR Lifecycle Report',
    project: opts.project,
  })
  const doc = rd.doc

  const enriched = items.map((it) => {
    const id = String(it?.id || it?._id || '')
    const evals = opts.evaluationsByItemId[id] || []
    return {
      id,
      rank: it?.rank ?? null,
      text: normalizePdfText(String(it?.text || '')),
      score: typeof it?.score === 'number' ? it.score : 0,
      status: String(it?.status || 'active'),
      category: categoryName(opts.categoriesById, it?.categoryId),
      createdAt: String(it?.createdAt || ''),
      evals,
      verdict: verdictFor(evals),
      lastEvaluated: lastEvaluatedAt(evals),
    }
  })

  // --- Summary stats + coverage donut --------------------------------------
  const count = (s: VerdictState) => enriched.filter((e) => e.verdict.state === s).length
  const archived = enriched.filter((e) => e.status === 'archived').length
  const COVERAGE_COLORS: Record<VerdictState, [number, number, number]> = {
    verified: [21, 128, 61],
    partial: [217, 119, 6],
    fail: [185, 28, 28],
    na: [148, 163, 184],
    unverified: [222, 226, 232],
  }

  doc.setFont(SANS, 'bold'); doc.setFontSize(13)
  rd.ensureSpace(58)
  doc.text('Verification Summary', rd.margin, rd.y)
  rd.y += 7

  const statsTop = rd.y
  doc.setFont(SANS, 'normal'); doc.setFontSize(9.5)
  const stats: Array<[string, string, VerdictState | null]> = [
    ['OPR items', String(enriched.length), null],
    ['Verified', String(count('verified')), 'verified'],
    ['Partially verified', String(count('partial')), 'partial'],
    ['Failing', String(count('fail')), 'fail'],
    ['N/A', String(count('na')), 'na'],
    ['Unverified', String(count('unverified')), 'unverified'],
    ['Archived', String(archived), null],
  ]
  let statY = statsTop
  for (const [label, value, state] of stats) {
    if (state) {
      const [cr, cg, cb] = COVERAGE_COLORS[state]
      doc.setFillColor(cr, cg, cb)
      doc.rect(rd.margin, statY - 2.6, 3, 3, 'F')
    }
    doc.setTextColor(100)
    doc.text(`${label}:`, rd.margin + 5, statY)
    doc.setTextColor(0)
    doc.text(value, rd.margin + 43, statY)
    statY += 6
  }

  // Coverage + evaluations donuts in the otherwise-empty right half. Drawn
  // as vector wedge fans (crisp at any zoom; no chart library needed).
  const drawDonut = (
    cx: number,
    cy: number,
    segments: Array<{ value: number; color: [number, number, number] }>,
    centerCount: number,
    centerLabel: string,
    caption: string,
  ) => {
    const r = 17
    let angle = -90
    const total = segments.reduce((a, s) => a + s.value, 0) || 1
    for (const seg of segments) {
      if (!seg.value) continue
      const sweep = (seg.value / total) * 360
      doc.setFillColor(seg.color[0], seg.color[1], seg.color[2])
      const step = 2.5
      for (let a = angle; a < angle + sweep; a += step) {
        const a2 = Math.min(a + step, angle + sweep)
        const x1 = cx + r * Math.cos((a * Math.PI) / 180)
        const y1 = cy + r * Math.sin((a * Math.PI) / 180)
        const x2 = cx + r * Math.cos((a2 * Math.PI) / 180)
        const y2 = cy + r * Math.sin((a2 * Math.PI) / 180)
        doc.triangle(cx, cy, x1, y1, x2, y2, 'F')
      }
      angle += sweep
    }
    doc.setFillColor(255, 255, 255)
    doc.circle(cx, cy, 10, 'F')
    doc.setFont(SANS, 'bold'); doc.setFontSize(15)
    doc.setTextColor(0)
    doc.text(String(centerCount), cx, cy + 1.5, { align: 'center' })
    doc.setFont(SANS, 'normal'); doc.setFontSize(7)
    doc.setTextColor(120)
    doc.text(centerLabel, cx, cy + 6, { align: 'center' })
    doc.setFontSize(8)
    doc.text(caption, cx, cy + r + 6, { align: 'center' })
    doc.setTextColor(0)
    return cy + r + 9
  }

  const coverageSegments = (['verified', 'partial', 'fail', 'na', 'unverified'] as VerdictState[])
    .map((s) => ({ value: count(s), color: COVERAGE_COLORS[s] }))
    .filter((s) => s.value > 0)
  // All evidence checks across every item, by result.
  const allEvals = enriched.flatMap((e) => e.evals)
  const evalCount = (status: string) => allEvals.filter((ev) => String(ev?.status || 'unverified') === status).length
  const evalSegments: Array<{ value: number; color: [number, number, number] }> = [
    { value: evalCount('pass'), color: COVERAGE_COLORS.verified },
    { value: evalCount('fail'), color: COVERAGE_COLORS.fail },
    { value: evalCount('na'), color: COVERAGE_COLORS.na },
    { value: evalCount('unverified'), color: COVERAGE_COLORS.unverified },
  ].filter((s) => s.value > 0)

  if (enriched.length) {
    const cy = statsTop + 18
    let bottom = statY
    if (allEvals.length) {
      // Side by side: items by coverage, evaluations by result.
      bottom = Math.max(bottom, drawDonut(rd.margin + rd.contentWidth * 0.52, cy, coverageSegments, enriched.length, 'OPR items', 'Items by coverage'))
      bottom = Math.max(bottom, drawDonut(rd.margin + rd.contentWidth * 0.82, cy, evalSegments, allEvals.length, 'evaluations', 'Evaluations by result'))
    } else {
      bottom = Math.max(bottom, drawDonut(rd.margin + rd.contentWidth * 0.72, cy, coverageSegments, enriched.length, 'OPR items', 'Items by coverage'))
    }
    rd.y = bottom
  } else {
    rd.y = statY
  }
  rd.sectionGap()

  // --- Summary table -------------------------------------------------------
  drawTable(rd, {
    columns: [
      { key: 'rank', label: 'Rank', weight: 0.5 },
      { key: 'text', label: 'OPR Item', weight: 3 },
      { key: 'category', label: 'Category', weight: 1 },
      { key: 'score', label: 'Score', weight: 0.5 },
      { key: 'status', label: 'Status', weight: 0.7 },
      { key: 'verdict', label: 'Verification', weight: 1 },
    ],
    rows: enriched,
    cellText: (row: any, key) => {
      if (key === 'verdict') return row.verdict.label
      if (key === 'rank') return row.rank != null ? String(row.rank) : '—'
      return String(row[key] ?? '')
    },
  })

  // --- Per-item lifecycle detail, grouped by category ----------------------
  const byCategory = new Map<string, typeof enriched>()
  for (const e of enriched) {
    const key = e.category || 'Uncategorized'
    if (!byCategory.has(key)) byCategory.set(key, [])
    byCategory.get(key)!.push(e)
  }

  rd.sectionGap(8)
  rd.ensureSpace(14)
  doc.setFont(SANS, 'bold'); doc.setFontSize(13)
  doc.text('Item Lifecycle Detail', rd.margin, rd.y)
  rd.y += 8

  for (const [cat, catItems] of byCategory) {
    rd.ensureSpace(12)
    doc.setFont(SANS, 'bold'); doc.setFontSize(11.5)
    doc.text(cat, rd.margin, rd.y)
    rd.y += 7

    for (const e of catItems) {
      // Item heading
      doc.setFont(SANS, 'bold'); doc.setFontSize(10)
      const heading = `${e.rank != null ? `OPR-${e.rank} — ` : ''}${e.text}`
      const lines = splitText(doc, heading, rd.contentWidth)
      rd.ensureSpace(lines.length * 5 + 14)
      doc.text(lines, rd.margin, rd.y)
      rd.y += lines.length * 5 + 1

      // Meta + verdict line
      doc.setFont(SANS, 'normal'); doc.setFontSize(8.5)
      doc.setTextColor(100)
      const metaBits = [
        `Score: ${e.score}`,
        `Status: ${e.status}`,
        e.createdAt ? `Added: ${formatDate(e.createdAt)}` : '',
        e.lastEvaluated ? `Last verified: ${formatDate(e.lastEvaluated)}` : '',
      ].filter(Boolean).join('   •   ')
      rd.ensureSpace(5)
      doc.text(metaBits, rd.margin, rd.y)
      // Verdict, colored, right-aligned on the meta line
      if (e.verdict.state === 'verified') doc.setTextColor(21, 128, 61)
      else if (e.verdict.state === 'fail') doc.setTextColor(185, 28, 28)
      else if (e.verdict.state === 'partial') doc.setTextColor(146, 64, 14)
      else doc.setTextColor(100)
      doc.setFont(SANS, 'bold')
      doc.text(e.verdict.label.toUpperCase(), rd.margin + rd.contentWidth, rd.y, { align: 'right' })
      doc.setTextColor(0)
      doc.setFont(SANS, 'normal')
      rd.y += 6

      // Evidence trail
      if (e.evals.length) {
        drawTable(rd, {
          columns: [
            { key: 'contextLabel', label: 'Where verified', weight: 1.4 },
            { key: 'target', label: 'Evidence', weight: 1.4 },
            { key: 'status', label: 'Result', weight: 0.55 },
            { key: 'evaluatedAt', label: 'Date', weight: 0.6 },
            { key: 'notes', label: 'Notes', weight: 1.6 },
          ],
          rows: e.evals,
          cellText: (row: any, key) => {
            if (key === 'target') return String(row.targetLabel || row.targetKey || row.targetType || '—')
            if (key === 'status') return String(row.status || 'unverified').toUpperCase()
            if (key === 'evaluatedAt') return row.evaluatedAt ? formatDate(String(row.evaluatedAt)) : '—'
            if (key === 'notes') return normalizePdfText(String(row.notes || ''))
            return String(row[key] ?? '—')
          },
        })
      } else {
        rd.ensureSpace(5)
        doc.setFontSize(8.5)
        doc.setTextColor(120)
        doc.text('Not yet verified — no evidence linked.', rd.margin, rd.y)
        doc.setTextColor(0)
        rd.y += 5
      }
      rd.y += 3
    }
    rd.y += 2
  }

  deliverPdf(rd.finish(), reportFileName([projName, 'opr-lifecycle']), dlWin)
}

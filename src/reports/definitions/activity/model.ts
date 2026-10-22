// Activity report view-model (Stage 1 of the Activity report redesign —
// docs/activity_report_redesign.md). One assembly pass builds everything the
// renderers need; the jsPDF renderer (pdf.ts) and the future docx renderer
// both consume this model so the two outputs can't drift. Sections whose data
// is missing are omitted by the renderers, never printed empty.

export type SeverityBucket = 'High' | 'Medium' | 'Low'

export interface SessionBullet {
  text: string
  /** Bold lead ("Decision:", "Benchmark:") split off when present. */
  lead?: string
  /** Trailing cross-reference ("→ Issues #2, #3"), rendered in accent. */
  ref?: string
  /** Trailing status word rendered green (e.g. "Closed"). */
  closed?: boolean
}

export interface SessionVM {
  name: string
  /** Muted meta lines under the name (time, location/participants). */
  meta: string[]
  bullets: SessionBullet[]
}

export interface IssueVM {
  number: string
  tag: string
  title: string
  description: string
  recommendation: string
  severity: SeverityBucket
  status: string
  metaLine: string
  /** First linked photo (data URL) for the thumbnail column. */
  photoSrc?: string
  /** Set when this issue collapses onto an earlier identical one. */
  sameAs?: string
}

export interface EquipmentRowVM {
  tag: string
  name: string
  makeModel: string
  pfcDone: number
  pfcTotal: number
  fptDone: number
  fptTotal: number
  openIssues: number
  worstSeverity: SeverityBucket | null
}

export interface PhotoVM {
  dataUrl: string
  caption: string
}

export interface AttendeeVM {
  name: string
  org: string
  present: boolean
}

export interface ActivityReportModel {
  reportId: string
  eyebrow: string
  title: string
  subtitle: string
  issuedDate: string
  footerLabel: string
  runningTitle: string
  metaStrip: Array<{ label: string; value: string; mono?: boolean }>
  kpis: Array<{ value: string; label: string; warn?: boolean }>
  summaryItems: string[]
  sessions: SessionVM[]
  issues: IssueVM[]
  issueCounts: { high: number; medium: number; low: number; fromWalk: number; fromChecklists: number }
  observations: string[]
  equipmentRows: EquipmentRowVM[]
  remainingByTrade: Array<{ trade: string; count: number; items: string[] }>
  photos: PhotoVM[]
  heroPhoto: PhotoVM | null
  attendees: AttendeeVM[]
  revisionRows: Array<{ rev: string; date: string; description: string; by: string }>
  preparedBy: string
  reviewedBy: string
}

export interface ActivityReportInput {
  activity: any
  project: any
  /** Full equipment records linked to the activity. */
  equipment: any[]
  /** Issues already resolved per the scope rule (directly linked + open on scoped equipment). */
  issues: any[]
  /** Which of those issue ids are DIRECTLY linked to the activity ("site walk" source). */
  directIssueIds: Set<string>
  /** Action sub-records (for the "reviews completed" KPI). */
  actions: any[]
  /** Activity photos, already as data URLs (Azure + legacy base64). */
  photos: Array<{ dataUrl: string; caption?: string }>
}

// ---------------------------------------------------------------------------

const TYPE_PREFIX: Record<string, string> = {
  'Site Visit Review': 'SV',
  'Cx Meeting': 'CX',
  'Functional Test': 'FT',
  'Seasonal Test': 'ST',
  'Design Review': 'DR',
  'Submittal Review': 'SUB',
  'Warranty Review': 'WR',
  'Training Review': 'TR',
  'Installation Review': 'IR',
  'Startup Review': 'SU',
  'Test and Balance Review': 'TAB',
}

function deriveReportId(activity: any): string {
  const type = String(activity?.type || '')
  const prefix = TYPE_PREFIX[type]
    || type.split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 3).toUpperCase()
    || 'RPT'
  const m = String(activity?.name || '').match(/(\d+)\s*$/)
  return m ? `${prefix}-${m[1].padStart(2, '0')}` : prefix
}

function fmtLongDate(d: any): string {
  const dt = d ? new Date(d) : null
  if (!dt || isNaN(dt.getTime())) return ''
  return dt.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function fmtShortDate(d: any): string {
  const dt = d ? new Date(d) : null
  if (!dt || isNaN(dt.getTime())) return ''
  return dt.toLocaleDateString('en-US')
}

export function severityBucket(sev: any): SeverityBucket | 'Observation' {
  const s = String(sev || '').toLowerCase()
  if (s === 'critical' || s === 'high') return 'High'
  if (s === 'medium') return 'Medium'
  if (s === 'comment') return 'Observation'
  return 'Low'
}

const isClosed = (st: any) => ['closed', 'cancelled'].includes(String(st || '').toLowerCase())

// ---- description HTML -> sessions (fallback until structured sessions[] ship)

function textOf(el: Element): string {
  return String(el.textContent || '').replace(/\s+/g, ' ').trim()
}

function toBullet(text: string): SessionBullet | null {
  let t = text.trim()
  if (!t) return null
  const b: SessionBullet = { text: t }
  const lead = t.match(/^([A-Z][A-Za-z ]{2,18}):\s+/)
  if (lead) {
    b.lead = lead[1] + ':'
    t = t.slice(lead[0].length)
  }
  const refIdx = t.lastIndexOf('→')
  if (refIdx > 0) {
    b.ref = '→ ' + t.slice(refIdx + 1).trim()
    t = t.slice(0, refIdx).trim()
  }
  if (/\bClosed\.?$/.test(t)) {
    b.closed = true
    t = t.replace(/\s*Closed\.?$/, '').trim()
  }
  b.text = t
  return b
}

export function parseSessionsFromHtml(html: string): SessionVM[] {
  const out: SessionVM[] = []
  if (!html || typeof document === 'undefined') return out
  let doc: Document
  try {
    doc = new DOMParser().parseFromString(html, 'text/html')
  } catch (e) {
    return out
  }
  let current: SessionVM | null = null
  const push = (b: SessionBullet | null) => {
    if (!b) return
    if (!current) {
      current = { name: 'Notes', meta: [], bullets: [] }
      out.push(current)
    }
    current.bullets.push(b)
  }
  const walk = (nodes: Element[]) => {
    for (const el of nodes) {
      const tag = el.tagName.toLowerCase()
      if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4') {
        current = { name: textOf(el), meta: [], bullets: [] }
        out.push(current)
      } else if (tag === 'ul' || tag === 'ol') {
        for (const li of Array.from(el.querySelectorAll(':scope > li'))) push(toBullet(textOf(li)))
      } else if (tag === 'p') {
        push(toBullet(textOf(el)))
      } else if (tag === 'div' || tag === 'section') {
        walk(Array.from(el.children))
      }
    }
  }
  walk(Array.from(doc.body.children))
  return out.filter(s => s.bullets.length || s.meta.length)
}

// ---- equipment helpers

function getAttr(eq: any, keys: string[]): string {
  const rows: any[] = Array.isArray(eq?.attributes) ? eq.attributes : []
  for (const k of keys) {
    const hit = rows.find((r: any) => String(r?.key || '').toLowerCase().replace(/[\s:]+$/, '').includes(k))
    if (hit && hit.value) return String(hit.value)
  }
  if (eq?.attributes && !Array.isArray(eq.attributes) && typeof eq.attributes === 'object') {
    for (const [k, v] of Object.entries(eq.attributes)) {
      if (keys.some(kk => k.toLowerCase().includes(kk)) && v) return String(v)
    }
  }
  return ''
}

function checklistItemDone(it: any): boolean {
  if (typeof it?.done !== 'undefined') return !!it.done
  const ans = String(it?.answer ?? '').toLowerCase()
  return ans === 'yes' || ans === 'na'
}

export function pfcCounts(eq: any): { done: number; total: number } {
  let done = 0
  let total = 0
  for (const s of (Array.isArray(eq?.checklists) ? eq.checklists : [])) {
    const items: any[] = Array.isArray(s?.questions) ? s.questions : (Array.isArray(s?.items) ? s.items : [])
    for (const it of items) {
      total++
      if (checklistItemDone(it)) done++
    }
  }
  return { done, total }
}

function fptRecorded(t: any): boolean {
  if (t?.pass === true || t?.pass === false) return true
  const rows: any[] = Array.isArray(t?.rows) ? t.rows : []
  return rows.some((r: any) => String(r?.actual ?? '').trim() !== '' || r?.pass === true || r?.pass === false || String(r?.pass ?? '').trim() !== '')
}

// ---------------------------------------------------------------------------

export function assembleActivityReportModel(input: ActivityReportInput): ActivityReportModel {
  const { activity, project, equipment, actions } = input
  const reportId = deriveReportId(activity)
  const issued = fmtShortDate(new Date())
  const typeLabel = String(activity?.type || 'Activity').replace(/\s*Review$/, '')

  // ---- issues (already scoped by the caller; normalize, sort, collapse)
  const observations: string[] = []
  const rawIssues = (input.issues || []).filter((i: any) => !isClosed(i?.status))
  const normalized: Array<IssueVM & { _sortSev: number; _num: number }> = []
  for (const i of rawIssues) {
    const bucket = severityBucket(i?.severity)
    const id = String(i?.id || i?._id || '')
    const direct = input.directIssueIds.has(id)
    if (bucket === 'Observation') {
      const txt = [String(i?.title || ''), String(i?.description || '')].filter(Boolean).join(' — ')
      if (txt) observations.push(txt)
      continue
    }
    const metaBits = [
      direct ? 'Site walk' : 'Checklist',
      i?.dateFound ? `Raised ${fmtShortDate(i.dateFound) || String(i.dateFound)}` : '',
      i?.assignedTo ? `Resp. ${i.assignedTo}` : '',
      i?.dueDate ? `Due ${i.dueDate}` : '',
    ].filter(Boolean)
    normalized.push({
      number: String(i?.number ?? ''),
      tag: String(i?.tag || ''),
      title: String(i?.title || ''),
      description: String(i?.description || ''),
      recommendation: String(i?.recommendation || ''),
      severity: bucket,
      status: String(i?.status || 'Open'),
      metaLine: metaBits.join(' · '),
      photoSrc: (Array.isArray(i?.photos) && i.photos[0] && (i.photos[0].data || i.photos[0].url)) || undefined,
      _sortSev: bucket === 'High' ? 0 : bucket === 'Medium' ? 1 : 2,
      _num: Number(i?.number) || 0,
    })
  }
  normalized.sort((a, b) => a._sortSev - b._sortSev || a._num - b._num)
  // Collapse identical descriptions ("Same condition as #15").
  const seenDesc = new Map<string, string>()
  for (const v of normalized) {
    const key = v.description.toLowerCase().replace(/\s+/g, ' ').trim()
    if (key.length > 20) {
      const first = seenDesc.get(key)
      if (first) {
        v.sameAs = first
        v.description = `Same condition as #${first}.`
        v.recommendation = ''
      } else {
        seenDesc.set(key, v.number)
      }
    }
  }
  const issues: IssueVM[] = normalized.map(({ _sortSev, _num, ...v }) => v)
  const issueCounts = {
    high: issues.filter(i => i.severity === 'High').length,
    medium: issues.filter(i => i.severity === 'Medium').length,
    low: issues.filter(i => i.severity === 'Low').length,
    fromWalk: issues.filter(i => i.metaLine.startsWith('Site walk')).length,
    fromChecklists: issues.filter(i => i.metaLine.startsWith('Checklist')).length,
  }

  // ---- equipment matrix + remaining-by-trade rollup
  const sevRank: Record<SeverityBucket, number> = { High: 0, Medium: 1, Low: 2 }
  const equipmentRows: EquipmentRowVM[] = equipment.map((eq: any) => {
    const pfc = pfcCounts(eq)
    const tests: any[] = Array.isArray(eq?.functionalTests) ? eq.functionalTests : []
    const tag = String(eq?.tag || '')
    const eqIssues = issues.filter(i => i.tag && i.tag.toLowerCase() === tag.toLowerCase())
    let worst: SeverityBucket | null = null
    for (const i of eqIssues) if (!worst || sevRank[i.severity] < sevRank[worst]) worst = i.severity
    const make = getAttr(eq, ['make', 'manufacturer', 'mfr'])
    const model = getAttr(eq, ['model'])
    return {
      tag,
      name: String(eq?.title || eq?.name || ''),
      makeModel: [make, model].filter(Boolean).join(' '),
      pfcDone: pfc.done,
      pfcTotal: pfc.total,
      fptDone: tests.filter(fptRecorded).length,
      fptTotal: tests.length,
      openIssues: eqIssues.length,
      worstSeverity: worst,
    }
  })
  const tradeMap = new Map<string, string[]>()
  for (const eq of equipment) {
    const tag = String(eq?.tag || '')
    for (const s of (Array.isArray(eq?.checklists) ? eq.checklists : [])) {
      const items: any[] = Array.isArray(s?.questions) ? s.questions : (Array.isArray(s?.items) ? s.items : [])
      const open = items.filter((it: any) => !checklistItemDone(it))
      if (!open.length) continue
      const trade = String(s?.title || 'General')
      const list = tradeMap.get(trade) || []
      for (const it of open) {
        const q = String(it?.question_text ?? it?.text ?? '').trim()
        if (q) list.push(`${tag}: ${q.length > 70 ? q.slice(0, 67) + '…' : q}`)
      }
      tradeMap.set(trade, list)
    }
  }
  const remainingByTrade = Array.from(tradeMap.entries())
    .map(([trade, items]) => ({ trade, count: items.length, items }))
    .sort((a, b) => b.count - a.count)

  // ---- photos
  const allPhotos: PhotoVM[] = (input.photos || [])
    .filter(p => p && p.dataUrl)
    .map(p => ({ dataUrl: p.dataUrl, caption: String(p.caption || '').trim() }))
  const heroPhoto = allPhotos.length ? allPhotos[0] : null

  // ---- attendance
  const attendees: AttendeeVM[] = (Array.isArray(activity?.attendees) ? activity.attendees : [])
    .filter((a: any) => String(a?.name || '').trim())
    .map((a: any) => ({
      name: String(a.name).trim(),
      org: [String(a?.company || '').trim(), String(a?.role || '').trim()].filter(Boolean).join(' · '),
      present: a?.signedIn !== false,
    }))
    .sort((a: AttendeeVM, b: AttendeeVM) => Number(b.present) - Number(a.present))

  // ---- header/meta
  const reviewer = activity?.reviewer
  const preparedBy = reviewer ? [reviewer.firstName, reviewer.lastName].filter(Boolean).join(' ') : ''
  const ca = project?.commissioning_agent
  const caName = ca ? [ca.firstName, ca.lastName].filter(Boolean).join(' ') : ''
  const start = fmtLongDate(activity?.startDate)
  const subtitleBits = [String(activity?.name || ''), start, String(activity?.location || '')].filter(Boolean)
  const phase = String(activity?.phase || '')
  const cxPhase = [phase ? phase[0].toUpperCase() + phase.slice(1) : '', String(activity?.milestone || '')].filter(Boolean).join(' · ')

  const openCount = issues.length
  const actionsTotal = (actions || []).length
  const actionsDone = (actions || []).filter((a: any) => String(a?.status || '') === 'Complete').length
  const kpis: ActivityReportModel['kpis'] = []
  if (equipment.length) kpis.push({ value: String(equipment.length), label: 'Equipment reviewed' })
  kpis.push({
    value: String(openCount),
    label: issueCounts.high ? `Open issues · ${issueCounts.high} high` : 'Open issues',
    warn: openCount > 0,
  })
  if (actionsTotal) kpis.push({ value: `${actionsDone} / ${actionsTotal}`, label: 'Reviews completed' })

  const projectNo = String(project?.number || project?.projectNumber || project?.metadata?.number || '')

  return {
    reportId,
    eyebrow: `COMMISSIONING ${typeLabel.toUpperCase()} REPORT · ${reportId}`,
    title: String(project?.name || 'Project'),
    subtitle: subtitleBits.join(' · '),
    issuedDate: issued,
    footerLabel: `${reportId} · Rev 0 · Issued ${issued}`,
    runningTitle: [String(project?.name || ''), reportId, fmtShortDate(activity?.startDate)].filter(Boolean).join(' · '),
    metaStrip: [
      { label: 'Project No.', value: projectNo || '—', mono: true },
      { label: 'Prepared by', value: preparedBy || caName || '—' },
      { label: 'Cx phase', value: cxPhase || String(activity?.type || '—') },
      { label: 'Revision', value: `Rev 0 · Issued ${issued}` },
    ],
    kpis,
    summaryItems: [], // Stage 2: editable Activity.summary field
    sessions: parseSessionsFromHtml(String(activity?.descriptionHtml || '')),
    issues,
    issueCounts,
    observations,
    equipmentRows,
    remainingByTrade,
    photos: allPhotos,
    heroPhoto,
    attendees,
    revisionRows: [{ rev: '0', date: issued, description: 'Issued for distribution', by: preparedBy || caName || '' }],
    preparedBy: [preparedBy || caName, ca?.company].filter(Boolean).join(', '),
    reviewedBy: '',
  }
}

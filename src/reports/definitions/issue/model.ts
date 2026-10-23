// Issue Detail report view-model (docs: cxma-issue-report-redesign spec,
// issue-mockup.pdf). One assembly pass; the jsPDF renderer (pdf.ts) and the
// docx renderer consume the same model so the formats cannot drift. Sections
// with no data are omitted — except the response/verification FILL-IN blocks,
// which print on purpose when the data is missing.

export type PriorityKey = 'Critical' | 'High' | 'Medium' | 'Low'

export interface HistoryLine {
  date: string
  text: string
  by: string
  red?: boolean
  bold?: boolean
}

export interface IssueReportModel {
  // header
  projectName: string
  projectNo: string
  clientName: string
  eyebrow: string
  number: string
  title: string
  priority: PriorityKey
  statusLabel: string
  closed: boolean
  verified: boolean
  dueLine: { text: string; red: boolean } | null
  lifeSafetyNote: string
  facts: Array<{ label: string; value: string; mono?: boolean }>
  condition: string
  requiredAction: string[]
  referenceLine: string
  photos: Array<{ dataUrl: string; caption: string }>
  photosNote: string
  response: { correctiveAction: string; completedDate: string; respondedBy: string } | null
  verification: { outcomeLabel: string; verifiedBy: string; verifiedDate: string; notes: string } | null
  history: HistoryLine[]
  comments: Array<{ author: string; date: string; text: string }>
  distribution: string
  runningTitle: string
  footerLabel: string
  statusAsOf: string
}

export interface IssueReportInput {
  issue: any
  project: any
  /** Linked activity's display name, when issue.activityId resolves. */
  activityName?: string
  /** Equipment tags for the facts grid (issue.tag now; equipmentIds later). */
  equipmentTags?: string[]
  logs?: any[]
  /** Azure + legacy photos, already as data URLs with captions when known. */
  photos?: Array<{ dataUrl: string; caption?: string }>
  generatedAt?: Date
}

// ---------------------------------------------------------------------------

function plainText(v: any): string {
  const s = String(v ?? '')
  if (!/[<&]/.test(s)) return s.trim()
  try {
    const d = new DOMParser().parseFromString(s, 'text/html')
    return String(d.body.textContent || '').replace(/[ \t]+/g, ' ').trim()
  } catch (e) {
    return s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  }
}

function fmtDate(v: any): string {
  if (!v) return ''
  const d = new Date(v)
  if (isNaN(d.getTime())) return String(v)
  return d.toLocaleDateString('en-US')
}

const DAY = 24 * 60 * 60 * 1000

/** Display labels for stored issue-type keys; unknown keys title-case. */
const TYPE_LABELS: Record<string, string> = {
  construction: 'Construction Review',
  design: 'Design Review',
  assessment: 'Assessment',
  submittal: 'Submittal Review',
  checklist: 'Checklist',
  fpt: 'Functional Testing',
  warranty: 'Warranty',
  'site visit': 'Site Visit',
}
export function typeLabel(t: any): string {
  const key = String(t || '').trim()
  if (!key) return ''
  const hit = TYPE_LABELS[key.toLowerCase()]
  if (hit) return hit
  return key.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1))
}

export function priorityBucket(sev: any): PriorityKey {
  const s = String(sev || '').toLowerCase()
  if (s === 'critical') return 'Critical'
  if (s === 'high') return 'High'
  if (s === 'medium' || s === 'comment') return 'Medium'
  return 'Low'
}

/**
 * Shorten a company name: the project's companyShortNames map wins
 * (Project Settings), then a suffix-stripping heuristic.
 */
export function shortCompany(name: string, map: Record<string, string> = {}): string {
  const full = String(name || '').trim()
  if (!full) return ''
  for (const [k, v] of Object.entries(map)) {
    if (k.trim().toLowerCase() === full.toLowerCase()) return String(v)
  }
  const stripped = full.replace(/[,.]?\s*(LLC|L\.L\.C\.|Inc|Incorporated|Corp|Corporation|Co|Company|Ltd)\.?$/i, '').trim().replace(/[,.]+$/, '')
  return stripped || full
}

/** "Name (Company)" / "Name - Company" -> "Name · ShortCo". */
export function formatPerson(raw: any, map: Record<string, string> = {}): string {
  const s = String(raw || '').trim()
  if (!s) return ''
  const m = s.match(/^(.*?)\s*[(–-]\s*([^)]+?)\)?$/)
  if (m && m[2] && m[1]) {
    return `${m[1].trim()} · ${shortCompany(m[2], map)}`
  }
  return s
}

/** Split the recommendation into numbered action items (lines / list markup). */
export function splitActions(recommendation: string): string[] {
  const text = plainText(recommendation)
  if (!text) return []
  const lines = String(recommendation || '')
    .split(/<li[^>]*>|\n|•|(?:^|\s)\d+[.)]\s+/)
    .map(plainText)
    .filter(Boolean)
  return lines.length > 1 ? lines : [text]
}

// ---- history: plain language from the free-form log events ----------------

const FIELD_LABELS: Record<string, string> = {
  description: 'Description',
  recommendation: 'Recommendation',
  resolution: 'Resolution',
  title: 'Title',
  severity: 'Priority',
  priority: 'Priority',
  status: 'Status',
  assignedTo: 'Assignee',
  responsible_person: 'Assignee',
  dueDate: 'Due date',
  dateFound: 'Date found',
  foundBy: 'Found by',
  location: 'Location',
  system: 'System',
  tag: 'Equipment tag',
  type: 'Type',
  photos: 'Photos',
  activityId: 'Linked activity',
  labels: 'Tags',
  closedDate: 'Closed date',
  closedBy: 'Closed by',
  lifeSafety: 'Life-safety flag',
  reference: 'Reference',
}
const IGNORED_KEYS = new Set(['projectId', 'updatedAt', 'createdAt', '_id', 'id', '__v', 'number', 'clientId', 'expectedVersion'])

function describeDetails(details: any, activityName?: string): string {
  if (!details || typeof details !== 'object') return ''
  const keys = Object.keys(details).filter(k => !IGNORED_KEYS.has(k))
  if (!keys.length) return ''
  const parts: string[] = []
  // structured diffs {field, from, to} (logged going forward)
  if (Array.isArray(details.changes)) {
    for (const ch of details.changes) {
      const label = FIELD_LABELS[String(ch?.field)] || String(ch?.field || '')
      if (ch?.from !== undefined && ch?.to !== undefined && String(ch.from) && String(ch.to)) {
        parts.push(`${label} changed ${plainText(ch.from).slice(0, 40)} → ${plainText(ch.to).slice(0, 40)}`)
      } else if (label) parts.push(`${label} edited`)
    }
    return parts.join('; ')
  }
  const edited: string[] = []
  for (const k of keys) {
    if (k === 'activityId') {
      parts.push(details[k] ? `Linked to activity ${activityName || ''}`.trim() : 'Unlinked from activity')
    } else if (k === 'photos' && Array.isArray(details[k])) {
      if (details[k].length) parts.push(`${details[k].length} photo${details[k].length === 1 ? '' : 's'} saved`)
    } else if (k === 'assignedTo' && details[k]) {
      parts.push(`Assigned to ${plainText(details[k])}`)
    } else if (k === 'status' && details[k]) {
      parts.push(`Status set to ${plainText(details[k])}`)
    } else if (FIELD_LABELS[k]) {
      edited.push(FIELD_LABELS[k])
    }
  }
  if (edited.length) {
    const list = edited.length > 2 ? `${edited.slice(0, -1).join(', ')} and ${edited[edited.length - 1]}` : edited.join(' and ')
    parts.push(`${list} edited`)
  }
  return parts.join('; ')
}

export function buildHistory(logs: any[], opts: { activityName?: string; issue?: any; generatedAt?: Date } = {}): HistoryLine[] {
  const events = (Array.isArray(logs) ? logs : [])
    .filter(e => e && e.ts)
    .slice()
    .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
  const out: HistoryLine[] = []
  const fmt = (ts: any) => {
    const d = new Date(ts)
    return isNaN(d.getTime()) ? '' : `${d.toLocaleDateString('en-US')} ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false })}`
  }
  let i = 0
  while (i < events.length) {
    const e = events[i]
    const by = String(e.by || '')
    if (e.type === 'create') {
      const iss = opts.issue || {}
      const bits = [
        `Issue raised as ${priorityBucket(iss.severity)}`,
        iss.assignedTo ? `assigned to ${plainText(iss.assignedTo)}` : '',
        iss.dueDate ? `due ${fmtDate(iss.dueDate)}` : '',
      ].filter(Boolean).join(', ')
      out.push({ date: fmt(e.ts), text: bits, by, bold: true })
      i++
      continue
    }
    if (e.type === 'update') {
      // collapse same-user updates within 60 minutes
      const group = [e]
      let j = i + 1
      while (j < events.length && events[j].type === 'update' && String(events[j].by || '') === by
        && new Date(events[j].ts).getTime() - new Date(group[group.length - 1].ts).getTime() < 60 * 60 * 1000) {
        group.push(events[j]); j++
      }
      const described = group.map(g => describeDetails(g.details, opts.activityName)).filter(Boolean)
      const unique = [...new Set(described)]
      if (unique.length) {
        let text = unique.join('; ')
        if (group.length > 1) text += ` (${group.length} edits)`
        out.push({ date: fmt(e.ts), text, by })
      } else if (described.length === 0 && group.every(g => !describeDetails(g.details, opts.activityName))) {
        // all empty payloads -> hidden entirely (no-change saves)
      }
      i = j
      continue
    }
    if (e.type === 'delete') { i++; continue }
    // other event types: use their message verbatim (already human text)
    const msg = plainText(e.message || '')
    if (msg) out.push({ date: fmt(e.ts), text: msg, by })
    i++
  }
  // system overdue event
  const iss = opts.issue || {}
  const open = !['closed', 'cancelled'].includes(String(iss.status || '').toLowerCase())
  const due = iss.dueDate ? new Date(iss.dueDate) : null
  const now = opts.generatedAt || new Date()
  const hasResponse = !!plainText(iss.response?.correctiveAction || iss.resolution)
  if (open && due && !isNaN(due.getTime()) && now.getTime() > due.getTime() && !hasResponse) {
    out.push({ date: fmtDate(iss.dueDate), text: 'Due date passed, no contractor response recorded', by: 'System', red: true, bold: true })
  }
  return out
}

// ---------------------------------------------------------------------------

export function assembleIssueReportModel(input: IssueReportInput): IssueReportModel {
  const { issue, project } = input
  const now = input.generatedAt || new Date()
  const shortMap: Record<string, string> = (project?.reportSettings && typeof project.reportSettings === 'object' && project.reportSettings.companyShortNames) || {}
  const number = String(issue?.number ?? '')
  const title = plainText(issue?.title)
  const priority = priorityBucket(issue?.severity)
  const statusRaw = String(issue?.status || 'Open')
  const closed = ['closed', 'cancelled'].includes(statusRaw.toLowerCase())
  const verification = issue?.verification && issue.verification.outcome ? issue.verification : null
  const outcomeLabels: Record<string, string> = {
    verified_closed: 'Verified, issue closed',
    not_resolved: 'Not resolved, remains open',
    accepted_as_is: 'Accepted by Owner as-is',
  }

  // due line
  let dueLine: IssueReportModel['dueLine'] = null
  const due = issue?.dueDate ? new Date(issue.dueDate) : null
  if (closed) {
    dueLine = { text: `Closed ${fmtDate(issue?.closedDate) || ''}`.trim(), red: false }
  } else if (due && !isNaN(due.getTime())) {
    const days = Math.round((now.getTime() - due.getTime()) / DAY)
    dueLine = days > 0
      ? { text: `Overdue ${days} day${days === 1 ? '' : 's'} · due ${fmtDate(issue.dueDate)}`, red: true }
      : { text: `Due ${days === 0 ? 'today' : `in ${-days} day${days === -1 ? '' : 's'}`} · ${fmtDate(issue.dueDate)}`, red: false }
  }

  // response: Step 2 block, with legacy resolution as the recorded fallback
  const responseRaw = issue?.response && plainText(issue.response.correctiveAction)
    ? issue.response
    : (plainText(issue?.resolution) ? { correctiveAction: issue.resolution, completedDate: '', respondedBy: '' } : null)

  const equipmentTags = (input.equipmentTags && input.equipmentTags.length)
    ? input.equipmentTags
    : (issue?.tag ? [String(issue.tag)] : [])

  const facts: IssueReportModel['facts'] = [
    { label: 'Assigned to', value: formatPerson(issue?.assignedTo, shortMap) },
    { label: 'Found by', value: formatPerson(issue?.foundBy, shortMap) },
    { label: 'Found / due', value: [fmtDate(issue?.dateFound), fmtDate(issue?.dueDate)].filter(Boolean).join(' → ') },
    { label: 'Equipment', value: equipmentTags.join(' · '), mono: true },
    { label: 'Location · system', value: [plainText(issue?.location), plainText(issue?.system)].filter(Boolean).join(' · ') },
    { label: 'Raised during', value: plainText(input.activityName || '') },
  ]

  const photos = (input.photos || []).filter(p => p && p.dataUrl).map(p => ({ dataUrl: p.dataUrl, caption: plainText(p.caption || '') }))
  const takenDate = fmtDate(issue?.dateFound)
  const statusAsOf = now.toLocaleDateString('en-US')
  const projectNo = String(project?.number || project?.projectNumber || project?.metadata?.number || '')

  const distribution = [
    issue?.assignedTo ? `${formatPerson(issue.assignedTo, shortMap)} (assigned)` : '',
    ...(Array.isArray(project?.reportSettings?.issueDistribution) ? project.reportSettings.issueDistribution : [])
      .map((d: any) => typeof d === 'string' ? d : [d?.name, shortCompany(d?.company, shortMap)].filter(Boolean).join(', ')),
  ].filter(Boolean).join(' · ')

  return {
    projectName: String(project?.name || ''),
    projectNo,
    clientName: shortCompany(project?.client || '', shortMap),
    eyebrow: `COMMISSIONING ISSUE${issue?.type ? ` · ${typeLabel(issue.type).toUpperCase()}` : ''}`,
    number,
    title,
    priority,
    statusLabel: closed ? 'CLOSED' : statusRaw.toUpperCase(),
    closed,
    verified: !!verification,
    dueLine,
    lifeSafetyNote: issue?.lifeSafety ? plainText(issue?.lifeSafetyNote || 'This issue carries a life-safety aspect.') : '',
    facts,
    condition: plainText(issue?.description),
    requiredAction: splitActions(issue?.recommendation || ''),
    referenceLine: plainText(issue?.reference || ''),
    photos,
    photosNote: photos.length ? `${photos.length} photo${photos.length === 1 ? '' : 's'}${takenDate ? ` · taken ${takenDate}` : ''}` : '',
    response: responseRaw ? {
      correctiveAction: plainText(responseRaw.correctiveAction),
      completedDate: fmtDate(responseRaw.completedDate),
      respondedBy: plainText(responseRaw.respondedBy),
    } : null,
    verification: verification ? {
      outcomeLabel: outcomeLabels[String(verification.outcome)] || plainText(verification.outcome),
      verifiedBy: plainText(verification.verifiedBy),
      verifiedDate: fmtDate(verification.verifiedDate),
      notes: plainText(verification.notes),
    } : null,
    history: buildHistory(input.logs || [], { activityName: input.activityName, issue, generatedAt: now }),
    comments: (Array.isArray(issue?.comments) ? issue.comments : [])
      .map((cm: any) => ({ author: plainText(cm?.name), date: fmtDate(cm?.createdAt), text: plainText(cm?.text) }))
      .filter((cm: any) => cm.text),
    distribution,
    runningTitle: [String(project?.name || ''), `Issue #${number}`, title].filter(Boolean).join(' · '),
    footerLabel: `Issue #${number} · Status as of ${statusAsOf} · Generated in cxma`,
    statusAsOf,
  }
}

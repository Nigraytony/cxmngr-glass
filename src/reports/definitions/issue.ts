// Issue report definitions (Detailed / Compact / List), built on the report
// kit. Replaces the renderless IssuePdfReport.vue component.
import { ReportDoc } from '../core/frame'
import { drawTable } from '../core/table'
import { loadImage, type ImageFormat } from '../core/images'
import { formatDate, htmlToText, normalizePdfText, splitText } from '../core/text'
import { SANS } from '../core/tokens'
import { deliverPdf, openDeliveryWindow, reportFileName } from '../core/deliver'
import { useProjectStore } from '../../stores/project'

/** Resolve the project for header logos: current selection, or fetch by the issues' projectId. */
async function resolveProject(preferredPid?: any): Promise<any> {
  const projectStore = useProjectStore()
  let project: any = (projectStore.currentProject && (projectStore.currentProject as any).value) || null
  const targetPid = preferredPid || (typeof window !== 'undefined' ? localStorage.getItem('selectedProjectId') : null)
  if (!project || (targetPid && (String(project._id || project.id) !== String(targetPid)))) {
    try { if (targetPid) project = await projectStore.fetchProject(String(targetPid)) } catch (e) { /* ignore optional project fetch */ }
  }
  return project || {}
}

/** "Issue # N — title" heading plus the two-column key-fields grid. */
function renderIssueTitleAndFields(rd: ReportDoc, issue: any): void {
  const doc = rd.doc
  const numberText = issue.number != null ? `Issue # ${issue.number}` : 'Issue'
  const titleText = issue.title ? ` — ${normalizePdfText(String(issue.title))}` : ''
  doc.setFont(SANS, 'bold'); doc.setFontSize(14)
  const titleLines = splitText(doc, numberText + titleText, rd.contentWidth)
  rd.ensureSpace(Math.max(10, titleLines.length * 7) + 2)
  doc.text(titleLines, rd.margin, rd.y)
  rd.y += Math.max(10, titleLines.length * 7) + 2

  doc.setFont(SANS, 'normal'); doc.setFontSize(10)
  const info: Array<[string, string]> = [
    ['Type', normalizePdfText(String(issue.type || ''))],
    ['Priority', normalizePdfText(String(issue.priority || ''))],
    ['Status', normalizePdfText(String(issue.status || ''))],
    ['Found By', normalizePdfText(String(issue.foundBy || ''))],
    ['Date Found', formatDate(issue.dateFound)],
    ['Assigned To', normalizePdfText(String(issue.assignedTo || ''))],
    ['Due Date', formatDate(issue.dueDate)],
    ['Closed By', normalizePdfText(String(issue.closedBy || ''))],
    ['Closed Date', formatDate(issue.closedDate)],
    ['Location', normalizePdfText(String(issue.location || ''))],
    ['System', normalizePdfText(String(issue.system || ''))],
  ]
  const colW = rd.contentWidth / 2
  const rows = Math.ceil(info.length / 2)
  rd.ensureSpace(rows * 7 + 2)
  let i = 0
  for (const [label, value] of info) {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = rd.margin + col * colW
    const yy = rd.y + row * 7
    doc.setTextColor(100)
    doc.text(label + ':', x, yy)
    doc.setTextColor(0)
    const vLines = splitText(doc, value, colW - 24)
    doc.text(vLines, x + 24, yy)
    i++
  }
  rd.y += rows * 7 + 2
}

/** A heading + paginated body-text section; skipped when the content is empty. */
function renderTextSection(rd: ReportDoc, heading: string, content?: string): void {
  const doc = rd.doc
  const text = normalizePdfText(htmlToText(content || ''))
  if (!text) return
  rd.ensureSpace(12)
  doc.setFont(SANS, 'bold'); doc.setFontSize(12)
  doc.text(heading, rd.margin, rd.y)
  rd.y += 6
  doc.setFont(SANS, 'normal'); doc.setFontSize(10)
  const lines = splitText(doc, text, rd.contentWidth)
  const lineHeight = 5
  let idx = 0
  while (idx < lines.length) {
    const remaining = Math.floor((rd.bottomLimit - rd.y) / lineHeight)
    if (remaining <= 0) { rd.newPage(); continue }
    const chunk = lines.slice(idx, idx + remaining)
    doc.text(chunk, rd.margin, rd.y)
    rd.y += chunk.length * lineHeight + 4
    idx += chunk.length
  }
}

/** Single-issue detailed report (the issue editor's download button).
 *  Redesigned (issue-mockup.pdf): delegates to definitions/issue/report,
 *  which fetches the full record + photos + logs and renders the two-page
 *  issue sheet. The multi-issue batch exports below keep the legacy layout
 *  until the batch-export phase of the redesign. */
export async function generateIssuePdf(issue: any, opts: { sections?: Record<string, boolean> } = {}): Promise<void> {
  if (!issue) return
  const project = await resolveProject(issue?.projectId)
  const { generateIssueDetailReport } = await import('./issue/report')
  await generateIssueDetailReport(issue, project, opts)
}

/** Editable Word (.docx) version of the Issue Detail report — same model
 *  and section toggles as the PDF. */
export async function generateIssueDocx(issue: any, opts: { sections?: Record<string, boolean> } = {}): Promise<void> {
  if (!issue) return
  const project = await resolveProject(issue?.projectId)
  const { generateIssueDetailDocx } = await import('./issue/report')
  await generateIssueDetailDocx(issue, project, opts)
}

/** Batch export (Issue report redesign Step 5): a cover table followed by
 *  each selected issue's full redesigned sheet, continuous page numbers.
 *  Honors the per-project section preferences from IssueEdit's ▾ menu. */
export async function generateIssuesDetailedPdf(issues: any[]): Promise<void> {
  if (!Array.isArray(issues) || issues.length === 0) return
  const project = await resolveProject(issues[0]?.projectId)
  const { generateIssuesBatchReport, loadIssueReportSections } = await import('./issue/report')
  const pid = String(issues[0]?.projectId || project?._id || project?.id || '')
  await generateIssuesBatchReport(issues, project, { sections: loadIssueReportSections(pid) })
}

/** Dense multi-issue report: fields + text sections only, flowing continuously. */
export async function generateIssuesCompactPdf(issues: any[]): Promise<void> {
  if (!Array.isArray(issues) || issues.length === 0) return
  const dlWin = openDeliveryWindow()
  const project = await resolveProject(issues[0]?.projectId)
  const rd = await ReportDoc.create({
    title: 'Issues Report',
    footerLabel: 'Issues Report',
    project,
  })
  for (let k = 0; k < issues.length; k++) {
    if (k > 0) rd.sectionGap(3)
    const issue = issues[k]
    renderIssueTitleAndFields(rd, issue)
    renderTextSection(rd, 'Description', issue.description)
    renderTextSection(rd, 'Recommendation', issue.recommendation)
    renderTextSection(rd, 'Resolution', issue.resolution)
  }
  deliverPdf(rd.finish(), reportFileName(['issues-compact']), dlWin)
}

/** Landscape flat table of issues with the caller's column selection. */
export async function generateIssuesListPdf(issues: any[], columns?: string[]): Promise<void> {
  if (!Array.isArray(issues) || issues.length === 0) return
  const dlWin = openDeliveryWindow()
  const project = await resolveProject(issues[0]?.projectId)
  const projName = project?.name ? String(project.name) : ''
  const rd = await ReportDoc.create({
    title: projName ? `${projName} - Issues List` : 'Issues List',
    footerLabel: 'Issues List',
    project,
    orientation: 'landscape',
    titleFontSize: 14,
  })
  // Columns (filter out foundBy, dateFound, assignedTo, and severity explicitly)
  const provided = (Array.isArray(columns) && columns.length)
    ? columns.slice()
    : Object.keys(issues.reduce((acc, it) => { Object.keys(it || {}).forEach(k => { if (k !== 'id' && k !== '_id') acc[k] = true }); return acc }, {} as any))
  let cols = provided.filter(k => !/^foundby$/i.test(String(k)) && !/^datefound$/i.test(String(k)) && !/^assignedto$/i.test(String(k)) && !/^severity$/i.test(String(k)))
  if (cols.length === 0) {
    cols = ['number', 'title', 'type', 'priority', 'status', 'dueDate', 'location', 'system']
  }

  const weightFor = (k: string) => {
    const key = String(k).toLowerCase()
    if (key === 'description') return 3
    if (key === 'title') return 1.5
    if (key === 'priority') return 0.625
    if (key === 'severity' || key === 'status' || key === 'number') return 0.5
    return 1
  }

  const headerLabel = (key: string) => {
    if (/^responsible_person$/i.test(key)) return 'responsible'
    if (/^number$/i.test(key)) return '#'
    if (/^duedate$/i.test(key)) return 'due date'
    if (/^closeddate$/i.test(key)) return 'closed date'
    return String(key)
  }

  const cellText = (row: any, key: string): string => {
    const v = (row as any)?.[key]
    if (key === 'description') return normalizePdfText(htmlToText(v))
    if (v === null || v === undefined) return ''
    if (Array.isArray(v)) {
      if (key.toLowerCase().includes('comment')) return `${v.length} comment(s)`
      if (key.toLowerCase().includes('photo') || key.toLowerCase().includes('image')) return `${v.length} photo(s)`
      if (key.toLowerCase().includes('attach') || key.toLowerCase().includes('document')) return `${v.length} attachment(s)`
      try { return v.join(', ') } catch (e) { return String(v) }
    }
    if (typeof v === 'object') {
      if ('name' in v && typeof (v as any).name === 'string') return String((v as any).name)
      try { return JSON.stringify(v) } catch (e) { return String(v) }
    }
    if (/(date|created|updated)/i.test(key)) {
      try { return v ? new Date(v).toLocaleDateString() : '' } catch (e) { return String(v) }
    }
    return normalizePdfText(String(v))
  }

  drawTable(rd, {
    columns: cols.map(k => ({ key: String(k), label: headerLabel(String(k)), weight: weightFor(k) })),
    rows: issues,
    cellText,
  })

  deliverPdf(rd.finish(), reportFileName([projName, 'issues-list']), dlWin)
}

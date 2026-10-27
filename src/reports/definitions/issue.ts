// Issue report definitions (Detailed / Compact / List), built on the report
// kit. Replaces the renderless IssuePdfReport.vue component.
import { ReportDoc } from '../core/frame'
import { formatDateOnly } from '../core/dates'
import { drawTable } from '../core/table'

import { htmlToText, normalizePdfText } from '../core/text'
import { issueColumnLabel } from './issue/labels'

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
export async function generateIssuesDetailedPdf(issues: any[], opts: { summaryBand?: boolean } = {}): Promise<void> {
  if (!Array.isArray(issues) || issues.length === 0) return
  const project = await resolveProject(issues[0]?.projectId)
  const { generateIssuesBatchReport, loadIssueReportSections } = await import('./issue/report')
  const pid = String(issues[0]?.projectId || project?._id || project?.id || '')
  await generateIssuesBatchReport(issues, project, { sections: loadIssueReportSections(pid), summaryBand: opts.summaryBand })
}

/** Issue Sheets (Issues batch redesign): the compact card deck — priority
 *  top borders, chips, clamped Condition/Action, photo thumbnails, a card
 *  never split across pages. Replaces the old run-together compact layout. */
export async function generateIssuesCompactPdf(issues: any[], opts: { scopeLine?: string; summaryBand?: boolean } = {}): Promise<void> {
  if (!Array.isArray(issues) || issues.length === 0) return
  const project = await resolveProject(issues[0]?.projectId)
  const { generateIssueSheetsReport } = await import('./issue/sheets')
  await generateIssueSheetsReport(issues, project, opts)
}

/** Issues Log (Batch-Log mockup): landscape table with the summary band,
 *  plain-words filter line, chips, and no-split rows. */
export async function generateIssuesLogPdf(issues: any[], opts: Record<string, any> = {}): Promise<void> {
  if (!Array.isArray(issues) || issues.length === 0) return
  const project = await resolveProject(issues[0]?.projectId)
  const { generateIssuesLogReport } = await import('./issue/log')
  await generateIssuesLogReport(issues, project, opts)
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

  // Weights sized so short enum/date columns NEVER break words mid-word
  // ("Mediu/m", "Clos/ed"): each gets room for its longest value + header.
  const weightFor = (k: string) => {
    const key = String(k).toLowerCase()
    if (key === 'description' || key === 'recommendation' || key === 'resolution') return 3
    if (key === 'title') return 1.8
    if (key === 'number') return 0.4
    if (key === 'priority' || key === 'severity' || key === 'status' || key === 'type') return 0.85
    if (/(date|created|updated)/.test(key)) return 0.95
    if (key === 'tag' || key === 'system') return 0.8
    return 1.1
  }

  // Display labels, never raw field names — shared with the Data exports.
  const headerLabel = issueColumnLabel

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
      // Date-only fields must not shift a day across timezones (core/dates).
      return formatDateOnly(v)
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

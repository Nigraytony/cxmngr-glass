// Issue report definitions (Detailed / Compact / List), built on the report
// kit. Replaces the renderless IssuePdfReport.vue component.
import { ReportDoc } from '../core/frame'
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

function issueHeaderTitle(issue: any): string {
  return issue?.number != null ? `Issue ${issue.number} Report` : 'Issue Report'
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

/** Full single-issue layout: fields, text sections, comments, photos, attachments. */
async function renderIssueDetails(rd: ReportDoc, issue: any): Promise<void> {
  const doc = rd.doc
  renderIssueTitleAndFields(rd, issue)
  renderTextSection(rd, 'Description', issue.description)
  renderTextSection(rd, 'Recommendation', issue.recommendation)
  renderTextSection(rd, 'Resolution', issue.resolution)

  // Comments
  try {
    const commentsArr: any[] = Array.isArray(issue.comments) ? issue.comments : []
    if (commentsArr.length) {
      const drawCommentsHeader = (continued = false) => {
        rd.ensureSpace(12)
        doc.setFont(SANS, 'bold'); doc.setFontSize(12)
        doc.text(continued ? 'Comments (continued)' : 'Comments', rd.margin, rd.y)
        rd.y += 6
        doc.setFont(SANS, 'normal'); doc.setFontSize(9)
      }
      drawCommentsHeader(false)
      for (const cm of commentsArr) {
        const namePart = cm?.name ? String(cm.name) : ''
        const datePart = cm?.createdAt ? formatDate(String(cm.createdAt)) : ''
        const prefix = namePart ? `${namePart}${datePart ? ` (${datePart})` : ''}: ` : ''
        const line = `${prefix}${htmlToText(cm?.text || '')}`
        const lines = splitText(doc, line, rd.contentWidth)
        const needed = Math.min(12, lines.length * 4) + 2
        if (rd.ensureSpace(needed)) drawCommentsHeader(true)
        doc.text(lines, rd.margin, rd.y)
        rd.y += needed
      }
    }
  } catch (e) { /* ignore */ }

  // Photos (up to 6 thumbnails, 3 per row)
  try {
    const phs: any[] = Array.isArray(issue.photos) ? issue.photos : []
    const imgs: Array<{ dataUrl: string, format?: ImageFormat }> = []
    for (let p = 0; p < Math.min(6, phs.length); p++) {
      const src = typeof phs[p] === 'string' ? phs[p] : (phs[p]?.data || phs[p]?.url || phs[p]?.src)
      const img = await loadImage(src)
      if (img.dataUrl) imgs.push({ dataUrl: img.dataUrl, format: img.format })
    }
    if (imgs.length) {
      rd.ensureSpace(10)
      doc.setFont(SANS, 'bold'); doc.setFontSize(12)
      doc.text('Photos', rd.margin, rd.y)
      rd.y += 4
      const thumbW = (rd.contentWidth - 8) / 3
      const thumbH = thumbW * 0.75
      let rowStart = 0
      while (rowStart < imgs.length) {
        const rowImgs = imgs.slice(rowStart, rowStart + 3)
        rd.ensureSpace(thumbH + 4)
        rowImgs.forEach((it, idxInRow) => {
          const x = rd.margin + idxInRow * (thumbW + 4)
          try { doc.addImage(it.dataUrl, it.format || 'JPEG', x, rd.y, thumbW, thumbH) } catch (e) { /* ignore */ }
        })
        rd.y += thumbH + 4
        rowStart += 3
      }
      rd.y += 2
    }
  } catch (e) { /* ignore */ }

  // Attachments (list up to 5)
  try {
    const atts: any[] = Array.isArray(issue.attachments) ? issue.attachments : (issue as any)?.documents || []
    if (atts.length) {
      rd.ensureSpace(12)
      doc.setFont(SANS, 'bold'); doc.setFontSize(12)
      doc.text('Attachments', rd.margin, rd.y)
      rd.y += 6
      doc.setFont(SANS, 'normal'); doc.setFontSize(9)
      for (let a = 0; a < Math.min(5, atts.length); a++) {
        const att = atts[a]
        const name = (typeof att === 'string') ? att.split('/').pop() : (att?.name || att?.filename || att?.url || 'Attachment')
        const lines = splitText(doc, String(name), rd.contentWidth)
        if (rd.ensureSpace(10)) {
          doc.setFont(SANS, 'bold'); doc.setFontSize(12)
          doc.text('Attachments (continued)', rd.margin, rd.y)
          rd.y += 6
          doc.setFont(SANS, 'normal'); doc.setFontSize(9)
        }
        doc.text(lines, rd.margin + 2, rd.y)
        rd.y += Math.min(10, lines.length * 4) + 1
      }
    }
  } catch (e) { /* ignore */ }
}

/** One issue per page (or more), with full detail sections. */
export async function generateIssuesDetailedPdf(issues: any[]): Promise<void> {
  if (!Array.isArray(issues) || issues.length === 0) return
  const dlWin = openDeliveryWindow()
  const project = await resolveProject(issues[0]?.projectId)
  const rd = await ReportDoc.create({
    title: issueHeaderTitle(issues[0]),
    footerLabel: 'Issues Report',
    project,
  })
  for (let idx = 0; idx < issues.length; idx++) {
    const issue = issues[idx]
    if (idx > 0) {
      rd.setTitle(issueHeaderTitle(issue))
      rd.newPage()
    }
    await renderIssueDetails(rd, issue)
  }
  deliverPdf(rd.finish(), reportFileName(['issues-detailed']), dlWin)
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
  const doc = rd.doc

  // Columns (filter out foundBy, dateFound, assignedTo, and severity explicitly)
  const provided = (Array.isArray(columns) && columns.length)
    ? columns.slice()
    : Object.keys(issues.reduce((acc, it) => { Object.keys(it || {}).forEach(k => { if (k !== 'id' && k !== '_id') acc[k] = true }); return acc }, {} as any))
  let cols = provided.filter(k => !/^foundby$/i.test(String(k)) && !/^datefound$/i.test(String(k)) && !/^assignedto$/i.test(String(k)) && !/^severity$/i.test(String(k)))
  if (cols.length === 0) {
    cols = ['number', 'title', 'type', 'priority', 'status', 'dueDate', 'location', 'system']
  }

  // Column widths: custom weights per column
  const tableWidth = rd.contentWidth
  const weights = cols.map(k => {
    const key = String(k).toLowerCase()
    if (key === 'description') return 3
    if (key === 'title') return 1.5
    if (key === 'priority') return 0.625
    if (key === 'severity' || key === 'status' || key === 'number') return 0.5
    return 1
  })
  const totalWeight = weights.reduce((a, b) => a + b, 0) || 1
  const widths = cols.map((_, i) => tableWidth * (weights[i] / totalWeight))

  const headerLabel = (key: string) => {
    if (/^responsible_person$/i.test(key)) return 'responsible'
    if (/^number$/i.test(key)) return '#'
    if (/^duedate$/i.test(key)) return 'due date'
    if (/^closeddate$/i.test(key)) return 'closed date'
    return String(key)
  }
  const textYOffset = 3.18

  const drawColumnHeader = () => {
    doc.setFont(SANS, 'bold'); doc.setFontSize(10)
    let hx = rd.margin
    for (let i = 0; i < cols.length; i++) {
      doc.text(headerLabel(String(cols[i])), hx + 1, rd.y + textYOffset)
      hx += widths[i]
    }
    rd.y += 4
    doc.setDrawColor(200, 200, 200)
    doc.line(rd.margin, rd.y, rd.margin + tableWidth, rd.y)
    rd.y += 2
    doc.setFont(SANS, 'normal'); doc.setFontSize(9)
  }

  const maxW = (idx: number) => widths[idx] - 2
  const lineHeight = 4

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

  drawColumnHeader()
  for (let r = 0; r < issues.length; r++) {
    const row = issues[r]
    const cellLines: string[][] = []
    let rowLines = 1
    for (let c = 0; c < cols.length; c++) {
      const text = cellText(row, cols[c])
      const lines = splitText(doc, text, Math.max(10, maxW(c)))
      cellLines.push(lines)
      rowLines = Math.max(rowLines, lines.length)
    }
    const rowHeight = rowLines * lineHeight + 2
    if (rd.ensureSpace(rowHeight + textYOffset)) drawColumnHeader()
    // Zebra stripe background (alternate rows)
    if (r % 2 === 1) {
      try {
        doc.setFillColor(245, 245, 245)
        doc.rect(rd.margin, rd.y - 1, tableWidth, rowHeight + 2, 'F')
      } catch (e) { /* ignore */ }
    }
    let cx = rd.margin
    for (let c = 0; c < cols.length; c++) {
      doc.text(cellLines[c], cx + 1, rd.y + textYOffset)
      cx += widths[c]
    }
    rd.y += rowHeight + 1
  }

  deliverPdf(rd.finish(), reportFileName([projName, 'issues-list']), dlWin)
}

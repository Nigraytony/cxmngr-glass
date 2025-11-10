<script setup lang="ts">
import { ref } from 'vue'
import jsPDF from 'jspdf'
import { useProjectStore } from '../../stores/project'

// Image helpers copied and generalized from IssueEdit.vue

type ImageFormat = 'PNG' | 'JPEG' | 'WEBP'

function mimeToFormat(mime?: string | null): ImageFormat | undefined {
  if (!mime) return undefined
  const m = mime.toLowerCase()
  if (m.includes('png')) return 'PNG'
  if (m.includes('jpeg') || m.includes('jpg')) return 'JPEG'
  if (m.includes('webp')) return 'WEBP'
  return undefined
}

async function convertDataUrlToJpeg(dataUrl: string, quality = 0.92): Promise<string | null> {
  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('image load failed'))
      img.src = dataUrl
    })
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth || img.width
    canvas.height = img.naturalHeight || img.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0)
    return canvas.toDataURL('image/jpeg', quality)
  } catch {
    return null
  }
}

async function loadImage(src?: string): Promise<{ dataUrl?: string, format?: ImageFormat }> {
  try {
    if (!src) return {}
    if (src.startsWith('data:')) {
      const mime = src.slice(5, src.indexOf(';'))
      let fmt = mimeToFormat(mime)
      if (fmt === 'WEBP' || (mime && mime.toLowerCase().includes('svg'))) {
        const conv = await convertDataUrlToJpeg(src)
        if (conv) return { dataUrl: conv, format: 'JPEG' }
      }
      return { dataUrl: src, format: fmt }
    }
    const res = await fetch(src)
    if (!res.ok) return {}
    const blob = await res.blob()
    const dataUrl: string = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(String(reader.result))
      reader.readAsDataURL(blob)
    })
    let fmt = mimeToFormat(blob.type)
    if ((blob.type && blob.type.toLowerCase().includes('svg')) || fmt === 'WEBP') {
      const conv = await convertDataUrlToJpeg(dataUrl)
      if (conv) return { dataUrl: conv, format: 'JPEG' }
    }
    return { dataUrl, format: fmt }
  } catch {
    return {}
  }
}

function htmlToText(html?: string): string {
  if (!html) return ''
  try {
    const tmp = document.createElement('div')
    tmp.innerHTML = String(html)
    const t = tmp.textContent || tmp.innerText || ''
    return t.replace(/\s+/g, ' ').trim()
  } catch {
    return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  }
}

function formatDate(dt?: string): string {
  try { return dt ? new Date(dt).toLocaleDateString() : '' } catch { return '' }
}

function splitText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth) as unknown as string[]
}

const projectStore = useProjectStore()

// Renders a single issue onto the provided doc, returns the new y position and whether a new page was added at the end.
async function renderIssuePage(doc: jsPDF, issue: any, opts: { pageNoRef: { value: number } }) {
  const margin = 12
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const bottomLimit = pageHeight - 26
  const pageDate = new Date().toLocaleDateString()
  let y = margin

  // Resolve project for header logos
  let project: any = (projectStore.currentProject && (projectStore.currentProject as any).value) || null
  const targetPid = issue.projectId || (typeof window !== 'undefined' ? localStorage.getItem('selectedProjectId') : null)
  if (!project || (targetPid && (String(project._id || project.id) !== String(targetPid)))) {
    try { if (targetPid) project = await projectStore.fetchProject(String(targetPid)) } catch (e) { /* ignore optional project fetch */ }
  }
  project = project || {}
  const clientImg = await loadImage(project?.logo)
  const cxaImg = await loadImage(project?.commissioning_agent?.logo)

  // Load footer logo once
  let footerLogo = await loadImage('/brand/logo.png')
  if (!footerLogo.dataUrl) footerLogo = await loadImage('/brand/logo.svg')

  const drawFooter = () => {
    const footerY = pageHeight - 10
    doc.setDrawColor(180, 180, 180)
    doc.line(margin, footerY - 6, pageWidth - margin, footerY - 6)
    try {
      if (footerLogo.dataUrl) {
        const lh = 5.5
        const lw = 12
        doc.addImage(footerLogo.dataUrl, footerLogo.format || 'PNG', margin, footerY - lh, lw, lh)
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
        const issueNumText = (issue.number != null && issue.number !== undefined) ? String(issue.number) : ''
        const footerTitle = `Issue ${issueNumText} Report`
        doc.text(footerTitle, margin + lw + 2, footerY - 2)
      } else {
        doc.setFillColor(220, 220, 220)
        doc.rect(margin, footerY - 5.5, 8, 5, 'F')
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
        const issueNumText = (issue.number != null && issue.number !== undefined) ? String(issue.number) : ''
        const footerTitle = `Issue ${issueNumText} Report`
        doc.text(footerTitle, margin + 10, footerY - 2)
      }
    } catch (e) {
      doc.setFillColor(220, 220, 220)
      doc.rect(margin, footerY - 5.5, 8, 5, 'F')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
      const issueNumText = (issue.number != null && issue.number !== undefined) ? String(issue.number) : ''
      const footerTitle = `Issue ${issueNumText} Report`
      doc.text(footerTitle, margin + 10, footerY - 2)
    }
    // Middle: page number
    doc.setFont('helvetica', 'normal')
    doc.text(String(opts.pageNoRef.value), pageWidth / 2, footerY - 2, { align: 'center' })
    // Right: date
    doc.text(pageDate, pageWidth - margin, footerY - 2, { align: 'right' })
  }

  // Header logos
  const logoH = 12
  if (clientImg.dataUrl) doc.addImage(clientImg.dataUrl, clientImg.format || 'PNG', margin, y, logoH * 2.5, logoH)
  if (cxaImg.dataUrl) {
    const w = logoH * 2.5
    doc.addImage(cxaImg.dataUrl, cxaImg.format || 'PNG', pageWidth - margin - w, y, w, logoH)
  }

  // H1 header
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  const headerIssueNum = (issue.number != null && issue.number !== undefined) ? String(issue.number) : ''
  doc.text(`Issue ${headerIssueNum} Report`, pageWidth / 2, y + 8, { align: 'center' })
  y += 22

  // H2 title line
  const numberText = issue.number != null ? `Issue # ${issue.number}` : 'Issue'
  const titleText = issue.title ? ` — ${issue.title}` : ''
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  const titleLines = splitText(doc, numberText + titleText, pageWidth - margin * 2)
  doc.text(titleLines, margin, y)
  y += Math.max(10, titleLines.length * 7) + 2

  // Key fields grid
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const info: Array<[string, string]> = [
    ['Type', String(issue.type || '')],
    ['Priority', String(issue.priority || '')],
    ['Status', String(issue.status || '')],
    ['Found By', String(issue.foundBy || '')],
    ['Date Found', formatDate(issue.dateFound)],
    ['Assigned To', String(issue.assignedTo || '')],
    ['Due Date', formatDate(issue.dueDate)],
    ['Closed By', String(issue.closedBy || '')],
    ['Closed Date', formatDate(issue.closedDate)],
    ['Location', String(issue.location || '')],
    ['System', String(issue.system || '')],
  ]
  const colW = (pageWidth - margin * 2) / 2
  const labelColor = 100
  let i = 0
  for (const [label, value] of info) {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = margin + col * colW
    const yy = y + row * 7
    doc.setTextColor(labelColor)
    doc.text(label + ':', x, yy)
    doc.setTextColor(0)
    const vLines = splitText(doc, value, colW - 24)
    doc.text(vLines, x + 24, yy)
    i++
  }
  const rows = Math.ceil(info.length / 2)
  y += rows * 7 + 2

  // Sections helper with simple height guard (one page bias)
  const section = (heading: string, content?: string) => {
    const text = htmlToText(content || '').trim()
    if (!text) return
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    // If no room for header, new page
    if (y + 6 > bottomLimit) { drawFooter(); doc.addPage(); opts.pageNoRef.value++; y = margin }
    doc.text(heading, margin, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const maxW = pageWidth - margin * 2
    const lines = splitText(doc, text, maxW)
    // Basic pagination for long text blocks
    const lineHeight = 5
    let idx = 0
    while (idx < lines.length) {
      const remaining = Math.floor((bottomLimit - y) / lineHeight)
      if (remaining <= 0) { drawFooter(); doc.addPage(); opts.pageNoRef.value++; y = margin; continue }
      const chunk = lines.slice(idx, idx + remaining)
      doc.text(chunk, margin, y)
      y += chunk.length * lineHeight + 4
      idx += chunk.length
    }
  }
  section('Description', issue.description)
  section('Recommendation', issue.recommendation)
  section('Resolution', issue.resolution)

  // Comments: show all with pagination
  try {
    const commentsArr: any[] = Array.isArray(issue.comments) ? issue.comments : []
    if (commentsArr.length) {
      const drawCommentsHeader = (continued = false) => {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
        // If no room for header, new page
        if (y + 6 > bottomLimit) { drawFooter(); doc.addPage(); opts.pageNoRef.value++; y = margin }
        doc.text(continued ? 'Comments (continued)' : 'Comments', margin, y); y += 6
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
      }
      drawCommentsHeader(false)
      for (let c = 0; c < commentsArr.length; c++) {
        const cm = commentsArr[c]
        const namePart = cm?.name ? String(cm.name) : ''
        const datePart = cm?.createdAt ? formatDate(String(cm.createdAt)) : ''
        const prefix = namePart ? `${namePart}${datePart ? ` (${datePart})` : ''}: ` : ''
        const line = `${prefix}${htmlToText(cm?.text || '')}`
        const lines = splitText(doc, line, pageWidth - margin * 2)
        const needed = Math.min(12, lines.length * 4) + 2
        if (y + needed > bottomLimit) { drawFooter(); doc.addPage(); opts.pageNoRef.value++; y = margin; drawCommentsHeader(true) }
        doc.text(lines, margin, y)
        y += needed
      }
    }
  } catch (e) { /* ignore */ }

  // Photos (up to 6 thumbnails; single page bias)
  try {
    const phs: any[] = Array.isArray(issue.photos) ? issue.photos : []
    const imgs = [] as Array<{ dataUrl: string, format?: ImageFormat }>
    for (let p = 0; p < Math.min(6, phs.length); p++) {
      const src = typeof phs[p] === 'string' ? phs[p] : (phs[p]?.data || phs[p]?.url || phs[p]?.src)
      const img = await loadImage(src)
      if (img.dataUrl) imgs.push({ dataUrl: img.dataUrl, format: img.format })
    }
    if (imgs.length) {
      if (y + 4 > bottomLimit) { drawFooter(); doc.addPage(); opts.pageNoRef.value++; y = margin }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('Photos', margin, y); y += 4
      const thumbW = (pageWidth - margin * 2 - 8) / 3
      const thumbH = thumbW * 0.75
      for (let idx = 0; idx < imgs.length; idx++) {
        const col = idx % 3
        const row = Math.floor(idx / 3)
        const x = margin + col * (thumbW + 4)
        const yy = y + row * (thumbH + 4)
        if (yy + thumbH > bottomLimit) break
        const it = imgs[idx]
        doc.addImage(it.dataUrl, it.format || 'JPEG', x, yy, thumbW, thumbH)
      }
      y += Math.min(2, Math.ceil(imgs.length / 3)) * (thumbH + 4) + 2
    }
  } catch (e) { /* ignore */ }

  // Attachments (list up to 5)
  try {
    const atts: any[] = Array.isArray(issue.attachments) ? issue.attachments : (issue as any)?.documents || []
    if (atts.length) {
      if (y + 6 > bottomLimit) { drawFooter(); doc.addPage(); opts.pageNoRef.value++; y = margin }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('Attachments', margin, y); y += 6
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
      const maxA = 5
      for (let a = 0; a < Math.min(maxA, atts.length); a++) {
        const att = atts[a]
        const name = (typeof att === 'string') ? att.split('/').pop() : (att?.name || att?.filename || att?.url || 'Attachment')
        const lines = splitText(doc, String(name), pageWidth - margin * 2)
        if (y + 10 > bottomLimit) { drawFooter(); doc.addPage(); opts.pageNoRef.value++; y = margin; doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('Attachments (continued)', margin, y); y += 6; doc.setFont('helvetica', 'normal'); doc.setFontSize(9) }
        doc.text(lines, margin + 2, y)
        y += Math.min(10, lines.length * 4) + 1
      }
    }
  } catch (e) { /* ignore */ }

  // Footer for final page of this issue
  drawFooter()
}

async function generateIssuePdf(issue: any) {
  // Open blank window to preserve user gesture
  const dlWin = window.open('', '_blank')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageNoRef = { value: 1 }
  await renderIssuePage(doc, issue, { pageNoRef })
  const fname = `issue-${issue?.number || issue?.id || 'report'}.pdf`
  try {
    if (dlWin) {
      const blob = doc.output('blob') as Blob
      const url = URL.createObjectURL(blob)
      try { dlWin.document.title = fname } catch {}
      dlWin.location.href = url
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } else {
      doc.save(fname)
    }
  } catch {
    doc.save(fname)
  }
}

async function generateIssuesDetailedPdf(issues: any[]) {
  if (!Array.isArray(issues) || issues.length === 0) return
  const dlWin = window.open('', '_blank')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageNoRef = { value: 1 }
  for (let idx = 0; idx < issues.length; idx++) {
    const issue = issues[idx]
    if (idx > 0) { doc.addPage(); pageNoRef.value++ }
    await renderIssuePage(doc, issue, { pageNoRef })
  }
  const fname = `issues-detailed-${new Date().toISOString().slice(0,10)}.pdf`
  try {
    if (dlWin) {
      const blob = doc.output('blob') as Blob
      const url = URL.createObjectURL(blob)
      try { dlWin.document.title = fname } catch {}
      dlWin.location.href = url
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } else {
      doc.save(fname)
    }
  } catch {
    doc.save(fname)
  }
}

async function generateIssuesCompactPdf(issues: any[]) {
  if (!Array.isArray(issues) || issues.length === 0) return
  const dlWin = window.open('', '_blank')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 12
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const bottomLimit = pageHeight - 26
  const pageDate = new Date().toLocaleDateString()
  const pageNoRef = { value: 1 }
  // Header placement tighter to the top for compact layout
  const headerTop = 6
  const headerLogoH = 6 // half of detailed report logo height (12)
  // Resolve project for header logos (use first issue's project or current selection)
  let project: any = (projectStore.currentProject && (projectStore.currentProject as any).value) || null
  const targetPid = (issues[0]?.projectId) || (typeof window !== 'undefined' ? localStorage.getItem('selectedProjectId') : null)
  if (!project || (targetPid && (String(project._id || project.id) !== String(targetPid)))) {
    try { if (targetPid) project = await projectStore.fetchProject(String(targetPid)) } catch (e) { /* ignore optional project fetch */ }
  }
  project = project || {}
  const clientImg = await loadImage(project?.logo)
  const cxaImg = await loadImage(project?.commissioning_agent?.logo)
  const drawHeader = () => {
    try {
      if (clientImg.dataUrl) doc.addImage(clientImg.dataUrl, clientImg.format || 'PNG', margin, headerTop, headerLogoH * 2.5, headerLogoH)
      if (cxaImg.dataUrl) {
        const w = headerLogoH * 2.5
        doc.addImage(cxaImg.dataUrl, cxaImg.format || 'PNG', pageWidth - margin - w, headerTop, w, headerLogoH)
      }
  } catch (e) { /* ignore */ }
    return Math.max(margin, headerTop + headerLogoH + 2)
  }
  let y = drawHeader()

  // Footer logo once
  let footerLogo = await loadImage('/brand/logo.png')
  if (!footerLogo.dataUrl) footerLogo = await loadImage('/brand/logo.svg')

  const drawFooter = () => {
    const footerY = pageHeight - 10
    doc.setDrawColor(180, 180, 180)
    doc.line(margin, footerY - 6, pageWidth - margin, footerY - 6)
    try {
      if (footerLogo.dataUrl) {
        const lh = 5.5
        const lw = 12
        doc.addImage(footerLogo.dataUrl, footerLogo.format || 'PNG', margin, footerY - lh, lw, lh)
      } else {
        doc.setFillColor(220, 220, 220)
        doc.rect(margin, footerY - 5.5, 8, 5, 'F')
      }
    } catch {
      doc.setFillColor(220, 220, 220)
      doc.rect(margin, footerY - 5.5, 8, 5, 'F')
    }
    // Middle: page number
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
    doc.text(String(pageNoRef.value), pageWidth / 2, footerY - 2, { align: 'center' })
    // Right: date
    doc.text(pageDate, pageWidth - margin, footerY - 2, { align: 'right' })
  }

  const ensureSpace = (needed: number) => {
    if (y + needed > bottomLimit) {
      drawFooter(); doc.addPage(); pageNoRef.value++; y = drawHeader()
      return true
    }
    return false
  }

  const section = (heading: string, content?: string) => {
    const text = htmlToText(content || '').trim()
    if (!text) return
    // Header spacing
    ensureSpace(6)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
    doc.text(heading, margin, y); y += 6
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
    const maxW = pageWidth - margin * 2
    const lines = splitText(doc, text, maxW)
    const lineHeight = 5
    let idx = 0
    while (idx < lines.length) {
      const remaining = Math.floor((bottomLimit - y) / lineHeight)
      if (remaining <= 0) { drawFooter(); doc.addPage(); pageNoRef.value++; y = margin; continue }
      const chunk = lines.slice(idx, idx + remaining)
      doc.text(chunk, margin, y)
      y += chunk.length * lineHeight + 4
      idx += chunk.length
    }
  }

  for (let k = 0; k < issues.length; k++) {
    const issue = issues[k]

    // Separation between issues (no line; use vertical spacing only)
    if (k > 0) {
      const sepMargin = 1.06 // ~4px
      ensureSpace(sepMargin * 2)
      y += sepMargin
      // no horizontal line per request
      y += sepMargin
    }

    // H2 title: Issue # — title
    const numberText = issue.number != null ? `Issue # ${issue.number}` : 'Issue'
    const titleText = issue.title ? ` — ${issue.title}` : ''
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14)
    const titleLines = splitText(doc, numberText + titleText, pageWidth - margin * 2)
    ensureSpace(Math.max(10, titleLines.length * 7) + 2)
    doc.text(titleLines, margin, y)
    y += Math.max(10, titleLines.length * 7) + 2

    // Key fields grid (2 columns); simple height guard
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
    const info: Array<[string, string]> = [
      ['Type', String(issue.type || '')],
      ['Priority', String(issue.priority || '')],
      ['Status', String(issue.status || '')],
      ['Found By', String(issue.foundBy || '')],
      ['Date Found', formatDate(issue.dateFound)],
      ['Assigned To', String(issue.assignedTo || '')],
      ['Due Date', formatDate(issue.dueDate)],
      ['Closed By', String(issue.closedBy || '')],
      ['Closed Date', formatDate(issue.closedDate)],
      ['Location', String(issue.location || '')],
      ['System', String(issue.system || '')],
    ]
    const colW = (pageWidth - margin * 2) / 2
    const rows = Math.ceil(info.length / 2)
    ensureSpace(rows * 7 + 2)
    const labelColor = 100
    let i = 0
    for (const [label, value] of info) {
      const col = i % 2
      const row = Math.floor(i / 2)
      const x = margin + col * colW
      const yy = y + row * 7
      doc.setTextColor(labelColor); doc.text(label + ':', x, yy)
      doc.setTextColor(0)
      const vLines = splitText(doc, value, colW - 24)
      doc.text(vLines, x + 24, yy)
      i++
    }
    y += rows * 7 + 2

    // Text sections (no photos, comments, attachments)
    section('Description', issue.description)
    section('Recommendation', issue.recommendation)
    section('Resolution', issue.resolution)
  }

  // Final footer
  drawFooter()

  const fname = `issues-compact-${new Date().toISOString().slice(0,10)}.pdf`
  try {
    if (dlWin) {
      const blob = doc.output('blob') as Blob
      const url = URL.createObjectURL(blob)
  try { dlWin.document.title = fname } catch (e) { /* ignore cross-window access errors */ }
      dlWin.location.href = url
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } else {
      doc.save(fname)
    }
  } catch {
    doc.save(fname)
  }
}

// Flat table/list report
async function generateIssuesListPdf(issues: any[], columns?: string[]) {
  if (!Array.isArray(issues) || issues.length === 0) return
  const dlWin = window.open('', '_blank')
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
  const margin = 12
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const bottomLimit = pageHeight - 26
  const pageDate = new Date().toLocaleDateString()
  const pageNoRef = { value: 1 }

  // Resolve project for header logos
  let project: any = (projectStore.currentProject && (projectStore.currentProject as any).value) || null
  const targetPid = (issues[0]?.projectId) || (typeof window !== 'undefined' ? localStorage.getItem('selectedProjectId') : null)
  if (!project || (targetPid && (String(project._id || project.id) !== String(targetPid)))) {
  try { if (targetPid) project = await projectStore.fetchProject(String(targetPid)) } catch (e) { /* ignore optional project fetch */ }
  }
  project = project || {}
  const clientImg = await loadImage(project?.logo)
  const cxaImg = await loadImage(project?.commissioning_agent?.logo)

  // Footer logo once
  let footerLogo = await loadImage('/brand/logo.png')
  if (!footerLogo.dataUrl) footerLogo = await loadImage('/brand/logo.svg')

  const headerTop = 6
  const headerLogoH = 6
  const drawHeader = () => {
    try {
      if (clientImg.dataUrl) doc.addImage(clientImg.dataUrl, clientImg.format || 'PNG', margin, headerTop, headerLogoH * 2.5, headerLogoH)
      if (cxaImg.dataUrl) {
        const w = headerLogoH * 2.5
        doc.addImage(cxaImg.dataUrl, cxaImg.format || 'PNG', pageWidth - margin - w, headerTop, w, headerLogoH)
      }
  } catch (e) { /* ignore */ }
    // Title
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14)
    const projName = (project && (project as any).name) ? String((project as any).name) : ''
    const title = projName ? `${projName} - Issues List` : 'Issues List'
    doc.text(title, pageWidth / 2, headerTop + headerLogoH + 3, { align: 'center' })
    // Add extra separation between title and table
    return headerTop + headerLogoH + 13
  }

  const drawFooter = () => {
    const footerY = pageHeight - 10
    doc.setDrawColor(180, 180, 180)
    doc.line(margin, footerY - 6, pageWidth - margin, footerY - 6)
    try {
      if (footerLogo.dataUrl) {
        const lh = 5.5
        const lw = 12
        doc.addImage(footerLogo.dataUrl, footerLogo.format || 'PNG', margin, footerY - lh, lw, lh)
      } else {
        doc.setFillColor(220, 220, 220)
        doc.rect(margin, footerY - 5.5, 8, 5, 'F')
      }
    } catch {
      doc.setFillColor(220, 220, 220)
      doc.rect(margin, footerY - 5.5, 8, 5, 'F')
    }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
    doc.text(String(pageNoRef.value), pageWidth / 2, footerY - 2, { align: 'center' })
    doc.text(pageDate, pageWidth - margin, footerY - 2, { align: 'right' })
  }

  let y = drawHeader()

  // Columns (filter out foundBy, dateFound, assignedTo, and severity explicitly)
  const provided = (Array.isArray(columns) && columns.length) ? columns.slice() : Object.keys(issues.reduce((acc, it) => { Object.keys(it||{}).forEach(k => { if (k !== 'id' && k !== '_id') acc[k]=true }); return acc }, {} as any))
  let cols = provided.filter(k => !/^foundby$/i.test(String(k)) && !/^datefound$/i.test(String(k)) && !/^assignedto$/i.test(String(k)) && !/^severity$/i.test(String(k)))
  if (cols.length === 0) {
    cols = ['number','title','type','priority','status','dueDate','location','system']
  }

  // Column widths: custom weights per column
  const tableWidth = pageWidth - margin * 2
  const weights = cols.map(k => {
    const key = String(k).toLowerCase()
    if (key === 'description') return 3    // +50% from previous 2x
    if (key === 'title') return 1.5        // +50%
    if (key === 'priority') return 0.625   // +25% over 0.5
    if (key === 'severity' || key === 'status' || key === 'number') return 0.5 // -50%
    return 1
  })
  const totalWeight = weights.reduce((a, b) => a + b, 0) || 1
  const widths = cols.map((_, i) => tableWidth * (weights[i] / totalWeight))

  // Header row
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
  const headerY = y
  let x = margin
  const headerLabel = (key: string) => {
    if (/^responsible_person$/i.test(key)) return 'responsible'
    if (/^number$/i.test(key)) return '#'
    if (/^duedate$/i.test(key)) return 'due date'
    if (/^closeddate$/i.test(key)) return 'closed date'
    return String(key)
  }
  const textYOffset = 3.18 // ~12px downward shift for better vertical alignment
  for (let i = 0; i < cols.length; i++) {
    const label = headerLabel(String(cols[i]))
    const w = widths[i]
    doc.text(label, x + 1, headerY + textYOffset)
    x += w
  }
  y += 4
  doc.setDrawColor(200, 200, 200); doc.line(margin, y, margin + tableWidth, y)
  y += 2
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9)

  const maxW = (idx: number) => widths[idx] - 2
  const lineHeight = 4

  const cellText = (row: any, key: string): string => {
    let v = (row as any)?.[key]
    if (key === 'description') return htmlToText(v)
    if (v === null || v === undefined) return ''
    if (Array.isArray(v)) {
      // Common structured arrays: comments/photos/attachments
      if (key.toLowerCase().includes('comment')) return `${v.length} comment(s)`
      if (key.toLowerCase().includes('photo') || key.toLowerCase().includes('image')) return `${v.length} photo(s)`
      if (key.toLowerCase().includes('attach') || key.toLowerCase().includes('document')) return `${v.length} attachment(s)`
      try { return v.join(', ') } catch { return String(v) }
    }
    if (typeof v === 'object') {
      // Try common fields; else JSON
      if ('name' in v && typeof (v as any).name === 'string') return String((v as any).name)
      try { return JSON.stringify(v) } catch { return String(v) }
    }
    // Dates
    if (/(date|created|updated)/i.test(key)) {
      try { return v ? new Date(v).toLocaleDateString() : '' } catch { return String(v) }
    }
    return String(v)
  }

  for (let r = 0; r < issues.length; r++) {
    const row = issues[r]
    // Compute row height
    const cellLines: string[][] = []
    let rowLines = 1
    for (let c = 0; c < cols.length; c++) {
      const key = cols[c]
      const text = cellText(row, key)
      const lines = splitText(doc as any, text, Math.max(10, maxW(c)))
      cellLines.push(lines)
      rowLines = Math.max(rowLines, lines.length)
    }
    const rowHeight = rowLines * lineHeight + 2
    if (y + rowHeight + textYOffset > bottomLimit) {
      drawFooter(); doc.addPage(); pageNoRef.value++; y = drawHeader()
      // redraw header row
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
      let hx = margin; const hy = y
      for (let i = 0; i < cols.length; i++) { doc.text(headerLabel(String(cols[i])), hx + 1, hy + textYOffset); hx += widths[i] }
      y += 4; doc.setDrawColor(200,200,200); doc.line(margin, y, margin + tableWidth, y); y += 2
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
    }
    // Zebra stripe background (alternate rows)
    if (r % 2 === 1) {
      try {
        doc.setFillColor(245, 245, 245) // subtle light gray to match app's soft surfaces
        doc.rect(margin, y - 1, tableWidth, rowHeight + 2, 'F')
  } catch (e) { /* ignore */ }
    }
    // Draw row cells
    let cx = margin; let cy = y
    for (let c = 0; c < cols.length; c++) {
      const lines = cellLines[c]
      doc.text(lines, cx + 1, cy + textYOffset)
      cx += widths[c]
    }
    y += rowHeight
    // Removed horizontal row separator; add a tiny spacer to separate dense rows
    y += 1
  }

  drawFooter()
  const dateStr = new Date().toISOString().slice(0,10)
  const projNameForFile = (project && (project as any).name) ? String((project as any).name) : ''
  const safeProj = projNameForFile ? projNameForFile.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() : ''
  const fname = (safeProj ? `${safeProj}-` : '') + `issues-list-${dateStr}.pdf`
  try {
    if (dlWin) {
      const blob = doc.output('blob') as Blob
      const url = URL.createObjectURL(blob)
  try { dlWin.document.title = fname } catch (e) { /* ignore cross-window access errors */ }
      dlWin.location.href = url
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } else {
      doc.save(fname)
    }
  } catch {
    doc.save(fname)
  }
}

defineExpose({ generateIssuePdf, generateIssuesDetailedPdf, generateIssuesCompactPdf, generateIssuesListPdf })
</script>

<template>
  <!-- No UI; methods are invoked via ref -->
  <div style="display:none" />
</template>

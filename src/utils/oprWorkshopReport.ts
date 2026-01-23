import { jsPDF } from 'jspdf'
import { drawBrandedFooter, drawBrandedHeader, fitImageToHeight } from './pdfBranding'
import type { OprAnswer, OprCategory, OprQuestion, OprResult, OprResultsRow, OprWorkshopAttendee, OprWorkshopInfo } from '../stores/opr'

export type OprWorkshopReportSettings = {
  include: {
    coverPage: boolean
    toc: boolean
    info: boolean
    participants: boolean
    qa: boolean
    results: boolean
  }
  coverTitle: string
  coverSubtitle: string
  coverByLine: string
  coverJumbotronDataUrl: string
}

export type OprWorkshopReportData = {
  project: any
  workshop: OprWorkshopInfo | null
  attendees: OprWorkshopAttendee[]
  categories: OprCategory[]
  questions: OprQuestion[]
  answersByQuestionId: Record<string, OprAnswer[]>
  resultsByQuestionId: Record<string, OprResult[]>
  allResults: OprResultsRow[]
}

// Minimal image format enum mirroring existing usage
type ImageFormat = 'JPEG' | 'PNG' | 'WEBP' | 'SVG' | 'GIF'
type LoadedImage = {
  dataUrl?: string
  format?: ImageFormat
  width?: number
  height?: number
}

function mimeToFormat(mime?: string | null): ImageFormat | undefined {
  if (!mime) return undefined
  const m = mime.toLowerCase()
  if (m.includes('png')) return 'PNG'
  if (m.includes('jpeg') || m.includes('jpg')) return 'JPEG'
  if (m.includes('webp')) return 'WEBP'
  if (m.includes('gif')) return 'GIF'
  if (m.includes('svg')) return 'SVG'
  return undefined
}

async function convertDataUrlToJpeg(dataUrl: string, quality = 0.92): Promise<string | null> {
  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('img load fail'))
      img.src = dataUrl
    })
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth || img.width
    canvas.height = img.naturalHeight || img.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0)
    return canvas.toDataURL('image/jpeg', quality)
  } catch (e) {
    return null
  }
}

async function loadImage(src?: string): Promise<LoadedImage> {
  try {
    if (!src) return {}
    let dataUrl: string | undefined
    let format: ImageFormat | undefined

    if (src.startsWith('data:')) {
      const mime = src.slice(5, src.indexOf(';'))
      format = mimeToFormat(mime)
      if (format === 'WEBP' || (mime && mime.toLowerCase().includes('svg'))) {
        const conv = await convertDataUrlToJpeg(src)
        if (conv) {
          dataUrl = conv
          format = 'JPEG'
        }
      }
      if (!dataUrl) dataUrl = src
    } else {
      const res = await fetch(src)
      if (!res.ok) return {}
      const blob = await res.blob()
      const rawDataUrl: string = await new Promise(resolve => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.readAsDataURL(blob)
      })
      format = blob.type ? mimeToFormat(blob.type) : undefined
      if (!format || format === 'WEBP' || blob.type.toLowerCase().includes('svg')) {
        const conv = await convertDataUrlToJpeg(rawDataUrl)
        if (conv) {
          dataUrl = conv
          format = 'JPEG'
        } else {
          dataUrl = rawDataUrl
        }
      } else {
        dataUrl = rawDataUrl
      }
    }

    if (!dataUrl) return {}

    const dims = await new Promise<{ width: number; height: number }>((resolve) => {
      const img = new Image()
      img.onload = () => resolve({ width: img.naturalWidth || img.width || 0, height: img.naturalHeight || img.height || 0 })
      img.onerror = () => resolve({ width: 0, height: 0 })
      img.src = dataUrl as string
    })

    return {
      dataUrl,
      format,
      width: dims.width || undefined,
      height: dims.height || undefined,
    }
  } catch (e) {
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
  } catch (e) {
    return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  }
}

function normalizePdfText(v?: string): string {
  if (!v) return ''
  return String(v)
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function splitText(doc: jsPDF, text: string, maxWidth: number): string[] {
  try { return doc.splitTextToSize(text, maxWidth) as unknown as string[] } catch (e) { return [text] }
}

function fmtDate(v?: string) {
  const raw = String(v || '').trim()
  if (!raw) return ''
  try {
    // Prefer YYYY-MM-DD date-only values.
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const d = new Date(`${raw}T00:00:00`)
      return d.toLocaleDateString()
    }
    return new Date(raw).toLocaleDateString()
  } catch (e) {
    return raw
  }
}

function safeTime(v?: string) {
  const t = String(v || '').trim()
  return t || ''
}

function deriveWorkshopTitle(data: OprWorkshopReportData, settings: OprWorkshopReportSettings) {
  const name = normalizePdfText(data?.workshop?.name || '')
  if (name) return name
  const title = normalizePdfText(settings.coverTitle || '')
  return title || 'OPR Workshop'
}

async function loadFirstAvailable(srcs: string[]): Promise<LoadedImage> {
  for (const s of srcs) {
    const img = await loadImage(s)
    if (img?.dataUrl) return img
  }
  return {}
}

type TocEntry = { title: string; pageNo: number; indent: number }

function estimateTocPages(doc: jsPDF, titles: Array<{ title: string; indent: number }>, opts: { margin: number; pageWidth: number; pageHeight: number }) {
  // Conservative layout tuned to match drawBrandedHeader() nextY.
  const startY = 44
  const bottomLimit = opts.pageHeight - 26
  const lineH = 6
  const linesPerPage = Math.max(10, Math.floor((bottomLimit - startY) / lineH))
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  const tocW = opts.pageWidth - opts.margin * 2 - 18
  let lines = 2 // "Table of Contents" + spacing
  for (const t of titles) {
    const indentW = t.indent * 5
    const entryW = Math.max(40, tocW - indentW)
    const titleLines = splitText(doc, normalizePdfText(t.title), entryW)
    lines += Math.max(1, titleLines.length)
  }
  return Math.max(1, Math.ceil(lines / linesPerPage))
}

function questionTag(index1: number) {
  return `OPR-${index1}`
}

function sortAttendees(attendees: OprWorkshopAttendee[]) {
  const statusOrder: Record<string, number> = { approved: 0, pending: 1, denied: 2 }
  return [...attendees].sort((a, b) => {
    const ao = statusOrder[String(a?.status || 'pending')] ?? 9
    const bo = statusOrder[String(b?.status || 'pending')] ?? 9
    if (ao !== bo) return ao - bo
    const an = String(a?.snapshot?.name || '').toLowerCase()
    const bn = String(b?.snapshot?.name || '').toLowerCase()
    return an.localeCompare(bn)
  })
}

function sortAllResults(rows: OprResultsRow[]) {
  return [...rows].sort((a, b) => {
    const ac = String(a?.categoryName || '').toLowerCase()
    const bc = String(b?.categoryName || '').toLowerCase()
    if (ac !== bc) return ac.localeCompare(bc)
    const aq = String(a?.questionPrompt || '').toLowerCase()
    const bq = String(b?.questionPrompt || '').toLowerCase()
    if (aq !== bq) return aq.localeCompare(bq)
    return Number(a?.rank || 0) - Number(b?.rank || 0)
  })
}

export async function generateOprWorkshopPdf(data: OprWorkshopReportData, settings: OprWorkshopReportSettings): Promise<ArrayBuffer> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 12
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const bottomLimit = pageHeight - 26
  const pageDate = new Date().toLocaleDateString()

  const workshopTitle = deriveWorkshopTitle(data, settings)
  const leftLogo = await loadImage(data?.project?.logo)
  const rightLogo = await loadImage(data?.project?.commissioning_agent?.logo)
  const footerLogo = await loadFirstAvailable(['/brand/logo-2.png', '/brand/logo-2.svg', '/brand/logo.png', '/brand/logo.svg'])

  const tocSkeleton: Array<{ title: string; indent: number }> = []
  if (settings.include.info) tocSkeleton.push({ title: 'Workshop Info', indent: 0 })
  if (settings.include.participants) tocSkeleton.push({ title: 'Participants', indent: 0 })
  if (settings.include.qa) {
    tocSkeleton.push({ title: 'Q&A', indent: 0 })
    const qs = Array.isArray(data.questions) ? data.questions : []
    qs.forEach((q, idx) => {
      const t = `${questionTag(idx + 1)} — ${normalizePdfText(q?.prompt || '')}`.trim()
      tocSkeleton.push({ title: t, indent: 1 })
    })
  }
  if (settings.include.results) tocSkeleton.push({ title: 'Comprehensive Results', indent: 0 })

  const tocPages = settings.include.toc ? estimateTocPages(doc, tocSkeleton, { margin, pageWidth, pageHeight }) : 0
  const reservedPages = (settings.include.coverPage ? 1 : 0) + (settings.include.toc ? tocPages : 0)
  const tocStartPage = settings.include.coverPage ? 2 : 1
  const contentStartPage = reservedPages ? (reservedPages + 1) : 1

  // Create reserved pages up-front so TOC page numbers are correct.
  if (reservedPages) {
    while (doc.getNumberOfPages() < reservedPages) doc.addPage()
    doc.addPage() // first content page
  }
  doc.setPage(contentStartPage)

  let currentPageNo = contentStartPage
  let y = margin
  const tocEntries: TocEntry[] = []

  const setBold = () => doc.setFont('helvetica', 'bold')
  const setNormal = () => doc.setFont('helvetica', 'normal')

  const drawHeader = (subtitle?: string) => {
    const res = drawBrandedHeader(doc, {
      margin,
      pageWidth,
      title: workshopTitle,
      leftLogo,
      rightLogo,
      logoH: 12,
      maxLogoW: 36,
      titleFontSize: 18,
      setTitleFont: () => setBold(),
    })
    y = res.nextY
    if (subtitle) {
      setNormal()
      doc.setFontSize(11)
      const lines = splitText(doc, normalizePdfText(subtitle), pageWidth - margin * 2)
      for (const l of lines) {
        if (y + 6 > bottomLimit) { newPage(); break }
        doc.text(l, margin, y)
        y += 6
      }
      y += 2
    }
  }

  const newPage = () => {
    doc.addPage()
    currentPageNo++
    drawHeader()
  }

  const ensureSpace = (h: number) => {
    if (y + h > bottomLimit) newPage()
  }

  const sectionTitle = (title: string) => {
    ensureSpace(12)
    setBold(); doc.setFontSize(13)
    doc.text(normalizePdfText(title), margin, y)
    y += 8
    setNormal(); doc.setFontSize(11)
  }

  const markToc = (title: string, indent = 0) => {
    tocEntries.push({ title, pageNo: currentPageNo, indent })
  }

  drawHeader()

  // Workshop Info
  if (settings.include.info) {
    markToc('Workshop Info', 0)
    sectionTitle('Workshop Info')
    const w = data.workshop || null
    const infoPairs: Array<[string, string]> = [
      ['Name', w?.name || '—'],
      ['Date', fmtDate(w?.date) || '—'],
      ['Location', w?.location || '—'],
      ['Start Time', safeTime(w?.startTime) || '—'],
      ['End Time', safeTime(w?.endTime) || '—'],
      ['Tags', (Array.isArray(w?.tags) && w?.tags.length) ? w!.tags.join(', ') : '—'],
    ]
    const colW = (pageWidth - margin * 2) / 2
    doc.setFontSize(11)
    for (let i = 0; i < infoPairs.length; i++) {
      const col = i % 2
      const row = Math.floor(i / 2)
      const x = margin + col * colW
      const yy = y + row * 8
      ensureSpace(10)
      doc.setTextColor(100)
      doc.text(`${infoPairs[i][0]}:`, x, yy)
      doc.setTextColor(0)
      const vLines = splitText(doc, normalizePdfText(infoPairs[i][1] || '—'), colW - 26)
      doc.text(vLines, x + 26, yy)
    }
    y += Math.ceil(infoPairs.length / 2) * 8 + 2
    if (w?.description) {
      ensureSpace(12)
      setBold(); doc.setFontSize(12); doc.text('Description', margin, y); y += 6
      setNormal(); doc.setFontSize(11)
      const lines = splitText(doc, normalizePdfText(htmlToText(w.description)), pageWidth - margin * 2)
      for (const l of lines) {
        ensureSpace(7)
        doc.text(l, margin, y)
        y += 6
      }
      y += 2
    }
  }

  // Participants
  if (settings.include.participants) {
    markToc('Participants', 0)
    sectionTitle('Participants')
    const rows = sortAttendees(Array.isArray(data.attendees) ? data.attendees : [])
    if (!rows.length) {
      doc.setFontSize(11)
      doc.text('No participants yet.', margin, y)
      y += 6
    } else {
      const tableW = pageWidth - margin * 2
      const cols = [
        { key: 'name', label: 'Name', w: tableW * 0.24 },
        { key: 'email', label: 'Email', w: tableW * 0.30 },
        { key: 'company', label: 'Company', w: tableW * 0.20 },
        { key: 'role', label: 'Role', w: tableW * 0.12 },
        { key: 'status', label: 'Status', w: tableW * 0.14 },
      ]
      const lineH = 5
      const padTop = 4
      const padBottom = 3

      const drawHeaderRow = () => {
        ensureSpace(10)
        setBold(); doc.setFontSize(10)
        doc.setFillColor(245, 245, 245)
        doc.rect(margin, y - 4, tableW, 8, 'F')
        let x = margin
        for (const c of cols) {
          doc.text(c.label, x + 1.5, y + 1)
          x += c.w
        }
        setNormal(); doc.setFontSize(10)
        y += 7
      }

      drawHeaderRow()
      for (const r of rows) {
        const name = normalizePdfText(r?.snapshot?.name || '—')
        const email = normalizePdfText(r?.snapshot?.email || '—')
        const company = normalizePdfText(r?.snapshot?.company || '—')
        const role = normalizePdfText(r?.snapshot?.role || '—')
        const status = normalizePdfText(r?.status || 'pending')
        const vals = [name, email, company, role, status]
        const cellLines = vals.map((v, i) => splitText(doc, v || '—', cols[i].w - 3))
        const maxLines = cellLines.reduce((m, arr) => Math.max(m, arr.length), 1)
        const rowH = padTop + padBottom + (maxLines * lineH)

        if (y + rowH > bottomLimit) {
          newPage()
          sectionTitle('Participants (cont.)')
          drawHeaderRow()
        }
        let x = margin
        for (let i = 0; i < cols.length; i++) {
          const baseY = y + padTop
          for (let k = 0; k < cellLines[i].length; k++) {
            doc.text(String(cellLines[i][k] || ''), x + 1.5, baseY + (k * lineH))
          }
          x += cols[i].w
        }
        y += rowH
        doc.setDrawColor(230, 230, 230)
        doc.line(margin, y, margin + tableW, y)
        y += 1
      }
      y += 2
    }
  }

  // Q&A
  if (settings.include.qa) {
    markToc('Q&A', 0)
    sectionTitle('Q&A')
    const catNameById: Record<string, string> = {}
    for (const c of (Array.isArray(data.categories) ? data.categories : [])) {
      if (!c?.id) continue
      catNameById[String(c.id)] = String(c.name || '')
    }
    const qs = Array.isArray(data.questions) ? data.questions : []
    for (let qi = 0; qi < qs.length; qi++) {
      const q = qs[qi]
      const qid = String(q?.id || '')
      if (!qid) continue

      const qTag = questionTag(qi + 1)
      const qTitle = `${qTag} — ${normalizePdfText(q?.prompt || '')}`
      markToc(qTitle, 1)

      ensureSpace(14)
      setBold(); doc.setFontSize(12)
      const qLines = splitText(doc, qTitle, pageWidth - margin * 2)
      for (const l of qLines) {
        ensureSpace(7)
        doc.text(l, margin, y)
        y += 6
      }
      setNormal(); doc.setFontSize(10)
      const catName = q?.categoryId ? (catNameById[String(q.categoryId)] || '') : ''
      const metaBits = [
        catName ? `Category: ${normalizePdfText(catName)}` : '',
        q?.status ? `Status: ${normalizePdfText(q.status)}` : '',
      ].filter(Boolean).join('   •   ')
      if (metaBits) {
        ensureSpace(6)
        doc.setTextColor(80)
        doc.text(metaBits, margin, y)
        doc.setTextColor(0)
        y += 6
      }
      y += 2

      // Responses
      const ans = Array.isArray(data.answersByQuestionId?.[qid]) ? data.answersByQuestionId[qid] : []
      ensureSpace(10)
      setBold(); doc.setFontSize(11); doc.text('Responses', margin, y); y += 6
      setNormal(); doc.setFontSize(10)
      if (!ans.length) {
        doc.setTextColor(120)
        doc.text('No responses.', margin, y)
        doc.setTextColor(0)
        y += 6
      } else {
        const sorted = [...ans].sort((a, b) => {
          const as = Number.isFinite(Number((a as any)?.seq)) ? Number((a as any).seq) : null
          const bs = Number.isFinite(Number((b as any)?.seq)) ? Number((b as any).seq) : null
          if (as != null && bs != null && as !== bs) return as - bs
          const at = String(a?.createdAt || '')
          const bt = String(b?.createdAt || '')
          return at.localeCompare(bt)
        })
        const tagByAnswerId: Record<string, string> = {}
        for (let i = 0; i < sorted.length; i++) {
          const aid = String(sorted[i]?.id || '')
          if (!aid) continue
          const seq = Number.isFinite(Number((sorted[i] as any)?.seq)) ? Number((sorted[i] as any).seq) : null
          tagByAnswerId[aid] = `${qTag}-${seq && seq > 0 ? seq : (i + 1)}`
        }
        for (let i = 0; i < sorted.length; i++) {
          const a = sorted[i]
          const aid = String(a?.id || '')
          const tag = aid ? (tagByAnswerId[aid] || '') : ''
          const author = normalizePdfText(a?.authorUserId || '') || 'Unknown'
          ensureSpace(8)
          setBold(); doc.setFontSize(10)
          doc.text(`${tag || qTag}  ${author}`, margin, y)
          y += 5
          setNormal(); doc.setFontSize(10)
          const lines = splitText(doc, normalizePdfText(a?.text || ''), pageWidth - margin * 2 - 4)
          for (const l of lines) {
            ensureSpace(6)
            doc.text(l, margin + 4, y)
            y += 5
          }
          y += 2
        }

        // Votes
        ensureSpace(10)
        setBold(); doc.setFontSize(11); doc.text('Votes', margin, y); y += 6
        setNormal(); doc.setFontSize(10)
        const res = Array.isArray(data.resultsByQuestionId?.[qid]) ? data.resultsByQuestionId[qid] : []
        if (!res.length) {
          doc.setTextColor(120)
          doc.text('No vote results.', margin, y)
          doc.setTextColor(0)
          y += 6
        } else {
          const sortedRes = [...res].sort((a, b) => Number(a?.rank || 0) - Number(b?.rank || 0))
          for (const r of sortedRes) {
            const aid = String(r?.answerId || '')
            const aTag = aid ? (tagByAnswerId[aid] || '') : ''
            const head = `#${r.rank}  ${aTag || ''}  ${normalizePdfText(r?.authorUserId || '') || 'Unknown'}  (${r.score} pts, ${r.voteCount} votes)`
            const headLines = splitText(doc, normalizePdfText(head), pageWidth - margin * 2)
            setBold(); doc.setFontSize(10)
            for (const l of headLines) {
              ensureSpace(6)
              doc.text(l, margin, y)
              y += 5
            }
            setNormal(); doc.setFontSize(10)
            const txtLines = splitText(doc, normalizePdfText(r?.text || ''), pageWidth - margin * 2 - 4)
            for (const l of txtLines) {
              ensureSpace(6)
              doc.text(l, margin + 4, y)
              y += 5
            }
            const rc = r?.rankCounts || {}
            const breakdown = `Rank breakdown: #1 ${rc['1'] || 0}, #2 ${rc['2'] || 0}, #3 ${rc['3'] || 0}, #4 ${rc['4'] || 0}, #5 ${rc['5'] || 0}`
            const bLines = splitText(doc, breakdown, pageWidth - margin * 2 - 4)
            doc.setTextColor(100)
            for (const l of bLines) {
              ensureSpace(6)
              doc.text(l, margin + 4, y)
              y += 5
            }
            doc.setTextColor(0)
            y += 2
          }
        }
      }

      y += 3
    }
  }

  // Comprehensive Results
  if (settings.include.results) {
    markToc('Comprehensive Results', 0)
    sectionTitle('Comprehensive Results')
    const rows = sortAllResults(Array.isArray(data.allResults) ? data.allResults : [])
    if (!rows.length) {
      doc.text('No results yet.', margin, y)
      y += 6
    } else {
      const qs = Array.isArray(data.questions) ? data.questions : []
      const qidToTag: Record<string, string> = {}
      for (let i = 0; i < qs.length; i++) {
        const qid = String(qs[i]?.id || '')
        if (qid) qidToTag[qid] = questionTag(i + 1)
      }
      doc.setFontSize(10)
      for (const r of rows) {
        const qTag = r?.questionId ? (qidToTag[String(r.questionId)] || 'Q') : 'Q'
        const head = `${normalizePdfText(r.categoryName || '—')}  •  ${qTag}  •  #${r.rank}  •  ${r.score} pts  •  ${r.voteCount} votes`
        const headLines = splitText(doc, head, pageWidth - margin * 2)
        setBold(); doc.setFontSize(10)
        for (const l of headLines) {
          ensureSpace(6)
          doc.text(l, margin, y)
          y += 5
        }
        setNormal(); doc.setFontSize(10)
        const txtLines = splitText(doc, normalizePdfText(r.text || ''), pageWidth - margin * 2 - 4)
        for (const l of txtLines) {
          ensureSpace(6)
          doc.text(l, margin + 4, y)
          y += 5
        }
        const rc = r?.rankCounts || {}
        const breakdown = `Rank breakdown: #1 ${rc['1'] || 0}, #2 ${rc['2'] || 0}, #3 ${rc['3'] || 0}, #4 ${rc['4'] || 0}, #5 ${rc['5'] || 0}`
        doc.setTextColor(100)
        const bLines = splitText(doc, breakdown, pageWidth - margin * 2 - 4)
        for (const l of bLines) {
          ensureSpace(6)
          doc.text(l, margin + 4, y)
          y += 5
        }
        doc.setTextColor(0)
        y += 3
      }
    }
  }

  // Cover page
  if (settings.include.coverPage) {
    doc.setPage(1)
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, pageWidth, pageHeight, 'F')

    // Logos (top row)
    const logoH = 14
    let logoRowH = 0
    try {
      if (leftLogo?.dataUrl) {
        const dim = fitImageToHeight(leftLogo, logoH, 45, 38)
        doc.addImage(leftLogo.dataUrl, leftLogo.format || 'PNG', margin, margin, dim.w, dim.h)
        logoRowH = Math.max(logoRowH, dim.h)
      }
    } catch (e) { /* ignore */ }
    try {
      if (rightLogo?.dataUrl) {
        const dim = fitImageToHeight(rightLogo, logoH, 45, 38)
        doc.addImage(rightLogo.dataUrl, rightLogo.format || 'PNG', pageWidth - margin - dim.w, margin, dim.w, dim.h)
        logoRowH = Math.max(logoRowH, dim.h)
      }
    } catch (e) { /* ignore */ }

    let cy = margin + (logoRowH || logoH) + 16
    setBold(); doc.setFontSize(26)
    const cTitle = normalizePdfText(settings.coverTitle || 'OPR Workshop Report')
    doc.text(splitText(doc, cTitle, pageWidth - margin * 2), pageWidth / 2, cy, { align: 'center' })
    cy += 16

    setNormal(); doc.setFontSize(14)
    const subtitle = normalizePdfText(settings.coverSubtitle || '') || normalizePdfText(data?.project?.name || '')
    if (subtitle) {
      doc.text(splitText(doc, subtitle, pageWidth - margin * 2), pageWidth / 2, cy, { align: 'center' })
      cy += 10
    }

    // Workshop summary
    const w = data.workshop || null
    const summaryBits = [
      w?.name ? normalizePdfText(w.name) : '',
      w?.date ? fmtDate(w.date) : '',
      w?.location ? normalizePdfText(w.location) : '',
    ].filter(Boolean).join('  •  ')
    if (summaryBits) {
      doc.setFontSize(11)
      doc.setTextColor(80)
      doc.text(splitText(doc, summaryBits, pageWidth - margin * 2), pageWidth / 2, cy, { align: 'center' })
      doc.setTextColor(0)
      cy += 12
    }

    // Cover image
    const coverImg = await loadImage(settings.coverJumbotronDataUrl || '')
    if (coverImg?.dataUrl) {
      try {
        const maxW = pageWidth - margin * 2
        const maxH = 120
        const dim = fitImageToHeight(coverImg, maxH, maxW, maxW)
        const x = (pageWidth - dim.w) / 2
        const yImg = Math.min(pageHeight - 70 - dim.h, cy + 8)
        doc.addImage(coverImg.dataUrl, coverImg.format || 'PNG', x, yImg, dim.w, dim.h)
      } catch (e) { /* ignore */ }
    }

    // By line
    const by = normalizePdfText(settings.coverByLine || '')
    if (by) {
      setNormal(); doc.setFontSize(12)
      doc.text(by, pageWidth / 2, pageHeight - 40, { align: 'center' })
    }
  }

  // Table of contents
  if (settings.include.toc) {
    let tocPageNo = tocStartPage
    doc.setPage(tocPageNo)
    drawBrandedHeader(doc, {
      margin,
      pageWidth,
      title: workshopTitle,
      leftLogo,
      rightLogo,
      logoH: 12,
      maxLogoW: 36,
      titleFontSize: 18,
      setTitleFont: () => setBold(),
    })
    let ty = 44
    setBold(); doc.setFontSize(14)
    doc.text('Table of Contents', margin, ty)
    ty += 10
    setNormal(); doc.setFontSize(11)

    const tocW = pageWidth - margin * 2 - 18
    const lineH = 6
    for (const e of tocEntries) {
      const indentX = e.indent * 5
      const entryW = Math.max(40, tocW - indentX)
      const lines = splitText(doc, normalizePdfText(e.title), entryW)
      // Page break within TOC
      if (ty + (lines.length * lineH) > bottomLimit) {
        tocPageNo++
        doc.setPage(tocPageNo)
        drawBrandedHeader(doc, {
          margin,
          pageWidth,
          title: workshopTitle,
          leftLogo,
          rightLogo,
          logoH: 12,
          maxLogoW: 36,
          titleFontSize: 18,
          setTitleFont: () => setBold(),
        })
        ty = 44
        setBold(); doc.setFontSize(14); doc.text('Table of Contents (cont.)', margin, ty); ty += 10
        setNormal(); doc.setFontSize(11)
      }
      // First line with page number on the right
      doc.text(lines[0] || '', margin + indentX, ty)
      doc.text(String(e.pageNo), pageWidth - margin, ty, { align: 'right' })
      ty += lineH
      // Continuation lines without page number
      for (let i = 1; i < lines.length; i++) {
        if (ty + lineH > bottomLimit) {
          tocPageNo++
          doc.setPage(tocPageNo)
          drawBrandedHeader(doc, {
            margin,
            pageWidth,
            title: workshopTitle,
            leftLogo,
            rightLogo,
            logoH: 12,
            maxLogoW: 36,
            titleFontSize: 18,
            setTitleFont: () => setBold(),
          })
          ty = 44
          setBold(); doc.setFontSize(14); doc.text('Table of Contents (cont.)', margin, ty); ty += 10
          setNormal(); doc.setFontSize(11)
        }
        doc.text(lines[i] || '', margin + indentX + 3, ty)
        ty += lineH
      }
    }
  }

  // Draw footers last so they land under all content.
  const totalPages = doc.getNumberOfPages()
  const leftLabel = `${workshopTitle} Report`
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    drawBrandedFooter(doc, {
      margin,
      pageWidth,
      pageHeight,
      pageNo: p,
      pageDate,
      footerLogo,
      leftLabel,
      setBold,
      setNormal,
    })
  }

  return doc.output('arraybuffer') as ArrayBuffer
}


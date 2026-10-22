import { jsPDF } from 'jspdf'
import { drawBrandedFooter, drawBrandedHeader } from '../reports/core/frame'
import { loadFirstAvailable, loadImage } from '../reports/core/images'
import { formatDate as fmtDate, htmlToText, normalizePdfText, splitText } from '../reports/core/text'
import { ensureReportFonts } from '../reports/core/fonts'
import { SANS, setColor as setReportColor } from '../reports/core/tokens'
import { drawCoverPage } from '../reports/core/cover'
import { drawToc, estimateTocPages, type TocEntry } from '../reports/core/toc'
import { enabledSectionKeys, normalizeReportSettings, type ReportSettings, type SectionDef } from '../reports/core/settings'
import type { OprAnswer, OprCategory, OprQuestion, OprResult, OprResultsRow, OprWorkshopAttendee, OprWorkshopInfo } from '../stores/opr'

/** Legacy settings shape (pre-Phase 3); still accepted and migrated. */
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

/** The OPR Workshop report's sections, in default order. */
export const OPR_WORKSHOP_REPORT_SECTIONS: SectionDef[] = [
  { key: 'info', label: 'Workshop Info' },
  { key: 'participants', label: 'Participants' },
  { key: 'qa', label: 'Q&A' },
  { key: 'results', label: 'Comprehensive Results' },
]

function toReportSettings(settings: OprWorkshopReportSettings | ReportSettings | any): ReportSettings {
  if (settings && Array.isArray(settings.sections)) {
    return normalizeReportSettings(settings, OPR_WORKSHOP_REPORT_SECTIONS)
  }
  const inc = settings?.include || {}
  return normalizeReportSettings({
    include: inc,
    toc: !!inc.toc,
    cover: {
      enabled: !!inc.coverPage,
      title: String(settings?.coverTitle || ''),
      subtitle: String(settings?.coverSubtitle || ''),
      byLine: String(settings?.coverByLine || ''),
      imageDataUrl: String(settings?.coverJumbotronDataUrl || ''),
    },
  }, OPR_WORKSHOP_REPORT_SECTIONS)
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

function safeTime(v?: string) {
  const t = String(v || '').trim()
  return t || ''
}

function deriveWorkshopTitle(data: OprWorkshopReportData, coverTitle: string) {
  const name = normalizePdfText(data?.workshop?.name || '')
  if (name) return name
  const title = normalizePdfText(coverTitle || '')
  return title || 'OPR Workshop'
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

export async function generateOprWorkshopPdf(data: OprWorkshopReportData, settings: OprWorkshopReportSettings | ReportSettings): Promise<ArrayBuffer> {
  const s = toReportSettings(settings)
  const orderedKeys = enabledSectionKeys(s)
  const doc = new jsPDF({ unit: 'mm', format: 'letter' }); await ensureReportFonts(doc); setReportColor(doc, 'text')
  const margin = 12
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const bottomLimit = pageHeight - 26
  const pageDate = new Date().toLocaleDateString()

  const workshopTitle = deriveWorkshopTitle(data, s.cover.title)
  const leftLogo = await loadImage(data?.project?.logo)
  const rightLogo = await loadImage(data?.project?.commissioning_agent?.logo)
  const footerLogo = await loadFirstAvailable(['/brand/logo-2.png', '/brand/logo-2.svg', '/brand/logo.png', '/brand/logo.svg'])

  const tocSkeleton: Array<{ title: string; indent: number }> = []
  for (const key of orderedKeys) {
    if (key === 'info') tocSkeleton.push({ title: 'Workshop Info', indent: 0 })
    else if (key === 'participants') tocSkeleton.push({ title: 'Participants', indent: 0 })
    else if (key === 'qa') {
      tocSkeleton.push({ title: 'Q&A', indent: 0 })
      const qs = Array.isArray(data.questions) ? data.questions : []
      qs.forEach((q, idx) => {
        const t = `${questionTag(idx + 1)} — ${normalizePdfText(q?.prompt || '')}`.trim()
        tocSkeleton.push({ title: t, indent: 1 })
      })
    } else if (key === 'results') tocSkeleton.push({ title: 'Comprehensive Results', indent: 0 })
  }

  const tocPages = s.toc ? estimateTocPages(doc, tocSkeleton, { margin, pageWidth, pageHeight }) : 0
  const reservedPages = (s.cover.enabled ? 1 : 0) + (s.toc ? tocPages : 0)
  const tocStartPage = s.cover.enabled ? 2 : 1
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

  const setBold = () => doc.setFont(SANS, 'bold')
  const setNormal = () => doc.setFont(SANS, 'normal')

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

  // Section renderers, dispatched in the user's chosen order below.
  // Workshop Info
  const renderInfoSection = () => {
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
  const renderParticipantsSection = () => {
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
  const renderQaSection = () => {
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
  const renderResultsSection = () => {
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

  // Render the enabled sections in the user's chosen order.
  const renderersByKey: Record<string, () => void> = {
    info: renderInfoSection,
    participants: renderParticipantsSection,
    qa: renderQaSection,
    results: renderResultsSection,
  }
  for (const key of orderedKeys) renderersByKey[key]?.()

  // Cover page (shared renderer)
  if (s.cover.enabled) {
    doc.setPage(1)
    const w = data.workshop || null
    const metaLine = [
      w?.name ? normalizePdfText(w.name) : '',
      w?.date ? fmtDate(w.date) : '',
      w?.location ? normalizePdfText(w.location) : '',
    ].filter(Boolean).join('  •  ')
    await drawCoverPage(doc, { margin, pageWidth, pageHeight }, {
      title: s.cover.title || 'OPR Workshop Report',
      subtitle: s.cover.subtitle || normalizePdfText(data?.project?.name || ''),
      metaLine,
      byLine: s.cover.byLine,
      imageDataUrl: s.cover.imageDataUrl,
      leftLogo,
      rightLogo,
    })
  }

  // Table of contents (shared renderer) on the reserved pages
  if (s.toc) {
    drawToc(doc, tocEntries, {
      margin,
      pageWidth,
      pageHeight,
      startPage: tocStartPage,
      drawPageHeader: () => {
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
      },
    })
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


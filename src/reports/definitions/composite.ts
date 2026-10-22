// The custom report composer's renderers (Phase 7, custom reports Stage 2):
// a saved composite definition is DATA — an ordered list of blocks — and
// these functions render it to a branded PDF on the kit, or export its table
// blocks as an XLSX workbook (one sheet per table).
import { ReportDoc } from '../core/frame'
import { drawTable } from '../core/table'
import { drawCoverPage } from '../core/cover'
import { drawToc, estimateTocPages, type TocEntry } from '../core/toc'
import { dateStamp, deliverPdf, deliverPdfBytes, openDeliveryWindow, reportFileName } from '../core/deliver'
import { normalizePdfText, splitText } from '../core/text'
import { SANS } from '../core/tokens'
import { cellValue, columnsForKeys, defaultColumnKeys, ENTITY_COLUMNS, ENTITY_LABELS } from '../data/columns'
import { fetchEntityRows, type ComposerEntity, type EntityRowsResult } from '../data/fetchRows'
import http from '../../utils/http'

export type ComposerBlock = {
  id: string
  type: 'cover' | 'heading' | 'text' | 'pageBreak' | 'summary' | 'table' | 'documents' | 'toc'
  // cover
  title?: string
  subtitle?: string
  byLine?: string
  imageDataUrl?: string
  // heading / text
  text?: string
  level?: 1 | 2
  // summary / table
  entity?: ComposerEntity
  groupBy?: string
  columns?: string[]
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  limit?: number
  // documents
  folderId?: string
  folderPath?: string
}

export interface CompositeDefinition {
  blocks: ComposerBlock[]
  orientation?: 'portrait' | 'landscape'
}

/** Fetch each referenced entity once, shared across blocks. */
async function prefetchEntities(definition: CompositeDefinition, projectId: string): Promise<Map<string, EntityRowsResult>> {
  const entities = [...new Set(
    (definition.blocks || [])
      .filter((b) => (b.type === 'table' || b.type === 'summary') && b.entity)
      .map((b) => String(b.entity)),
  )]
  const cache = new Map<string, EntityRowsResult>()
  await Promise.all(entities.map(async (e) => {
    try {
      cache.set(e, await fetchEntityRows(e as ComposerEntity, projectId))
    } catch (err) {
      cache.set(e, { rows: [], ctx: {} })
    }
  }))
  return cache
}

function resolveTableColumns(block: ComposerBlock) {
  const defs = ENTITY_COLUMNS[String(block.entity)] || []
  const keys = Array.isArray(block.columns) && block.columns.length ? block.columns : defaultColumnKeys(defs)
  return columnsForKeys(defs, keys)
}

function tableRowsFor(block: ComposerBlock, data: EntityRowsResult): any[] {
  let rows = [...(data?.rows || [])]
  const defs = ENTITY_COLUMNS[String(block.entity)] || []
  const sortCol = block.sortBy ? defs.find((d) => d.key === block.sortBy) : null
  if (sortCol) {
    const dir = block.sortDir === 'desc' ? -1 : 1
    rows.sort((a, b) => {
      const av = cellValue(sortCol, a, data.ctx)
      const bv = cellValue(sortCol, b, data.ctx)
      const an = Number(av); const bn = Number(bv)
      if (!Number.isNaN(an) && !Number.isNaN(bn) && av !== '' && bv !== '') return (an - bn) * dir
      return av.localeCompare(bv) * dir
    })
  }
  const limit = Number(block.limit || 0)
  if (limit > 0) rows = rows.slice(0, limit)
  return rows
}

function summaryCounts(block: ComposerBlock, data: EntityRowsResult): Array<{ label: string; count: number }> {
  const defs = ENTITY_COLUMNS[String(block.entity)] || []
  const col = defs.find((d) => d.key === block.groupBy) || null
  const counts = new Map<string, number>()
  for (const row of data?.rows || []) {
    const label = (col ? cellValue(col, row, data.ctx) : '') || '—'
    counts.set(label, (counts.get(label) || 0) + 1)
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
}

export interface GenerateCompositeOptions {
  project: any
  projectId: string
  name: string
  definition: CompositeDefinition
}

type FolderFile = { id: string; originalName: string; contentType: string; sizeBytes: number }

function fileIsPdf(f: FolderFile): boolean {
  return String(f.contentType || '').includes('pdf') || /\.pdf$/i.test(String(f.originalName || ''))
}

function formatBytes(n: number): string {
  const b = Number(n || 0)
  if (!b) return '—'
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

async function fetchFolderFiles(projectId: string, folderId: string): Promise<FolderFile[]> {
  if (!folderId) return []
  try {
    const { data } = await http.get(`/api/projects/${projectId}/docs/files`, { params: { folderId } })
    return (Array.isArray(data?.files) ? data.files : [])
      .filter((f: any) => f && f.status === 'ready')
      .map((f: any) => ({
        id: String(f.id || ''),
        originalName: String(f.originalName || 'Document'),
        contentType: String(f.contentType || ''),
        sizeBytes: Number(f.sizeBytes || 0),
      }))
  } catch (e) {
    return []
  }
}

/** Fetch a Documents-module file's bytes via its short-lived download URL. */
async function fetchFileBytes(projectId: string, fileId: string): Promise<ArrayBuffer | null> {
  try {
    const { data } = await http.get(`/api/projects/${projectId}/docs/files/${fileId}/download-url`)
    const url = String(data?.downloadUrl || '')
    if (!url) return null
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.arrayBuffer()
  } catch (e) {
    return null
  }
}

type DocsBlockData = { files: FolderFile[]; pdfBytes: ArrayBuffer[]; pdfPages: number }

/**
 * Fetch every documents block's file list AND its PDF bytes up front, so
 * (a) the merge phase doesn't refetch and (b) the TOC can offset its page
 * numbers by the pages each merge will insert.
 */
async function prefetchDocumentsBlocks(definition: CompositeDefinition, projectId: string): Promise<Map<string, DocsBlockData>> {
  const docBlocks = (definition.blocks || []).filter((b) => b.type === 'documents' && b.folderId)
  const out = new Map<string, DocsBlockData>()
  if (!docBlocks.length) return out
  const { PDFDocument } = await import('pdf-lib')
  await Promise.all(docBlocks.map(async (b) => {
    const files = await fetchFolderFiles(projectId, String(b.folderId))
    const pdfBytes: ArrayBuffer[] = []
    let pdfPages = 0
    for (const f of files.filter(fileIsPdf)) {
      const bytes = await fetchFileBytes(projectId, f.id)
      if (!bytes) continue
      try {
        const src = await PDFDocument.load(bytes, { ignoreEncryption: true })
        pdfPages += src.getPageCount()
        pdfBytes.push(bytes)
      } catch (e) { /* skip unloadable file */ }
    }
    out.set(b.id, { files, pdfBytes, pdfPages })
  }))
  return out
}

function tocEntryTitle(b: ComposerBlock): string | null {
  if (b.type === 'heading') return String(b.text || 'Heading')
  if (b.type === 'table') return b.title || ENTITY_LABELS[String(b.entity)] || 'Table'
  if (b.type === 'summary') return b.title || `Summary — ${ENTITY_LABELS[String(b.entity)] || b.entity || ''}`
  if (b.type === 'documents') return b.title || 'Documents'
  return null
}

export async function generateCompositePdf(opts: GenerateCompositeOptions): Promise<void> {
  const blocks = Array.isArray(opts.definition?.blocks) ? opts.definition.blocks : []
  if (!blocks.length) return
  const dlWin = openDeliveryWindow()
  const cache = await prefetchEntities(opts.definition, opts.projectId)
  const rd = await ReportDoc.create({
    title: opts.name || 'Custom Report',
    footerLabel: opts.name || 'Custom Report',
    project: opts.project,
    orientation: opts.definition?.orientation === 'landscape' ? 'landscape' : 'portrait',
  })
  const doc = rd.doc
  const docsCache = await prefetchDocumentsBlocks(opts.definition, opts.projectId)
  // PDF files from documents blocks merge in AFTER rendering, at the page
  // each block ended on (the stated order).
  const pdfInserts: Array<{ afterPage: number; bytesList: ArrayBuffer[] }> = []
  // TOC bookkeeping: entries carry FINAL-document page numbers, so every
  // entry is offset by the pages that earlier documents blocks will insert.
  const tocEntries: TocEntry[] = []
  let insertOffset = 0
  let tocStartPage = 0
  const tocTitles = blocks
    .map((b) => ({ title: tocEntryTitle(b), indent: b.type === 'heading' && b.level === 2 ? 1 : 0 }))
    .filter((t): t is { title: string; indent: number } => !!t.title)
  const pushTocEntry = (b: ComposerBlock) => {
    const title = tocEntryTitle(b)
    if (!title) return
    tocEntries.push({ title, pageNo: rd.pageNo + insertOffset, indent: b.type === 'heading' && b.level === 2 ? 1 : 0 })
  }

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    if (b.type === 'cover') {
      // First-block cover paints over page 1 (its own background); a cover
      // later in the flow gets its own fresh page.
      if (i > 0) rd.newPage()
      await drawCoverPage(doc, { margin: rd.margin, pageWidth: rd.pageWidth, pageHeight: rd.pageHeight }, {
        title: b.title || opts.name || 'Custom Report',
        subtitle: b.subtitle || String(opts.project?.name || ''),
        byLine: b.byLine || '',
        imageDataUrl: b.imageDataUrl || '',
      })
      if (i < blocks.length - 1) rd.newPage()
      continue
    }
    if (b.type === 'pageBreak') {
      rd.newPage()
      continue
    }
    if (b.type === 'toc') {
      // The TOC gets its own reserved page(s); entries are backfilled after
      // the whole report has rendered (so page numbers are known).
      if (rd.y > rd.headerBottomY + 1) rd.newPage()
      tocStartPage = rd.pageNo
      const est = estimateTocPages(doc, tocTitles, {
        margin: rd.margin,
        pageWidth: rd.pageWidth,
        pageHeight: rd.pageHeight,
        startY: rd.headerBottomY + 2,
        bottomLimit: rd.bottomLimit,
      })
      for (let k = 1; k < est; k++) rd.newPage()
      if (i < blocks.length - 1) rd.newPage()
      continue
    }
    if (b.type === 'heading') {
      const size = b.level === 2 ? 11.5 : 13
      doc.setFont(SANS, 'bold'); doc.setFontSize(size)
      const lines = splitText(doc, normalizePdfText(String(b.text || '')), rd.contentWidth)
      rd.ensureSpace(lines.length * (size * 0.5) + 6)
      pushTocEntry(b)
      doc.text(lines, rd.margin, rd.y)
      rd.y += lines.length * (size * 0.5) + 3
      doc.setFont(SANS, 'normal')
      continue
    }
    if (b.type === 'text') {
      doc.setFont(SANS, 'normal'); doc.setFontSize(9.5)
      const paragraphs = String(b.text || '').split(/\n+/).map((p) => normalizePdfText(p)).filter(Boolean)
      for (const p of paragraphs) {
        const lines = splitText(doc, p, rd.contentWidth)
        for (const line of lines) {
          rd.ensureSpace(6)
          doc.text(line, rd.margin, rd.y)
          rd.y += 5
        }
        rd.y += 2
      }
      continue
    }
    if (b.type === 'summary' && b.entity) {
      const data = cache.get(String(b.entity)) || { rows: [], ctx: {} }
      const defs = ENTITY_COLUMNS[String(b.entity)] || []
      const groupLabel = defs.find((d) => d.key === b.groupBy)?.label || b.groupBy || ''
      doc.setFont(SANS, 'bold'); doc.setFontSize(11.5)
      rd.ensureSpace(10)
      pushTocEntry(b)
      doc.text(normalizePdfText(b.title || `${ENTITY_LABELS[String(b.entity)] || b.entity} by ${groupLabel}`), rd.margin, rd.y)
      rd.y += 6
      doc.setFont(SANS, 'normal'); doc.setFontSize(9.5)
      rd.ensureSpace(6)
      doc.setTextColor(100)
      doc.text(`Total: ${data.rows.length}`, rd.margin, rd.y)
      doc.setTextColor(0)
      rd.y += 6
      const counts = summaryCounts(b, data)
      if (counts.length) {
        drawTable(rd, {
          columns: [
            { key: 'label', label: groupLabel || 'Value', weight: 3 },
            { key: 'count', label: 'Count', weight: 0.7 },
          ],
          rows: counts,
          cellText: (row: any, key) => String(row[key] ?? ''),
        })
      }
      rd.y += 2
      continue
    }
    if (b.type === 'documents') {
      const cached = docsCache.get(b.id) || { files: [], pdfBytes: [], pdfPages: 0 }
      const files = cached.files
      doc.setFont(SANS, 'bold'); doc.setFontSize(11.5)
      rd.ensureSpace(10)
      pushTocEntry(b)
      doc.text(normalizePdfText(b.title || 'Documents'), rd.margin, rd.y)
      rd.y += 6
      if (b.folderPath) {
        doc.setFont(SANS, 'normal'); doc.setFontSize(8.5)
        doc.setTextColor(100)
        rd.ensureSpace(5)
        doc.text(`Folder: ${normalizePdfText(b.folderPath)}`, rd.margin, rd.y)
        doc.setTextColor(0)
        rd.y += 5
      }
      if (!files.length) {
        doc.setFont(SANS, 'normal'); doc.setFontSize(9)
        doc.setTextColor(120)
        rd.ensureSpace(6)
        doc.text(b.folderId ? 'No documents in the selected folder.' : 'No folder selected.', rd.margin, rd.y)
        doc.setTextColor(0)
        rd.y += 6
      } else {
        drawTable(rd, {
          columns: [
            { key: 'originalName', label: 'Document', weight: 2.6 },
            { key: 'contentType', label: 'Type', weight: 1.2 },
            { key: 'sizeBytes', label: 'Size', weight: 0.6 },
            { key: 'inReport', label: 'In report', weight: 0.7 },
          ],
          rows: files,
          cellText: (row: any, key) => {
            if (key === 'sizeBytes') return formatBytes(row.sizeBytes)
            if (key === 'inReport') return fileIsPdf(row) ? 'merged' : 'listed'
            return String(row[key] ?? '')
          },
        })
        if (cached.pdfBytes.length) {
          pdfInserts.push({ afterPage: doc.getNumberOfPages(), bytesList: cached.pdfBytes })
          insertOffset += cached.pdfPages
        }
      }
      rd.y += 2
      continue
    }
    if (b.type === 'table' && b.entity) {
      const data = cache.get(String(b.entity)) || { rows: [], ctx: {} }
      const cols = resolveTableColumns(b)
      const rows = tableRowsFor(b, data)
      doc.setFont(SANS, 'bold'); doc.setFontSize(11.5)
      rd.ensureSpace(10)
      pushTocEntry(b)
      doc.text(normalizePdfText(b.title || ENTITY_LABELS[String(b.entity)] || String(b.entity)), rd.margin, rd.y)
      rd.y += 6
      if (!rows.length) {
        doc.setFont(SANS, 'normal'); doc.setFontSize(9)
        doc.setTextColor(120)
        rd.ensureSpace(6)
        doc.text('No rows.', rd.margin, rd.y)
        doc.setTextColor(0)
        rd.y += 6
      } else {
        const byKey = new Map(cols.map((c) => [c.key, c]))
        drawTable(rd, {
          columns: cols.map((c) => ({ key: c.key, label: c.label, weight: c.weight })),
          rows,
          cellText: (row, key) => {
            const col = byKey.get(key)
            return col ? cellValue(col, row, data.ctx) : ''
          },
        })
      }
      rd.y += 2
      continue
    }
  }

  // Backfill the TOC onto its reserved page(s), now that every entry's
  // final page number (render page + merge-insert offsets) is known.
  if (tocStartPage > 0 && tocEntries.length) {
    drawToc(doc, tocEntries, {
      margin: rd.margin,
      pageWidth: rd.pageWidth,
      pageHeight: rd.pageHeight,
      startPage: tocStartPage,
      startY: rd.headerBottomY + 2,
      bottomLimit: rd.bottomLimit,
      // Reserved pages already carry the branded header from rd.newPage().
      drawPageHeader: () => {},
    })
    try { doc.setPage(doc.getNumberOfPages()) } catch (e) { /* ignore */ }
  }

  const fname = reportFileName([String(opts.project?.name || ''), opts.name || 'custom-report'])
  if (!pdfInserts.length) {
    deliverPdf(rd.finish(), fname, dlWin)
    return
  }

  // Merge each documents block's (prefetched) PDF files in at its recorded
  // position. Process inserts in DESCENDING page order so earlier
  // insertions don't shift the positions still to be processed.
  let bytes = rd.output()
  const { PDFDocument } = await import('pdf-lib')
  for (const ins of [...pdfInserts].sort((a, b) => b.afterPage - a.afterPage)) {
    const base = await PDFDocument.load(bytes, { ignoreEncryption: true })
    let at = Math.min(ins.afterPage, base.getPageCount())
    let changed = false
    for (const buf of ins.bytesList) {
      try {
        const src = await PDFDocument.load(buf, { ignoreEncryption: true })
        const pages = await base.copyPages(src, src.getPageIndices())
        for (const p of pages) {
          if (at >= base.getPageCount()) base.addPage(p)
          else base.insertPage(at, p)
          at++
        }
        changed = true
      } catch (e) {
        /* skip unmergeable file */
      }
    }
    if (changed) {
      const out = await base.save()
      bytes = out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer
    }
  }
  deliverPdfBytes(bytes, fname, dlWin)
}

/** Export every table block as a sheet in one XLSX workbook. */
export async function generateCompositeXlsx(opts: GenerateCompositeOptions): Promise<number> {
  const blocks = (opts.definition?.blocks || []).filter((b) => b.type === 'table' && b.entity)
  if (!blocks.length) return 0
  const cache = await prefetchEntities(opts.definition, opts.projectId)
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  const usedNames = new Set<string>()
  for (const b of blocks) {
    const data = cache.get(String(b.entity)) || { rows: [], ctx: {} }
    const cols = resolveTableColumns(b)
    const rows = tableRowsFor(b, data)
    const sheetRows = rows.map((row) => {
      const out: Record<string, string> = {}
      for (const c of cols) out[c.label] = cellValue(c, row, data.ctx)
      return out
    })
    const ws = XLSX.utils.json_to_sheet(sheetRows, { header: cols.map((c) => c.label) })
    ws['!cols'] = cols.map((c) => ({ wch: Math.max(10, Math.min(40, c.label.length + 6)) }))
    let name = String(b.title || ENTITY_LABELS[String(b.entity)] || b.entity).replace(/[\\/?*[\]:]/g, ' ').slice(0, 28) || 'Sheet'
    let unique = name
    let n = 2
    while (usedNames.has(unique)) unique = `${name} ${n++}`.slice(0, 31)
    usedNames.add(unique)
    XLSX.utils.book_append_sheet(wb, ws, unique)
  }
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = reportFileName([String(opts.project?.name || ''), opts.name || 'custom-report'], 'xlsx')
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return blocks.length
}

export function newBlockId(): string {
  return `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/** `dateStamp` re-exported so the composer page can label drafts. */
export { dateStamp }

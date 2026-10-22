// The custom report composer's renderers (Phase 7, custom reports Stage 2):
// a saved composite definition is DATA — an ordered list of blocks — and
// these functions render it to a branded PDF on the kit, or export its table
// blocks as an XLSX workbook (one sheet per table).
import { ReportDoc } from '../core/frame'
import { drawTable } from '../core/table'
import { drawCoverPage } from '../core/cover'
import { dateStamp, deliverPdf, openDeliveryWindow, reportFileName } from '../core/deliver'
import { normalizePdfText, splitText } from '../core/text'
import { SANS } from '../core/tokens'
import { cellValue, columnsForKeys, defaultColumnKeys, ENTITY_COLUMNS, ENTITY_LABELS } from '../data/columns'
import { fetchEntityRows, type ComposerEntity, type EntityRowsResult } from '../data/fetchRows'

export type ComposerBlock = {
  id: string
  type: 'cover' | 'heading' | 'text' | 'pageBreak' | 'summary' | 'table'
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
    if (b.type === 'heading') {
      const size = b.level === 2 ? 11.5 : 13
      doc.setFont(SANS, 'bold'); doc.setFontSize(size)
      const lines = splitText(doc, normalizePdfText(String(b.text || '')), rd.contentWidth)
      rd.ensureSpace(lines.length * (size * 0.5) + 6)
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
    if (b.type === 'table' && b.entity) {
      const data = cache.get(String(b.entity)) || { rows: [], ctx: {} }
      const cols = resolveTableColumns(b)
      const rows = tableRowsFor(b, data)
      doc.setFont(SANS, 'bold'); doc.setFontSize(11.5)
      rd.ensureSpace(10)
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

  deliverPdf(rd.finish(), reportFileName([String(opts.project?.name || ''), opts.name || 'custom-report']), dlWin)
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

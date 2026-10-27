// Issues Data export (Excel/CSV) — the batch redesign's "Data" report.
// Excel gets what a spreadsheet person expects: display-label headers,
// REAL date cells (typed, formatted, sortable — never a text date), a
// frozen header row, an autofilter, and content-sized column widths.
// CSV keeps plain text (BOM for Excel, labels, HTML stripped) since CSV
// has no typing to offer.
import * as XLSX from 'xlsx'
import { htmlToText } from '../../core/text'
import { dateOnlyToLocal, formatDateOnly } from '../../core/dates'
import { issueColumnLabel } from './labels'

// dateFound/dueDate/closedDate are DATE-ONLY (core/dates); created/updated
// are real timestamps.
const DATE_ONLY_FIELDS = new Set(['datefound', 'duedate', 'closeddate'])
const TIMESTAMP_FIELDS = new Set(['createdat', 'updatedat'])
const HTML_FIELDS = new Set(['description', 'recommendation', 'resolution'])

/** Full plain-text cell value (no truncation, no JSON dumps). */
function cellText(row: any, key: string): string {
  const v = row?.[key]
  if (v === null || v === undefined) return ''
  if (HTML_FIELDS.has(key.toLowerCase())) return htmlToText(String(v))
  if (Array.isArray(v)) return v.map(x => (x && typeof x === 'object' ? String((x as any).name ?? '') : String(x ?? ''))).filter(Boolean).join(', ')
  if (typeof v === 'object') {
    if (typeof (v as any).name === 'string') return String((v as any).name)
    try { return JSON.stringify(v) } catch (e) { return String(v) }
  }
  return String(v)
}

function downloadBlob(blob: Blob, filename: string): void {
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(href)
}

function stampedName(base: string, ext: string): string {
  const dt = new Date()
  return `${base}-${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}.${ext}`
}

/** SheetJS CE does not write freeze panes, so inject the sheetView pane XML
 *  into the finished workbook (it is a zip). Any surprise returns the
 *  workbook unfrozen rather than failing the export. */
async function freezeHeaderRow(xlsxBytes: ArrayBuffer): Promise<ArrayBuffer | Uint8Array> {
  try {
    const { default: JSZip } = await import('jszip')
    const zip = await JSZip.loadAsync(xlsxBytes)
    const path = 'xl/worksheets/sheet1.xml'
    const xml = await zip.file(path)?.async('string')
    if (!xml || xml.includes('<pane ')) return xlsxBytes
    const pane = '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>'
    let patched: string
    if (/<sheetView\b[^>]*\/>/.test(xml)) {
      // SheetJS CE writes a self-closing <sheetView/>; open it up and put
      // the pane inside (a second <sheetViews> would be schema-invalid).
      patched = xml.replace(/<sheetView\b([^>]*)\/>/, `<sheetView$1>${pane}</sheetView>`)
    } else if (/<sheetView\b[^>]*>/.test(xml)) {
      patched = xml.replace(/(<sheetView\b[^>]*>)/, `$1${pane}`)
    } else {
      // No sheetViews at all: schema order puts it after <dimension/>.
      const views = `<sheetViews><sheetView workbookViewId="0">${pane}</sheetView></sheetViews>`
      const dim = xml.match(/<dimension[^>]*\/>/)
      patched = dim ? xml.replace(dim[0], dim[0] + views) : xml.replace('<sheetData>', `${views}<sheetData>`)
    }
    if (patched === xml) return xlsxBytes
    zip.file(path, patched)
    return await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
  } catch (e) {
    return xlsxBytes
  }
}

/** Excel export: typed date cells, frozen header, autofilter, fitted widths. */
export async function exportIssuesXlsx(rows: any[], columns: string[], fileBase = 'issues'): Promise<void> {
  if (!rows.length || !columns.length) return
  const cols = columns.slice()
  const header = cols.map(issueColumnLabel)

  const aoa: any[][] = [header]
  for (const r of rows) {
    aoa.push(cols.map(k => {
      const lk = k.toLowerCase()
      if (DATE_ONLY_FIELDS.has(lk)) {
        // Local-midnight Date (core/dates) — SheetJS serializes in local
        // time, so the cell shows the stored calendar date, never a shift.
        const d = dateOnlyToLocal(r?.[k])
        return d || cellText(r, k)
      }
      if (TIMESTAMP_FIELDS.has(lk)) {
        const d = r?.[k] ? new Date(r[k]) : null
        return d && !isNaN(d.getTime()) ? d : ''
      }
      if (lk === 'number') {
        const n = Number(r?.[k])
        return isNaN(n) ? cellText(r, k) : n
      }
      return cellText(r, k)
    }))
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa, { cellDates: true })
  // Number formats on the typed date cells.
  cols.forEach((k, ci) => {
    const lk = k.toLowerCase()
    const z = DATE_ONLY_FIELDS.has(lk) ? 'm/d/yyyy' : TIMESTAMP_FIELDS.has(lk) ? 'm/d/yyyy h:mm AM/PM' : ''
    if (!z) return
    for (let ri = 1; ri < aoa.length; ri++) {
      const cell = ws[XLSX.utils.encode_cell({ r: ri, c: ci })]
      if (cell && cell.t === 'd') cell.z = z
    }
  })
  // Widths fitted to content (clamped so Description cannot eat the sheet).
  ws['!cols'] = cols.map((k, ci) => {
    let w = String(header[ci]).length + 2
    for (let ri = 1; ri < aoa.length; ri++) {
      const v = aoa[ri][ci]
      const len = v instanceof Date ? 10 : String(v ?? '').length
      if (len > w) w = len
    }
    return { wch: Math.max(10, Math.min(60, w)) }
  })
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: aoa.length - 1, c: cols.length - 1 } }) }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Issues')
  const out: ArrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellDates: true })
  const bytes = await freezeHeaderRow(out)
  downloadBlob(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), stampedName(fileBase, 'xlsx'))
}

/** CSV export: display-label headers, full plain text, BOM for Excel. */
export function exportIssuesCsv(rows: any[], columns: string[], fileBase = 'issues'): void {
  if (!rows.length || !columns.length) return
  const cols = columns.slice()
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`
  const lines = [cols.map(k => esc(issueColumnLabel(k))).join(',')]
  for (const r of rows) {
    lines.push(cols.map(k => {
      const lk = k.toLowerCase()
      if (DATE_ONLY_FIELDS.has(lk)) return esc(formatDateOnly(r?.[k]))
      return esc(cellText(r, k))
    }).join(','))
  }
  const csv = '﻿' + lines.join('\n')
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), stampedName(fileBase, 'csv'))
}

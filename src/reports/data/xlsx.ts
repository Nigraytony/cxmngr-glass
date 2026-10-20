// The one XLSX serializer (SheetJS, lazy-loaded to keep it off the main bundle).
import { cellValue, type ColumnDef } from './columns'

export async function downloadXlsx(filename: string, sheetName: string, rows: any[], columns: ColumnDef[], ctx?: Record<string, any>): Promise<void> {
  const XLSX = await import('xlsx')
  const data = rows.map(row => {
    const out: Record<string, string> = {}
    for (const c of columns) out[c.label] = cellValue(c, row, ctx)
    return out
  })
  const ws = XLSX.utils.json_to_sheet(data, { header: columns.map(c => c.label) })
  ws['!cols'] = columns.map(c => ({ wch: Math.max(10, Math.min(40, c.label.length + 6)) }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31) || 'Sheet1')
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

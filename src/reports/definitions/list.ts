// Generic branded List PDF for any entity: the frame + the shared table
// renderer over a ColumnDef selection. Used by ListReportMenu on every list
// page (Phase 4).
import { ReportDoc } from '../core/frame'
import { drawTable } from '../core/table'
import { deliverPdf, openDeliveryWindow, reportFileName } from '../core/deliver'
import { cellValue, type ColumnDef } from '../data/columns'

export interface ListPdfOptions {
  /** Running header title (e.g. "Acme HQ - Equipment List"). */
  title: string
  footerLabel: string
  project?: any
  columns: ColumnDef[]
  rows: any[]
  /** Lookup maps passed to column accessors. */
  ctx?: Record<string, any>
  /** Slug parts for the filename (date stamp appended automatically). */
  fileBase: Array<string | undefined>
  orientation?: 'portrait' | 'landscape'
}

export async function generateListPdf(opts: ListPdfOptions): Promise<void> {
  if (!opts.columns.length || !opts.rows.length) return
  const dlWin = openDeliveryWindow()
  const byKey = new Map(opts.columns.map(c => [c.key, c]))
  const rd = await ReportDoc.create({
    title: opts.title,
    footerLabel: opts.footerLabel,
    project: opts.project,
    orientation: opts.orientation || 'landscape',
    titleFontSize: 14,
  })
  drawTable(rd, {
    columns: opts.columns.map(c => ({ key: c.key, label: c.label, weight: c.weight })),
    rows: opts.rows,
    cellText: (row, key) => {
      const col = byKey.get(key)
      return col ? cellValue(col, row, opts.ctx) : ''
    },
  })
  deliverPdf(rd.finish(), reportFileName(opts.fileBase), dlWin)
}

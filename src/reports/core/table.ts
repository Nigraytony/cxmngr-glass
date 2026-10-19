// Brand-styled table rendering on jspdf-autotable, integrated with the
// ReportDoc frame: tables start at the frame cursor, repeat their header row
// across page breaks, draw the branded page header on pages they create, and
// leave the cursor below the table. Footers come from ReportDoc.finish().
import autoTable from 'jspdf-autotable'
import type { ReportDoc } from './frame'
import { COLORS, SANS, SIZES } from './tokens'

export interface TableColumn {
  key: string
  label: string
  /** Relative width; defaults to 1. */
  weight?: number
}

export interface DrawTableOptions {
  columns: TableColumn[]
  /** Row objects; cells are read by column key and stringified. */
  rows: Array<Record<string, any>>
  /** Per-cell text override; defaults to String(row[key] ?? ''). */
  cellText?: (row: Record<string, any>, key: string) => string
}

export function drawTable(rd: ReportDoc, opts: DrawTableOptions): void {
  const { columns, rows } = opts
  if (!columns.length) return
  const cellText = opts.cellText || ((row: Record<string, any>, key: string) => String(row?.[key] ?? ''))

  const tableWidth = rd.contentWidth
  const totalWeight = columns.reduce((a, c) => a + (c.weight || 1), 0) || 1
  const columnStyles: Record<number, { cellWidth: number }> = {}
  columns.forEach((c, i) => {
    columnStyles[i] = { cellWidth: tableWidth * ((c.weight || 1) / totalWeight) }
  })

  const startPage = rd.pageNo
  autoTable(rd.doc as any, {
    startY: rd.y,
    margin: {
      left: rd.margin,
      right: rd.margin,
      top: rd.headerBottomY,
      bottom: rd.pageHeight - rd.bottomLimit,
    },
    head: [columns.map(c => c.label)],
    body: rows.map(r => columns.map(c => cellText(r, c.key))),
    styles: {
      font: SANS,
      fontSize: SIZES.tableCell,
      textColor: COLORS.text as unknown as number[],
      cellPadding: 1.5,
      overflow: 'linebreak',
    },
    headStyles: {
      font: SANS,
      fontStyle: 'bold',
      fontSize: SIZES.tableHeader,
      fillColor: COLORS.headerTint as unknown as number[],
      textColor: COLORS.text as unknown as number[],
    },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles,
    didDrawPage: () => {
      // autotable added this page itself; stamp the branded header on it.
      if (rd.pageNo > startPage) rd.drawHeaderOnCurrentPage()
    },
  })

  const finalY = (rd.doc as any).lastAutoTable?.finalY
  rd.y = typeof finalY === 'number' ? finalY + 4 : rd.y
}

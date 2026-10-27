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
  /** Called after each BODY cell draws, with its page-space position and the
   *  document page it landed on — lets a caller come back and stamp values
   *  that are only known later (e.g. the batch cover's Page column). */
  onCellDrawn?: (key: string, rowIndex: number, pos: { x: number; y: number; w: number; h: number; pageNumber: number }) => void
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
    // Phase 8 look: slate header band with white text, horizontal hairline
    // row separators only (no vertical grid), faint slate-50 zebra.
    theme: 'plain',
    styles: {
      font: SANS,
      fontSize: SIZES.tableCell,
      textColor: COLORS.text as unknown as number[],
      cellPadding: { top: 1.8, right: 2, bottom: 1.8, left: 2 },
      overflow: 'linebreak',
      lineColor: COLORS.hairline as unknown as number[],
      lineWidth: { bottom: 0.15 } as any,
    },
    headStyles: {
      font: SANS,
      fontStyle: 'bold',
      fontSize: SIZES.tableHeader,
      fillColor: COLORS.accent as unknown as number[],
      textColor: COLORS.white as unknown as number[],
      lineWidth: 0,
    },
    alternateRowStyles: { fillColor: COLORS.zebra as unknown as number[] },
    columnStyles,
    didDrawPage: () => {
      // autotable added this page itself; stamp the branded header on it.
      if (rd.pageNo > startPage) rd.drawHeaderOnCurrentPage()
    },
    didDrawCell: opts.onCellDrawn
      ? (data: any) => {
        if (data.section !== 'body') return
        const pageNumber = (rd.doc as any).getCurrentPageInfo
          ? (rd.doc as any).getCurrentPageInfo().pageNumber
          : rd.pageNo
        opts.onCellDrawn!(columns[data.column.index].key, data.row.index, {
          x: data.cell.x, y: data.cell.y, w: data.cell.width, h: data.cell.height, pageNumber,
        })
      }
      : undefined,
  })

  const finalY = (rd.doc as any).lastAutoTable?.finalY
  rd.y = typeof finalY === 'number' ? finalY + 4 : rd.y
}

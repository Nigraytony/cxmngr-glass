// The one CSV serializer: UTF-8 BOM (Excel-friendly) + RFC-4180 escaping.
import { cellValue, type ColumnDef } from './columns'

function csvEscape(value: any): string {
  const s = String(value ?? '')
  if (/[",\r\n]/.test(s) || /^\s|\s$/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function toCsv(rows: any[], columns: ColumnDef[], ctx?: Record<string, any>): string {
  const lines = [columns.map(c => csvEscape(c.label)).join(',')]
  for (const row of rows) {
    lines.push(columns.map(c => csvEscape(cellValue(c, row, ctx))).join(','))
  }
  return `﻿${lines.join('\r\n')}\r\n`
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

// Per-entity column definitions for list exports (CSV/XLSX/List-PDF) and the
// column chooser. One definition per entity, shared by every output format.
import { htmlToText } from '../core/text'

export interface ColumnDef {
  key: string
  label: string
  /** Resolve the cell value; defaults to row[key]. ctx carries lookup maps. */
  accessor?: (row: any, ctx?: Record<string, any>) => any
  /** Relative width for the List PDF (core/table.ts); defaults to 1. */
  weight?: number
  /** Included by default in exports (true when omitted). */
  enabled?: boolean
}

function dateCell(v: any): string {
  if (!v) return ''
  try { return new Date(v).toLocaleDateString() } catch (e) { return String(v) }
}

export const ISSUE_COLUMNS: ColumnDef[] = [
  { key: 'number', label: '#', weight: 0.5 },
  { key: 'title', label: 'Title', weight: 1.5 },
  { key: 'description', label: 'Description', weight: 3, accessor: r => htmlToText(r?.description) },
  { key: 'type', label: 'Type' },
  { key: 'priority', label: 'Priority', weight: 0.625, accessor: r => r?.priority || r?.severity || '' },
  { key: 'status', label: 'Status', weight: 0.5 },
  { key: 'foundBy', label: 'Found By', enabled: false },
  { key: 'dateFound', label: 'Date Found', enabled: false, accessor: r => dateCell(r?.dateFound) },
  { key: 'assignedTo', label: 'Assigned To', accessor: r => r?.assignedTo || r?.responsible_person || '' },
  { key: 'dueDate', label: 'Due Date', accessor: r => dateCell(r?.dueDate) },
  { key: 'closedDate', label: 'Closed Date', enabled: false, accessor: r => dateCell(r?.closedDate) },
  { key: 'location', label: 'Location' },
  { key: 'system', label: 'System' },
  { key: 'recommendation', label: 'Recommendation', weight: 2, enabled: false, accessor: r => htmlToText(r?.recommendation) },
  { key: 'resolution', label: 'Resolution', weight: 2, enabled: false, accessor: r => htmlToText(r?.resolution) },
  { key: 'createdAt', label: 'Created', enabled: false, accessor: r => dateCell(r?.createdAt) },
]

function equipAttr(row: any, key: string): string {
  if (Array.isArray(row?.attributes)) {
    for (const a of row.attributes) {
      if (a && typeof a === 'object' && a.key === key && a.value) return String(a.value)
    }
  } else if (row?.attributes && typeof row.attributes === 'object') {
    if (row.attributes[key]) return String(row.attributes[key])
  }
  return ''
}

export const EQUIPMENT_COLUMNS: ColumnDef[] = [
  { key: 'tag', label: 'Tag', weight: 0.8 },
  { key: 'title', label: 'Title', weight: 1.6 },
  { key: 'type', label: 'Type' },
  { key: 'system', label: 'System' },
  { key: 'status', label: 'Status' },
  { key: 'space', label: 'Space', accessor: (r, ctx) => {
    const sid = r?.spaceId ? String((r.spaceId as any)?._id || r.spaceId) : ''
    const sp = sid && ctx?.spacesById ? ctx.spacesById[sid] : null
    return sp ? String(sp.title || sp.tag || '') : String(r?.location || '')
  } },
  { key: 'responsible', label: 'Responsible', enabled: false },
  { key: 'manufacturer', label: 'Manufacturer', enabled: false, accessor: r => equipAttr(r, 'Manufacturer') },
  { key: 'model', label: 'Model', enabled: false, accessor: r => equipAttr(r, 'Model') },
  { key: 'serial', label: 'Serial', enabled: false, accessor: r => equipAttr(r, 'Serial Number') || equipAttr(r, 'Serial') },
  { key: 'description', label: 'Description', weight: 2, enabled: false, accessor: r => htmlToText(r?.description) },
  { key: 'checklists', label: 'Checklists', enabled: false, accessor: r => String(Array.isArray(r?.checklists) ? r.checklists.length : 0) },
  { key: 'functionalTests', label: 'FPTs', enabled: false, accessor: r => String(Array.isArray(r?.functionalTests) ? r.functionalTests.length : 0) },
  { key: 'issues', label: 'Open Issues', enabled: false, accessor: (r, ctx) => {
    const eqId = String(r?.id || r?._id || '')
    const all: any[] = ctx?.issues || []
    if (!eqId || !all.length) return String(Array.isArray(r?.issues) ? r.issues.length : 0)
    return String(all.filter(i => String(i?.assetId || '') === eqId && String(i?.status || '').toLowerCase() !== 'closed').length)
  } },
  { key: 'updatedAt', label: 'Updated', enabled: false, accessor: r => dateCell(r?.updatedAt) },
]

/** Resolve a cell to display text (shared by CSV/XLSX/PDF). */
export function cellValue(col: ColumnDef, row: any, ctx?: Record<string, any>): string {
  try {
    const v = col.accessor ? col.accessor(row, ctx) : (row ? row[col.key] : '')
    if (v === null || v === undefined) return ''
    if (Array.isArray(v)) return v.map(x => String(x ?? '')).filter(Boolean).join(', ')
    if (typeof v === 'object') return String((v as any).name ?? (v as any).title ?? '')
    return String(v)
  } catch (e) {
    return ''
  }
}

/** The default-enabled subset, used when the user has no saved selection. */
export function defaultColumnKeys(defs: ColumnDef[]): string[] {
  return defs.filter(d => d.enabled !== false).map(d => d.key)
}

/** Order the defs by a saved key selection (unknown keys dropped). */
export function columnsForKeys(defs: ColumnDef[], keys: string[]): ColumnDef[] {
  const byKey = new Map(defs.map(d => [d.key, d]))
  return keys.map(k => byKey.get(k)).filter(Boolean) as ColumnDef[]
}

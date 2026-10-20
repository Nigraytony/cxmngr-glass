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
    const chain = String(r?.spaceChain || '').trim()
    if (chain) return chain
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

export const ACTIVITY_COLUMNS: ColumnDef[] = [
  { key: 'name', label: 'Name', weight: 1.6 },
  { key: 'type', label: 'Type' },
  { key: 'startDate', label: 'Start', weight: 0.7, accessor: r => dateCell(r?.startDate) },
  { key: 'endDate', label: 'End', weight: 0.7, accessor: r => dateCell(r?.endDate) },
  { key: 'location', label: 'Location' },
  { key: 'description', label: 'Description', weight: 2.4, enabled: false, accessor: r => htmlToText(r?.descriptionHtml || r?.description) },
  { key: 'equipmentCount', label: 'Equipment', weight: 0.6, enabled: false, accessor: r => String(Array.isArray(r?.equipment) ? r.equipment.length : 0) },
  { key: 'issuesCount', label: 'Issues', weight: 0.6, enabled: false, accessor: r => String(Array.isArray(r?.issues) ? r.issues.length : 0) },
  { key: 'updatedAt', label: 'Updated', weight: 0.7, enabled: false, accessor: r => dateCell(r?.updatedAt) },
]

export const SPACE_COLUMNS: ColumnDef[] = [
  { key: 'tag', label: 'Tag', weight: 0.8 },
  { key: 'title', label: 'Title', weight: 1.6 },
  { key: 'type', label: 'Type' },
  { key: 'parentChain', label: 'Parent', weight: 1.6, accessor: (r, ctx) => {
    const chain = String(r?.parentChain || '').trim()
    if (chain) return chain
    const byId = ctx?.spacesById || {}
    const parts: string[] = []
    let cur: any = r?.parentSpace ? byId[String(r.parentSpace)] : null
    let depth = 0
    while (cur && depth < 10) {
      parts.unshift(String(cur.title || cur.tag || ''))
      cur = cur.parentSpace ? byId[String(cur.parentSpace)] : null
      depth++
    }
    return parts.filter(Boolean).join(' > ')
  } },
  { key: 'equipmentCount', label: 'Equipment', weight: 0.6, enabled: false, accessor: r => (r?.equipmentCount == null ? '' : String(r.equipmentCount)) },
  { key: 'subspacesCount', label: 'Sub-spaces', weight: 0.6, enabled: false, accessor: r => (r?.subspacesCount == null ? '' : String(r.subspacesCount)) },
  { key: 'issuesCount', label: 'Issues', weight: 0.6, enabled: false, accessor: r => (r?.issuesCount == null ? '' : String(r.issuesCount)) },
  { key: 'description', label: 'Description', weight: 2, enabled: false, accessor: r => htmlToText(r?.description) },
]

export const SYSTEM_COLUMNS: ColumnDef[] = [
  { key: 'tag', label: 'Tag', weight: 0.8 },
  { key: 'name', label: 'Name', weight: 1.6 },
  { key: 'type', label: 'Type' },
  { key: 'description', label: 'Description', weight: 2.4, accessor: r => htmlToText(r?.description) },
  { key: 'equipment', label: 'Equipment', weight: 0.6, enabled: false, accessor: r => String(Array.isArray(r?.equipmentIds) ? r.equipmentIds.length : 0) },
  { key: 'issues', label: 'Issues', weight: 0.6, enabled: false, accessor: r => String(Array.isArray(r?.issueIds) ? r.issueIds.length : 0) },
  { key: 'tags', label: 'Tags', enabled: false },
  { key: 'updatedAt', label: 'Updated', weight: 0.7, enabled: false, accessor: r => dateCell(r?.updatedAt) },
]

export const OPR_ITEM_COLUMNS: ColumnDef[] = [
  { key: 'rank', label: 'Rank', weight: 0.5 },
  { key: 'text', label: 'OPR Item', weight: 3.2 },
  { key: 'category', label: 'Category', accessor: (r, ctx) => {
    const byId = ctx?.categoriesById || {}
    const c = r?.categoryId ? byId[String(r.categoryId)] : null
    return c ? String(c.name || '') : ''
  } },
  { key: 'score', label: 'Score', weight: 0.5, enabled: false },
  { key: 'status', label: 'Status', weight: 0.6 },
  { key: 'createdAt', label: 'Created', weight: 0.7, enabled: false, accessor: r => dateCell(r?.createdAt) },
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

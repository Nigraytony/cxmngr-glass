// Cross-module row fetching for the report composer (Phase 7): one function
// that returns ALL of a project's rows for any entity, plus the ctx lookup
// maps its column accessors need. Server-paginated endpoints are paged
// through (cap 5000 rows); array-shaped endpoints are taken as-is.
import http from '../../utils/http'

export type ComposerEntity =
  | 'issues' | 'equipment' | 'activities' | 'spaces' | 'systems' | 'oprItems' | 'templates'

export const COMPOSER_ENTITIES: ComposerEntity[] = [
  'issues', 'equipment', 'activities', 'spaces', 'systems', 'oprItems', 'templates',
]

async function pageThrough(url: string, baseParams: Record<string, any>): Promise<any[]> {
  const out: any[] = []
  const perPage = 200
  for (let p = 1; p <= 25; p++) {
    const { data } = await http.get(url, { params: { ...baseParams, page: p, perPage } })
    const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : [])
    out.push(...items)
    const total = Number(data?.total ?? 0)
    if (!items.length || (total && out.length >= total) || items.length < perPage) break
    // An array response means the endpoint ignored pagination — one call has everything.
    if (Array.isArray(data)) break
  }
  return out
}

export interface EntityRowsResult {
  rows: any[]
  ctx: Record<string, any>
}

export async function fetchEntityRows(entity: ComposerEntity, projectId: string): Promise<EntityRowsResult> {
  const pid = String(projectId || '')
  if (!pid) return { rows: [], ctx: {} }
  switch (entity) {
    case 'issues':
      return { rows: await pageThrough('/api/issues', { projectId: pid }), ctx: {} }
    case 'equipment':
      // The equipment space column prefers the server-provided spaceChain.
      return { rows: await pageThrough('/api/equipment', { projectId: pid }), ctx: {} }
    case 'activities':
      return { rows: await pageThrough('/api/activities', { projectId: pid }), ctx: {} }
    case 'spaces': {
      const rows = await pageThrough('/api/spaces', { projectId: pid })
      const spacesById: Record<string, any> = {}
      for (const s of rows) {
        const id = String(s?._id || s?.id || '')
        if (id) spacesById[id] = s
      }
      return { rows, ctx: { spacesById } }
    }
    case 'systems':
      return { rows: await pageThrough('/api/systems', { projectId: pid }), ctx: {} }
    case 'oprItems': {
      const [items, cats] = await Promise.all([
        http.get(`/api/projects/${pid}/opr/link/items`).then(r => (Array.isArray(r.data) ? r.data : [])).catch(() => []),
        http.get(`/api/projects/${pid}/opr/link/categories`).then(r => (Array.isArray(r.data) ? r.data : [])).catch(() => []),
      ])
      const categoriesById: Record<string, any> = {}
      for (const c of cats) {
        const id = String(c?.id || c?._id || '')
        if (id) categoriesById[id] = c
      }
      return { rows: items, ctx: { categoriesById } }
    }
    case 'templates':
      return { rows: await pageThrough('/api/templates', { projectId: pid }), ctx: {} }
    default:
      return { rows: [], ctx: {} }
  }
}

// Equipment data-access repository. Routes to network or local IndexedDB +
// outbox via the offline gate (see activitiesRepository.ts for the canonical
// pattern and docs/offline_phase1_design.md). The store keeps `id` mapping,
// state, and logging. When no project is checked out, useLocal() is always
// false and every method behaves exactly as before.
//
// Note: the online update path tolerates a legacy backend that only exposes
// PUT — it tries PATCH first and falls back to PUT on 404/405. Optimistic-lock
// conflict detection wraps the PATCH attempt (the PUT fallback is best-effort).
import http from '../utils/http'
import type { Equipment } from '../stores/equipment'
import { withVersion, staleVersionConflict, type UpdateOptions, type UpdateResult } from './optimistic'
import { db } from './db'
import { outbox } from './outbox'
import { newObjectId } from './clientId'
import { useLocal, getCheckedOutProjectId, OfflineUnsupportedError, viaNetwork, shouldFallBackToLocal, setOnline } from './offlineGate'
import { toPlain } from './plain'

const API_BASE = `/api/equipment`
const ENTITY = 'equipment' as const

function nowIso(): string {
  return new Date().toISOString()
}

export const equipmentRepository = {
  async listByProject(projectId: string): Promise<any[]> {
    return viaNetwork(
      async () => {
        const res = await http.get(`${API_BASE}/project/${projectId}`)
        return Array.isArray(res.data) ? res.data : []
      },
      async () => db.equipment.where('projectId').equals(String(projectId)).toArray(),
      projectId,
    )
  },

  // `includePhotos` pulls the heavy base64 photo payload — used at checkout to
  // hydrate full records for offline use. Offline, the local copy already holds
  // whatever was hydrated, so the flag is a no-op on that path.
  async get(id: string, opts: { includePhotos?: boolean } = {}): Promise<any> {
    return viaNetwork(
      async () => {
        const params: any = {}
        if (opts.includePhotos) params.includePhotos = true
        return (await http.get(`${API_BASE}/${id}`, { params })).data
      },
      async () => (await db.equipment.get(id)) || null,
    )
  },

  async create(payload: Partial<Equipment>): Promise<any> {
    return viaNetwork(
      async () => (await http.post(API_BASE, payload)).data,
      async () => {
        const _id = newObjectId()
        const record: any = { ...payload, _id, createdAt: nowIso(), updatedAt: nowIso() }
        await db.equipment.put(toPlain(record))
        await outbox.recordWrite({ entity: ENTITY, op: 'create', entityId: _id, projectId: String(payload.projectId), payload: { ...payload, _id } })
        return record
      },
      payload.projectId,
    )
  },

  async update(id: string, payload: Partial<Equipment>, opts: UpdateOptions = {}): Promise<UpdateResult> {
    return viaNetwork<UpdateResult>(
      async () => {
        const body = withVersion(payload, opts.expectedVersion)
        try {
          const res = await http.patch(`${API_BASE}/${id}`, body, { headers: { 'Content-Type': 'application/json' } })
          return { ok: true, data: res.data }
        } catch (e: any) {
          const conflict = staleVersionConflict(e)
          if (conflict) return conflict
          // Fallback to PUT if PATCH is not supported by the backend.
          if (e?.response?.status === 404 || e?.response?.status === 405) {
            const res = await http.put(`${API_BASE}/${id}`, body, { headers: { 'Content-Type': 'application/json' } })
            return { ok: true, data: res.data }
          }
          throw e
        }
      },
      async () => {
        const current = await db.equipment.get(id)
        const merged = { ...(current || {}), ...payload, _id: id, updatedAt: nowIso() }
        await db.equipment.put(toPlain(merged))
        const projectId = String((current && current.projectId) || (payload as any).projectId || getCheckedOutProjectId() || '')
        const expectedVersion = opts.expectedVersion ?? (current ? current.__v : undefined)
        await outbox.recordWrite({ entity: ENTITY, op: 'update', entityId: id, projectId, payload, expectedVersion })
        return { ok: true, data: merged }
      },
    )
  },

  async remove(id: string): Promise<void> {
    await viaNetwork<void>(
      async () => { await http.delete(`${API_BASE}/${id}`) },
      async () => {
        const current = await db.equipment.get(id)
        await db.equipment.delete(id)
        const pid = String((current && current.projectId) || getCheckedOutProjectId() || '')
        await outbox.recordWrite({ entity: ENTITY, op: 'delete', entityId: id, projectId: pid })
      },
    )
  },

  // Server-side duplicate endpoint; throws if unavailable so the store can fall
  // back to a client-side copy. Offline, that fallback (a local create) is
  // exactly what we want, so signal unsupported here.
  async duplicate(id: string, tag: string): Promise<any> {
    if (useLocal()) throw new OfflineUnsupportedError('Server duplicate is unavailable offline')
    try {
      const res = await http.post(`${API_BASE}/${id}/duplicate`, { tag })
      return res.data
    } catch (e: any) {
      if (shouldFallBackToLocal(e)) {
        setOnline(false)
        throw new OfflineUnsupportedError('Server duplicate is unavailable offline')
      }
      throw e
    }
  },
}

export default equipmentRepository

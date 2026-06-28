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
import { useLocal, getCheckedOutProjectId, OfflineUnsupportedError } from './offlineGate'

const API_BASE = `/api/equipment`
const ENTITY = 'equipment' as const

function nowIso(): string {
  return new Date().toISOString()
}

export const equipmentRepository = {
  async listByProject(projectId: string): Promise<any[]> {
    if (useLocal(projectId)) {
      return db.equipment.where('projectId').equals(String(projectId)).toArray()
    }
    const res = await http.get(`${API_BASE}/project/${projectId}`)
    return Array.isArray(res.data) ? res.data : []
  },

  async get(id: string): Promise<any> {
    if (useLocal()) {
      return (await db.equipment.get(id)) || null
    }
    const res = await http.get(`${API_BASE}/${id}`)
    return res.data
  },

  async create(payload: Partial<Equipment>): Promise<any> {
    if (useLocal(payload.projectId)) {
      const _id = newObjectId()
      const record: any = { ...payload, _id, createdAt: nowIso(), updatedAt: nowIso() }
      await db.equipment.put(record)
      await outbox.recordWrite({ entity: ENTITY, op: 'create', entityId: _id, projectId: String(payload.projectId), payload: { ...payload, _id } })
      return record
    }
    const res = await http.post(API_BASE, payload)
    return res.data
  },

  async update(id: string, payload: Partial<Equipment>, opts: UpdateOptions = {}): Promise<UpdateResult> {
    if (useLocal()) {
      const current = await db.equipment.get(id)
      const merged = { ...(current || {}), ...payload, _id: id, updatedAt: nowIso() }
      await db.equipment.put(merged)
      const projectId = String((current && current.projectId) || (payload as any).projectId || getCheckedOutProjectId() || '')
      const expectedVersion = opts.expectedVersion ?? (current ? current.__v : undefined)
      await outbox.recordWrite({ entity: ENTITY, op: 'update', entityId: id, projectId, payload, expectedVersion })
      return { ok: true, data: merged }
    }
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

  async remove(id: string): Promise<void> {
    if (useLocal()) {
      const current = await db.equipment.get(id)
      await db.equipment.delete(id)
      const pid = String((current && current.projectId) || getCheckedOutProjectId() || '')
      await outbox.recordWrite({ entity: ENTITY, op: 'delete', entityId: id, projectId: pid })
      return
    }
    await http.delete(`${API_BASE}/${id}`)
  },

  // Server-side duplicate endpoint; throws if unavailable so the store can fall
  // back to a client-side copy. Offline, that fallback (a local create) is
  // exactly what we want, so signal unsupported here.
  async duplicate(id: string, tag: string): Promise<any> {
    if (useLocal()) throw new OfflineUnsupportedError('Server duplicate is unavailable offline')
    const res = await http.post(`${API_BASE}/${id}/duplicate`, { tag })
    return res.data
  },
}

export default equipmentRepository

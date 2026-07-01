// Issues data-access repository. Routes to network or local IndexedDB + outbox
// via the offline gate (see activitiesRepository.ts for the canonical pattern
// and docs/offline_phase1_design.md). The store keeps normalization, in-memory
// state, and logging. When no project is checked out, useLocal() is always
// false and every method behaves exactly as before.
import http from '../utils/http'
import type { Issue } from '../stores/issues'
import { withVersion, staleVersionConflict, type UpdateOptions, type UpdateResult } from './optimistic'
import { db } from './db'
import { outbox } from './outbox'
import { newObjectId } from './clientId'
import { getCheckedOutProjectId, viaNetwork } from './offlineGate'
import { toPlain } from './plain'

const API_BASE = `/api/issues`
const ENTITY = 'issue' as const

export interface ListIssuesParams {
  projectId: string
  page?: number
  perPage?: number
}

function nowIso(): string {
  return new Date().toISOString()
}

export const issuesRepository = {
  // Returns the raw server payload (array, or paginated `{ items, total, ... }`).
  // The store is responsible for unwrapping the shape. The local path returns a
  // plain array, which the store handles.
  async list(params: ListIssuesParams): Promise<any> {
    return viaNetwork(
      async () => {
        const res = await http.get(API_BASE, {
          params: { projectId: params.projectId, page: params.page ?? 1, perPage: params.perPage ?? 200 },
        })
        return res.data || []
      },
      async () => db.issues.where('projectId').equals(String(params.projectId)).toArray(),
      params.projectId,
    )
  },

  async get(id: string): Promise<any> {
    return viaNetwork(
      async () => (await http.get(`${API_BASE}/${id}`)).data,
      async () => (await db.issues.get(id)) || null,
    )
  },

  async create(payload: Partial<Issue>): Promise<any> {
    return viaNetwork(
      async () => (await http.post(API_BASE, payload, { headers: { 'Content-Type': 'application/json' } })).data,
      async () => {
        const _id = newObjectId()
        // Offline issues have no server-assigned `number` until check-in.
        const record: any = { ...payload, _id, createdAt: nowIso(), updatedAt: nowIso() }
        await db.issues.put(toPlain(record))
        await outbox.recordWrite({ entity: ENTITY, op: 'create', entityId: _id, projectId: String(payload.projectId), payload: { ...payload, _id } })
        return record
      },
      payload.projectId,
    )
  },

  async update(id: string, payload: Partial<Issue>, opts: UpdateOptions = {}): Promise<UpdateResult> {
    return viaNetwork<UpdateResult>(
      async () => {
        try {
          const res = await http.patch(`${API_BASE}/${id}`, withVersion(payload, opts.expectedVersion), { headers: { 'Content-Type': 'application/json' } })
          return { ok: true, data: res.data }
        } catch (e: any) {
          const conflict = staleVersionConflict(e)
          if (conflict) return conflict
          throw e
        }
      },
      async () => {
        const current = await db.issues.get(id)
        const merged = { ...(current || {}), ...payload, _id: id, updatedAt: nowIso() }
        await db.issues.put(toPlain(merged))
        const projectId = String((current && current.projectId) || (payload as any).projectId || getCheckedOutProjectId() || '')
        const expectedVersion = opts.expectedVersion ?? (current ? current.__v : undefined)
        await outbox.recordWrite({ entity: ENTITY, op: 'update', entityId: id, projectId, payload, expectedVersion })
        return { ok: true, data: merged }
      },
    )
  },

  // The backend returns the removed document; the store uses it to reconcile
  // state, so the local path returns the record it removed too.
  async remove(id: string): Promise<any> {
    return viaNetwork(
      async () => (await http.delete(`${API_BASE}/${id}`)).data,
      async () => {
        const current = await db.issues.get(id)
        await db.issues.delete(id)
        const pid = String((current && current.projectId) || getCheckedOutProjectId() || '')
        await outbox.recordWrite({ entity: ENTITY, op: 'delete', entityId: id, projectId: pid })
        return current || { _id: id }
      },
    )
  },
}

export default issuesRepository

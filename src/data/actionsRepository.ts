// Actions data-access repository — sub-records of an Activity. Routes to network
// or local IndexedDB + outbox via the offline gate (see activitiesRepository.ts
// for the canonical pattern and docs/offline_phase1_design.md). When no project
// is checked out, useLocal() is always false and every method behaves as before.
//
// NOTE: optimistic locking is still NOT wired for actions (the backend PATCH
// uses a load-modify-save path with no expected-version check). The local path
// records updates without an expectedVersion; check-in replays them via
// actions.update, which never reports a conflict. Finishing the `__v` migration
// for actions remains a tracked follow-up.
import http from '../utils/http'
import { withVersion, type UpdateOptions } from './optimistic'
import { db } from './db'
import { outbox } from './outbox'
import { newObjectId } from './clientId'
import { useLocal, getCheckedOutProjectId } from './offlineGate'

const API_BASE = `/api/actions`
const ENTITY = 'action' as const

function nowIso(): string {
  return new Date().toISOString()
}

export const actionsRepository = {
  async list(activityId: string, projectId?: string): Promise<any[]> {
    if (useLocal(projectId)) {
      return db.actions.where('activityId').equals(String(activityId)).toArray()
    }
    const params: any = { activityId }
    if (projectId) params.projectId = projectId
    const res = await http.get(API_BASE, { params })
    return Array.isArray(res.data) ? res.data : []
  },

  async create(payload: Record<string, any>): Promise<any> {
    if (useLocal(payload.projectId)) {
      const _id = newObjectId()
      const record: any = { ...payload, _id, createdAt: nowIso(), updatedAt: nowIso() }
      await db.actions.put(record)
      await outbox.recordWrite({ entity: ENTITY, op: 'create', entityId: _id, projectId: String(payload.projectId), payload: { ...payload, _id } })
      return record
    }
    const res = await http.post(API_BASE, payload)
    return res.data
  },

  async update(id: string, payload: Record<string, any>, opts: UpdateOptions = {}): Promise<any> {
    if (useLocal()) {
      const current = await db.actions.get(id)
      const merged = { ...(current || {}), ...payload, _id: id, updatedAt: nowIso() }
      await db.actions.put(merged)
      const projectId = String((current && current.projectId) || payload.projectId || getCheckedOutProjectId() || '')
      await outbox.recordWrite({ entity: ENTITY, op: 'update', entityId: id, projectId, payload })
      return merged
    }
    const res = await http.patch(`${API_BASE}/${id}`, withVersion(payload, opts.expectedVersion))
    return res.data
  },

  async remove(id: string): Promise<void> {
    if (useLocal()) {
      const current = await db.actions.get(id)
      await db.actions.delete(id)
      const pid = String((current && current.projectId) || getCheckedOutProjectId() || '')
      await outbox.recordWrite({ entity: ENTITY, op: 'delete', entityId: id, projectId: pid })
      return
    }
    await http.delete(`${API_BASE}/${id}`)
  },
}

export default actionsRepository

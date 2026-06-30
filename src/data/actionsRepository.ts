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
import { getCheckedOutProjectId, viaNetwork } from './offlineGate'

const API_BASE = `/api/actions`
const ENTITY = 'action' as const

function nowIso(): string {
  return new Date().toISOString()
}

export const actionsRepository = {
  async list(activityId: string, projectId?: string): Promise<any[]> {
    return viaNetwork(
      async () => {
        const params: any = { activityId }
        if (projectId) params.projectId = projectId
        const res = await http.get(API_BASE, { params })
        return Array.isArray(res.data) ? res.data : []
      },
      async () => db.actions.where('activityId').equals(String(activityId)).toArray(),
      projectId,
    )
  },

  async create(payload: Record<string, any>): Promise<any> {
    return viaNetwork(
      async () => (await http.post(API_BASE, payload)).data,
      async () => {
        const _id = newObjectId()
        const record: any = { ...payload, _id, createdAt: nowIso(), updatedAt: nowIso() }
        await db.actions.put(record)
        await outbox.recordWrite({ entity: ENTITY, op: 'create', entityId: _id, projectId: String(payload.projectId), payload: { ...payload, _id } })
        return record
      },
      payload.projectId,
    )
  },

  async update(id: string, payload: Record<string, any>, opts: UpdateOptions = {}): Promise<any> {
    return viaNetwork(
      async () => (await http.patch(`${API_BASE}/${id}`, withVersion(payload, opts.expectedVersion))).data,
      async () => {
        const current = await db.actions.get(id)
        const merged = { ...(current || {}), ...payload, _id: id, updatedAt: nowIso() }
        await db.actions.put(merged)
        const projectId = String((current && current.projectId) || payload.projectId || getCheckedOutProjectId() || '')
        await outbox.recordWrite({ entity: ENTITY, op: 'update', entityId: id, projectId, payload })
        return merged
      },
      payload.projectId,
    )
  },

  async remove(id: string): Promise<void> {
    await viaNetwork<void>(
      async () => { await http.delete(`${API_BASE}/${id}`) },
      async () => {
        const current = await db.actions.get(id)
        await db.actions.delete(id)
        const pid = String((current && current.projectId) || getCheckedOutProjectId() || '')
        await outbox.recordWrite({ entity: ENTITY, op: 'delete', entityId: id, projectId: pid })
      },
    )
  },
}

export default actionsRepository

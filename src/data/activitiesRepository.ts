// Activities data-access repository.
//
// The Pinia store calls this repository instead of `http.*` directly. Each
// method routes to ONE of two backends, decided by the offline gate
// (offlineGate.useLocal): the network (default) or the local IndexedDB + outbox
// when the activity's project is checked out and we're offline. The store's
// orchestration logic (state mutation, logging, normalization) is unchanged —
// the local path returns the same shapes the network path does.
//
// Contract: methods return the raw payloads the store expects (the old
// `res.data`). The store remains responsible for `normalize()`, in-memory
// state, and logging.
//
// See docs/offline_phase1_design.md. When no project is checked out (the live
// app), useLocal() is always false and every method behaves exactly as before.
import http from '../utils/http'
import type { Activity } from '../stores/activities'
import { withVersion, staleVersionConflict, type UpdateOptions, type UpdateResult } from './optimistic'
import { db } from './db'
import { outbox } from './outbox'
import { newObjectId } from './clientId'
import { useLocal, getCheckedOutProjectId, OfflineUnsupportedError } from './offlineGate'

const API_BASE = `/api/activities`
const ENTITY = 'activity' as const

export interface ListActivitiesParams {
  projectId: string
  light?: boolean
}

export interface FetchActivityOptions {
  light?: boolean
  includePhotos?: boolean
}

function nowIso(): string {
  return new Date().toISOString()
}

export const activitiesRepository = {
  async list(params: ListActivitiesParams): Promise<any[]> {
    if (useLocal(params.projectId)) {
      return db.activities.where('projectId').equals(String(params.projectId)).toArray()
    }
    const query: any = { projectId: params.projectId }
    if (params.light) query.light = true
    const res = await http.get(API_BASE, { params: query })
    return res.data || []
  },

  async get(id: string, opts: FetchActivityOptions = {}): Promise<any> {
    if (useLocal()) {
      return (await db.activities.get(id)) || null
    }
    const params: any = {}
    if (opts.light) params.light = true
    if (opts.includePhotos) params.includePhotos = true
    const res = await http.get(`${API_BASE}/${id}`, { params })
    return res.data
  },

  async getPhotos(id: string): Promise<any[]> {
    if (useLocal()) {
      const a = await db.activities.get(id)
      return (a && a.photos) || []
    }
    const res = await http.get(`${API_BASE}/${id}/photos`)
    return res.data || []
  },

  async create(payload: Partial<Activity>): Promise<any> {
    if (useLocal(payload.projectId)) {
      const _id = newObjectId()
      const record: any = { ...payload, _id, status: payload.status || 'draft', createdAt: nowIso(), updatedAt: nowIso() }
      await db.activities.put(record)
      // The outbox create carries the client _id so the backend create reuses
      // it (decision D2) and check-in replay is idempotent.
      await outbox.recordWrite({ entity: ENTITY, op: 'create', entityId: _id, projectId: String(payload.projectId), payload: { ...payload, _id } })
      return record
    }
    const res = await http.post(API_BASE, payload, { headers: { 'Content-Type': 'application/json' } })
    return res.data
  },

  // Returns a discriminated result rather than throwing on 409, so the store
  // can surface a "changed by someone else" conflict instead of a generic
  // error. Other HTTP errors still throw (caller handles as before).
  async update(id: string, payload: Partial<Activity>, opts: UpdateOptions = {}): Promise<UpdateResult> {
    if (useLocal()) {
      const current = await db.activities.get(id)
      const merged = { ...(current || {}), ...payload, _id: id, updatedAt: nowIso() }
      await db.activities.put(merged)
      const projectId = String((current && current.projectId) || (payload as any).projectId || getCheckedOutProjectId() || '')
      // Capture the version we based this edit on for check-in optimistic locking.
      const expectedVersion = opts.expectedVersion ?? (current ? current.__v : undefined)
      await outbox.recordWrite({ entity: ENTITY, op: 'update', entityId: id, projectId, payload, expectedVersion })
      // Conflicts can't occur offline — they surface at check-in.
      return { ok: true, data: merged }
    }
    try {
      const res = await http.patch(`${API_BASE}/${id}`, withVersion(payload, opts.expectedVersion), { headers: { 'Content-Type': 'application/json' } })
      return { ok: true, data: res.data }
    } catch (e: any) {
      const conflict = staleVersionConflict(e)
      if (conflict) return conflict
      throw e
    }
  },

  async uploadPhotos(id: string, files: FileList | File[]): Promise<any> {
    if (useLocal()) throw new OfflineUnsupportedError('Photos cannot be uploaded while offline')
    const fd = new FormData()
    const arr = Array.from(files as any)
    for (const f of arr) fd.append('photos', f as Blob)
    const res = await http.post(`${API_BASE}/${id}/photos`, fd)
    return res.data
  },

  async removePhoto(id: string, index: number): Promise<any> {
    if (useLocal()) throw new OfflineUnsupportedError('Photos cannot be edited while offline')
    const res = await http.delete(`${API_BASE}/${id}/photos/${index}`)
    return res.data
  },

  async updatePhotoCaption(id: string, index: number, caption: string): Promise<any> {
    if (useLocal()) throw new OfflineUnsupportedError('Photos cannot be edited while offline')
    const res = await http.patch(`${API_BASE}/${id}/photos/${index}`, { caption }, { headers: { 'Content-Type': 'application/json' } })
    return res.data
  },

  async remove(id: string, projectId?: string): Promise<void> {
    if (useLocal(projectId)) {
      const current = await db.activities.get(id)
      await db.activities.delete(id)
      const pid = String(projectId || (current && current.projectId) || getCheckedOutProjectId() || '')
      await outbox.recordWrite({ entity: ENTITY, op: 'delete', entityId: id, projectId: pid })
      return
    }
    const config: any = {}
    if (projectId) config.params = { projectId }
    await http.delete(`${API_BASE}/${id}`, config)
  },

  async fetchReportBlob(id: string): Promise<Blob> {
    if (useLocal()) throw new OfflineUnsupportedError('Reports cannot be generated while offline')
    const res = await http.get(`${API_BASE}/${id}/report`, { responseType: 'blob' })
    return new Blob([res.data], { type: 'application/pdf' })
  },
}

export default activitiesRepository

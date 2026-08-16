// Offline photo capture (offline Phase 2 — see docs/offline_phase1_design.md D4).
//
// The app has TWO photo systems and offline has to serve both:
//   - 'base64' — Equipment: multipart POST /api/equipment/:id/photos, stored as
//     base64 in Mongo.
//   - 'azure'  — Issues/Activities (AzurePhotosPanel): a SAS flow that PUTs the
//     file straight to Azure Blob under the docs folder Photos/<Type>/<id>.
//
// Offline-captured photos are queued in the `db.photos` table and replayed on
// check-in via whichever flow their `system` demands. Display: a queued photo is
// surfaced as a `__local` entry merged into the edit form / panel; repos strip
// `__local` before persisting an entity, so it lives only in db.photos.
import axios from 'axios'
import http from '../utils/http'
import { db } from './db'
import { newObjectId } from './clientId'

export type PhotoSystem = 'base64' | 'azure'

// Base64 (multipart) endpoint segment per entity. Only Equipment uses base64.
const BASE64_ENDPOINT: Record<string, string> = { equipment: 'equipment', issue: 'issues', activity: 'activities' }

export interface OfflinePhotoRow {
  localId: string
  system: PhotoSystem
  entityType: string // base64: 'equipment'; azure: the folder label e.g. 'Issue' | 'Activity'
  entityId: string
  projectId: string
  data: string // data URL (data:<mime>;base64,<...>)
  contentType: string
  filename: string
  size: number
  caption: string
  createdAt: number
}

// One shape that satisfies both consumers: the base64 photos[] array (data,
// contentType, filename, caption, createdAt) AND AzurePhotosPanel's DocFile-ish
// list (id, originalName, status). `__local` marks it for stripping/branching.
export interface LocalPhotoDisplay {
  __local: true
  __localId: string
  data: string
  contentType: string
  filename: string
  originalName: string
  caption: string
  createdAt: string
  id: string
  status: 'ready'
}

function rowToDisplay(r: OfflinePhotoRow): LocalPhotoDisplay {
  return {
    __local: true,
    __localId: r.localId,
    id: r.localId,
    data: r.data,
    contentType: r.contentType,
    filename: r.filename,
    originalName: r.filename,
    caption: r.caption || '',
    createdAt: new Date(r.createdAt).toISOString(),
    status: 'ready',
  }
}

function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

// Persist an offline-captured photo and return the display entry.
export async function savePhotoOffline(opts: {
  system: PhotoSystem
  entityType: string
  entityId: string
  projectId: string
  file: File
}): Promise<LocalPhotoDisplay> {
  const data = await readFileAsDataUrl(opts.file)
  const row: OfflinePhotoRow = {
    localId: newObjectId(),
    system: opts.system,
    entityType: opts.entityType,
    entityId: String(opts.entityId),
    projectId: String(opts.projectId),
    data,
    contentType: opts.file.type || 'image/jpeg',
    filename: opts.file.name || 'photo.jpg',
    size: opts.file.size || 0,
    caption: '',
    createdAt: Date.now(),
  }
  await db.photos.put(row)
  return rowToDisplay(row)
}

// Locally-queued photos for one entity, for merging into the form/panel on load.
export async function pendingPhotosFor(entityType: string, entityId: string): Promise<LocalPhotoDisplay[]> {
  const rows = await db.photos.where('entityId').equals(String(entityId)).toArray()
  return rows
    .filter((r: OfflinePhotoRow) => r.entityType === entityType)
    .sort((a: OfflinePhotoRow, b: OfflinePhotoRow) => a.createdAt - b.createdAt)
    .map(rowToDisplay)
}

export async function removePendingPhoto(localId: string): Promise<void> {
  await db.photos.delete(localId)
}

export async function pendingPhotoCount(): Promise<number> {
  return db.photos.count()
}

// Remove the `__local` display entries from a photos[] payload so they aren't
// persisted onto the entity (they sync separately).
export function stripLocalPhotos<T = any>(photos: T): T {
  if (!Array.isArray(photos)) return photos
  return photos.filter((p: any) => !(p && p.__local)) as any
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64 = ''] = String(dataUrl).split(',')
  const mime = (head.match(/data:(.*?);base64/) || [])[1] || 'application/octet-stream'
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

// ---- check-in sync ------------------------------------------------------

// Blob PUTs must not carry app auth headers (they go straight to Azure).
const blobHttp = axios.create()

async function uploadBase64Photo(r: OfflinePhotoRow): Promise<void> {
  const base = BASE64_ENDPOINT[r.entityType] || r.entityType
  const fd = new FormData()
  fd.append('photos', dataUrlToBlob(r.data), r.filename || 'photo.jpg')
  await http.post(`/api/${base}/${r.entityId}/photos`, fd)
}

// Recreate the docs folder path Photos/<entityType>/<entityId> and return its id.
async function ensureAzureFolder(projectId: string, entityType: string, entityId: string): Promise<string> {
  const treeRes = await http.get(`/api/projects/${projectId}/docs/folders/tree`)
  const flat: Array<{ id: string; name: string; parentId: string | null }> = []
  const walk = (node: any) => {
    const kids = Array.isArray(node?.children) ? node.children : []
    for (const c of kids) {
      if (c && c.id) flat.push({ id: String(c.id), name: String(c.name || ''), parentId: c.parentId ? String(c.parentId) : null })
      walk(c)
    }
  }
  walk(treeRes.data?.root)
  const findChild = (parentId: string | null, name: string) =>
    flat.find((f) => (f.parentId ? String(f.parentId) : null) === (parentId || null) && f.name.trim() === name.trim())?.id || ''

  let parentId: string | null = null
  for (const seg of ['Photos', entityType, entityId]) {
    let id = findChild(parentId, seg)
    if (!id) {
      const res = await http.post(`/api/projects/${projectId}/docs/folders`, { parentId, name: seg }, { headers: { 'Content-Type': 'application/json' } })
      id = String(res.data?.folder?.id || '')
    }
    if (!id) throw new Error('Could not create photo folder')
    parentId = id
  }
  return parentId as string
}

async function uploadAzurePhoto(r: OfflinePhotoRow, folderCache: Map<string, string>): Promise<void> {
  const key = `${r.entityType}/${r.entityId}`
  let folderId = folderCache.get(key)
  if (!folderId) {
    folderId = await ensureAzureFolder(r.projectId, r.entityType, r.entityId)
    folderCache.set(key, folderId)
  }
  const req = await http.post(
    `/api/projects/${r.projectId}/docs/files/request-upload`,
    { folderId, filename: r.filename, contentType: r.contentType, sizeBytes: r.size },
    { headers: { 'Content-Type': 'application/json' } },
  )
  const { uploadUrl, fileId } = req.data || {}
  await blobHttp.put(uploadUrl, dataUrlToBlob(r.data), {
    withCredentials: false,
    headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': r.contentType },
  })
  await http.post(`/api/projects/${r.projectId}/docs/files/${fileId}/complete`, {})
}

// Replay queued photos to the server. Called on check-in AFTER the outbox has
// replayed (so a client-generated entityId already exists server-side).
// Successful uploads are dropped; failures stay queued for the next attempt.
export async function syncPendingPhotos(): Promise<{ uploaded: number; failed: number }> {
  const rows = (await db.photos.toArray()) as OfflinePhotoRow[]
  const folderCache = new Map<string, string>()
  let uploaded = 0
  let failed = 0
  for (const r of rows) {
    try {
      if (r.system === 'azure') await uploadAzurePhoto(r, folderCache)
      else await uploadBase64Photo(r)
      await db.photos.delete(r.localId)
      uploaded++
    } catch (e) {
      failed++
    }
  }
  return { uploaded, failed }
}

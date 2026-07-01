// Offline photo capture (offline Phase 2 — see docs/offline_phase1_design.md D4).
//
// Photos can't ride the normal entity update/outbox path uniformly: the Issues
// PATCH persists `photos[]`, but the Equipment and Activities PATCH routes
// deliberately STRIP photos (they're added only via a dedicated multipart
// endpoint). So offline-captured photos are stored in their own `db.photos`
// table and replayed as multipart uploads on check-in — uniform for all three
// entities, no backend change.
//
// Display: a captured photo is also surfaced as a `__local` entry merged into
// the edit form's `photos[]`. Repos strip `__local` entries before persisting an
// entity, so the photo lives in exactly one place (db.photos) and is neither
// double-displayed nor double-synced.
import http from '../utils/http'
import { db } from './db'
import { newObjectId } from './clientId'

export type PhotoEntity = 'issue' | 'activity' | 'equipment'

const ENDPOINT: Record<PhotoEntity, string> = {
  issue: 'issues',
  activity: 'activities',
  equipment: 'equipment',
}

export interface OfflinePhotoRow {
  localId: string
  entity: PhotoEntity
  entityId: string
  projectId: string
  data: string // data URL (data:<mime>;base64,<...>)
  contentType: string
  filename: string
  size: number
  caption: string
  createdAt: number
}

// Shape merged into an edit form's photos[] for display. `__local` marks it so
// repos strip it from the entity payload (see stripLocalPhotos).
export interface LocalPhotoDisplay {
  data: string
  contentType: string
  filename: string
  caption: string
  createdAt: string
  __local: true
  __localId: string
}

function rowToDisplay(r: OfflinePhotoRow): LocalPhotoDisplay {
  return {
    data: r.data,
    contentType: r.contentType,
    filename: r.filename,
    caption: r.caption || '',
    createdAt: new Date(r.createdAt).toISOString(),
    __local: true,
    __localId: r.localId,
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

// Persist an offline-captured photo and return the display entry to append to
// the form. `file` is the already-compressed File from PhotoUploader.
export async function savePhotoOffline(opts: {
  entity: PhotoEntity
  entityId: string
  projectId: string
  file: File
}): Promise<LocalPhotoDisplay> {
  const data = await readFileAsDataUrl(opts.file)
  const row: OfflinePhotoRow = {
    localId: newObjectId(),
    entity: opts.entity,
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

// Locally-queued photos for one entity, for merging into the form on load.
export async function pendingPhotosFor(entity: PhotoEntity, entityId: string): Promise<LocalPhotoDisplay[]> {
  const rows = await db.photos.where('entityId').equals(String(entityId)).toArray()
  return rows
    .filter((r: OfflinePhotoRow) => r.entity === entity)
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
// persisted onto the entity (they sync separately via the multipart endpoint).
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

// Replay queued photos to the server via each entity's multipart endpoint.
// Called on check-in AFTER the outbox has replayed (so a client-generated
// entityId already exists server-side). Successful uploads are dropped; failures
// stay queued for the next attempt.
export async function syncPendingPhotos(): Promise<{ uploaded: number; failed: number }> {
  const rows = await db.photos.toArray()
  let uploaded = 0
  let failed = 0
  for (const r of rows as OfflinePhotoRow[]) {
    const base = ENDPOINT[r.entity]
    if (!base) { failed++; continue }
    try {
      const fd = new FormData()
      fd.append('photos', dataUrlToBlob(r.data), r.filename || 'photo.jpg')
      await http.post(`/api/${base}/${r.entityId}/photos`, fd)
      await db.photos.delete(r.localId)
      uploaded++
    } catch (e) {
      failed++
    }
  }
  return { uploaded, failed }
}

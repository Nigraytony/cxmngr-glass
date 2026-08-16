// Offline photo capture: photos queue in db.photos and replay on check-in via
// their `system` — base64 multipart (Equipment) or the Azure SAS flow
// (Issues/Activities, AzurePhotosPanel). See src/data/offlinePhotos.ts.
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'

const httpMock = vi.hoisted(() => ({
  get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn(),
}))
const blobPut = vi.hoisted(() => vi.fn())
vi.mock('../../src/utils/http', () => ({ default: httpMock, http: httpMock }))
vi.mock('axios', () => ({ default: { create: () => ({ put: blobPut }) } }))

import { db } from '../../src/data/db'
import {
  pendingPhotosFor, pendingPhotoCount, stripLocalPhotos, syncPendingPhotos,
} from '../../src/data/offlinePhotos'

async function resetDb() {
  if (!db.isOpen()) await db.open()
  await Promise.all(db.tables.map((t) => t.clear()))
}
beforeEach(async () => {
  await resetDb()
  vi.clearAllMocks()
})

function seed(row: { localId: string; system: string; entityType: string; entityId: string; projectId?: string; createdAt?: number }) {
  return db.photos.put({
    localId: row.localId, system: row.system, entityType: row.entityType, entityId: row.entityId,
    projectId: row.projectId || 'p1', data: 'data:image/jpeg;base64,' + btoa('x'),
    contentType: 'image/jpeg', filename: 'a.jpg', size: 1, caption: '', createdAt: row.createdAt || 1,
  } as any)
}

describe('stripLocalPhotos', () => {
  it('removes __local entries, keeps server photos', () => {
    expect(stripLocalPhotos([{ data: 'server' }, { data: 'local', __local: true }])).toEqual([{ data: 'server' }])
  })
  it('passes non-arrays through', () => {
    expect(stripLocalPhotos(undefined)).toBe(undefined)
  })
})

describe('pendingPhotosFor', () => {
  it('returns __local display entries for the entityType, oldest first', async () => {
    await seed({ localId: 'l1', system: 'azure', entityType: 'Issue', entityId: 'i1', createdAt: 2 })
    await seed({ localId: 'l2', system: 'azure', entityType: 'Issue', entityId: 'i1', createdAt: 1 })
    await seed({ localId: 'l3', system: 'base64', entityType: 'equipment', entityId: 'i1' }) // different type
    const list = await pendingPhotosFor('Issue', 'i1')
    expect(list.map((p) => p.__localId)).toEqual(['l2', 'l1'])
    expect(list[0]).toMatchObject({ __local: true, id: 'l2', status: 'ready' })
  })
})

describe('syncPendingPhotos — base64 (Equipment)', () => {
  it('uploads via the multipart endpoint and clears the row', async () => {
    await seed({ localId: 'l1', system: 'base64', entityType: 'equipment', entityId: 'e1' })
    httpMock.post.mockResolvedValue({ data: {} })
    const res = await syncPendingPhotos()
    expect(res).toEqual({ uploaded: 1, failed: 0 })
    expect(httpMock.post.mock.calls[0][0]).toBe('/api/equipment/e1/photos')
    expect(httpMock.post.mock.calls[0][1] instanceof FormData).toBe(true)
    expect(await pendingPhotoCount()).toBe(0)
  })
})

describe('syncPendingPhotos — azure (Issue/Activity)', () => {
  it('ensures the folder, requests a SAS upload, PUTs the blob, completes, and clears', async () => {
    await seed({ localId: 'l1', system: 'azure', entityType: 'Issue', entityId: 'i1', projectId: 'p1' })
    httpMock.get.mockResolvedValue({ data: { root: { children: [] } } }) // empty tree → create folders
    let folderSeq = 0
    httpMock.post.mockImplementation((url: string) => {
      if (url.endsWith('/docs/folders')) return Promise.resolve({ data: { folder: { id: 'f' + (++folderSeq) } } })
      if (url.endsWith('/request-upload')) return Promise.resolve({ data: { uploadUrl: 'https://blob/put', fileId: 'file1' } })
      if (url.endsWith('/complete')) return Promise.resolve({ data: {} })
      return Promise.resolve({ data: {} })
    })
    blobPut.mockResolvedValue({})

    const res = await syncPendingPhotos()

    expect(res).toEqual({ uploaded: 1, failed: 0 })
    // Photos / Issue / i1 → three folder creates
    const folderCreates = httpMock.post.mock.calls.filter((c: any[]) => String(c[0]).endsWith('/docs/folders'))
    expect(folderCreates).toHaveLength(3)
    expect(httpMock.post.mock.calls.some((c: any[]) => String(c[0]).endsWith('/request-upload'))).toBe(true)
    expect(blobPut).toHaveBeenCalledWith('https://blob/put', expect.anything(), expect.objectContaining({ withCredentials: false }))
    expect(httpMock.post.mock.calls.some((c: any[]) => String(c[0]).includes('/docs/files/file1/complete'))).toBe(true)
    expect(await pendingPhotoCount()).toBe(0)
  })

  it('keeps the photo queued if the blob PUT fails', async () => {
    await seed({ localId: 'l1', system: 'azure', entityType: 'Issue', entityId: 'i1' })
    httpMock.get.mockResolvedValue({ data: { root: { children: [] } } })
    httpMock.post.mockImplementation((url: string) => {
      if (url.endsWith('/docs/folders')) return Promise.resolve({ data: { folder: { id: 'f1' } } })
      if (url.endsWith('/request-upload')) return Promise.resolve({ data: { uploadUrl: 'https://blob/put', fileId: 'file1' } })
      return Promise.resolve({ data: {} })
    })
    blobPut.mockRejectedValue(new Error('network'))
    const res = await syncPendingPhotos()
    expect(res).toEqual({ uploaded: 0, failed: 1 })
    expect(await pendingPhotoCount()).toBe(1)
  })
})

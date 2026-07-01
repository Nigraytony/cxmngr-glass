// Offline photo capture: photos are queued in db.photos and replayed as
// multipart uploads on check-in (uniform across issue/activity/equipment,
// whose PATCH routes don't all persist photos). See src/data/offlinePhotos.ts.
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'

const httpMock = vi.hoisted(() => ({
  get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn(),
}))
vi.mock('../../src/utils/http', () => ({ default: httpMock, http: httpMock }))

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

function seed(row: { localId: string; entity: string; entityId: string; createdAt?: number }) {
  return db.photos.put({
    localId: row.localId, entity: row.entity, entityId: row.entityId, projectId: 'p1',
    data: 'data:image/jpeg;base64,' + btoa('x'), contentType: 'image/jpeg',
    filename: 'a.jpg', size: 1, caption: '', createdAt: row.createdAt || 1,
  } as any)
}

describe('stripLocalPhotos', () => {
  it('removes __local entries, keeps server photos', () => {
    const photos = [{ data: 'server' }, { data: 'local', __local: true }]
    expect(stripLocalPhotos(photos)).toEqual([{ data: 'server' }])
  })
  it('passes non-arrays through untouched', () => {
    expect(stripLocalPhotos(undefined)).toBe(undefined)
  })
})

describe('pendingPhotosFor', () => {
  it('returns __local display entries for the entity, oldest first', async () => {
    await seed({ localId: 'l1', entity: 'issue', entityId: 'i1', createdAt: 2 })
    await seed({ localId: 'l2', entity: 'issue', entityId: 'i1', createdAt: 1 })
    await seed({ localId: 'l3', entity: 'equipment', entityId: 'i1' }) // different entity
    const list = await pendingPhotosFor('issue', 'i1')
    expect(list.map((p) => p.__localId)).toEqual(['l2', 'l1'])
    expect(list[0].__local).toBe(true)
    expect(list[0].data).toContain('base64,')
  })
})

describe('syncPendingPhotos', () => {
  it('uploads each queued photo via its entity endpoint and clears it', async () => {
    await seed({ localId: 'l1', entity: 'issue', entityId: 'i1' })
    await seed({ localId: 'l2', entity: 'equipment', entityId: 'e1' })
    await seed({ localId: 'l3', entity: 'activity', entityId: 'a1' })
    httpMock.post.mockResolvedValue({ data: {} })

    const res = await syncPendingPhotos()

    expect(res).toEqual({ uploaded: 3, failed: 0 })
    expect(await pendingPhotoCount()).toBe(0)
    const urls = httpMock.post.mock.calls.map((c: any[]) => c[0]).sort()
    expect(urls).toEqual([
      '/api/activities/a1/photos',
      '/api/equipment/e1/photos',
      '/api/issues/i1/photos',
    ])
    // Body is FormData carrying a Blob under the 'photos' field.
    expect(httpMock.post.mock.calls[0][1] instanceof FormData).toBe(true)
  })

  it('keeps a photo queued when its upload fails', async () => {
    await seed({ localId: 'l1', entity: 'issue', entityId: 'i1' })
    httpMock.post.mockRejectedValue(new Error('network'))
    const res = await syncPendingPhotos()
    expect(res).toEqual({ uploaded: 0, failed: 1 })
    expect(await pendingPhotoCount()).toBe(1)
  })
})

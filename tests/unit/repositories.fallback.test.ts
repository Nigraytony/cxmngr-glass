// Failure-based offline fallback: when a project is checked out and a request
// hits a dead network (no HTTP response) even though navigator.onLine wrongly
// says we're up, repositories must serve the local copy / queue the write and
// flip the gate to offline. Server errors (4xx/5xx) and check-in replay must
// NOT trigger the fallback. See src/data/offlineGate.ts (viaNetwork).
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const httpMock = vi.hoisted(() => ({
  get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn(),
}))
vi.mock('../../src/utils/http', () => ({ default: httpMock, http: httpMock }))

import { db } from '../../src/data/db'
import { outbox } from '../../src/data/outbox'
import { issuesRepository } from '../../src/data/issuesRepository'
import { setCheckedOutProject, setOnline, isOnline, setReplaying } from '../../src/data/offlineGate'

function networkError(): any {
  // Axios connectivity failure: request made, no response.
  const e: any = new Error('Network Error')
  e.request = {}
  return e
}
function serverError(status: number): any {
  const e: any = new Error('Server Error')
  e.response = { status, data: {} }
  return e
}

async function resetDb() {
  if (!db.isOpen()) await db.open()
  await Promise.all(db.tables.map((t) => t.clear()))
}

beforeEach(async () => {
  await resetDb()
  vi.clearAllMocks()
  setCheckedOutProject('p1')
  setOnline(true) // the browser believes it's online — the bug we're guarding against
  setReplaying(false)
})
afterEach(() => {
  setCheckedOutProject(null)
  setOnline(true)
  setReplaying(false)
})

describe('failure-based offline fallback', () => {
  it('serves the local copy and flips the gate offline when a read hits a dead network', async () => {
    await db.issues.put({ _id: 'i1', projectId: 'p1', title: 'Cached' })
    httpMock.get.mockRejectedValueOnce(networkError())
    const rec = await issuesRepository.get('i1')
    expect(rec?.title).toBe('Cached')
    expect(isOnline()).toBe(false)
  })

  it('list falls back to the local project rows on a dead network', async () => {
    await db.issues.bulkPut([
      { _id: 'a', projectId: 'p1', title: 'A' },
      { _id: 'b', projectId: 'p1', title: 'B' },
    ])
    httpMock.get.mockRejectedValueOnce(networkError())
    const list = await issuesRepository.list({ projectId: 'p1' })
    expect(list.map((i: any) => i.title).sort()).toEqual(['A', 'B'])
  })

  it('queues a write to the outbox when a create hits a dead network', async () => {
    httpMock.post.mockRejectedValueOnce(networkError())
    const rec = await issuesRepository.create({ projectId: 'p1', title: 'Made offline' } as any)
    expect(rec._id).toBeTruthy()
    expect(await db.issues.get(rec._id)).toBeTruthy()
    const ops = await outbox.all()
    expect(ops[0]).toMatchObject({ op: 'create', entity: 'issue' })
  })

  it('does NOT mask a real server error (5xx) with stale local data', async () => {
    await db.issues.put({ _id: 'i1', projectId: 'p1', title: 'Cached' })
    httpMock.get.mockRejectedValueOnce(serverError(500))
    await expect(issuesRepository.get('i1')).rejects.toMatchObject({ response: { status: 500 } })
    expect(isOnline()).toBe(true) // server answered → not a connectivity problem
  })

  it('does NOT fall back during check-in replay — a network drop must surface', async () => {
    await db.issues.put({ _id: 'i1', projectId: 'p1', title: 'Cached' })
    setReplaying(true)
    httpMock.get.mockRejectedValueOnce(networkError())
    await expect(issuesRepository.get('i1')).rejects.toThrow(/network/i)
  })
})

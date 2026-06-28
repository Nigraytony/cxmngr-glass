import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '../../src/data/db'
import { outbox } from '../../src/data/outbox'
import { activitiesRepository } from '../../src/data/activitiesRepository'
import { setCheckedOutProject, setOnline } from '../../src/data/offlineGate'
import { isObjectIdLike } from '../../src/data/clientId'

async function resetDb() {
  if (!db.isOpen()) await db.open()
  await Promise.all(db.tables.map((t) => t.clear()))
}

describe('activitiesRepository — offline (local) path', () => {
  beforeEach(async () => {
    await resetDb()
    setCheckedOutProject('p1')
    setOnline(false)
  })
  afterEach(() => {
    setCheckedOutProject(null)
    setOnline(true)
  })

  it('create mints a client _id, stores locally, and queues a create op', async () => {
    const rec = await activitiesRepository.create({ projectId: 'p1', name: 'Offline A' })

    expect(isObjectIdLike(rec._id)).toBe(true)
    expect(rec.status).toBe('draft')
    expect(await db.activities.get(rec._id)).toBeTruthy()

    const ops = await outbox.all()
    expect(ops).toHaveLength(1)
    expect(ops[0]).toMatchObject({ entity: 'activity', op: 'create', entityId: rec._id })
    expect(ops[0].payload._id).toBe(rec._id) // client id carried for D2 replay
  })

  it('list returns locally-stored activities for the project', async () => {
    await activitiesRepository.create({ projectId: 'p1', name: 'One' })
    await activitiesRepository.create({ projectId: 'p1', name: 'Two' })

    const list = await activitiesRepository.list({ projectId: 'p1' })
    expect(list.map((a: any) => a.name).sort()).toEqual(['One', 'Two'])
  })

  it('update on an offline-created activity coalesces into the create op', async () => {
    const rec = await activitiesRepository.create({ projectId: 'p1', name: 'Draft' })

    const res = await activitiesRepository.update(rec._id, { name: 'Renamed' })
    expect(res.ok).toBe(true)
    expect(res.data.name).toBe('Renamed')
    expect(await activitiesRepository.get(rec._id)).toMatchObject({ name: 'Renamed' })

    const ops = await outbox.all()
    expect(ops).toHaveLength(1)
    expect(ops[0].op).toBe('create')
    expect(ops[0].payload.name).toBe('Renamed')
  })

  it('update on a hydrated activity queues an update carrying the base __v', async () => {
    await db.activities.put({ _id: 'x1', projectId: 'p1', name: 'Server', __v: 3 })

    const res = await activitiesRepository.update('x1', { name: 'Edited' }, { expectedVersion: 3 })
    expect(res.data.name).toBe('Edited')

    const ops = await outbox.all()
    expect(ops).toHaveLength(1)
    expect(ops[0]).toMatchObject({ op: 'update', entityId: 'x1', expectedVersion: 3 })
    expect(ops[0].payload).toMatchObject({ name: 'Edited' })
  })

  it('delete of an offline-created activity removes it and clears the queue', async () => {
    const rec = await activitiesRepository.create({ projectId: 'p1', name: 'Temp' })

    await activitiesRepository.remove(rec._id, 'p1')
    expect(await db.activities.get(rec._id)).toBeUndefined()
    expect(await outbox.count()).toBe(0)
  })

  it('rejects photo upload and report generation while offline', async () => {
    await expect(activitiesRepository.uploadPhotos('x', [] as any)).rejects.toThrow(/offline/i)
    await expect(activitiesRepository.fetchReportBlob('x')).rejects.toThrow(/offline/i)
  })
})

import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '../../src/data/db'
import { outbox } from '../../src/data/outbox'
import { issuesRepository } from '../../src/data/issuesRepository'
import { equipmentRepository } from '../../src/data/equipmentRepository'
import { actionsRepository } from '../../src/data/actionsRepository'
import { setCheckedOutProject, setOnline } from '../../src/data/offlineGate'
import { isObjectIdLike } from '../../src/data/clientId'

async function resetDb() {
  if (!db.isOpen()) await db.open()
  await Promise.all(db.tables.map((t) => t.clear()))
}

beforeEach(async () => {
  await resetDb()
  setCheckedOutProject('p1')
  setOnline(false)
})
afterEach(() => {
  setCheckedOutProject(null)
  setOnline(true)
})

describe('issuesRepository — offline path', () => {
  it('create mints a client _id, stores locally, queues a create op', async () => {
    const rec = await issuesRepository.create({ projectId: 'p1', title: 'Bug' } as any)
    expect(isObjectIdLike(rec._id)).toBe(true)
    expect(await db.issues.get(rec._id)).toBeTruthy()
    const ops = await outbox.all()
    expect(ops).toHaveLength(1)
    expect(ops[0]).toMatchObject({ entity: 'issue', op: 'create', entityId: rec._id })
    expect(ops[0].payload._id).toBe(rec._id)
  })

  it('list returns locally-stored issues for the project', async () => {
    await issuesRepository.create({ projectId: 'p1', title: 'A' } as any)
    await issuesRepository.create({ projectId: 'p1', title: 'B' } as any)
    const list = await issuesRepository.list({ projectId: 'p1' })
    expect(list.map((i: any) => i.title).sort()).toEqual(['A', 'B'])
  })

  it('update on a hydrated issue queues an update with the base __v', async () => {
    await db.issues.put({ _id: 'i9', projectId: 'p1', title: 'Server', __v: 4 })
    const res = await issuesRepository.update('i9', { title: 'Edited' } as any, { expectedVersion: 4 })
    expect(res.data.title).toBe('Edited')
    const ops = await outbox.all()
    expect(ops[0]).toMatchObject({ op: 'update', entityId: 'i9', expectedVersion: 4 })
  })

  it('remove returns the removed record so the store can reconcile state', async () => {
    await db.issues.put({ _id: 'i1', projectId: 'p1', title: 'Doomed', __v: 1 })
    const removed = await issuesRepository.remove('i1')
    expect(removed._id).toBe('i1')
    expect(await db.issues.get('i1')).toBeUndefined()
    const ops = await outbox.all()
    expect(ops[0]).toMatchObject({ op: 'delete', entityId: 'i1' })
  })
})

describe('equipmentRepository — offline path', () => {
  it('create + list + update + remove round-trip locally', async () => {
    const rec = await equipmentRepository.create({ projectId: 'p1', tag: 'AHU-1' } as any)
    expect(isObjectIdLike(rec._id)).toBe(true)

    const list = await equipmentRepository.listByProject('p1')
    expect(list.map((e: any) => e.tag)).toEqual(['AHU-1'])

    const upd = await equipmentRepository.update(rec._id, { tag: 'AHU-1A' } as any)
    expect(upd.data.tag).toBe('AHU-1A')
    // created-offline → update coalesces into the create op
    const ops = await outbox.all()
    expect(ops).toHaveLength(1)
    expect(ops[0].op).toBe('create')
    expect(ops[0].payload.tag).toBe('AHU-1A')

    await equipmentRepository.remove(rec._id)
    expect(await db.equipment.get(rec._id)).toBeUndefined()
    expect(await outbox.count()).toBe(0) // delete cancels the never-synced create
  })

  it('server duplicate is unsupported offline (store falls back to a local create)', async () => {
    await expect(equipmentRepository.duplicate('x', 'TAG')).rejects.toThrow(/offline/i)
  })
})

describe('actionsRepository — offline path', () => {
  it('lists by activityId from the local store', async () => {
    await db.actions.put({ _id: 'a1', projectId: 'p1', activityId: 'act1', title: 'Step 1' })
    await db.actions.put({ _id: 'a2', projectId: 'p1', activityId: 'act2', title: 'Other' })
    const list = await actionsRepository.list('act1', 'p1')
    expect(list.map((a: any) => a._id)).toEqual(['a1'])
  })

  it('create mints an _id and queues a create op; update merges and returns raw data', async () => {
    const rec = await actionsRepository.create({ projectId: 'p1', activityId: 'act1', title: 'Do' })
    expect(isObjectIdLike(rec._id)).toBe(true)

    const updated = await actionsRepository.update(rec._id, { status: 'Complete' })
    expect(updated).toMatchObject({ status: 'Complete', title: 'Do' }) // raw object, not UpdateResult

    const ops = await outbox.all()
    expect(ops).toHaveLength(1) // create + update coalesced
    expect(ops[0].op).toBe('create')
    expect(ops[0].payload.status).toBe('Complete')
  })

  it('delete removes locally and queues a delete for a hydrated action', async () => {
    await db.actions.put({ _id: 'a1', projectId: 'p1', activityId: 'act1', title: 'X' })
    await actionsRepository.remove('a1')
    expect(await db.actions.get('a1')).toBeUndefined()
    const ops = await outbox.all()
    expect(ops[0]).toMatchObject({ op: 'delete', entityId: 'a1' })
  })
})

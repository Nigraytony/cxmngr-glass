import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/data/db'
import { outbox } from '../../src/data/outbox'

async function resetDb() {
  if (!db.isOpen()) await db.open()
  await Promise.all(db.tables.map((t) => t.clear()))
}

describe('outbox', () => {
  beforeEach(resetDb)

  it('enqueues and returns ops in insertion order', async () => {
    await outbox.enqueue({ entity: 'issue', op: 'create', entityId: 'a', projectId: 'p1' })
    await outbox.enqueue({ entity: 'issue', op: 'update', entityId: 'a', projectId: 'p1', expectedVersion: 3 })

    const all = await outbox.all()
    expect(all.map((o) => o.op)).toEqual(['create', 'update'])
    expect(typeof all[0].createdAt).toBe('number')
    expect(all[1].expectedVersion).toBe(3)
  })

  it('counts and removes ops by id', async () => {
    const id1 = await outbox.enqueue({ entity: 'activity', op: 'create', entityId: 'x', projectId: 'p1' })
    await outbox.enqueue({ entity: 'activity', op: 'delete', entityId: 'y', projectId: 'p1' })

    expect(await outbox.count()).toBe(2)
    await outbox.remove(id1)
    expect((await outbox.all()).map((o) => o.entityId)).toEqual(['y'])
  })

  it('filters ops by project, preserving order', async () => {
    await outbox.enqueue({ entity: 'issue', op: 'create', entityId: 'a', projectId: 'p1' })
    await outbox.enqueue({ entity: 'issue', op: 'create', entityId: 'b', projectId: 'p2' })
    await outbox.enqueue({ entity: 'issue', op: 'update', entityId: 'a', projectId: 'p1' })

    const p1 = await outbox.forProject('p1')
    expect(p1.map((o) => o.entityId)).toEqual(['a', 'a'])
  })

  it('clears all ops', async () => {
    await outbox.enqueue({ entity: 'issue', op: 'create', entityId: 'a', projectId: 'p1' })
    await outbox.clear()
    expect(await outbox.count()).toBe(0)
  })
})

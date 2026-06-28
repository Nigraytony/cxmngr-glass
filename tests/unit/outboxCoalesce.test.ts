import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/data/db'
import { outbox } from '../../src/data/outbox'

async function resetDb() {
  if (!db.isOpen()) await db.open()
  await Promise.all(db.tables.map((t) => t.clear()))
}

describe('outbox.recordWrite (coalescing)', () => {
  beforeEach(resetDb)

  it('merges an update into a pending create', async () => {
    await outbox.recordWrite({ entity: 'activity', op: 'create', entityId: 'a', projectId: 'p1', payload: { name: 'A', _id: 'a' } })
    await outbox.recordWrite({ entity: 'activity', op: 'update', entityId: 'a', projectId: 'p1', payload: { name: 'B' } })

    const all = await outbox.all()
    expect(all).toHaveLength(1)
    expect(all[0].op).toBe('create')
    expect(all[0].payload).toMatchObject({ name: 'B', _id: 'a' })
  })

  it('merges repeated updates into one op, keeping the base version', async () => {
    await outbox.recordWrite({ entity: 'activity', op: 'update', entityId: 'a', projectId: 'p1', payload: { name: 'B' }, expectedVersion: 4 })
    await outbox.recordWrite({ entity: 'activity', op: 'update', entityId: 'a', projectId: 'p1', payload: { status: 'completed' }, expectedVersion: 9 })

    const all = await outbox.all()
    expect(all).toHaveLength(1)
    expect(all[0].op).toBe('update')
    expect(all[0].payload).toMatchObject({ name: 'B', status: 'completed' })
    expect(all[0].expectedVersion).toBe(4) // base version preserved across edits
  })

  it('drops everything when deleting an entity that was only created offline', async () => {
    await outbox.recordWrite({ entity: 'activity', op: 'create', entityId: 'a', projectId: 'p1', payload: { _id: 'a' } })
    await outbox.recordWrite({ entity: 'activity', op: 'update', entityId: 'a', projectId: 'p1', payload: { name: 'X' } })

    const res = await outbox.recordWrite({ entity: 'activity', op: 'delete', entityId: 'a', projectId: 'p1' })
    expect(res).toBeNull()
    expect(await outbox.count()).toBe(0)
  })

  it('replaces pending updates with a delete for an existing (synced) entity', async () => {
    await outbox.recordWrite({ entity: 'activity', op: 'update', entityId: 'a', projectId: 'p1', payload: { name: 'X' }, expectedVersion: 2 })
    await outbox.recordWrite({ entity: 'activity', op: 'delete', entityId: 'a', projectId: 'p1' })

    const all = await outbox.all()
    expect(all).toHaveLength(1)
    expect(all[0].op).toBe('delete')
  })

  it('keeps ops for different entity types with the same id independent', async () => {
    await outbox.recordWrite({ entity: 'activity', op: 'update', entityId: 'a', projectId: 'p1', payload: { name: 'A' } })
    await outbox.recordWrite({ entity: 'issue', op: 'update', entityId: 'a', projectId: 'p1', payload: { title: 'I' } })

    expect(await outbox.count()).toBe(2)
  })
})

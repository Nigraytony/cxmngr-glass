// The offline mutation outbox (Phase 1 — see docs/offline_phase1_design.md).
// Every offline create/update/delete is appended here and replayed in order on
// check-in. Ordering is the auto-increment `id`, so insertion order == replay
// order.
import { db, type OutboxOp } from './db'

export type { OutboxOp }

export const outbox = {
  // Append a mutation. `createdAt` defaults to now but is injectable for tests.
  async enqueue(op: Omit<OutboxOp, 'id' | 'createdAt'> & { createdAt?: number }): Promise<number> {
    const record: OutboxOp = { createdAt: Date.now(), ...op }
    return db.outbox.add(record)
  },

  // Record an entity write with coalescing, so repeated edits to one entity
  // collapse into a single pending op (avoids self-conflicts on check-in):
  //   - create:            appended as-is
  //   - update + pending create → merged into that create's payload
  //   - update + pending update → merged into that update (base version kept)
  //   - delete + pending create → all pending ops dropped (never synced)
  //   - delete (otherwise)      → pending updates dropped, a delete appended
  // Returns the affected op id, or null when a delete cancelled a pending create.
  async recordWrite(w: Omit<OutboxOp, 'id' | 'createdAt'>): Promise<number | null> {
    const existing = (await db.outbox.where('entityId').equals(w.entityId).toArray())
      .filter((o) => o.entity === w.entity)
      .sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
    const creates = existing.filter((o) => o.op === 'create')
    const updates = existing.filter((o) => o.op === 'update')

    if (w.op === 'create') {
      return this.enqueue(w)
    }

    if (w.op === 'update') {
      const target = creates[0] || updates[0]
      if (target) {
        target.payload = { ...(target.payload || {}), ...(w.payload || {}) }
        await db.outbox.put(target)
        return target.id ?? null
      }
      return this.enqueue(w)
    }

    // delete
    if (creates.length) {
      for (const o of existing) await db.outbox.delete(o.id!)
      return null
    }
    for (const u of updates) await db.outbox.delete(u.id!)
    return this.enqueue(w)
  },

  // All queued ops in replay (insertion) order.
  async all(): Promise<OutboxOp[]> {
    return db.outbox.orderBy('id').toArray()
  },

  // Queued ops for one project, in replay order.
  async forProject(projectId: string): Promise<OutboxOp[]> {
    const rows = await db.outbox.where('projectId').equals(projectId).toArray()
    return rows.sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
  },

  async count(): Promise<number> {
    return db.outbox.count()
  },

  async remove(id: number): Promise<void> {
    await db.outbox.delete(id)
  },

  async clear(): Promise<void> {
    await db.outbox.clear()
  },
}

export default outbox

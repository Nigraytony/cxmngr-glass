import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/data/db'
import { outbox } from '../../src/data/outbox'
import { checkoutProject, checkInProject } from '../../src/data/checkout'

async function resetDb() {
  if (!db.isOpen()) await db.open()
  await Promise.all(db.tables.map((t) => t.clear()))
}

// Records every repo call so tests can assert dispatch + args.
function makeRepos(overrides: any = {}) {
  const calls: any[] = []
  const spy = (name: string, ret: any = {}) => (...args: any[]) => { calls.push([name, ...args]); return Promise.resolve(ret) }
  const repos: any = {
    activities: { list: async () => [], create: spy('activities.create'), update: spy('activities.update', { ok: true }), remove: spy('activities.remove'), listByProject: undefined },
    issues: { list: async () => [], create: spy('issues.create'), update: spy('issues.update', { ok: true }), remove: spy('issues.remove') },
    equipment: { listByProject: async () => [], create: spy('equipment.create'), update: spy('equipment.update', { ok: true }), remove: spy('equipment.remove') },
    actions: { list: async () => [], create: spy('actions.create'), update: spy('actions.update', {}), remove: spy('actions.remove') },
    calls,
  }
  // Shallow-merge per-entity overrides.
  for (const k of Object.keys(overrides)) repos[k] = { ...repos[k], ...overrides[k] }
  return repos
}

describe('checkInProject', () => {
  beforeEach(resetDb)

  it('drains the outbox through the repositories in order and clears applied ops', async () => {
    await outbox.enqueue({ entity: 'issue', op: 'create', entityId: 'i1', projectId: 'p1', payload: { title: 'x' } })
    await outbox.enqueue({ entity: 'equipment', op: 'update', entityId: 'e1', projectId: 'p1', payload: { tag: 'T' }, expectedVersion: 2 })
    await outbox.enqueue({ entity: 'activity', op: 'delete', entityId: 'a1', projectId: 'p1' })

    const repos = makeRepos()
    const report = await checkInProject({ repos })

    expect(report.applied).toBe(3)
    expect(report.remaining).toBe(0)
    expect(report.conflicts).toHaveLength(0)
    expect(await outbox.count()).toBe(0)

    expect(repos.calls).toEqual([
      ['issues.create', { title: 'x' }],
      ['equipment.update', 'e1', { tag: 'T' }, { expectedVersion: 2 }],
      ['activities.remove', 'a1', 'p1'],
    ])
  })

  it('applies last-write-wins on a conflict and reports the overwritten state', async () => {
    await outbox.enqueue({ entity: 'issue', op: 'update', entityId: 'i1', projectId: 'p1', payload: { title: 'mine' }, expectedVersion: 1 })

    let call = 0
    const repos = makeRepos({
      issues: {
        update: async (_id: string, _payload: any, opts: any) => {
          call++
          if (call === 1) {
            expect(opts.expectedVersion).toBe(1)
            return { ok: false, conflict: true, current: { _id: 'i1', __v: 5, title: 'theirs' }, currentVersion: 5 }
          }
          // forced re-apply against the latest version
          expect(opts.expectedVersion).toBe(5)
          return { ok: true }
        },
      },
    })

    const report = await checkInProject({ repos })

    expect(report.applied).toBe(1)
    expect(report.conflicts).toHaveLength(1)
    expect(report.conflicts[0]).toMatchObject({ entity: 'issue', entityId: 'i1', resolved: true })
    expect(report.conflicts[0].overwritten).toMatchObject({ title: 'theirs', __v: 5 })
    expect(await outbox.count()).toBe(0)
  })

  it('aborts on a connectivity error, leaving the failing op queued', async () => {
    await outbox.enqueue({ entity: 'issue', op: 'create', entityId: 'i1', projectId: 'p1', payload: {} })
    await outbox.enqueue({ entity: 'issue', op: 'create', entityId: 'i2', projectId: 'p1', payload: {} })

    const repos = makeRepos({
      issues: {
        create: async () => { throw new Error('Network Error') }, // no `.response`
      },
    })

    const report = await checkInProject({ repos })

    expect(report.aborted).toBe(true)
    expect(report.applied).toBe(0)
    expect(report.remaining).toBe(2)
    expect(await outbox.count()).toBe(2)
  })

  it('records a server rejection (4xx) and keeps the op queued, continuing', async () => {
    await outbox.enqueue({ entity: 'issue', op: 'create', entityId: 'bad', projectId: 'p1', payload: {} })
    await outbox.enqueue({ entity: 'activity', op: 'delete', entityId: 'a1', projectId: 'p1' })

    const repos = makeRepos({
      issues: {
        create: async () => { const e: any = new Error('Bad Request'); e.response = { status: 400, data: { error: 'invalid' } }; throw e },
      },
    })

    const report = await checkInProject({ repos })

    expect(report.applied).toBe(1) // the activity delete still applied
    expect(report.failed).toEqual([{ entity: 'issue', op: 'create', entityId: 'bad', error: 'invalid' }])
    expect(report.remaining).toBe(1) // failed issue op stays queued
  })
})

describe('checkoutProject', () => {
  beforeEach(resetDb)

  it('hydrates local tables and writes checkout meta', async () => {
    const repos = makeRepos({
      activities: { list: async () => [{ _id: 'a1', projectId: 'p1' }] },
      issues: { list: async () => ({ items: [{ _id: 'i1', projectId: 'p1' }] }) }, // paginated shape
      equipment: { listByProject: async () => [{ _id: 'e1', projectId: 'p1' }] },
      actions: { list: async () => [{ _id: 'ac1', projectId: 'p1', activityId: 'a1' }] },
    })

    const summary = await checkoutProject('p1', { repos })

    expect(summary).toEqual({ projectId: 'p1', activities: 1, issues: 1, equipment: 1, actions: 1 })
    expect(await db.activities.count()).toBe(1)
    expect(await db.issues.count()).toBe(1)
    expect(await db.equipment.count()).toBe(1)
    expect(await db.actions.count()).toBe(1)
    expect((await db.meta.get('checkout'))?.projectId).toBe('p1')
  })
})

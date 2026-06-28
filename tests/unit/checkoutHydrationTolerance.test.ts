import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/data/db'
import { checkoutProject } from '../../src/data/checkout'

async function resetDb() {
  if (!db.isOpen()) await db.open()
  await Promise.all(db.tables.map((t) => t.clear()))
}

function featureDisabledError() {
  const e: any = new Error('Feature not available')
  e.response = { status: 403, data: { code: 'FEATURE_NOT_IN_PLAN', feature: 'activities' } }
  return e
}

describe('checkoutProject — hydration tolerance', () => {
  beforeEach(resetDb)

  it('treats FEATURE_NOT_IN_PLAN (403) as an empty set and still checks out', async () => {
    const repos: any = {
      activities: { list: async () => { throw featureDisabledError() } }, // disabled on this plan
      issues: { list: async () => [{ _id: 'i1', projectId: 'p1' }] },
      equipment: { listByProject: async () => [{ _id: 'e1', projectId: 'p1' }] },
      actions: { list: async () => [] },
    }

    const summary = await checkoutProject('p1', { repos })

    expect(summary).toEqual({ projectId: 'p1', activities: 0, issues: 1, equipment: 1, actions: 0 })
    expect(await db.issues.count()).toBe(1)
    expect(await db.activities.count()).toBe(0)
    expect((await db.meta.get('checkout'))?.projectId).toBe('p1')
  })

  it('still aborts the checkout on a non-feature error', async () => {
    const repos: any = {
      activities: { list: async () => { const e: any = new Error('boom'); e.response = { status: 500 }; throw e } },
      issues: { list: async () => [] },
      equipment: { listByProject: async () => [] },
      actions: { list: async () => [] },
    }

    await expect(checkoutProject('p1', { repos })).rejects.toThrow(/boom/)
    // Nothing was committed.
    expect(await db.meta.get('checkout')).toBeUndefined()
  })
})

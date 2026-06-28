import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/data/db'
import { checkoutProject, getCheckoutMeta } from '../../src/data/checkout'

async function resetDb() {
  if (!db.isOpen()) await db.open()
  await Promise.all(db.tables.map((t) => t.clear()))
}

function stubRepos() {
  return {
    activities: { list: async () => [] },
    issues: { list: async () => [] },
    equipment: { listByProject: async () => [] },
    actions: { list: async () => [] },
  } as any
}

describe('checkoutProject — grant meta (D1)', () => {
  beforeEach(resetDb)

  it('persists the offline grant in the checkout meta row', async () => {
    await checkoutProject('p1', {
      repos: stubRepos(),
      grant: { deviceId: 'dev-1', grant: 'GRANT.JWT', grantExpiresAt: 1234 },
    })
    const meta = await getCheckoutMeta()
    expect(meta).toMatchObject({ projectId: 'p1', deviceId: 'dev-1', grant: 'GRANT.JWT', grantExpiresAt: 1234 })
  })

  it('writes meta without grant fields when none supplied', async () => {
    await checkoutProject('p1', { repos: stubRepos() })
    const meta = await getCheckoutMeta()
    expect(meta?.projectId).toBe('p1')
    expect(meta?.grant).toBeUndefined()
  })
})

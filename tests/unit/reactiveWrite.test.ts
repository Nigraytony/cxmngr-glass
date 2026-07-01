// Regression: offline writes must not hand IndexedDB a Vue reactive Proxy.
// A component edit form (reactive) and its nested arrays throw
// `DataCloneError: … could not be cloned` on db.put. toPlain() sanitizes both
// the stored record and the outbox payload. See src/data/plain.ts.
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { reactive, isReactive } from 'vue'
import { db } from '../../src/data/db'
import { outbox } from '../../src/data/outbox'
import { issuesRepository } from '../../src/data/issuesRepository'
import { setCheckedOutProject, setOnline } from '../../src/data/offlineGate'
import { toPlain } from '../../src/data/plain'

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

describe('toPlain', () => {
  it('strips Vue reactivity (incl. nested) and drops undefined', () => {
    const r = reactive({ a: 1, b: undefined, list: [{ x: 1 }] })
    const p = toPlain(r)
    expect(isReactive(p)).toBe(false)
    expect(isReactive(p.list)).toBe(false)
    expect(p).toEqual({ a: 1, list: [{ x: 1 }] })
  })
})

describe('offline write with a reactive payload (DataCloneError regression)', () => {
  it('create stores a cloneable record and queues a plain outbox op', async () => {
    const payload = reactive({ projectId: 'p1', title: 'Bug', comments: [{ text: 'hi' }], photos: [] })
    const rec = await issuesRepository.create(payload as any)
    const stored = await db.issues.get(rec._id)
    expect(stored?.title).toBe('Bug')
    expect(stored.comments[0].text).toBe('hi')
    const ops = await outbox.all()
    expect(isReactive(ops[0].payload)).toBe(false)
    expect(ops[0].payload.comments[0].text).toBe('hi')
  })

  it('update with a reactive payload persists nested arrays without throwing', async () => {
    await db.issues.put({ _id: 'i1', projectId: 'p1', title: 'Server', comments: [] })
    const patch = reactive({ comments: [{ text: 'added' }] })
    const res = await issuesRepository.update('i1', patch as any)
    expect(res.ok).toBe(true)
    const stored = await db.issues.get('i1')
    expect(stored.comments[0].text).toBe('added')
  })
})

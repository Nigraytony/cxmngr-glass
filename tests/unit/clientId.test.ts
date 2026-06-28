import { describe, it, expect } from 'vitest'
import { newObjectId, isObjectIdLike } from '../../src/data/clientId'

describe('clientId', () => {
  it('generates 24-hex, ObjectId-like values', () => {
    const id = newObjectId()
    expect(id).toMatch(/^[a-f0-9]{24}$/)
    expect(isObjectIdLike(id)).toBe(true)
  })

  it('encodes the timestamp (seconds) in the first 4 bytes', () => {
    const now = 1_700_000_000_000
    const id = newObjectId(now)
    expect(parseInt(id.slice(0, 8), 16)).toBe(Math.floor(now / 1000))
  })

  it('produces unique ids across many calls', () => {
    const ids = new Set(Array.from({ length: 2000 }, () => newObjectId()))
    expect(ids.size).toBe(2000)
  })

  it('rejects non-objectid values', () => {
    expect(isObjectIdLike('nope')).toBe(false)
    expect(isObjectIdLike('')).toBe(false)
    expect(isObjectIdLike('ABCDEF')).toBe(false)
    expect(isObjectIdLike(123 as any)).toBe(false)
    expect(isObjectIdLike(null)).toBe(false)
  })
})

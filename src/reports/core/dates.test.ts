import { describe, it, expect } from 'vitest'
import { formatDateOnly, dateOnlyToLocal, daysPast } from './dates'

// The 10/15 → 10/14 bug: a bare YYYY-MM-DD parsed via `new Date()` is UTC
// midnight, which toLocaleDateString renders as the PREVIOUS day anywhere
// west of UTC. These helpers must never shift a date-only value, regardless
// of the machine timezone the tests run in.
describe('formatDateOnly', () => {
  it('formats bare date-only strings without any timezone shift', () => {
    expect(formatDateOnly('2026-10-15')).toBe('10/15/2026')
    expect(formatDateOnly('2026-06-25')).toBe('6/25/2026')
    expect(formatDateOnly('2026-01-01')).toBe('1/1/2026')
  })

  it('treats UTC-midnight ISO timestamps as date-only', () => {
    expect(formatDateOnly('2026-10-15T00:00:00Z')).toBe('10/15/2026')
    expect(formatDateOnly('2026-10-15T00:00:00.000Z')).toBe('10/15/2026')
  })

  it('falls back to locale formatting for real timestamps and junk', () => {
    expect(formatDateOnly('')).toBe('')
    expect(formatDateOnly(null)).toBe('')
    expect(formatDateOnly('Before startup')).toBe('Before startup')
  })
})

describe('daysPast / dateOnlyToLocal', () => {
  const now = new Date(2026, 9, 23, 15, 30) // local 10/23/2026 3:30pm

  it('computes whole days past a date-only due date in LOCAL time', () => {
    expect(daysPast('2026-10-15', now)).toBe(8)
    expect(daysPast('2026-10-23', now)).toBe(0) // due today, not overdue
    expect(daysPast('2026-10-29', now)).toBe(-6)
    expect(daysPast('', now)).toBeNull()
  })

  it('parses date-only values to local midnight', () => {
    const d = dateOnlyToLocal('2026-10-15')!
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(9)
    expect(d.getDate()).toBe(15)
    expect(d.getHours()).toBe(0)
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { getDeviceId } from '../../src/data/deviceId'
import { isObjectIdLike } from '../../src/data/clientId'

describe('getDeviceId', () => {
  beforeEach(() => localStorage.removeItem('offline.deviceId'))

  it('generates an ObjectId-like id and persists it', () => {
    const a = getDeviceId()
    expect(isObjectIdLike(a)).toBe(true)
    expect(localStorage.getItem('offline.deviceId')).toBe(a)
  })

  it('returns the same id on subsequent calls', () => {
    const a = getDeviceId()
    const b = getDeviceId()
    expect(b).toBe(a)
  })
})

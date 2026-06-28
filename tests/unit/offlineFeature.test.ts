import { describe, it, expect, afterEach } from 'vitest'
import { isOfflineEnabled } from '../../src/data/offlineFeature'

describe('isOfflineEnabled', () => {
  afterEach(() => { localStorage.removeItem('offline.enabled') })

  it('is off by default', () => {
    expect(isOfflineEnabled()).toBe(false)
  })

  it('is on when the localStorage flag is set to "1"', () => {
    localStorage.setItem('offline.enabled', '1')
    expect(isOfflineEnabled()).toBe(true)
  })

  it('ignores other localStorage values', () => {
    localStorage.setItem('offline.enabled', 'true')
    expect(isOfflineEnabled()).toBe(false)
  })
})

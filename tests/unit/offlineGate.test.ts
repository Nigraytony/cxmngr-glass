import { describe, it, expect, beforeEach } from 'vitest'
import { useLocal, setCheckedOutProject, setOnline, getCheckedOutProjectId, isOfflineSessionActive } from '../../src/data/offlineGate'

describe('offlineGate.useLocal', () => {
  beforeEach(() => { setCheckedOutProject(null); setOnline(true) })

  it('is false when no project is checked out', () => {
    expect(useLocal('p1')).toBe(false)
  })

  it('is false when checked out but online', () => {
    setCheckedOutProject('p1')
    setOnline(true)
    expect(useLocal('p1')).toBe(false)
  })

  it('is true when checked out, offline, and the project matches', () => {
    setCheckedOutProject('p1')
    setOnline(false)
    expect(useLocal('p1')).toBe(true)
  })

  it('is true for project-agnostic ops (by-id) when checked out + offline', () => {
    setCheckedOutProject('p1')
    setOnline(false)
    expect(useLocal()).toBe(true)
  })

  it('is false for a different project than the one checked out', () => {
    setCheckedOutProject('p1')
    setOnline(false)
    expect(useLocal('p2')).toBe(false)
  })

  it('tracks the checked-out project id', () => {
    setCheckedOutProject('abc')
    expect(getCheckedOutProjectId()).toBe('abc')
  })

  it('isOfflineSessionActive is true only when checked out AND offline', () => {
    expect(isOfflineSessionActive()).toBe(false)
    setCheckedOutProject('p1')
    setOnline(true)
    expect(isOfflineSessionActive()).toBe(false)
    setOnline(false)
    expect(isOfflineSessionActive()).toBe(true)
  })
})

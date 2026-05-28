import { describe, it, expect } from 'vitest'
import { safeErrorMessage, NETWORK_FALLBACK } from './safeErrorMessage'

const FALLBACK = "Couldn't save your changes"

describe('safeErrorMessage', () => {
  it('returns the fallback when err is null/undefined', () => {
    expect(safeErrorMessage(null, FALLBACK)).toBe(FALLBACK)
    expect(safeErrorMessage(undefined, FALLBACK)).toBe(FALLBACK)
  })

  it('uses err.response.data.error from an axios-shaped rejection', () => {
    const err = { response: { data: { error: 'Project not found' } } }
    expect(safeErrorMessage(err, FALLBACK)).toBe('Project not found')
  })

  it('falls back to err.response.data.message when error field is absent', () => {
    const err = { response: { data: { message: 'Invalid input' } } }
    expect(safeErrorMessage(err, FALLBACK)).toBe('Invalid input')
  })

  it('uses err.message when it looks like a normal sentence', () => {
    const err = new Error('That email is already in use.')
    expect(safeErrorMessage(err, FALLBACK)).toBe('That email is already in use.')
  })

  it('rejects "require is not defined" and uses the fallback (the regression that triggered this work)', () => {
    const err = new ReferenceError('require is not defined')
    expect(safeErrorMessage(err, FALLBACK)).toBe(FALLBACK)
  })

  it('rejects "Cannot read properties of undefined"', () => {
    const err = new TypeError("Cannot read properties of undefined (reading 'foo')")
    expect(safeErrorMessage(err, FALLBACK)).toBe(FALLBACK)
  })

  it('rejects axios default "Request failed with status code 500"', () => {
    const err = { message: 'Request failed with status code 500' }
    expect(safeErrorMessage(err, FALLBACK)).toBe(FALLBACK)
  })

  it('rejects stack-trace dumps (length > 200 chars)', () => {
    const dump = 'Some error\n' + ('  at Object.<anonymous> (/foo/bar.js:1:1)\n').repeat(20)
    const err = { message: dump }
    expect(safeErrorMessage(err, FALLBACK)).toBe(FALLBACK)
  })

  it('converts Network Error to NETWORK_FALLBACK', () => {
    const err = { message: 'Network Error' }
    expect(safeErrorMessage(err, FALLBACK)).toBe(NETWORK_FALLBACK)
  })

  it('converts fetch failed to NETWORK_FALLBACK', () => {
    const err = { message: 'fetch failed' }
    expect(safeErrorMessage(err, FALLBACK)).toBe(NETWORK_FALLBACK)
  })

  it('converts ENOTFOUND / ECONNREFUSED to NETWORK_FALLBACK', () => {
    expect(safeErrorMessage({ message: 'connect ENOTFOUND api.example.com' }, FALLBACK)).toBe(NETWORK_FALLBACK)
    expect(safeErrorMessage({ message: 'connect ECONNREFUSED 127.0.0.1:3000' }, FALLBACK)).toBe(NETWORK_FALLBACK)
  })

  it('prefers API error over err.message', () => {
    // Axios populates both: response.data.error from backend and err.message
    // as the axios default. The backend message wins.
    const err = {
      response: { data: { error: 'You do not have permission to delete this project.' } },
      message: 'Request failed with status code 403',
    }
    expect(safeErrorMessage(err, FALLBACK)).toBe('You do not have permission to delete this project.')
  })

  it('falls back to fallback when both API error and err.message are dev jargon', () => {
    const err = {
      response: { data: { error: 'TypeError: nope' } },
      message: 'TypeError: nope',
    }
    expect(safeErrorMessage(err, FALLBACK)).toBe(FALLBACK)
  })

  it('returns a generic fallback when an empty/whitespace fallback is provided', () => {
    expect(safeErrorMessage(new Error('TypeError: bad'), '')).toBe('Something went wrong. Please try again.')
    expect(safeErrorMessage(new Error('TypeError: bad'), '   ')).toBe('Something went wrong. Please try again.')
  })

  it('ignores non-string error fields gracefully', () => {
    const err = { response: { data: { error: { detail: 'nope' } } }, message: 12345 }
    expect(safeErrorMessage(err, FALLBACK)).toBe(FALLBACK)
  })
})

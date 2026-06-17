import { describe, it, expect } from 'vitest'
import { isStaleChunkError, shouldReloadForStaleChunk } from '../src/utils/chunkReload.ts'

describe('isStaleChunkError', () => {
  it('matches the dynamic-import failure messages browsers throw for stale chunks', () => {
    expect(isStaleChunkError(new Error('Failed to fetch dynamically imported module: https://x/BuildView-DT6NLdVS.js'))).toBe(true)
    expect(isStaleChunkError(new Error('error loading dynamically imported module'))).toBe(true)
    expect(isStaleChunkError(new Error('Importing a module script failed.'))).toBe(true) // Safari
    expect(isStaleChunkError('module script failed')).toBe(true)
  })

  it('does not match unrelated errors', () => {
    expect(isStaleChunkError(new Error('Cannot read properties of undefined'))).toBe(false)
    expect(isStaleChunkError(null)).toBe(false)
    expect(isStaleChunkError(undefined)).toBe(false)
  })
})

describe('shouldReloadForStaleChunk', () => {
  function fakeStore(initial: Record<string, string> = {}) {
    const m = new Map(Object.entries(initial))
    return {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
      _map: m,
    }
  }

  it('reloads on first failure and records the attempt time', () => {
    const store = fakeStore()
    expect(shouldReloadForStaleChunk(store, 1_000)).toBe(true)
    expect(store.getItem('stale-chunk-reload-at')).toBe('1000')
  })

  it('suppresses a second reload within the window (no infinite loop)', () => {
    const store = fakeStore({ 'stale-chunk-reload-at': '1000' })
    expect(shouldReloadForStaleChunk(store, 1_000 + 5_000)).toBe(false)
  })

  it('allows another reload once the window has elapsed (a later, separate deploy)', () => {
    const store = fakeStore({ 'stale-chunk-reload-at': '1000' })
    expect(shouldReloadForStaleChunk(store, 1_000 + 10_001)).toBe(true)
    expect(store.getItem('stale-chunk-reload-at')).toBe('11001')
  })
})

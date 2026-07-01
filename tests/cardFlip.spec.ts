import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { flipStorageKey, isFlipped, setFlipped } from '../src/utils/cardFlip.ts'

// Feature 15 — per-card flip persistence (localStorage). The loaders are thin fetch wrappers;
// the logic worth guarding is the storage key namespacing + default-side behaviour.
//
// happy-dom ships a non-functional localStorage stub (no setItem/getItem), so we install a real
// in-memory implementation for these tests.
function memoryStorage() {
  const store = new Map<string, string>()
  return {
    getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  }
}

describe('cardFlip persistence', () => {
  beforeEach(() => vi.stubGlobal('localStorage', memoryStorage()))
  afterEach(() => vi.unstubAllGlobals())

  it('namespaces the storage key by kind and slug', () => {
    expect(flipStorageKey('unit', 'darth-vader')).toBe('lg-flip:unit:darth-vader')
    expect(flipStorageKey('upgrade', 'darth-vader')).toBe('lg-flip:upgrade:darth-vader')
    // A unit and an upgrade sharing a slug must not cross-wire.
    expect(flipStorageKey('unit', 'x')).not.toBe(flipStorageKey('upgrade', 'x'))
  })

  it('defaults to the printed side (not flipped)', () => {
    expect(isFlipped('unit', 'anything')).toBe(false)
  })

  it('round-trips a flipped card and clears it when flipped back', () => {
    setFlipped('upgrade', 'offensive-stance', true)
    expect(isFlipped('upgrade', 'offensive-stance')).toBe(true)
    // The same slug under a different kind is unaffected.
    expect(isFlipped('unit', 'offensive-stance')).toBe(false)

    setFlipped('upgrade', 'offensive-stance', false)
    expect(isFlipped('upgrade', 'offensive-stance')).toBe(false)
    // Back on the default side, no key is left behind.
    expect(localStorage.getItem(flipStorageKey('upgrade', 'offensive-stance'))).toBeNull()
  })

  it('degrades safely when localStorage throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('denied') },
      setItem: () => { throw new Error('denied') },
      removeItem: () => { throw new Error('denied') },
    })
    expect(isFlipped('unit', 'x')).toBe(false)
    expect(() => setFlipped('unit', 'x', true)).not.toThrow()
  })
})

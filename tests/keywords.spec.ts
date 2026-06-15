import { describe, it, expect } from 'vitest'
import { resolveKeyword } from '../src/utils/keywords'

const G = {
  Scout: 'Scout def',
  Reliable: 'Reliable def',
  'Uncanny Luck': 'Uncanny Luck def',
  'Weak Point': 'Weak Point def',
  Immune: 'Immune def',
  'Special Issue': 'Special Issue def',
  'Master of the Force': 'MotF def',
  Mercenary: 'Mercenary def',
  Fixed: 'Fixed def',
}

describe('resolveKeyword', () => {
  it('matches an exact keyword', () => {
    expect(resolveKeyword(G, 'Scout')).toBe('Scout def')
  })

  it('strips a trailing numeric value ("Reliable 2" → Reliable)', () => {
    expect(resolveKeyword(G, 'Reliable 2')).toBe('Reliable def')
  })

  it('strips a trailing "X" placeholder ("Uncanny Luck X" → Uncanny Luck)', () => {
    expect(resolveKeyword(G, 'Uncanny Luck X')).toBe('Uncanny Luck def')
  })

  it('drops a ":" qualifier then a value ("Weak Point 1: Rear" → Weak Point)', () => {
    expect(resolveKeyword(G, 'Weak Point 1: Rear')).toBe('Weak Point def')
    expect(resolveKeyword(G, 'Weak Point 2: Rear, Sides')).toBe('Weak Point def')
  })

  it('resolves a ":" keyword by its prefix ("Immune: Pierce" → Immune)', () => {
    expect(resolveKeyword(G, 'Immune: Pierce')).toBe('Immune def')
  })

  it('resolves a valued multi-word keyword via whole-word prefix', () => {
    expect(resolveKeyword(G, 'Special Issue Blizzard Force')).toBe('Special Issue def')
    expect(resolveKeyword(G, 'Master of the Force 1')).toBe('MotF def')
    expect(resolveKeyword(G, 'Mercenary Rebels, Republic')).toBe('Mercenary def')
  })

  it('prefers the longest matching prefix key', () => {
    const g = { Special: 'short', 'Special Issue': 'long' }
    expect(resolveKeyword(g, 'Special Issue Blizzard Force')).toBe('long')
  })

  it('falls back to the first word ("Fixed Front" → Fixed)', () => {
    expect(resolveKeyword(G, 'Fixed Front')).toBe('Fixed def')
  })

  it('returns null for a genuinely absent keyword', () => {
    expect(resolveKeyword(G, 'Overwhelm')).toBeNull()
  })

  it('returns null for empty/blank input', () => {
    expect(resolveKeyword(G, '')).toBeNull()
  })

  it('does not partial-match a non-boundary prefix (Scout ≠ Scouting)', () => {
    expect(resolveKeyword(G, 'Scouting')).toBeNull()
  })
})

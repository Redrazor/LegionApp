import { describe, it, expect } from 'vitest'
import {
  TOKEN_META, TOKEN_META_BY_TYPE, TURN_CLEARED_TOKENS, PERSISTENT_TOKENS, isTurnCleared, isPanicked,
} from '../src/utils/playTokens.ts'

describe('token metadata', () => {
  it('splits the ten tokens into 3 turn-cleared (green) + 7 persistent, with no overlap', () => {
    expect(TURN_CLEARED_TOKENS).toEqual(['aim', 'dodge', 'surge'])
    expect(PERSISTENT_TOKENS).toEqual(['standby', 'observation', 'suppression', 'immobilize', 'ion', 'poison', 'shield'])
    expect(TOKEN_META).toHaveLength(10)
    const overlap = TURN_CLEARED_TOKENS.filter((t) => PERSISTENT_TOKENS.includes(t as never))
    expect(overlap).toEqual([])
  })

  it('indexes every token by type with a label and glyph', () => {
    for (const m of TOKEN_META) {
      expect(TOKEN_META_BY_TYPE[m.type]).toBe(m)
      expect(m.label.length).toBeGreaterThan(0)
      expect(m.glyph.length).toBeGreaterThan(0)
    }
  })

  it('isTurnCleared agrees with the class split', () => {
    expect(isTurnCleared('aim')).toBe(true)
    expect(isTurnCleared('surge')).toBe(true)
    expect(isTurnCleared('observation')).toBe(false) // persistent — not wiped each round
    expect(isTurnCleared('standby')).toBe(false)
    expect(isTurnCleared('suppression')).toBe(false)
    expect(isTurnCleared('shield')).toBe(false)
  })
})

describe('isPanicked', () => {
  it('panics once suppression reaches twice courage', () => {
    expect(isPanicked(1, 1)).toBe(false) // suppressed, not panicked
    expect(isPanicked(2, 1)).toBe(true) // 2 ≥ 1×2
    expect(isPanicked(3, 2)).toBe(false) // 3 < 2×2
    expect(isPanicked(4, 2)).toBe(true) // 4 ≥ 2×2
  })

  it('never panics a unit with no courage (vehicles/droids)', () => {
    expect(isPanicked(9, 0)).toBe(false)
    expect(isPanicked(9, null)).toBe(false)
    expect(isPanicked(9, undefined)).toBe(false)
  })
})

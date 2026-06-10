import { describe, it, expect } from 'vitest'
import { simulate, type SimInput } from '../src/utils/diceProb.ts'

const ATK = (o: Partial<SimInput['atk']> = {}): SimInput['atk'] => ({
  red: 0, black: 0, white: 0, surge: 'blank', aims: 0, pierce: 0, ...o,
})
const DEF = (o: Partial<SimInput['def']> = {}): SimInput['def'] => ({
  red: 0, white: 0, surge: 'blank', cover: 0, dodge: 0, ...o,
})

describe('simulate', () => {
  it('distribution sums to the run count', () => {
    const r = simulate({ atk: ATK({ red: 4 }), def: DEF({ white: 3 }) }, 10_000)
    expect(r.distribution.reduce((s, c) => s + c, 0)).toBe(10_000)
  })

  it('distribution length equals total attack dice + 1', () => {
    const r = simulate({ atk: ATK({ red: 3, black: 2 }), def: DEF() }, 1_000)
    expect(r.distribution.length).toBe(6)
  })

  it('zero attack dice always yields zero wounds', () => {
    const r = simulate({ atk: ATK(), def: DEF({ red: 5 }) }, 1_000)
    expect(r.mean).toBe(0)
    expect(r.distribution[0]).toBe(1_000)
  })

  it('cumulative[0] is 1.0 and the curve is non-increasing', () => {
    const r = simulate({ atk: ATK({ red: 6 }), def: DEF({ white: 4 }) }, 10_000)
    expect(r.cumulative[0]).toBeCloseTo(1.0, 5)
    for (let i = 1; i < r.cumulative.length; i++) {
      expect(r.cumulative[i]).toBeLessThanOrEqual(r.cumulative[i - 1])
    }
  })

  it('mean stays within [0, attack dice]', () => {
    const r = simulate({ atk: ATK({ red: 5 }), def: DEF({ red: 3 }) }, 10_000)
    expect(r.mean).toBeGreaterThanOrEqual(0)
    expect(r.mean).toBeLessThanOrEqual(5)
  })

  it('8 red dice vs no defence average ≈ 6 wounds (6/8 success per die)', () => {
    const r = simulate({ atk: ATK({ red: 8 }), def: DEF() }, 80_000)
    expect(r.mean).toBeGreaterThan(5.6)
    expect(r.mean).toBeLessThan(6.4)
  })

  it('8 white dice vs no defence average ≈ 2 wounds (2/8 success per die)', () => {
    const r = simulate({ atk: ATK({ white: 8 }), def: DEF() }, 80_000)
    expect(r.mean).toBeGreaterThan(1.6)
    expect(r.mean).toBeLessThan(2.4)
  })

  it('attack surge → hit raises the mean', () => {
    const none = simulate({ atk: ATK({ white: 8, surge: 'blank' }), def: DEF() }, 40_000)
    const surge = simulate({ atk: ATK({ white: 8, surge: 'hit' }), def: DEF() }, 40_000)
    expect(surge.mean).toBeGreaterThan(none.mean)
  })

  it('more defence dice lower the mean', () => {
    const low = simulate({ atk: ATK({ red: 6 }), def: DEF({ red: 1 }) }, 40_000)
    const high = simulate({ atk: ATK({ red: 6 }), def: DEF({ red: 5 }) }, 40_000)
    expect(low.mean).toBeGreaterThan(high.mean)
  })

  it('defense surge → block lowers wounds taken', () => {
    const none = simulate({ atk: ATK({ red: 6 }), def: DEF({ red: 5, surge: 'blank' }) }, 40_000)
    const block = simulate({ atk: ATK({ red: 6 }), def: DEF({ red: 5, surge: 'block' }) }, 40_000)
    expect(block.mean).toBeLessThan(none.mean)
  })

  it('aim raises the mean by rerolling blanks', () => {
    const none = simulate({ atk: ATK({ white: 8, aims: 0 }), def: DEF() }, 40_000)
    const aimed = simulate({ atk: ATK({ white: 8, aims: 2 }), def: DEF() }, 40_000)
    expect(aimed.mean).toBeGreaterThan(none.mean)
  })

  it('cover reduces wounds, pierce increases them', () => {
    const base = simulate({ atk: ATK({ red: 6 }), def: DEF({ red: 4 }) }, 40_000)
    const covered = simulate({ atk: ATK({ red: 6 }), def: DEF({ red: 4, cover: 2 }) }, 40_000)
    const pierced = simulate({ atk: ATK({ red: 6, pierce: 2 }), def: DEF({ red: 4 }) }, 40_000)
    expect(covered.mean).toBeLessThan(base.mean)
    expect(pierced.mean).toBeGreaterThan(base.mean)
  })

  it('reports the run count', () => {
    const r = simulate({ atk: ATK({ red: 3 }), def: DEF({ white: 2 }) }, 7_777)
    expect(r.runs).toBe(7_777)
  })
})

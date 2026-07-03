import { describe, it, expect } from 'vitest'
import {
  missionFormat, drawReconMission, pendingStandardMission, reconPoolsFrom, type ReconPools,
} from '../src/utils/mission.ts'
import type { Army, BattleCard } from '../src/types/index.ts'

const army = (gameSize: number): Army => ({
  name: '', faction: 'rebels', battleForce: null, gameSize, units: [], commandHand: [], battleDeck: [], doctrines: [],
})

/** Deterministic rng that yields the given values in order, then repeats the last. */
function seqRng(values: number[]): () => number {
  let i = 0
  return () => values[Math.min(i++, values.length - 1)]
}

const POOLS: ReconPools = { primary: ['p1', 'p2', 'p3'], secondary: ['s1', 's2', 's3'], advantage: ['a1', 'a2', 'a3'] }

describe('missionFormat', () => {
  it('solo: recon from a single Recon-sized army', () => {
    expect(missionFormat(army(600))).toBe('recon')
    expect(missionFormat(army(1000))).toBe('standard')
  })

  it('room: recon only when both present armies are Recon-sized', () => {
    expect(missionFormat(army(600), army(600))).toBe('recon')
    expect(missionFormat(army(600), army(1000))).toBe('standard')
    expect(missionFormat(army(1000), army(1000))).toBe('standard')
  })

  it('ignores absent armies (a missing opponent does not force Standard)', () => {
    expect(missionFormat(army(600), null)).toBe('recon')
  })

  it('is standard when no army is present', () => {
    expect(missionFormat(null, null)).toBe('standard')
    expect(missionFormat()).toBe('standard')
  })
})

describe('reconPoolsFrom', () => {
  it('groups only isRecon cards by subtype', () => {
    const cards = [
      { id: 'p1', subtype: 'primary', isRecon: true },
      { id: 's1', subtype: 'secondary', isRecon: true },
      { id: 'a1', subtype: 'advantage', isRecon: true },
      { id: 'std', subtype: 'primary', isRecon: false },
    ] as unknown as BattleCard[]
    expect(reconPoolsFrom(cards)).toEqual({ primary: ['p1'], secondary: ['s1'], advantage: ['a1'] })
  })
})

describe('drawReconMission', () => {
  it('draws deterministically in Blue→primary→secondary→advantage order', () => {
    // rng: 0.0 → Blue=host; 0 → p1; 0 → s1; 0 → adv first a1; 0 → adv second skips to a2
    const m = drawReconMission(POOLS, seqRng([0, 0, 0, 0, 0]), 1234)
    expect(m).toEqual({
      format: 'recon', bluePlayer: 'host', primary: 'p1', secondary: 's1',
      advantage: { host: 'a1', guest: 'a2' }, drawnAt: 1234,
    })
  })

  it('assigns Blue to guest when the roll-off is >= 0.5', () => {
    expect(drawReconMission(POOLS, seqRng([0.9, 0, 0, 0, 0]), 0).bluePlayer).toBe('guest')
  })

  it('gives each player a DISTINCT advantage', () => {
    for (const seed of [0.1, 0.4, 0.7, 0.99]) {
      const m = drawReconMission(POOLS, seqRng([0, seed, seed, seed, seed]), 0)
      expect(m.advantage.host).not.toBe(m.advantage.guest)
    }
  })

  it('handles empty pools without throwing', () => {
    const m = drawReconMission({ primary: [], secondary: [], advantage: [] }, seqRng([0]), 0)
    expect(m.primary).toBeNull()
    expect(m.advantage).toEqual({ host: null, guest: null })
  })
})

describe('pendingStandardMission', () => {
  it('is a pending standard placeholder', () => {
    expect(pendingStandardMission(42)).toMatchObject({ format: 'standard', pending: true, bluePlayer: null, primary: null, drawnAt: 42 })
  })
})

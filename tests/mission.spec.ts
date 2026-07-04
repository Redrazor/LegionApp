import { describe, it, expect } from 'vitest'
import {
  missionFormat, drawReconMission, pendingStandardMission, reconPoolsFrom, type ReconPools,
  standardDecksFrom, standardDraftReady, startStandardDraft, applyMissionModify,
} from '../src/utils/mission.ts'
import type { Army, BattleCard, BattleCardSubtype, MissionState } from '../src/types/index.ts'

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

// ── Standard draft (DOC56 p.19) ─────────────────────────────────────────────────

// ids encode their subtype in the 2nd char: hp1 = host primary, gs2 = guest secondary, …
const subtypeOf = (id: string): BattleCardSubtype | null => {
  const c = id[1]
  return c === 'p' ? 'primary' : c === 's' ? 'secondary' : c === 'a' ? 'advantage' : null
}
const HOST = ['hp1', 'hp2', 'hp3', 'hs1', 'hs2', 'hs3', 'ha1', 'ha2', 'ha3']
const GUEST = ['gp1', 'gp2', 'gp3', 'gs1', 'gs2', 'gs3', 'ga1', 'ga2', 'ga3']
const zeros = seqRng([0]) // Fisher–Yates with rng=0 is deterministic; Blue roll-off 0 < 0.5 → host

describe('standardDecksFrom', () => {
  it('splits chosen ids into three piles by subtype', () => {
    const d = standardDecksFrom(HOST, subtypeOf, seqRng([0.99])) // no shuffle churn needed
    expect(d.primary.remaining.slice().sort()).toEqual(['hp1', 'hp2', 'hp3'])
    expect(d.secondary.remaining.slice().sort()).toEqual(['hs1', 'hs2', 'hs3'])
    expect(d.advantage.remaining.slice().sort()).toEqual(['ha1', 'ha2', 'ha3'])
    expect(d.primary.discard).toEqual([])
  })
})

describe('standardDraftReady', () => {
  it('is true only when each participating deck has ≥1 of every type', () => {
    expect(standardDraftReady(HOST, GUEST, subtypeOf)).toBe(true)
    expect(standardDraftReady(['hp1', 'hs1'], GUEST, subtypeOf)).toBe(false) // host missing advantage
    expect(standardDraftReady(HOST, ['gp1', 'ga1'], subtypeOf)).toBe(false) // guest missing secondary
  })
  it('checks only the host deck in solo (guest null)', () => {
    expect(standardDraftReady(HOST, null, subtypeOf)).toBe(true)
    expect(standardDraftReady(['hp1', 'hs1'], null, subtypeOf)).toBe(false)
  })
})

describe('startStandardDraft', () => {
  it('rolls Blue and opens the reveal phase with nothing placed yet', () => {
    const m = startStandardDraft(HOST, GUEST, subtypeOf, zeros, 99)
    expect(m.format).toBe('standard')
    expect(m.bluePlayer).toBe('host')
    expect(m.primary).toBeNull()
    expect(m.secondary).toBeNull()
    expect(m.advantage).toEqual({ host: null, guest: null })
    expect(m.draft).toMatchObject({ phase: 'reveal', turn: 'host', solo: false })
  })
})

describe('applyMissionModify — reveal phase', () => {
  it('reveal-primary: Blue reveals their Objective, opponent reveals their Secondary, each an Advantage', () => {
    const m = applyMissionModify(startStandardDraft(HOST, GUEST, subtypeOf, zeros, 0), 'host', 'reveal-primary', zeros, 1)
    expect(m.primary).toBe('hp2') // Blue (host) Objective
    expect(m.secondary).toBe('gs2') // opponent (guest) Secondary
    expect(m.advantage).toEqual({ host: 'ha2', guest: 'ga2' })
    expect(m.draft).toMatchObject({ phase: 'modify', turn: 'host', primarySource: 'host', secondarySource: 'guest' })
  })

  it('reveal-secondary: Blue reveals their Secondary, opponent reveals their Objective', () => {
    const m = applyMissionModify(startStandardDraft(HOST, GUEST, subtypeOf, zeros, 0), 'host', 'reveal-secondary', zeros, 1)
    expect(m.secondary).toBe('hs2') // Blue (host) Secondary
    expect(m.primary).toBe('gp2') // opponent (guest) Objective
    expect(m.draft).toMatchObject({ phase: 'modify', primarySource: 'guest', secondarySource: 'host' })
  })

  it('ignores a reveal from the non-Blue player, and ignores modify actions during reveal', () => {
    const m0 = startStandardDraft(HOST, GUEST, subtypeOf, zeros, 0) // Blue = host
    expect(applyMissionModify(m0, 'guest', 'reveal-primary', zeros, 1)).toBe(m0)
    expect(applyMissionModify(m0, 'host', 'swap-primary', zeros, 1)).toBe(m0)
  })

  it('solo: one deck backs both sides, giving two distinct Advantages; guest deck is null', () => {
    const m = applyMissionModify(startStandardDraft(HOST, null, subtypeOf, zeros, 0), 'host', 'reveal-primary', zeros, 1)
    expect(m.draft?.solo).toBe(true)
    expect(m.draft?.decks.guest).toBeNull()
    expect(m.advantage.host).not.toBe(m.advantage.guest) // both off the single host deck
    expect([m.advantage.host, m.advantage.guest].every((a) => a?.startsWith('ha'))).toBe(true)
  })
})

describe('applyMissionModify — modify phase', () => {
  // Start and resolve the initial reveal (Blue reveals Objective) → ready to modify.
  const start = () => applyMissionModify(startStandardDraft(HOST, GUEST, subtypeOf, zeros, 0), 'host', 'reveal-primary', zeros, 1)

  it('swap-primary replaces the Objective from the actor’s deck, advances the turn, and counts a modification', () => {
    const m = applyMissionModify(start(), 'host', 'swap-primary', zeros, 1)
    expect(m.primary).toBe('hp3') // next card off the host Objective pile
    expect(m.draft?.primarySource).toBe('host')
    expect(m.draft?.turn).toBe('guest')
    expect(m.draft?.modsUsed).toEqual({ host: 1, guest: 0 })
  })

  it('swap-opponent-advantage redraws the OPPONENT’s Advantage from the opponent’s deck', () => {
    const m = applyMissionModify(start(), 'host', 'swap-opponent-advantage', zeros, 1)
    expect(m.advantage.guest).toBe('ga3') // next card off the GUEST advantage pile
    expect(m.advantage.host).toBe('ha2') // host advantage untouched
  })

  it('steal-blue moves the Blue token to the acting player', () => {
    const m0 = start()
    const afterHost = applyMissionModify(m0, 'host', 'pass', zeros, 1) // turn → guest
    const m = applyMissionModify(afterHost, 'guest', 'steal-blue', zeros, 2)
    expect(m.bluePlayer).toBe('guest')
  })

  it('pass consumes a modification without changing the placed cards', () => {
    const m = applyMissionModify(start(), 'host', 'pass', zeros, 1)
    expect(m.primary).toBe('hp2')
    expect(m.secondary).toBe('gs2')
    expect(m.draft?.modsUsed).toEqual({ host: 1, guest: 0 })
    expect(m.draft?.turn).toBe('guest')
  })

  it('ignores a modification when it is not the player’s turn', () => {
    const m0 = start() // turn = host
    expect(applyMissionModify(m0, 'guest', 'swap-primary', zeros, 1)).toBe(m0)
  })

  it('locks to phase "built" after each player has modified twice', () => {
    let m = start()
    m = applyMissionModify(m, 'host', 'pass', zeros, 1) // host 1
    m = applyMissionModify(m, 'guest', 'pass', zeros, 2) // guest 1
    m = applyMissionModify(m, 'host', 'pass', zeros, 3) // host 2
    expect(m.draft?.phase).toBe('modify')
    m = applyMissionModify(m, 'guest', 'pass', zeros, 4) // guest 2 → built
    expect(m.draft?.phase).toBe('built')
    expect(m.draft?.modsUsed).toEqual({ host: 2, guest: 2 })
    // a built mission ignores further modifications
    expect(applyMissionModify(m, 'host', 'pass', zeros, 5)).toBe(m)
  })

  it('does not mutate the input mission', () => {
    const m0 = start()
    const snapshot = JSON.stringify(m0)
    applyMissionModify(m0, 'host', 'swap-primary', zeros, 1)
    expect(JSON.stringify(m0)).toBe(snapshot)
  })

  it('reshuffles discards (including the just-discarded card) when a pile empties', () => {
    // Host Objective pile is empty with two discards; swapping discards the placed card
    // too, then reveals from the reshuffled pile (DOC56 "Empty Decks").
    const mission: MissionState = {
      format: 'standard', bluePlayer: 'host', primary: 'hp1', secondary: 'gs1',
      advantage: { host: 'ha1', guest: 'ga1' },
      draft: {
        phase: 'modify', turn: 'host', modsUsed: { host: 0, guest: 0 },
        decks: {
          host: {
            primary: { remaining: [], discard: ['x1', 'x2'] },
            secondary: { remaining: ['hs2'], discard: [] },
            advantage: { remaining: ['ha2'], discard: [] },
          },
          guest: {
            primary: { remaining: ['gp2'], discard: [] },
            secondary: { remaining: ['gs2'], discard: [] },
            advantage: { remaining: ['ga2'], discard: [] },
          },
        },
        primarySource: 'host', secondarySource: 'guest', solo: false,
      },
      drawnAt: 0,
    }
    const m = applyMissionModify(mission, 'host', 'swap-primary', zeros, 1)
    // new Objective is drawn from the reshuffled {x1, x2, hp1} pile — one of those three
    expect(['x1', 'x2', 'hp1']).toContain(m.primary)
  })
})

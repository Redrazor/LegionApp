import { describe, it, expect } from 'vitest'
import {
  createGameState, advancePhase, setVp, adjustVp,
  GAME_PHASES, MAX_ROUNDS, VP_CAP,
} from '../src/utils/playGame.ts'
import type { GameState } from '../src/types/index.ts'

const fresh = (now = 1000): GameState => createGameState(now)

describe('createGameState', () => {
  it('starts at Round 1, Command Phase, 0–0 with an opening log entry', () => {
    const g = fresh()
    expect(g.round).toBe(1)
    expect(g.phase).toBe('command')
    expect(g.vp).toEqual({ host: 0, guest: 0 })
    expect(g.over).toBe(false)
    expect(g.startedAt).toBe(1000)
    expect(g.log).toHaveLength(1)
    expect(g.log[0]).toMatchObject({ seq: 0, kind: 'system', actor: null, at: 1000 })
    expect(g.seq).toBe(1)
  })
})

describe('advancePhase', () => {
  it('steps Command → Activation → End within a round', () => {
    let g = fresh()
    g = advancePhase(g, 1)
    expect(g.phase).toBe('activation')
    g = advancePhase(g, 2)
    expect(g.phase).toBe('end')
    expect(g.round).toBe(1)
    expect(g.log.at(-1)).toMatchObject({ kind: 'phase', phase: 'end', round: 1 })
  })

  it('rolls End → next round Command Phase', () => {
    let g = fresh()
    g = advancePhase(advancePhase(g, 1), 2) // → end
    g = advancePhase(g, 3) // end → round 2 command
    expect(g.round).toBe(2)
    expect(g.phase).toBe('command')
    expect(g.log.at(-1)).toMatchObject({ kind: 'round', round: 2, phase: 'command' })
  })

  it('latches `over` after the final End Phase and then no-ops', () => {
    let g = fresh()
    // Walk all rounds to the final End Phase: 3 phases × 6 rounds − initial = 17 advances to reach R6 End.
    for (let r = 1; r <= MAX_ROUNDS; r++) {
      if (r > 1) g = advancePhase(g, 100 + r) // command (already there for r=1)
      while (g.phase !== 'end') g = advancePhase(g, 200 + r)
    }
    expect(g.round).toBe(MAX_ROUNDS)
    expect(g.phase).toBe('end')
    expect(g.over).toBe(false)
    const ended = advancePhase(g, 999)
    expect(ended.over).toBe(true)
    expect(ended.log.at(-1)).toMatchObject({ kind: 'system' })
    // Once over, further advances are a no-op (same reference).
    expect(advancePhase(ended, 1000)).toBe(ended)
  })

  it('logs one entry per advance', () => {
    let g = fresh()
    const before = g.log.length
    g = advancePhase(g, 1)
    expect(g.log.length).toBe(before + 1)
    expect(g.seq).toBe(2)
  })

  it('has exactly three phases in order', () => {
    expect(GAME_PHASES).toEqual(['command', 'activation', 'end'])
  })
})

describe('setVp / adjustVp', () => {
  it('sets an absolute value and logs the delta + actor', () => {
    const g = setVp(fresh(), 'host', 3, 5)
    expect(g.vp.host).toBe(3)
    expect(g.vp.guest).toBe(0)
    expect(g.log.at(-1)).toMatchObject({ kind: 'vp', actor: 'host', round: 1, phase: 'command' })
    expect(g.log.at(-1)!.text).toContain('+3')
  })

  it('clamps to 0..VP_CAP', () => {
    expect(setVp(fresh(), 'guest', 99, 1).vp.guest).toBe(VP_CAP)
    expect(setVp(fresh(), 'guest', -5, 1).vp.guest).toBe(0)
  })

  it('is a no-op (same reference, no log) when the value is unchanged', () => {
    const g = fresh()
    expect(setVp(g, 'host', 0, 1)).toBe(g)
    const capped = setVp(g, 'host', VP_CAP, 1)
    expect(setVp(capped, 'host', VP_CAP + 3, 2)).toBe(capped) // already at cap
  })

  it('adjustVp nudges by a delta and clamps', () => {
    let g = adjustVp(fresh(), 'host', 2, 1)
    expect(g.vp.host).toBe(2)
    g = adjustVp(g, 'host', -5, 2)
    expect(g.vp.host).toBe(0)
    expect(g.log.at(-1)!.text).toContain('-2') // 2 → 0
  })

  it('does not mutate the input state', () => {
    const g = fresh()
    const snapshot = JSON.stringify(g)
    setVp(g, 'host', 7, 1)
    advancePhase(g, 1)
    expect(JSON.stringify(g)).toBe(snapshot)
  })
})

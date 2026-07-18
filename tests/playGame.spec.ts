import { describe, it, expect } from 'vitest'
import {
  createGameState, advancePhase, setVp, adjustVp, setRound,
  adjustToken, clearTurnTokens, tokenCount, MAX_TOKENS,
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

describe('setRound', () => {
  it('jumps to an absolute round, keeps the phase, and logs it', () => {
    let g = advancePhase(fresh()) === fresh() ? fresh() : advancePhase(fresh(), 1) // → activation
    g = setRound(g, 4, 9)
    expect(g.round).toBe(4)
    expect(g.phase).toBe('activation')
    expect(g.log.at(-1)).toMatchObject({ kind: 'round', text: 'Round set to 4.' })
  })
  it('clamps to 1..MAX_ROUNDS', () => {
    expect(setRound(fresh(), 99, 1).round).toBe(MAX_ROUNDS)
    expect(setRound(fresh(), 0, 1).round).toBe(1)
  })
  it('is a no-op when unchanged and the game is live', () => {
    const g = fresh()
    expect(setRound(g, 1, 1)).toBe(g)
  })
  it('clears `over` so play can resume', () => {
    const over = { ...fresh(), round: MAX_ROUNDS, over: true }
    expect(setRound(over, 3, 1).over).toBe(false)
    // even re-selecting the same round un-latches game over
    expect(setRound(over, MAX_ROUNDS, 1).over).toBe(false)
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

describe('adjustToken', () => {
  it('adds a token, storing the count under the right player/uid and logging it', () => {
    const g = adjustToken(fresh(), 'host', 'u1', 'aim', 1, 'Luke', 5)
    expect(tokenCount(g, 'host', 'u1', 'aim')).toBe(1)
    expect(g.tokens.guest).toEqual({})
    expect(g.log.at(-1)).toMatchObject({ kind: 'token', actor: 'host', at: 5 })
    expect(g.log.at(-1)!.text).toContain('Luke')
    expect(g.log.at(-1)!.text).toContain('aim')
  })

  it('stacks and un-stacks, pruning the token key at zero and the unit entry when empty', () => {
    let g = adjustToken(fresh(), 'host', 'u1', 'suppression', 1, 'Squad', 1)
    g = adjustToken(g, 'host', 'u1', 'suppression', 2, 'Squad', 2)
    expect(tokenCount(g, 'host', 'u1', 'suppression')).toBe(3)
    g = adjustToken(g, 'host', 'u1', 'suppression', -3, 'Squad', 3)
    expect(g.tokens.host).toEqual({}) // uid entry pruned, not left as {}
  })

  it('clamps at 0 and MAX_TOKENS, no-op (same ref, no log) when unchanged', () => {
    const g = fresh()
    expect(adjustToken(g, 'host', 'u1', 'aim', -1, 'X', 1)).toBe(g) // already 0
    let s = adjustToken(g, 'host', 'u1', 'aim', 99, 'X', 1)
    expect(tokenCount(s, 'host', 'u1', 'aim')).toBe(MAX_TOKENS)
    expect(adjustToken(s, 'host', 'u1', 'aim', 5, 'X', 2)).toBe(s) // already capped
  })

  it('keeps different units and players independent', () => {
    let g = adjustToken(fresh(), 'host', 'u1', 'aim', 1, 'A', 1)
    g = adjustToken(g, 'guest', 'u1', 'aim', 2, 'B', 2)
    expect(tokenCount(g, 'host', 'u1', 'aim')).toBe(1)
    expect(tokenCount(g, 'guest', 'u1', 'aim')).toBe(2)
  })
})

describe('clearTurnTokens', () => {
  it('removes aim/dodge/surge but keeps persistent tokens (incl. standby, observation)', () => {
    let g = adjustToken(fresh(), 'host', 'u1', 'aim', 2, 'A', 1)
    g = adjustToken(g, 'host', 'u1', 'surge', 1, 'A', 2)
    g = adjustToken(g, 'host', 'u1', 'standby', 1, 'A', 3)
    g = adjustToken(g, 'host', 'u1', 'suppression', 1, 'A', 4)
    g = adjustToken(g, 'guest', 'u2', 'observation', 1, 'B', 5)
    const cleared = clearTurnTokens(g, 9)
    expect(tokenCount(cleared, 'host', 'u1', 'aim')).toBe(0)
    expect(tokenCount(cleared, 'host', 'u1', 'surge')).toBe(0)
    expect(tokenCount(cleared, 'guest', 'u2', 'observation')).toBe(1) // observation persists
    expect(tokenCount(cleared, 'host', 'u1', 'standby')).toBe(1) // standby now persists
    expect(tokenCount(cleared, 'host', 'u1', 'suppression')).toBe(1)
    expect(cleared.log.at(-1)).toMatchObject({ kind: 'token', actor: null })
  })

  it('is a no-op (same ref, no log) when there are no turn tokens', () => {
    const g = adjustToken(fresh(), 'host', 'u1', 'ion', 1, 'A', 1)
    expect(clearTurnTokens(g, 9)).toBe(g)
  })

  it('tolerates a game persisted before Phase 5 (no tokens field)', () => {
    // Simulate a legacy GameState from a client that predates the tokens field.
    const legacy = { ...fresh(), tokens: undefined } as unknown as GameState
    expect(tokenCount(legacy, 'host', 'u1', 'aim')).toBe(0)
    expect(clearTurnTokens(legacy, 9)).toBe(legacy) // nothing to clear, no crash
    const added = adjustToken(legacy, 'host', 'u1', 'aim', 1, 'A', 9)
    expect(tokenCount(added, 'host', 'u1', 'aim')).toBe(1)
    expect(added.tokens.guest).toEqual({}) // normalized both sides
  })

  it('is applied automatically when the round rolls over', () => {
    let g = adjustToken(fresh(), 'host', 'u1', 'aim', 1, 'A', 1)
    g = adjustToken(g, 'host', 'u1', 'shield', 1, 'A', 2)
    g = advancePhase(advancePhase(g, 3), 4) // → End Phase
    g = advancePhase(g, 5) // End → Round 2 Command: clears turn tokens
    expect(g.round).toBe(2)
    expect(tokenCount(g, 'host', 'u1', 'aim')).toBe(0)
    expect(tokenCount(g, 'host', 'u1', 'shield')).toBe(1) // persistent survives the round
  })
})

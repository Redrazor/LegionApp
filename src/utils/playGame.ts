import type { GamePhase, GameState, LogEntry, PlayerRole } from '../types/index.ts'

// Pure turn/VP tracker + change-log reducers, shared by the server (room, authoritative)
// and the client (solo). Every mutation returns a NEW GameState and appends a typed
// LogEntry, so the change-log substrate every later Play phase writes into lands here.
// `seq` is a deterministic per-game counter (tests don't depend on wall-clock); `now` is
// injected for the display-only `at` stamp, mirroring the mission draw's signature.

export const GAME_PHASES: GamePhase[] = ['command', 'activation', 'end']
export const MAX_ROUNDS = 6
export const VP_CAP = 12

export const PHASE_LABEL: Record<GamePhase, string> = {
  command: 'Command Phase',
  activation: 'Activation Phase',
  end: 'End Phase',
}

/** Append a log entry, stamping the running `seq` and wall-clock `at`. */
function withLog(state: GameState, now: number, entry: Omit<LogEntry, 'seq' | 'at'>): GameState {
  const e: LogEntry = { ...entry, seq: state.seq, at: now }
  return { ...state, seq: state.seq + 1, log: [...state.log, e] }
}

/** Fresh game at Round 1 / Command Phase, 0–0, with its opening log entry. */
export function createGameState(now: number): GameState {
  const base: GameState = {
    round: 1,
    phase: 'command',
    vp: { host: 0, guest: 0 },
    log: [],
    seq: 0,
    over: false,
    startedAt: now,
  }
  return withLog(base, now, {
    round: 1, phase: 'command', kind: 'system', actor: null,
    text: 'Game started — Round 1, Command Phase.',
  })
}

/**
 * Advance the clock one step: Command → Activation → End, then End rolls to the next
 * round's Command Phase (up to MAX_ROUNDS). Advancing past the final End Phase latches
 * `over`. A no-op once `over`. Logs the phase/round change.
 */
export function advancePhase(state: GameState, now: number): GameState {
  if (state.over) return state
  const i = GAME_PHASES.indexOf(state.phase)

  if (i < GAME_PHASES.length - 1) {
    const phase = GAME_PHASES[i + 1]
    return withLog({ ...state, phase }, now, {
      round: state.round, phase, kind: 'phase', actor: null,
      text: `Round ${state.round} — ${PHASE_LABEL[phase]}.`,
    })
  }

  // Currently at End Phase: either roll to the next round, or end the game.
  if (state.round >= MAX_ROUNDS) {
    return withLog({ ...state, over: true }, now, {
      round: state.round, phase: 'end', kind: 'system', actor: null,
      text: `Game over — ${MAX_ROUNDS} rounds complete.`,
    })
  }
  const round = state.round + 1
  return withLog({ ...state, round, phase: 'command' }, now, {
    round, phase: 'command', kind: 'round', actor: null,
    text: `Round ${round} — Command Phase.`,
  })
}

/**
 * Jump the round marker to an absolute round (clamped 1..MAX_ROUNDS) — the physical
 * tracker's movable round token, for corrections. Clears `over` (play resumes) and keeps
 * the current phase. No-op + no log if unchanged.
 */
export function setRound(state: GameState, round: number, now: number): GameState {
  const r = Math.max(1, Math.min(MAX_ROUNDS, Math.round(round)))
  if (r === state.round && !state.over) return state
  return withLog({ ...state, round: r, over: false }, now, {
    round: r, phase: state.phase, kind: 'round', actor: null,
    text: `Round set to ${r}.`,
  })
}

/** Set a player's VP to an absolute value (clamped 0..VP_CAP). No-op + no log if unchanged. */
export function setVp(state: GameState, player: PlayerRole, value: number, now: number): GameState {
  const v = Math.max(0, Math.min(VP_CAP, Math.round(value)))
  const prev = state.vp[player]
  if (v === prev) return state
  const d = v - prev
  return withLog({ ...state, vp: { ...state.vp, [player]: v } }, now, {
    round: state.round, phase: state.phase, kind: 'vp', actor: player,
    text: `${d > 0 ? '+' : ''}${d} VP (now ${v}).`,
  })
}

/** Nudge a player's VP by a delta (clamped). Thin wrapper over setVp for +/- controls. */
export function adjustVp(state: GameState, player: PlayerRole, delta: number, now: number): GameState {
  return setVp(state, player, state.vp[player] + delta, now)
}

// Pure, framework-free reducers over the authoritative room state. The socket layer
// (rooms.ts / index.ts) stays a thin shell over these so the game logic is unit-testable.
// This blob is what gets persisted to SQLite and broadcast to both players; later Play
// phases extend RoomState (mission, round, VP, tokens, log) and add reducers here.

import type { Army, RoomState, RoomSlot, PlayerRole, MissionState } from '../src/types/index.ts'
import { createGameState, advancePhase, setVp, setRound } from '../src/utils/playGame.ts'

// Note: the pure Recon draw (drawReconMission/pendingStandardMission/ReconPools) lives in
// src/utils/mission.ts so the client can run the same draw for solo games. These reducers
// only mutate RoomState.

/** Fresh state for a brand-new room whose host has just created it. */
export function createRoomState(hostName: string): RoomState {
  return { host: { name: hostName.trim() || 'Host', army: null }, guest: null }
}

/** Ensure the guest slot exists (idempotent) and set/keep its name. */
export function ensureGuest(state: RoomState, guestName: string): RoomState {
  if (state.guest) return state
  return { ...state, guest: { name: guestName, army: null } }
}

function withSlot(state: RoomState, role: PlayerRole, patch: Partial<RoomSlot>): RoomState {
  if (role === 'host') return { ...state, host: { ...state.host, ...patch } }
  if (!state.guest) return state // guest hasn't joined — nothing to patch
  return { ...state, guest: { ...state.guest, ...patch } }
}

/** Set a player's imported army (or clear it with null). */
export function setPlayerArmy(state: RoomState, role: PlayerRole, army: Army | null): RoomState {
  return withSlot(state, role, { army })
}

/** Rename a player. Falls back to a non-empty default. */
export function setPlayerName(state: RoomState, role: PlayerRole, name: string): RoomState {
  const clean = name.trim() || (role === 'host' ? 'Host' : 'Guest')
  return withSlot(state, role, { name: clean })
}

/** Read a slot by role (guest may be absent). */
export function slotFor(state: RoomState, role: PlayerRole): RoomSlot | null {
  return role === 'host' ? state.host : state.guest
}

// ── Mission ──────────────────────────────────────────────────────────────────
// Setting or clearing the mission also drops any game in progress — a new/redrawn
// mission is a fresh game (Round 1, 0–0). The tracker's own Reset does the same.

export function setMission(state: RoomState, mission: MissionState): RoomState {
  return { ...state, mission, game: null }
}

export function clearMission(state: RoomState): RoomState {
  return { ...state, mission: null, game: null }
}

// ── Turn + VP tracker (Phase 4) ────────────────────────────────────────────────
// Thin wrappers over the pure playGame reducers. `game` is created lazily on the first
// tracker action so the mission can be viewed before the clock starts.

/** Ensure a game exists (idempotent), creating a fresh one at Round 1 if absent. */
export function ensureGame(state: RoomState, now: number): RoomState {
  return state.game ? state : { ...state, game: createGameState(now) }
}

export function advanceGamePhase(state: RoomState, now: number): RoomState {
  const s = ensureGame(state, now)
  return { ...s, game: advancePhase(s.game!, now) }
}

export function setGameRound(state: RoomState, round: number, now: number): RoomState {
  const s = ensureGame(state, now)
  return { ...s, game: setRound(s.game!, round, now) }
}

export function scoreVp(state: RoomState, player: PlayerRole, value: number, now: number): RoomState {
  const s = ensureGame(state, now)
  return { ...s, game: setVp(s.game!, player, value, now) }
}

/** Restart the tracker (clears the game; next action starts a fresh one). */
export function resetGame(state: RoomState): RoomState {
  return { ...state, game: null }
}

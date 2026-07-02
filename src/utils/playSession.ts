import type { Army, CompactArmy } from '../types/index.ts'
import { fromCompact, decodeArmy } from './army.ts'

// ── Play session model ───────────────────────────────────────────────────────
// The serializable state of a single game of Legion. Phase 1 is single-device:
// only `self` is filled; `opponent` is reserved so Phase 2 (multiplayer) can drop
// the opponent's imported army straight into the same shape over the socket.

export interface PlayPlayer {
  name: string
  army: Army | null
}

export interface PlaySession {
  id: string // durable session id (client-generated now; server-owned in Phase 2)
  createdAt: number // epoch ms
  self: PlayPlayer
  opponent: PlayPlayer
}

/** A v4-ish unique id. Prefers the platform `crypto.randomUUID`; falls back to a
 *  timestamp+counter token when it's unavailable (older browsers, some test envs). */
let idCounter = 0
export function newSessionId(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return `s${Date.now().toString(36)}${(idCounter++).toString(36)}`
}

/** Build a fresh, empty session. `id`/`createdAt` are injectable for deterministic tests. */
export function createSession(
  selfName = 'You',
  opponentName = 'Opponent',
  id: string = newSessionId(),
  createdAt: number = Date.now(),
): PlaySession {
  return {
    id,
    createdAt,
    self: { name: selfName, army: null },
    opponent: { name: opponentName, army: null },
  }
}

/** Load one of the user's saved (compact) armies into a full Army for play. */
export function importFromSaved(compact: CompactArmy): Army {
  return fromCompact(compact)
}

/**
 * Import an army from a pasted share value: either the raw base64url code or a full
 * Build share link (`…/build?a=<code>`). Returns null on anything undecodable.
 */
export function importFromCode(input: string): Army | null {
  const token = extractShareToken(input)
  if (!token) return null
  return decodeArmy(token)
}

/** Pull the `a=` share token out of a Build URL, or return the trimmed input as-is. */
export function extractShareToken(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ''
  const at = trimmed.indexOf('a=')
  if (at >= 0 && (trimmed.includes('?') || trimmed.includes('&'))) {
    return trimmed.slice(at + 2).split(/[&#\s]/)[0]
  }
  return trimmed
}

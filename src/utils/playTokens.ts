import type { TokenType, TurnClearedToken, PersistentToken } from '../types/index.ts'

// Status-token metadata for the Play board (Phase 5). Pure data + helpers shared by the
// reducers (utils/playGame.ts) and the roster UI. Two classes:
//  - **turn-cleared** — the green tokens aim/dodge/surge — removed when the round rolls over.
//  - **persistent** (standby, observation, suppression/immobilize/ion/poison/shield) — kept.
// Every token maps to a keyword/condition in the rulebook, so the roster can deep-link a
// tooltip later.

export type TokenClass = 'turn' | 'persistent'

export interface TokenMeta {
  type: TokenType
  label: string
  cls: TokenClass
  /** Short glyph shown on the token chip (no external icon dependency). */
  glyph: string
  /** Tailwind accent classes for the chip when the count is non-zero. */
  tone: string
}

// Ordered so the roster renders turn-cleared first (the ones you touch every round), then
// persistent. Order within a class follows the rulebook's action/condition listing.
export const TOKEN_META: TokenMeta[] = [
  { type: 'aim', label: 'Aim', cls: 'turn', glyph: '◎', tone: 'text-sky-300 border-sky-400/40 bg-sky-400/10' },
  { type: 'dodge', label: 'Dodge', cls: 'turn', glyph: '↯', tone: 'text-emerald-300 border-emerald-400/40 bg-emerald-400/10' },
  { type: 'surge', label: 'Surge', cls: 'turn', glyph: '✴', tone: 'text-green-300 border-green-400/40 bg-green-400/10' },
  { type: 'standby', label: 'Standby', cls: 'persistent', glyph: '⧗', tone: 'text-amber-300 border-amber-400/40 bg-amber-400/10' },
  { type: 'observation', label: 'Observation', cls: 'persistent', glyph: '⌖', tone: 'text-teal-300 border-teal-400/40 bg-teal-400/10' },
  { type: 'suppression', label: 'Suppression', cls: 'persistent', glyph: '☈', tone: 'text-orange-300 border-orange-400/40 bg-orange-400/10' },
  { type: 'immobilize', label: 'Immobilize', cls: 'persistent', glyph: '⛓', tone: 'text-slate-300 border-slate-400/40 bg-slate-400/10' },
  { type: 'ion', label: 'Ion', cls: 'persistent', glyph: '⚡', tone: 'text-cyan-300 border-cyan-400/40 bg-cyan-400/10' },
  { type: 'poison', label: 'Poison', cls: 'persistent', glyph: '☣', tone: 'text-lime-300 border-lime-400/40 bg-lime-400/10' },
  { type: 'shield', label: 'Shield', cls: 'persistent', glyph: '⛨', tone: 'text-indigo-300 border-indigo-400/40 bg-indigo-400/10' },
]

export const TOKEN_META_BY_TYPE: Record<TokenType, TokenMeta> = Object.fromEntries(
  TOKEN_META.map((m) => [m.type, m]),
) as Record<TokenType, TokenMeta>

export const TURN_CLEARED_TOKENS: TurnClearedToken[] = TOKEN_META.filter((m) => m.cls === 'turn').map(
  (m) => m.type as TurnClearedToken,
)
export const PERSISTENT_TOKENS: PersistentToken[] = TOKEN_META.filter((m) => m.cls === 'persistent').map(
  (m) => m.type as PersistentToken,
)

/** True for aim/dodge/standby — the tokens wiped when the round rolls over. */
export function isTurnCleared(token: TokenType): boolean {
  return TOKEN_META_BY_TYPE[token]?.cls === 'turn'
}

/**
 * A unit is **Panicked** once its suppression reaches twice its courage. Units with no
 * courage value (vehicles/droids — courage 0 or null) never panic. The roster shows this in
 * amber, distinct from a future defeated-in-red state.
 */
export function isPanicked(suppression: number, courage: number | null | undefined): boolean {
  return !!courage && courage > 0 && suppression >= courage * 2
}

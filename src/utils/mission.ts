import type { Army, BattleCard, MissionFormat, MissionState, PlayerRole } from '../types/index.ts'
import { formatForCap } from './factions.ts'

// Mission logic shared by the server (room draw) and the client (solo draw) so both
// produce identical results. Recon draws randomly (Blue player, shared Primary +
// Secondary, one Advantage each); Standard's veto-draft isn't implemented yet.

function isRecon(army: Army | null | undefined): boolean {
  return !!army && formatForCap(army.gameSize).id === 'recon'
}

/**
 * The game's mission format from the armies in play. Ignores absent (null) armies, so
 * it works for solo (one army) and room (two). Recon only when at least one army is
 * present and every present army is Recon-sized; anything else is Standard.
 */
export function missionFormat(...armies: (Army | null | undefined)[]): MissionFormat {
  const present = armies.filter((a): a is Army => !!a)
  return present.length > 0 && present.every(isRecon) ? 'recon' : 'standard'
}

// ── Recon draw ────────────────────────────────────────────────────────────────

export interface ReconPools {
  primary: string[]
  secondary: string[]
  advantage: string[]
}

/** Group a battle-card list into the fixed Recon decks (ids), for a client-side draw. */
export function reconPoolsFrom(cards: BattleCard[]): ReconPools {
  const pools: ReconPools = { primary: [], secondary: [], advantage: [] }
  for (const c of cards) {
    if (!c.isRecon) continue
    if (c.subtype === 'primary') pools.primary.push(c.id)
    else if (c.subtype === 'secondary') pools.secondary.push(c.id)
    else if (c.subtype === 'advantage') pools.advantage.push(c.id)
  }
  return pools
}

function pick(arr: string[], rng: () => number): string | null {
  return arr.length ? arr[Math.floor(rng() * arr.length)] : null
}

/** Draw two DISTINCT entries from a deck (each player draws their own Advantage). */
function drawTwoDistinct(deck: string[], rng: () => number): [string | null, string | null] {
  if (deck.length === 0) return [null, null]
  if (deck.length === 1) return [deck[0], null]
  const first = Math.floor(rng() * deck.length)
  let second = Math.floor(rng() * (deck.length - 1))
  if (second >= first) second += 1 // skip the already-drawn index
  return [deck[first], deck[second]]
}

/**
 * Recon mission draw (Recon Rulebook p.2): a roll-off sets Blue, Blue draws 1 Primary +
 * 1 Secondary (shared), then each player draws their own Advantage. `rng`/`now` injectable.
 * RNG order: Blue → primary → secondary → advantages.
 */
export function drawReconMission(pools: ReconPools, rng: () => number, now: number): MissionState {
  const bluePlayer: PlayerRole = rng() < 0.5 ? 'host' : 'guest'
  const primary = pick(pools.primary, rng)
  const secondary = pick(pools.secondary, rng)
  const [host, guest] = drawTwoDistinct(pools.advantage, rng)
  return { format: 'recon', bluePlayer, primary, secondary, advantage: { host, guest }, drawnAt: now }
}

/** Placeholder mission for Standard games until the veto-draft is implemented. */
export function pendingStandardMission(now: number): MissionState {
  return { format: 'standard', pending: true, bluePlayer: null, primary: null, secondary: null, advantage: { host: null, guest: null }, drawnAt: now }
}

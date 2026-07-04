import type {
  Army, BattleCard, BattleCardSubtype, DraftPile, MissionFormat, MissionModifyAction,
  MissionState, PlayerDraftDecks, PlayerRole, StandardDraft,
} from '../types/index.ts'
import { formatForCap } from './factions.ts'

// Mission logic shared by the server (room draw) and the client (solo draw) so both
// produce identical results. Recon draws randomly (Blue player, shared Primary +
// Secondary, one Advantage each); Standard runs the interactive "Building a Mission"
// draft (DOC56 p.19) — Blue roll-off, initial reveal, then Blue-first alternating
// modify (two modifications each) drawing from each player's own battle deck.

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

/**
 * Placeholder Standard mission — shown until every participating player has built a
 * battle deck (Standard needs each player's own Objective/Secondary/Advantage decks).
 */
export function pendingStandardMission(now: number): MissionState {
  return { format: 'standard', pending: true, bluePlayer: null, primary: null, secondary: null, advantage: { host: null, guest: null }, draft: null, drawnAt: now }
}

// ── Standard draft (DOC56 p.19 "Building a Mission") ────────────────────────────

const MODS_PER_PLAYER = 2 // each player modifies the mission exactly twice
const MISSION_TYPES = ['primary', 'secondary', 'advantage'] as const

function otherRole(role: PlayerRole): PlayerRole {
  return role === 'host' ? 'guest' : 'host'
}

/** Fisher–Yates shuffle into a NEW array (pure; `rng` injectable). */
function shuffle(ids: string[], rng: () => number): string[] {
  const out = ids.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Split a player's chosen battle-deck ids into three shuffled draw piles by subtype. */
export function standardDecksFrom(
  deckIds: string[],
  subtypeOf: (id: string) => BattleCardSubtype | null,
  rng: () => number,
): PlayerDraftDecks {
  const by: Record<BattleCardSubtype, string[]> = { primary: [], secondary: [], advantage: [] }
  for (const id of deckIds) {
    const st = subtypeOf(id)
    if (st) by[st].push(id)
  }
  return {
    primary: { remaining: shuffle(by.primary, rng), discard: [] },
    secondary: { remaining: shuffle(by.secondary, rng), discard: [] },
    advantage: { remaining: shuffle(by.advantage, rng), discard: [] },
  }
}

/** Whether the draft can start: each participating deck must hold ≥1 card of every type. */
export function standardDraftReady(
  hostDeckIds: string[],
  guestDeckIds: string[] | null,
  subtypeOf: (id: string) => BattleCardSubtype | null,
): boolean {
  const complete = (ids: string[]) => {
    const decks = standardDecksFrom(ids, subtypeOf, () => 0)
    return MISSION_TYPES.every((t) => decks[t].remaining.length > 0)
  }
  if (!complete(hostDeckIds)) return false
  return guestDeckIds === null || complete(guestDeckIds)
}

/** Draw the top card of a pile, reshuffling its discards back in if it has emptied
 *  (DOC56 "Empty Decks"). Returns the drawn id (or null if truly empty) + the new pile. */
function drawTop(pile: DraftPile, rng: () => number): { card: string | null; pile: DraftPile } {
  if (pile.remaining.length === 0) {
    if (pile.discard.length === 0) return { card: null, pile }
    const [card, ...rest] = shuffle(pile.discard, rng)
    return { card, pile: { remaining: rest, discard: [] } }
  }
  const [card, ...rest] = pile.remaining
  return { card, pile: { remaining: rest, discard: pile.discard.slice() } }
}

function cloneDecks(d: PlayerDraftDecks): PlayerDraftDecks {
  return {
    primary: { remaining: d.primary.remaining.slice(), discard: d.primary.discard.slice() },
    secondary: { remaining: d.secondary.remaining.slice(), discard: d.secondary.discard.slice() },
    advantage: { remaining: d.advantage.remaining.slice(), discard: d.advantage.discard.slice() },
  }
}

/**
 * Start the Standard mission draft: Blue roll-off, then open the `reveal` phase — the Blue
 * player will choose whether to reveal their Objective or Secondary first (via
 * `applyMissionModify` with a `reveal-*` action). Pass `guestDeckIds === null` for solo (a
 * single deck backs both sides). `rng`/`now` injectable. RNG order: shuffle host decks →
 * shuffle guest decks → Blue roll-off.
 */
export function startStandardDraft(
  hostDeckIds: string[],
  guestDeckIds: string[] | null,
  subtypeOf: (id: string) => BattleCardSubtype | null,
  rng: () => number,
  now: number,
): MissionState {
  const solo = guestDeckIds === null
  const decks: { host: PlayerDraftDecks; guest: PlayerDraftDecks | null } = {
    host: standardDecksFrom(hostDeckIds, subtypeOf, rng),
    guest: solo ? null : standardDecksFrom(guestDeckIds, subtypeOf, rng),
  }
  const bluePlayer: PlayerRole = rng() < 0.5 ? 'host' : 'guest'
  const draft: StandardDraft = {
    phase: 'reveal',
    turn: bluePlayer, // the Blue player makes the initial reveal choice
    modsUsed: { host: 0, guest: 0 },
    decks,
    primarySource: bluePlayer,
    secondarySource: otherRole(bluePlayer),
    solo,
  }
  return {
    format: 'standard',
    bluePlayer,
    primary: null,
    secondary: null,
    advantage: { host: null, guest: null },
    draft,
    drawnAt: now,
  }
}

/**
 * Resolve the initial reveal (DOC56 p.19): the Blue player reveals `choice` (Objective or
 * Secondary) from their deck; the opponent reveals the OTHER type from theirs; then each
 * player reveals their own Advantage. Opens the modify phase, Blue first.
 */
function applyInitialReveal(
  mission: MissionState,
  draft: StandardDraft,
  blue: PlayerRole,
  choice: 'primary' | 'secondary',
  rng: () => number,
  now: number,
): MissionState {
  const red = otherRole(blue)
  const otherType = choice === 'primary' ? 'secondary' : 'primary'
  const decks = { host: cloneDecks(draft.decks.host), guest: draft.decks.guest ? cloneDecks(draft.decks.guest) : null }
  const deckOf = (role: PlayerRole): PlayerDraftDecks => (draft.solo || role === 'host' ? decks.host : decks.guest!)

  const reveal = (role: PlayerRole, type: (typeof MISSION_TYPES)[number]): string | null => {
    const target = deckOf(role)
    const { card, pile } = drawTop(target[type], rng)
    target[type] = pile
    return card
  }

  const blueCard = reveal(blue, choice)
  const redCard = reveal(red, otherType)
  const primary = choice === 'primary' ? blueCard : redCard
  const secondary = choice === 'primary' ? redCard : blueCard
  const primarySource = choice === 'primary' ? blue : red
  const secondarySource = choice === 'primary' ? red : blue
  const advantageHost = reveal('host', 'advantage')
  const advantageGuest = reveal('guest', 'advantage')

  return {
    ...mission,
    primary,
    secondary,
    advantage: { host: advantageHost, guest: advantageGuest },
    draft: { ...draft, phase: 'modify', turn: blue, modsUsed: { host: 0, guest: 0 }, decks, primarySource, secondarySource },
    drawnAt: now,
  }
}

/**
 * Apply one draft action by `player` on their turn. In the `reveal` phase, only the Blue
 * player's `reveal-primary` / `reveal-secondary` resolve the initial reveal. In the `modify`
 * phase, the six modify options apply: a swap discards the currently-placed card (into its
 * owner's pile) and reveals a replacement from the acting deck; `steal-blue` moves the Blue
 * token; `pass` does nothing — each counts as one of the player's two modifications, and once
 * both have modified twice the draft is `built`. Returns the mission unchanged if it isn't
 * `player`'s turn, the action doesn't belong to the current phase, or the draft is over.
 */
export function applyMissionModify(
  mission: MissionState,
  player: PlayerRole,
  action: MissionModifyAction,
  rng: () => number,
  now: number,
): MissionState {
  const draft = mission.draft
  if (!draft || draft.turn !== player) return mission

  if (draft.phase === 'reveal') {
    if (action === 'reveal-primary') return applyInitialReveal(mission, draft, player, 'primary', rng, now)
    if (action === 'reveal-secondary') return applyInitialReveal(mission, draft, player, 'secondary', rng, now)
    return mission // modify actions aren't valid until the reveal is done
  }
  if (draft.phase !== 'modify' || action === 'reveal-primary' || action === 'reveal-secondary') return mission

  const decks = { host: cloneDecks(draft.decks.host), guest: draft.decks.guest ? cloneDecks(draft.decks.guest) : null }
  const deckOf = (role: PlayerRole): PlayerDraftDecks => (draft.solo || role === 'host' ? decks.host : decks.guest!)

  // Discard the placed card into its owner's pile, then reveal a replacement from the
  // acting player's pile of that type. Returns the newly-placed card id.
  const swap = (type: (typeof MISSION_TYPES)[number], owner: PlayerRole, current: string | null, actor: PlayerRole): string | null => {
    if (current != null) deckOf(owner)[type].discard.push(current)
    const target = deckOf(actor)[type]
    const { card, pile } = drawTop(target, rng)
    deckOf(actor)[type] = pile
    return card
  }

  let bluePlayer = mission.bluePlayer
  let primary = mission.primary
  let secondary = mission.secondary
  const advantage = { ...mission.advantage }
  let primarySource = draft.primarySource
  let secondarySource = draft.secondarySource

  switch (action) {
    case 'swap-primary':
      primary = swap('primary', primarySource, primary, player)
      primarySource = player
      break
    case 'swap-secondary':
      secondary = swap('secondary', secondarySource, secondary, player)
      secondarySource = player
      break
    case 'swap-advantage':
      advantage[player] = swap('advantage', player, advantage[player], player)
      break
    case 'swap-opponent-advantage': {
      const opp = otherRole(player)
      advantage[opp] = swap('advantage', opp, advantage[opp], opp)
      break
    }
    case 'steal-blue':
      bluePlayer = player
      break
    case 'pass':
      break
  }

  const modsUsed = { ...draft.modsUsed, [player]: draft.modsUsed[player] + 1 }
  const done = modsUsed.host >= MODS_PER_PLAYER && modsUsed.guest >= MODS_PER_PLAYER

  return {
    ...mission,
    bluePlayer,
    primary,
    secondary,
    advantage,
    draft: {
      ...draft,
      phase: done ? 'built' : 'modify',
      turn: done ? draft.turn : otherRole(player),
      modsUsed,
      decks,
      primarySource,
      secondarySource,
    },
    drawnAt: now,
  }
}

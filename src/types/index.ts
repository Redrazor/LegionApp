// ── Core game data (produced by the scraper, served by the API) ──────────────

export type Faction = 'rebels' | 'empire' | 'republic' | 'separatists' | 'mercenary' | 'mandalorians'
export type Rank = 'commander' | 'operative' | 'corps' | 'special' | 'support' | 'heavy'

export interface HistoryEntry {
  date: string
  description: string
}

export interface Weapon {
  name: string
  range: number[] // [0] melee; [min,max] ranged
  dice: { red: number; black: number; white: number }
  keywords: string[]
}

/**
 * Upgrade equip-eligibility (authored in the legionhq2 source). A requirements
 * value is a group: criterion objects and/or nested sub-groups, optionally led by
 * an `AND` / `OR` / `NOT` token (default `AND`). A criterion matches a unit when
 * every field it sets matches. Empty/absent = no requirement. See
 * `unitMeetsRequirements` in `utils/army.ts`.
 */
export interface UpgradeRequirementCriterion {
  cardName?: string
  cardSubtype?: string // unit type, e.g. "clone trooper"
  rank?: string
  faction?: string
  title?: string
  affiliation?: string
  keywords?: string[]
  upgradeBar?: string[]
  forceAffinity?: string // 'light side' | 'dark side'
}
// A requirements group is an array of nodes. Defined as an interface (not a type
// alias) so the self-recursion resolves lazily — a recursive `… | T[]` alias
// trips TS2589 ("excessively deep") when inferred through Map/computed.
export type UpgradeRequirement = string | UpgradeRequirementCriterion | UpgradeRequirementList
export interface UpgradeRequirementList extends Array<UpgradeRequirement> {}

export interface Unit {
  id: string
  slug: string
  name: string
  title: string
  faction: Faction
  rank: Rank
  unitType: string
  affiliation: string | null // allegiance, e.g. "Clan Wren", "rogue" (for upgrade requirements)
  affiliations: Faction[] // factions a mercenary unit may ally into (empty = none)
  cost: number | null
  defense: 'red' | 'white' | null
  surgeAttack: 'crit' | 'hit' | null
  surgeDefense: boolean
  speed: number | null
  wounds: number | null
  courage: number | null
  miniCount: number | null // number of miniatures in the unit
  isUnique: boolean
  keywords: string[]
  upgradeBar: string[]
  weapons: Weapon[]
  cardImage: string | null
  portraitImage: string | null
  hasFullData: boolean
  history: HistoryEntry[]
  specialIssue?: string // battle force this unit may ONLY be fielded in (e.g. "Blizzard Force")
  unreleased?: string // set from public/data/unreleased.json: this card's image is a pre-release
  // preview / low-res placeholder pending an official card. The string is the shown note.
  counterpart?: Counterpart | null // owner-maintained (public/data/counterparts.json), overlaid at
  // load: a second miniature that carries its own card (Counterpart keyword, e.g. Iden's ID10 Seeker
  // Droid). Shown in the profile drawer only — it deploys with its parent, so no points/build impact.
  flip?: CardFlipSide | null // owner-maintained (public/data/card-flips.json), overlaid at load: the
  // card's OTHER printed side — units flip stats↔art. Display-only (Feature 15). Null when single-sided.
}

/** A card's alternate printed side, overlaid onto a Unit/Upgrade from public/data/card-flips.json.
 *  Units flip stats↔art (label "Artwork"); Reconfigure upgrades flip between two configs, each with
 *  its own label and keywords. Purely a display toggle — no points/validation impact (Feature 15). */
export interface CardFlipSide {
  image: string // the alternate side's card scan (e.g. /images/units/<slug>-front.webp)
  label: string // short caption for the Flip button / shown side (e.g. "Artwork", "Grenade Launcher")
  keywords?: string[] // keywords printed on the flip side (Reconfigure upgrades); resolve via keywords.json
}

/** A unit's Counterpart mini and its own card scans (owner-maintained overlay). */
export interface Counterpart {
  name: string
  cardImage: string // the play/stats side (what the gallery / lightbox shows)
  frontImage?: string // the art side, for the future Flip feature (Feature 15)
  portraitImage?: string // round bust cropped from the card (scripts/crop-counterpart-portraits.ts),
  // shown as the counterpart's badge in the army list — same treatment as a unit's portraitImage
  keywords?: string[] // printed keywords transcribed off the card, shown as glossary pills so its
  // rules are verifiable without opening the full card scan. Resolve via keywords.json.
  factions?: Faction[] // army factions this counterpart may be fielded in (owner-maintained). Some
  // counterparts are restricted even when their parent is a multi-affiliation mercenary — e.g. Grogu
  // deploys with Din Djarin ONLY in a Rebel army, never Imperial. Absent → allowed in any army the
  // parent can join (ID10 Seeker Droid, C-3PO). Gate: counterpartAllowed() in utils/army.ts.
}

export interface Upgrade {
  id: string
  slug: string
  name: string
  slot: string
  cost: number | null
  isUnique: boolean
  limit?: number // per-army copy cap (e.g. HQ Uplink ×2); omitted when unlimited
  requirements?: UpgradeRequirementList // equip-eligibility; omitted when unconditional
  faction: Faction | null
  keywords: string[]
  grantedSlots: string[] // slot types this upgrade adds to its unit's bar when equipped
  cardImage: string | null
  weapons: Weapon[] // weapon profile(s) the upgrade grants, from owner-maintained upgrade-weapons.json ([] if none)
  removed?: boolean // errata-removed from play: still shown in Browse/Reference, never selectable in Build
  unreleased?: string // pre-release preview / low-res placeholder image (see Unit.unreleased)
  flip?: CardFlipSide | null // owner-maintained (public/data/card-flips.json), overlaid at load: the
  // other config of a Reconfigure upgrade (E-11D Focused Fire↔Grenade Launcher). Display-only (Feature 15).
}

export interface CommandCard {
  id: string
  slug: string
  name: string
  pips: number
  commander: string | null
  faction: Faction | null
  cardImage: string | null
  unreleased?: string // pre-release preview / low-res placeholder image (see Unit.unreleased)
}

// ── Battle forces ────────────────────────────────────────────────────────────

/** A rank's per-format [min, max] count. */
export type RankBracket = [number, number]

/**
 * A battle force's rank table for one game mode. Each rank maps to a [min, max]
 * count; `commOp` (when set) is a combined commander+operative cap that overrides
 * the individual maxima.
 */
export interface BattleForceRankTable {
  commander: RankBracket
  operative: RankBracket
  corps: RankBracket
  special: RankBracket
  support: RankBracket
  heavy: RankBracket
  commOp: number | null
}

/**
 * A single "Choose N of the following" doctrine option for a battle force. Each
 * option carries verbatim rules `text` (owner-maintained, off the card) and an
 * `id` stored on `Army.doctrines`. `effect` (optional) keys the computable Phase-2
 * effects in `utils/army.ts`; pure in-game-only options omit it (shown as text).
 */
export interface BattleForceDoctrineOption {
  id: string // stable id, e.g. 'veterans' (stored on Army.doctrines)
  name: string
  text: string // verbatim rules text
  effect?: string // optional key for a computable engine effect
}

/**
 * A battle force's "Choose N of the following" army-build doctrines. Owner-maintained
 * (transcribed from the battle-force card), overlaid onto the `battleForces` store at
 * load from `public/data/battle-force-doctrines.json` so a re-scrape can't wipe it.
 */
export interface BattleForceDoctrines {
  pick: number // exactly this many options must be chosen
  options: BattleForceDoctrineOption[]
}

/**
 * An alternative army-building ruleset (replaces the standard rank table). A unit
 * is legal in a battle force iff its id appears in one of the six `rankUnits`
 * lists — which also sets the rank it fills. `rules` is a passthrough of the
 * source's special-rule flags (resolved/applied in Stage 2). Data-only here.
 */
export interface BattleForce {
  linkId: string // short id, e.g. "2t" (212th), "mc" (Mandalorian Clans)
  name: string
  faction: Faction
  forceAffinity: string | null // 'dark side' | 'light side' | null
  rankUnits: Record<Rank, string[]> // eligible unit ids per rank
  allowedUpgrades: string[] // upgrade ids permitted on top of unit upgrade bars
  disallowedUpgrades: string[] // upgrade ids forbidden in this battle force
  rules: Record<string, unknown> // source special-rule flags (passthrough)
  rulesText: string[] // human-readable rule text (from the source)
  modes: {
    standard: BattleForceRankTable // 1000-point / standard mode
    '500': BattleForceRankTable // 500-point mode
  }
  doctrines?: BattleForceDoctrines // optional "Choose N of the following"; overlaid at load
  /**
   * Transient (NOT in source data): upgrade slugs an active doctrine makes equippable by
   * any Mandalorian Trooper unit, ignoring their printed restrictions. Set by
   * `applyDoctrineEffects` on a per-army copy of the force; never persisted.
   */
  doctrineUnrestrictedUpgradeSlugs?: string[]
}

// ── Battle deck ──────────────────────────────────────────────────────────────

export type BattleCardSubtype = 'primary' | 'secondary' | 'advantage'

/**
 * A battle-deck card. The 2024 v2 battle deck (AMG 2.6) is built from three types —
 * Primary Objective / Secondary Objective / Advantage — 3 of each; Recon uses its own
 * pool, flagged by `isRecon`. (The pre-2.6 Deployment/"map" cards were folded into
 * Primary Objective cards, so there is no separate map-card type.)
 */
export interface BattleCard {
  id: string
  slug: string
  name: string
  subtype: BattleCardSubtype
  keywords: string[]
  faction: Faction | null // a few cards are faction-restricted; null = any
  isRecon: boolean // belongs to the Recon-format pool
  cardImage: string | null
}

// ── Card sourcing / provenance (Feature 18) ──────────────────────────────────

export type CardCategory = 'units' | 'upgrades' | 'commands' | 'battle'
/** `valid` = sourced from an official AMG document; `unknown` = legacy scan / image pending. */
export type SourceValidity = 'valid' | 'unknown'

/** One row of the Card Sources reference: where a card was sourced from, and when.
 *  Generated into `public/data/card-sources.json` by `npm run card-sources`. */
export interface CardSource {
  category: CardCategory
  slug: string
  name: string
  title?: string
  source: string // human-readable AMG document label, or the legacy/pending note
  date: string | null // month/year the source is dated, `YYYY-MM`, or null
  validity: SourceValidity
}

export type ProductType = 'expansion' | 'army-box' | 'starter' | 'specialists'

export interface Product {
  code: string
  name: string
  faction: Faction
  type: ProductType
  unitSlugs: string[]
  ean: string | null // AMG / Asmodee barcode (real boxes only)
  storeUrl: string | null // Philibert product page (real boxes only)
  image: string | null // box art, or the unit card scan for synthetic fallbacks
}

// ── Army builder ─────────────────────────────────────────────────────────────

export interface ArmyUpgrade {
  slot: string // slot type the upgrade fills (matches the unit's upgradeBar entry)
  upgradeId: string
}

export interface ArmyUnit {
  uid: string // unique instance id within the army
  unitId: string
  upgrades: ArmyUpgrade[]
}

export interface Army {
  name: string
  faction: Faction | null
  battleForce: string | null // optional battle-force linkId (e.g. 'mc'); null = standard
  gameSize: number // points cap; resolves to a format via rankLimits() — 600 Recon, 800 legacy, 1000 Standard, 1600 Grand Army
  units: ArmyUnit[]
  commandHand: string[] // chosen command-card ids (the 6 picks; Standing Orders is auto)
  battleDeck: string[] // chosen battle-card ids (3 primary + 3 secondary + 3 advantage; Standard only)
  doctrines: string[] // chosen doctrine option ids (only when the battle force has doctrines)
}

/** Compact, ID-only serialised army for save/share. */
export interface CompactArmy {
  v?: number // schema version (3 = + doctrines; 2 = battle force/command hand/battle deck era; absent = legacy v1)
  n: string // name
  f: Faction | null // faction
  b?: string | null // battle-force linkId (optional; absent/null = standard)
  g: number // game size
  u: [string, [string, string][]][] // [unitId, [[slot, upgradeId], ...]]
  c?: string[] // command-hand card ids (optional; absent = none)
  d?: string[] // battle-deck card ids (optional; absent = none)
  o?: string[] // chosen doctrine option ids (optional; absent = none)
}

// ── Play (multiplayer) ───────────────────────────────────────────────────────
// The canonical shared game state lives on the server (persisted to SQLite) and is
// broadcast to both players. `RoomState` is that authoritative blob — later Play
// phases (mission, VP, tokens, log…) extend it. Presence is transient (socket-driven),
// tracked at runtime and NOT persisted.

export type PlayerRole = 'host' | 'guest'

/** One player's persisted contribution to a room. */
export interface RoomSlot {
  name: string
  army: Army | null
}

export type MissionFormat = 'recon' | 'standard'

/**
 * The picked mission for the game (shared, persisted). Recon draws it randomly
 * (Blue player, shared Primary + Secondary, one Advantage each). Standard runs the
 * interactive "Building a Mission" draft (DOC56 p.19) held in `draft`; `pending: true`
 * marks a Standard game whose players haven't both built a battle deck yet.
 */
export interface MissionState {
  format: MissionFormat
  pending?: boolean // standard-format placeholder: a required battle deck isn't built yet
  bluePlayer: PlayerRole | null
  primary: string | null // battle-card id (shared) — the placed Objective
  secondary: string | null // battle-card id (shared) — the placed Secondary Objective
  advantage: { host: string | null; guest: string | null } // each player's own Advantage
  draft?: StandardDraft | null // interactive Standard draft state; absent for Recon / pending
  drawnAt: number
}

/**
 * A draft action a player takes on their turn (DOC56 p.19). The two `reveal-*` actions
 * belong to the initial `reveal` phase (Blue picks which objective type to reveal first);
 * the other six are the modify-phase options.
 */
export type MissionModifyAction =
  | 'reveal-primary' // (reveal phase, Blue) reveal your Objective first; opponent then reveals their Secondary
  | 'reveal-secondary' // (reveal phase, Blue) reveal your Secondary first; opponent then reveals their Objective
  | 'swap-primary' // reveal top of your Objective deck, replace the placed Objective
  | 'swap-secondary' // reveal top of your Secondary deck, replace the placed Secondary
  | 'swap-advantage' // reveal top of your Advantage deck, replace your Advantage
  | 'swap-opponent-advantage' // opponent reveals top of their Advantage deck, replaces theirs
  | 'steal-blue' // move the Blue-player token to you
  | 'pass' // no effect

/** One deck-type's draw pile for a player: `remaining[0]` is the top; discards are
 *  reshuffled back in (including the just-discarded card) when the pile empties (p.19). */
export interface DraftPile {
  remaining: string[]
  discard: string[]
}

/** A player's three Battle-Deck piles (from `Army.battleDeck`), split by subtype. */
export interface PlayerDraftDecks {
  primary: DraftPile
  secondary: DraftPile
  advantage: DraftPile
}

/**
 * Interactive Standard mission draft (DOC56 p.19 "Building a Mission"). Phases:
 *  - `reveal` — the Blue player chooses to reveal their Objective or Secondary; the
 *    opponent then reveals the OTHER type from their deck, and each reveals an Advantage.
 *  - `modify` — players alternate modifying the mission Blue-first; once each has modified
 *    twice (`modsUsed` both 2) it flips to…
 *  - `built` — the placed cards on `MissionState` are final.
 * In solo mode a single deck backs both sides (`decks.guest` is null and every reveal
 * draws from `decks.host`).
 */
export interface StandardDraft {
  phase: 'reveal' | 'modify' | 'built'
  turn: PlayerRole // whose action it is (the Blue player during `reveal`)
  modsUsed: { host: number; guest: number } // each caps at 2
  decks: { host: PlayerDraftDecks; guest: PlayerDraftDecks | null } // guest null in solo
  primarySource: PlayerRole // whose deck the placed Objective came from (for its next swap's discard)
  secondarySource: PlayerRole // whose deck the placed Secondary came from
  solo: boolean
}

// ── Turn + VP tracker + change-log (Phase 4) ─────────────────────────────────
// The playable game state once a mission is set: the round/phase clock, per-player
// victory points, and the append-only event log every later phase writes into.

/** The three phases of a Legion round, in order (Command → Activation → End). */
export type GamePhase = 'command' | 'activation' | 'end'

/**
 * One entry in the change log. `seq` is a monotonic per-game id (deterministic, so the
 * pure reducers stay testable); `at` is a wall-clock stamp for display only, injected at
 * the edge. `actor` is the player a VP change belongs to (null for system/phase events)
 * — the UI renders it as that player's mark and prepends it to `text`.
 */
export interface LogEntry {
  seq: number
  round: number
  phase: GamePhase
  kind: 'system' | 'phase' | 'round' | 'vp'
  actor: PlayerRole | null
  text: string
  at: number
}

/**
 * The turn/VP tracker's state (shared, persisted on `RoomState.game`; held locally in the
 * session store for solo). Round is 1..MAX_ROUNDS; VP is clamped 0..VP_CAP per player.
 * `over` latches true after the final End Phase. The pure reducers live in
 * `utils/playGame.ts` so client (solo) and server (room) produce identical state + log.
 */
export interface GameState {
  round: number
  phase: GamePhase
  vp: { host: number; guest: number }
  log: LogEntry[]
  seq: number // next log sequence number
  over: boolean
  startedAt: number
}

/** Authoritative shared room state (persisted). `guest` is null until someone joins. */
export interface RoomState {
  host: RoomSlot
  guest: RoomSlot | null
  mission?: MissionState | null
  game?: GameState | null
}

/** Which slots currently have a live socket connected. */
export interface RoomPresence {
  host: boolean
  guest: boolean
}

/** Full room snapshot pushed to clients on any change. */
export interface RoomSnapshot {
  id: string
  code: string
  state: RoomState
  presence: RoomPresence
}

// ── Display metadata ─────────────────────────────────────────────────────────

export interface FactionMeta {
  id: Faction
  name: string
  color: string
}

export interface RankMeta {
  id: Rank
  name: string
  min: number
  max: number
}

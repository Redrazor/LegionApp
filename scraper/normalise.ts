// Pure, testable transforms for the LegionApp data pipeline.
//
// Single source of truth: Legion HQ 2 (legionhq2.com) — the current-edition
// (2024 "v2" refresh) army builder. Each card is keyed by a unique id and
// carries its own stats, weapons, keywords and image, so there is no merging or
// name-based reconciliation: one card in → one record out.

/**
 * Upgrade equip-eligibility, as authored in the legionhq2 source. A requirements
 * value is a group: an array of criterion objects and/or nested sub-groups,
 * optionally led by an `AND` / `OR` / `NOT` token (default `AND`). A criterion
 * matches a unit when every field it sets matches. Empty array = no requirement.
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
// Interface (not a recursive type alias) so the self-recursion resolves lazily.
export type UpgradeRequirement = string | UpgradeRequirementCriterion | UpgradeRequirementList
export interface UpgradeRequirementList extends Array<UpgradeRequirement> {}

export interface Lhq2Card {
  id: string
  cardName: string
  title?: string
  cardType: string // 'unit' | 'upgrade' | 'command' | 'battle' | 'counterpart'
  cardSubtype?: string // unit type, upgrade slot, or command pip count
  rank?: string
  affiliation?: string // unit allegiance, e.g. "Clan Wren", "rogue", "Mandalore"
  affiliations?: string[] // factions a mercenary unit may be hired into, e.g. ["empire"]
  faction?: string
  cost?: number | null
  isUnique?: boolean
  uniqueCount?: number // per-army copy cap for non-unique "limited" cards (e.g. HQ Uplink ×2)
  imageName?: string
  commander?: string | string[]
  keywords?: (string | { name: string; value?: number })[]
  upgradeBar?: string[]
  additionalUpgradeSlots?: string[] // slot types an equipped upgrade grants the unit (e.g. ["comms"])
  requirements?: UpgradeRequirementList
  stats?: {
    minicount?: number
    hp?: number
    defense?: string // 'r' | 'w'
    courage?: number
    speed?: number
    hitsurge?: string // 'c' | 'h' | ''
    defsurge?: string // 'b' | ''
  }
  weapons?: {
    name: string
    range?: number[]
    dice?: { r?: number; b?: number; w?: number }
    keywords?: (string | { name: string; value?: number })[]
  }[]
  history?: { date: string; description: string }[]
  specialIssue?: string // battle force this unit may ONLY be fielded in
}

/** Raw battle-force object as authored in the legionhq2 SPA chunk bundle. */
export interface Lhq2BattleForce {
  name: string
  faction: string
  linkId: string
  forceAffinity?: string
  commander?: string[]
  operative?: string[]
  corps?: string[]
  special?: string[]
  support?: string[]
  heavy?: string[]
  allowedUpgrades?: string[]
  disallowedUpgrades?: string[]
  plainTextRules?: string[]
  rules?: Record<string, unknown>
  'standard mode'?: Lhq2RankTable
  '500-point mode'?: Lhq2RankTable
}

interface Lhq2RankTable {
  commander?: [number, number]
  operative?: [number, number]
  corps?: [number, number]
  special?: [number, number]
  support?: [number, number]
  heavy?: [number, number]
  commOp?: number
}

export interface Weapon {
  name: string
  range: number[]
  dice: { red: number; black: number; white: number }
  keywords: string[]
}

export interface Unit {
  id: string
  slug: string
  name: string
  title: string
  faction: string
  rank: string
  unitType: string
  affiliation: string | null
  affiliations: string[] // factions a mercenary unit may ally into (empty = none)
  cost: number | null
  defense: string | null
  surgeAttack: string | null
  surgeDefense: boolean
  speed: number | null
  wounds: number | null
  courage: number | null
  miniCount: number | null // number of miniatures in the unit (LHQ2 stats.minicount)
  isUnique: boolean
  keywords: string[]
  upgradeBar: string[]
  weapons: Weapon[]
  cardImage: string | null
  portraitImage: string | null
  hasFullData: boolean
  history: { date: string; description: string }[]
  specialIssue?: string // battle force this unit may ONLY be fielded in
}

export type RankBracket = [number, number]

export interface BattleForceRankTable {
  commander: RankBracket
  operative: RankBracket
  corps: RankBracket
  special: RankBracket
  support: RankBracket
  heavy: RankBracket
  commOp: number | null
}

export interface BattleForce {
  linkId: string
  name: string
  faction: string
  forceAffinity: string | null
  rankUnits: Record<string, string[]>
  allowedUpgrades: string[]
  disallowedUpgrades: string[]
  rules: Record<string, unknown>
  rulesText: string[]
  modes: { standard: BattleForceRankTable; '500': BattleForceRankTable }
}

export interface Upgrade {
  id: string
  slug: string
  name: string
  slot: string
  cost: number | null
  isUnique: boolean
  limit?: number // per-army copy cap (`uniqueCount`); omitted when unlimited
  requirements?: UpgradeRequirementList // equip-eligibility; omitted when unconditional
  faction: string | null
  keywords: string[]
  grantedSlots: string[] // upgrade slot types this upgrade adds to its unit when equipped (LHQ2 additionalUpgradeSlots)
  cardImage: string | null
}

export interface CommandCard {
  id: string
  slug: string
  name: string
  pips: number
  commander: string | null
  faction: string | null
  cardImage: string | null
}

export type BattleCardSubtype = 'primary' | 'secondary' | 'advantage'

export interface BattleCard {
  id: string
  slug: string
  name: string
  subtype: BattleCardSubtype
  keywords: string[]
  faction: string | null
  isRecon: boolean
  cardImage: string | null
}

export type ProductType = 'expansion' | 'army-box' | 'starter' | 'specialists'

export interface Product {
  code: string // EAN for real boxes, `exp-<slug>` for synthetic fallback
  name: string
  faction: string
  type: ProductType
  unitSlugs: string[]
  ean: string | null // AMG / Asmodee barcode (real boxes only)
  storeUrl: string | null // Philibert product page (real boxes only)
  image: string | null // /images/products/<ean>.jpg or /images/units/<slug>.webp
}

const RANK_ORDER = ['commander', 'operative', 'corps', 'special', 'support', 'heavy']
export const FACTIONS = ['rebels', 'empire', 'republic', 'separatists', 'mercenary', 'mandalorians']

export function rankIndex(rank: string): number {
  const i = RANK_ORDER.indexOf(rank)
  return i === -1 ? 99 : i
}

export function slugify(name: string, title?: string | null): string {
  const base = title ? `${name} ${title}` : name
  return base
    .toLowerCase()
    .replace(/[''".,()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Mandalorians are their own faction (Battle Force); unknown keys fall back to mercenary. */
export function mapFaction(f: string | undefined): string {
  return f && FACTIONS.includes(f) ? f : 'mercenary'
}

/** A keyword is either a plain string or { name, value }; render "Name N". */
export function normalizeKeyword(k: string | { name: string; value?: number }): string {
  if (typeof k === 'string') return k
  return k.value != null ? `${k.name} ${k.value}` : k.name
}

function normalizeKeywords(arr?: (string | { name: string; value?: number })[]): string[] {
  return (arr ?? []).map(normalizeKeyword)
}

function num(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : parseInt(String(v), 10)
  return Number.isFinite(n) ? n : null
}

function mapWeapon(w: NonNullable<Lhq2Card['weapons']>[number]): Weapon {
  // A few cards (e.g. General Grievous "Sinister Cyborg"'s second melee) carry a
  // placeholder weapon name that is only quote characters ("") — blank it so the UI
  // doesn't render a literal `""`. Names with internal/legit quotes are left intact.
  const rawName = w.name ?? ''
  return {
    name: /^"*$/.test(rawName.trim()) ? '' : rawName,
    range: w.range ?? [],
    dice: { red: w.dice?.r ?? 0, black: w.dice?.b ?? 0, white: w.dice?.w ?? 0 },
    // Some entries pack two keywords into one string ("Fixed Front, Blast");
    // split them so each renders (and resolves a glossary definition) on its own.
    keywords: normalizeKeywords(w.keywords).flatMap((k) => k.split(', ')).map((k) => k.trim()).filter(Boolean),
  }
}

function uniqueSlug(base: string, seen: Set<string>): string {
  let slug = base
  let n = 2
  while (seen.has(slug)) slug = `${base}-${n++}`
  seen.add(slug)
  return slug
}

/**
 * Corrections for units whose LHQ2 `stats.minicount` disagrees with the card's printed
 * miniature count — found by a full card-by-card audit of all 180 units (every value
 * here read off the card's top-right count badge, with the controls double-checked).
 * Keyed by the generated slug; re-verify after a re-scrape if LHQ2 fixes these upstream.
 *
 * Failure modes: a variant/detachment inheriting a sibling's count (Scout Troopers Strike
 * Team, Stormtroopers HRU), a value that's just wrong (MagnaGuard prototype, Clan Wren
 * Veterans), and "counterpart" units whose badge reads 0 because the models come from
 * member cards — The Bad Batch fields its clone members (republic 5; mercenary 4, no
 * Crosshair), so we use the fielded count rather than the literal 0.
 */
export const MINICOUNT_OVERRIDES: Record<string, number> = {
  'scout-troopers-strike-team': 1, // card 1; LHQ2 had the parent squad's 4
  'stormtroopers-heavy-response-unit': 3, // card 3; LHQ2 had 4
  'ig-100-magnaguard-prototype-assassin-droids': 4, // card 4; LHQ2 had 3
  'clan-wren-veterans': 4, // card 4; LHQ2 had 3
  'the-bad-batch-clone-force-99': 5, // republic — 5 members (badge shows 0)
  'the-bad-batch-clone-force-99-2': 4, // mercenary — 4 members, no Crosshair (badge shows 0)
}

/**
 * Defense-die colour corrections where LHQ2's source stat is wrong. Keyed by slug.
 */
export const DEFENSE_OVERRIDES: Record<string, 'red' | 'white'> = {
  'poggle-the-lesser-public-leader-of-the-geonosians': 'red', // card is red; LHQ2 had white
}

export function buildUnits(cards: Lhq2Card[]): Unit[] {
  const seen = new Set<string>()
  const units = cards
    .filter((c) => c.cardType === 'unit')
    .map((c) => {
      const s = c.stats ?? {}
      const slug = uniqueSlug(slugify(c.cardName, c.title), seen)
      return {
        id: c.id,
        slug,
        name: c.cardName.trim(),
        title: (c.title ?? '').trim(),
        faction: mapFaction(c.faction),
        rank: c.rank ?? 'corps',
        unitType: c.cardSubtype ?? 'trooper',
        affiliation: c.affiliation ?? null,
        affiliations: (c.affiliations ?? []).filter((f) => FACTIONS.includes(f)),
        cost: num(c.cost),
        defense: DEFENSE_OVERRIDES[slug] ?? (s.defense === 'r' ? 'red' : s.defense === 'w' ? 'white' : null),
        surgeAttack: s.hitsurge === 'c' ? 'crit' : s.hitsurge === 'h' ? 'hit' : null,
        surgeDefense: s.defsurge === 'b',
        speed: num(s.speed),
        wounds: num(s.hp),
        courage: num(s.courage),
        miniCount: MINICOUNT_OVERRIDES[slug] ?? num(s.minicount),
        isUnique: !!c.isUnique,
        keywords: normalizeKeywords(c.keywords),
        upgradeBar: c.upgradeBar ?? [],
        weapons: (c.weapons ?? []).map(mapWeapon),
        cardImage: c.imageName ? `/images/units/${slug}.webp` : null,
        portraitImage: null,
        hasFullData: true,
        history: c.history ?? [],
        ...(c.specialIssue ? { specialIssue: c.specialIssue } : {}),
      }
    })

  units.sort((a, b) =>
    a.faction === b.faction
      ? rankIndex(a.rank) - rankIndex(b.rank) || a.name.localeCompare(b.name)
      : a.faction.localeCompare(b.faction),
  )
  return units
}

export function buildUpgrades(cards: Lhq2Card[]): Upgrade[] {
  const seen = new Set<string>()
  return cards
    .filter((c) => c.cardType === 'upgrade')
    .map((c) => {
      const slug = uniqueSlug(slugify(c.cardName), seen)
      return {
        id: c.id,
        slug,
        name: c.cardName.trim(),
        slot: c.cardSubtype ?? 'gear',
        cost: num(c.cost),
        isUnique: !!c.isUnique,
        ...(c.uniqueCount ? { limit: c.uniqueCount } : {}),
        ...(c.requirements?.length ? { requirements: c.requirements } : {}),
        faction: c.faction ? mapFaction(c.faction) : null,
        keywords: normalizeKeywords(c.keywords),
        grantedSlots: c.additionalUpgradeSlots ?? [],
        cardImage: c.imageName ? `/images/upgrades/${slug}.webp` : null,
      }
    })
}

const BF_RANKS = ['commander', 'operative', 'corps', 'special', 'support', 'heavy'] as const

/** A [min, max] pair, defaulting to [0, 0] for an absent/malformed entry. */
function bracket(t: Lhq2RankTable | undefined, rank: string): RankBracket {
  const v = t?.[rank as keyof Lhq2RankTable]
  return Array.isArray(v) && v.length === 2 ? [Number(v[0]), Number(v[1])] : [0, 0]
}

function rankTable(raw: Lhq2RankTable | undefined): BattleForceRankTable {
  return {
    commander: bracket(raw, 'commander'),
    operative: bracket(raw, 'operative'),
    corps: bracket(raw, 'corps'),
    special: bracket(raw, 'special'),
    support: bracket(raw, 'support'),
    heavy: bracket(raw, 'heavy'),
    commOp: typeof raw?.commOp === 'number' ? raw.commOp : null,
  }
}

/**
 * Normalize raw legionhq2 battle-force objects into BattleForce records. Renames
 * the source's `"standard mode"` / `"500-point mode"` keys to `standard` / `500`,
 * coerces each rank to a [min, max] bracket, and passes `rules` through verbatim
 * (its flags are resolved when battle forces drive validation, in a later stage).
 */
export function buildBattleForces(raw: Lhq2BattleForce[]): BattleForce[] {
  return raw
    .map((b) => ({
      linkId: b.linkId,
      name: b.name.trim(),
      faction: mapFaction(b.faction),
      forceAffinity: b.forceAffinity ? b.forceAffinity : null,
      rankUnits: Object.fromEntries(BF_RANKS.map((r) => [r, b[r] ?? []])) as Record<string, string[]>,
      allowedUpgrades: b.allowedUpgrades ?? [],
      disallowedUpgrades: b.disallowedUpgrades ?? [],
      rules: b.rules ?? {},
      rulesText: b.plainTextRules ?? [],
      modes: {
        standard: rankTable(b['standard mode']),
        '500': rankTable(b['500-point mode']),
      },
    }))
    .sort((a, b) => a.faction.localeCompare(b.faction) || a.name.localeCompare(b.name))
}

/** Map the LHQ2 battle subtype to the v2 deck type (it already uses the v2 names). */
function battleCardSubtype(sub: string | undefined): BattleCardSubtype {
  return sub === 'primary' ? 'primary' : sub === 'advantage' ? 'advantage' : 'secondary'
}

export function buildBattleCards(cards: Lhq2Card[]): BattleCard[] {
  const seen = new Set<string>()
  return cards
    .filter((c) => c.cardType === 'battle')
    .map((c) => {
      const slug = uniqueSlug(slugify(c.cardName), seen)
      const keywords = normalizeKeywords(c.keywords)
      return {
        id: c.id,
        slug,
        name: c.cardName.trim(),
        subtype: battleCardSubtype(c.cardSubtype),
        keywords,
        faction: c.faction ? mapFaction(c.faction) : null,
        // The Recon-format pool is flagged by a "Recon" keyword in the source.
        isRecon: keywords.some((k) => /^recon$/i.test(k)),
        cardImage: c.imageName ? `/images/battle/${slug}.webp` : null,
      }
    })
}

export function buildCommands(cards: Lhq2Card[]): CommandCard[] {
  const seen = new Set<string>()
  return cards
    .filter((c) => c.cardType === 'command')
    .map((c) => {
      const slug = uniqueSlug(slugify(c.cardName, c.title), seen)
      const pips = parseInt(c.cardSubtype ?? '0', 10)
      const commander = Array.isArray(c.commander)
        ? c.commander.filter((n) => n !== 'AND').join(', ') || null
        : c.commander ?? null
      return {
        id: c.id,
        slug,
        name: c.cardName.trim(),
        pips: Number.isFinite(pips) ? pips : 0,
        commander,
        faction: c.faction ? mapFaction(c.faction) : null,
        cardImage: c.imageName ? `/images/commands/${slug}.webp` : null,
      }
    })
}


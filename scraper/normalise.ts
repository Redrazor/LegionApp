// Pure, testable transforms for the LegionApp data pipeline.
// Merges tabletopadmiral.com unit data (current list + card-scan images) with
// Legion HQ structured stats (defense, surges, keywords, upgrade slots).

import { FACTION_BY_FKEY, RANK_BY_FKEY, UNIT_TYPE_BY_FKEY, FACTION_BY_LHQ } from './fkey-maps.ts'

export interface TtaUnit {
  id: string | number
  name: string
  title?: string | null
  include_title?: boolean
  current_cost?: number | null
  original_cost?: number | null
  health?: number | null
  courage?: number | null
  speed?: number | null
  red_defense?: boolean | null
  is_unique?: boolean
  faction_fkey?: number
  rank_fkey?: number
  unit_type_fkey?: number
  image_url?: string | null
  cloudinary_image_url?: string | null
  portrait_image_url?: string | null
}

export interface LhqCard {
  id: string
  cardName: string
  displayName?: string
  title?: string
  cardType: string
  cardSubtype?: string
  faction?: string
  rank?: string
  cost?: number
  defense?: string // 'red' | 'white'
  surges?: string[]
  speed?: number
  wounds?: number
  resilience?: number | string
  courage?: number | string
  isUnique?: boolean
  keywords?: string[]
  upgradeBar?: string[]
  commander?: string
  requirements?: unknown[]
  faction_restriction?: string
  history?: { date: string; description: string }[]
  imageName?: string
}

export interface Unit {
  id: string
  slug: string
  name: string
  title: string
  faction: string
  rank: string
  unitType: string
  cost: number | null
  defense: string | null
  surgeAttack: string | null // 'crit' | 'hit' | null
  surgeDefense: boolean // converts to block
  speed: number | null
  wounds: number | null
  courage: number | null
  isUnique: boolean
  keywords: string[]
  upgradeBar: string[]
  cardImage: string | null
  portraitImage: string | null
  hasFullData: boolean
  history: { date: string; description: string }[]
}

export interface Upgrade {
  id: string
  slug: string
  name: string
  slot: string
  cost: number | null
  isUnique: boolean
  faction: string | null // faction restriction, if any
  keywords: string[]
  cardImage: string | null
}

export interface CommandCard {
  id: string
  slug: string
  name: string
  pips: number // 1,2,3 or 4 for special; 0 = unknown
  commander: string | null
  faction: string | null
  cardImage: string | null
}

export interface Product {
  code: string
  name: string
  faction: string
  type: 'unit-expansion' | 'core-set' | 'battle-force'
  unitSlugs: string[]
}

const RANK_ORDER = ['commander', 'operative', 'corps', 'special', 'support', 'heavy']
export const FACTIONS = ['rebels', 'empire', 'republic', 'separatists', 'mercenary']

export function rankIndex(rank: string): number {
  const i = RANK_ORDER.indexOf(rank)
  return i === -1 ? 99 : i
}

/** Normalise a card name for cross-source matching. */
export function normName(s: string | undefined | null): string {
  return (s ?? '')
    .toLowerCase()
    .replace(/\b(strike team)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Slugify a name (+ optional title) into a stable URL-safe id. */
export function slugify(name: string, title?: string | null): string {
  const base = title ? `${name} ${title}` : name
  return base
    .toLowerCase()
    .replace(/[''".,()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function decodeFaction(fkey?: number): string {
  return (fkey != null && FACTION_BY_FKEY[fkey]) || 'mercenary'
}
export function decodeRank(fkey?: number): string {
  return (fkey != null && RANK_BY_FKEY[fkey]) || 'corps'
}
export function decodeUnitType(fkey?: number): string {
  return (fkey != null && UNIT_TYPE_BY_FKEY[fkey]) || 'trooper'
}

function lhqFaction(f?: string): string | null {
  if (!f) return null
  return FACTION_BY_LHQ[f] ?? null
}

/** Split Legion HQ surge array into attack/defense conversions. */
function splitSurges(surges?: string[]): { surgeAttack: string | null; surgeDefense: boolean } {
  const s = surges ?? []
  const surgeAttack = s.includes('crit') ? 'crit' : s.includes('hit') ? 'hit' : null
  const surgeDefense = s.includes('block')
  return { surgeAttack, surgeDefense }
}

function num(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : parseInt(String(v), 10)
  return Number.isFinite(n) ? n : null
}

function ttaTitle(u: TtaUnit): string {
  return (u.include_title && u.title) ? u.title.trim() : ''
}

/**
 * Collapse classic / revamp duplicates. tabletopadmiral keeps both the legacy
 * and the current edition of a card under the same name + title + rank. We keep
 * one per (name, title, rank), preferring an entry that has a points cost, then
 * the most recently added record (highest numeric id) — i.e. the current edition.
 * Distinct cards that merely share a name (e.g. a Corps vs Operative Chewbacca)
 * differ by rank and are preserved.
 */
export function dedupeTtaUnits(ttaUnits: TtaUnit[]): TtaUnit[] {
  const groups = new Map<string, TtaUnit[]>()
  for (const u of ttaUnits) {
    const key = `${normName(u.name)}|${normName(ttaTitle(u))}|${u.rank_fkey ?? ''}`
    const arr = groups.get(key) ?? []
    arr.push(u)
    groups.set(key, arr)
  }
  const idNum = (u: TtaUnit) => (typeof u.id === 'number' ? u.id : parseInt(String(u.id), 10) || 0)
  const result: TtaUnit[] = []
  for (const arr of groups.values()) {
    arr.sort((a, b) => {
      const aCost = a.current_cost != null ? 1 : 0
      const bCost = b.current_cost != null ? 1 : 0
      return bCost - aCost || idNum(b) - idNum(a)
    })
    result.push(arr[0])
  }
  return result
}

/**
 * Build the merged unit catalogue.
 * Base list = tabletopadmiral units (current, de-duplicated). Structured stats
 * merged from Legion HQ by normalised name. Legion-HQ-only units are appended
 * so nothing is lost.
 */
// A unit candidate before slug/image paths are finalised.
interface Candidate extends Omit<Unit, 'slug' | 'cardImage' | 'portraitImage'> {
  hasImage: boolean
  hasPortrait: boolean
}

export function buildUnits(ttaUnitsRaw: TtaUnit[], lhqUnits: LhqCard[]): Unit[] {
  const ttaUnits = dedupeTtaUnits(ttaUnitsRaw)
  const lhqByName = new Map<string, LhqCard>()
  for (const c of lhqUnits) {
    const key = normName(c.cardName)
    if (!lhqByName.has(key)) lhqByName.set(key, c)
  }

  const usedLhq = new Set<string>()
  const candidates: Candidate[] = []

  for (const t of ttaUnits) {
    const key = normName(t.name)
    const lhq = lhqByName.get(key)
    if (lhq) usedLhq.add(key)
    const title = (t.include_title && t.title) || lhq?.title || ''
    const { surgeAttack, surgeDefense } = splitSurges(lhq?.surges)
    candidates.push({
      id: String(t.id),
      name: t.name.trim(),
      title: (title || '').trim(),
      faction: (lhqFaction(lhq?.faction) ?? decodeFaction(t.faction_fkey)) as Unit['faction'],
      rank: (lhq?.rank || decodeRank(t.rank_fkey)) as Unit['rank'],
      unitType: decodeUnitType(t.unit_type_fkey),
      cost: num(t.current_cost) ?? num(lhq?.cost),
      defense: (lhq?.defense ?? (t.red_defense === true ? 'red' : t.red_defense === false ? 'white' : null)) as Unit['defense'],
      surgeAttack: surgeAttack as Unit['surgeAttack'],
      surgeDefense,
      speed: num(t.speed) ?? num(lhq?.speed),
      wounds: num(t.health) ?? num(lhq?.wounds),
      courage: num(t.courage) ?? num(lhq?.courage),
      isUnique: !!(t.is_unique ?? lhq?.isUnique),
      keywords: lhq?.keywords ?? [],
      upgradeBar: lhq?.upgradeBar ?? [],
      hasFullData: !!lhq,
      history: lhq?.history ?? [],
      hasImage: !!(t.image_url || t.cloudinary_image_url),
      hasPortrait: !!t.portrait_image_url,
    })
  }

  // Append Legion-HQ-only units (e.g. strike-team variants) with no card scan.
  for (const c of lhqUnits) {
    const key = normName(c.cardName)
    if (usedLhq.has(key)) continue
    const { surgeAttack, surgeDefense } = splitSurges(c.surges)
    candidates.push({
      id: `lhq-${c.id}`,
      name: (c.displayName || c.cardName).trim(),
      title: (c.title || '').trim(),
      faction: (lhqFaction(c.faction) ?? 'mercenary') as Unit['faction'],
      rank: (c.rank || 'corps') as Unit['rank'],
      unitType: c.cardSubtype || 'trooper',
      cost: num(c.cost),
      defense: (c.defense ?? null) as Unit['defense'],
      surgeAttack: surgeAttack as Unit['surgeAttack'],
      surgeDefense,
      speed: num(c.speed),
      wounds: num(c.wounds),
      courage: num(c.courage),
      isUnique: !!c.isUnique,
      keywords: c.keywords ?? [],
      upgradeBar: c.upgradeBar ?? [],
      hasFullData: true,
      history: c.history ?? [],
      hasImage: false,
      hasPortrait: false,
    })
  }

  // Final dedupe across all sources by (name, title, rank). Prefer the entry
  // with full stats, then a card scan, then a points cost.
  const score = (c: Candidate) => (c.hasFullData ? 4 : 0) + (c.hasImage ? 2 : 0) + (c.cost != null ? 1 : 0)
  const byKey = new Map<string, Candidate>()
  for (const c of candidates) {
    const key = `${normName(c.name)}|${normName(c.title)}|${c.rank}`
    const existing = byKey.get(key)
    if (!existing || score(c) > score(existing)) byKey.set(key, c)
  }

  // Finalise slugs (with collision suffixes) and image paths from the slug.
  const seenSlugs = new Set<string>()
  const units: Unit[] = []
  for (const c of byKey.values()) {
    let slug = slugify(c.name, c.title)
    const base = slug
    let n = 2
    while (seenSlugs.has(slug)) slug = `${base}-${n++}`
    seenSlugs.add(slug)
    const { hasImage, hasPortrait, ...rest } = c
    units.push({
      ...rest,
      slug,
      cardImage: hasImage ? `/images/units/${slug}.webp` : null,
      portraitImage: hasPortrait ? `/images/portraits/${slug}.webp` : null,
    })
  }

  units.sort((a, b) =>
    a.faction === b.faction
      ? rankIndex(a.rank) - rankIndex(b.rank) || a.name.localeCompare(b.name)
      : a.faction.localeCompare(b.faction),
  )
  return units
}

export function buildUpgrades(lhqUpgrades: LhqCard[]): Upgrade[] {
  const seen = new Set<string>()
  return lhqUpgrades.map((c) => {
    let slug = slugify(c.cardName)
    let n = 2
    while (seen.has(slug)) slug = `${slugify(c.cardName)}-${n++}`
    seen.add(slug)
    return {
      id: c.id,
      slug,
      name: (c.displayName || c.cardName).trim(),
      slot: c.cardSubtype || 'gear',
      cost: num(c.cost),
      isUnique: !!c.isUnique,
      faction: lhqFaction(c.faction),
      keywords: c.keywords ?? [],
      cardImage: null,
    }
  })
}

export function buildCommands(lhqCommands: LhqCard[]): CommandCard[] {
  const seen = new Set<string>()
  return lhqCommands.map((c) => {
    let slug = slugify(c.cardName)
    let n = 2
    while (seen.has(slug)) slug = `${slugify(c.cardName)}-${n++}`
    seen.add(slug)
    const pips = parseInt(c.cardSubtype || '0', 10)
    return {
      id: c.id,
      slug,
      name: (c.displayName || c.cardName).trim(),
      pips: Number.isFinite(pips) ? pips : 0,
      commander: c.commander ?? null,
      faction: lhqFaction(c.faction),
      cardImage: null,
    }
  })
}

const PRODUCT_SUFFIX: Record<string, string> = {
  commander: 'Commander Expansion',
  operative: 'Operative Expansion',
  corps: 'Unit Expansion',
  special: 'Unit Expansion',
  support: 'Support Expansion',
  heavy: 'Heavy Expansion',
}

/** Generate a Collection product list: one expansion per unit, grouped by faction. */
export function buildProducts(units: Unit[]): Product[] {
  const products: Product[] = []
  const seen = new Set<string>()
  for (const u of units) {
    const code = `exp-${u.slug}`
    if (seen.has(code)) continue
    seen.add(code)
    const suffix = PRODUCT_SUFFIX[u.rank] ?? 'Unit Expansion'
    products.push({
      code,
      name: `${u.name}${u.title ? `, ${u.title}` : ''} ${suffix}`,
      faction: u.faction,
      type: 'unit-expansion',
      unitSlugs: [u.slug],
    })
  }
  return products
}

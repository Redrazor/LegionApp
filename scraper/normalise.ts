// Pure, testable transforms for the LegionApp data pipeline.
//
// Single source of truth: Legion HQ 2 (legionhq2.com) — the current-edition
// (2024 "v2" refresh) army builder. Each card is keyed by a unique id and
// carries its own stats, weapons, keywords and image, so there is no merging or
// name-based reconciliation: one card in → one record out.

export interface Lhq2Card {
  id: string
  cardName: string
  title?: string
  cardType: string // 'unit' | 'upgrade' | 'command' | 'battle' | 'counterpart'
  cardSubtype?: string // unit type, upgrade slot, or command pip count
  rank?: string
  faction?: string
  cost?: number | null
  isUnique?: boolean
  imageName?: string
  commander?: string | string[]
  keywords?: (string | { name: string; value?: number })[]
  upgradeBar?: string[]
  requirements?: unknown[]
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
  cost: number | null
  defense: string | null
  surgeAttack: string | null
  surgeDefense: boolean
  speed: number | null
  wounds: number | null
  courage: number | null
  isUnique: boolean
  keywords: string[]
  upgradeBar: string[]
  weapons: Weapon[]
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
  faction: string | null
  keywords: string[]
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
  return {
    name: w.name,
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
        cost: num(c.cost),
        defense: s.defense === 'r' ? 'red' : s.defense === 'w' ? 'white' : null,
        surgeAttack: s.hitsurge === 'c' ? 'crit' : s.hitsurge === 'h' ? 'hit' : null,
        surgeDefense: s.defsurge === 'b',
        speed: num(s.speed),
        wounds: num(s.hp),
        courage: num(s.courage),
        isUnique: !!c.isUnique,
        keywords: normalizeKeywords(c.keywords),
        upgradeBar: c.upgradeBar ?? [],
        weapons: (c.weapons ?? []).map(mapWeapon),
        cardImage: c.imageName ? `/images/units/${slug}.webp` : null,
        portraitImage: null,
        hasFullData: true,
        history: c.history ?? [],
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
        faction: c.faction ? mapFaction(c.faction) : null,
        keywords: normalizeKeywords(c.keywords),
        cardImage: c.imageName ? `/images/upgrades/${slug}.webp` : null,
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


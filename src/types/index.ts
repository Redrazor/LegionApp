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

export interface Unit {
  id: string
  slug: string
  name: string
  title: string
  faction: Faction
  rank: Rank
  unitType: string
  cost: number | null
  defense: 'red' | 'white' | null
  surgeAttack: 'crit' | 'hit' | null
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
  history: HistoryEntry[]
}

export interface Upgrade {
  id: string
  slug: string
  name: string
  slot: string
  cost: number | null
  isUnique: boolean
  faction: Faction | null
  keywords: string[]
  cardImage: string | null
}

export interface CommandCard {
  id: string
  slug: string
  name: string
  pips: number
  commander: string | null
  faction: Faction | null
  cardImage: string | null
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
  gameSize: number // points cap; resolves to a format via rankLimits() — 600 Recon, 800 legacy, 1000 Standard, 1600 Grand Army
  units: ArmyUnit[]
}

/** Compact, ID-only serialised army for save/share. */
export interface CompactArmy {
  n: string // name
  f: Faction | null // faction
  g: number // game size
  u: [string, [string, string][]][] // [unitId, [[slot, upgradeId], ...]]
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

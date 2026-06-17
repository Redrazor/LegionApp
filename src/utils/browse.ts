import type { CommandCard, Faction, Unit, Upgrade, UpgradeRequirementList } from '../types/index.ts'
import { commandCommanders, unitMeetsRequirements } from './army.ts'
import { FACTION_ORDER, slotLabel } from './factions.ts'

// ── Browse: command-card & upgrade search / grouping ─────────────────────────
//
// Pure logic for the Browse Commands and Upgrades sections. Units have their own
// `useSearch`; commands and upgrades each get a free-text name search, an optional
// "filter by character" (a fielded commander/operative), and faction/slot grouping.

/** A commander or operative offered in the "filter by character" control. */
export interface BrowseCharacter {
  name: string
  faction: Faction
}

/** Commanders & operatives by name (deduped, name-sorted) for the character filter. */
export function browseCharacters(units: Unit[]): BrowseCharacter[] {
  const seen = new Map<string, BrowseCharacter>()
  for (const u of units) {
    if (u.rank !== 'commander' && u.rank !== 'operative') continue
    const key = u.name.toLowerCase()
    if (!seen.has(key)) seen.set(key, { name: u.name, faction: u.faction })
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name))
}

// ── Commands ─────────────────────────────────────────────────────────────────

/** Distinct commander/operative names that have at least one command card, name-sorted. */
export function commandCharacters(cards: CommandCard[]): string[] {
  const set = new Set<string>()
  for (const c of cards) for (const n of commandCommanders(c)) set.add(n)
  return [...set].sort((a, b) => a.localeCompare(b))
}

/** Whether a command card belongs to a named commander/operative (multi-name aware). */
export function commandMatchesCharacter(card: CommandCard, name: string): boolean {
  const lc = name.toLowerCase()
  return commandCommanders(card).some((n) => n.toLowerCase() === lc)
}

/**
 * A command card's effective faction for grouping: its own `faction` when set, else the
 * faction of one of its commanders (commander cards often leave `faction` null), else
 * null (the universal pip cards — Standing Orders, Assault, …).
 */
export function commandFaction(
  card: CommandCard,
  commanderFaction: (name: string) => Faction | null,
): Faction | null {
  if (card.faction) return card.faction
  for (const n of commandCommanders(card)) {
    const f = commanderFaction(n)
    if (f) return f
  }
  return null
}

export interface CommandFilters {
  query: string
  faction: Faction | ''
  character: string // a commander/operative name, or '' for all
}

export function searchCommands(
  cards: CommandCard[],
  filters: CommandFilters,
  commanderFaction: (name: string) => Faction | null,
): CommandCard[] {
  const q = filters.query.trim().toLowerCase()
  return cards.filter((c) => {
    if (filters.faction && commandFaction(c, commanderFaction) !== filters.faction) return false
    if (filters.character && !commandMatchesCharacter(c, filters.character)) return false
    // Free-text matches the card name OR its commander (so typing "Leia" finds her cards).
    if (q) {
      const inName = c.name.toLowerCase().includes(q)
      const inCommander = commandCommanders(c).some((n) => n.toLowerCase().includes(q))
      if (!inName && !inCommander) return false
    }
    return true
  })
}

export interface CommandGroup {
  faction: Faction | null // null = universal/generic
  cards: CommandCard[]
}

/** Group command cards by (effective) faction in FACTION_ORDER, universal last; pip then name. */
export function groupCommandsByFaction(
  cards: CommandCard[],
  commanderFaction: (name: string) => Faction | null,
): CommandGroup[] {
  const map = new Map<Faction | 'universal', CommandCard[]>()
  for (const c of cards) {
    const key = commandFaction(c, commanderFaction) ?? 'universal'
    const arr = map.get(key) ?? []
    arr.push(c)
    map.set(key, arr)
  }
  const order: (Faction | 'universal')[] = [...FACTION_ORDER, 'universal']
  const sortCards = (a: CommandCard, b: CommandCard) => a.pips - b.pips || a.name.localeCompare(b.name)
  return order
    .filter((k) => map.has(k))
    .map((k) => ({ faction: k === 'universal' ? null : k, cards: (map.get(k) ?? []).slice().sort(sortCards) }))
}

// ── Upgrades ─────────────────────────────────────────────────────────────────

/** All unit names an upgrade's requirements reference (via `cardName` criteria). */
export function upgradeNamedUnits(reqs: UpgradeRequirementList | undefined): string[] {
  if (!reqs) return []
  const out: string[] = []
  const walk = (group: UpgradeRequirementList) => {
    for (const node of group) {
      if (Array.isArray(node)) walk(node)
      else if (typeof node !== 'string' && node.cardName) out.push(node.cardName)
    }
  }
  walk(reqs)
  return out
}

/** Distinct unit names referenced by upgrade requirements (`cardName`), name-sorted. */
export function upgradeCharacters(upgrades: Upgrade[]): string[] {
  const set = new Set<string>()
  for (const u of upgrades) for (const n of upgradeNamedUnits(u.requirements)) set.add(n)
  return [...set].sort((a, b) => a.localeCompare(b))
}

/** Whether an upgrade's requirements explicitly name a unit (a `cardName` criterion). */
export function upgradeNamesUnit(reqs: UpgradeRequirementList | undefined, unitName: string): boolean {
  if (!reqs) return false
  const lc = unitName.toLowerCase()
  const walk = (group: UpgradeRequirementList): boolean =>
    group.some((node) => {
      if (Array.isArray(node)) return walk(node)
      if (typeof node === 'string') return false
      return node.cardName != null && node.cardName.toLowerCase() === lc
    })
  return walk(reqs)
}

/**
 * Whether an upgrade is "associated with" a named character: its requirements name that
 * unit (a `cardName` criterion) AND a unit of that name can actually equip it
 * (`unitMeetsRequirements`) — so generic upgrades and unsatisfiable cardName references
 * (e.g. a `NOT`/cross-faction group) aren't swept in.
 */
export function upgradeForCharacter(upgrade: Upgrade, name: string, characterUnits: Unit[]): boolean {
  if (!upgradeNamesUnit(upgrade.requirements, name)) return false
  return characterUnits.some((u) => unitMeetsRequirements(u, upgrade.requirements))
}

export interface UpgradeFilters {
  query: string
  slot: string // an upgrade slot type, or '' for all
  character: string // a commander/operative name, or '' for all
}

export function searchUpgrades(upgrades: Upgrade[], units: Unit[], filters: UpgradeFilters): Upgrade[] {
  const q = filters.query.trim().toLowerCase()
  const lcName = filters.character.toLowerCase()
  const characterUnits = filters.character
    ? units.filter((u) => u.name.toLowerCase() === lcName)
    : []
  return upgrades.filter((u) => {
    if (filters.slot && u.slot !== filters.slot) return false
    if (filters.character && !upgradeForCharacter(u, filters.character, characterUnits)) return false
    // Free-text matches the upgrade name OR a unit it's restricted to (so "Leia" finds
    // upgrades that name her).
    if (q) {
      const inName = u.name.toLowerCase().includes(q)
      const inUnit = upgradeNamedUnits(u.requirements).some((n) => n.toLowerCase().includes(q))
      if (!inName && !inUnit) return false
    }
    return true
  })
}

export interface UpgradeGroup {
  slot: string
  upgrades: Upgrade[]
}

/** Group upgrades by slot (slot-label alphabetical); cheapest cost first then name. */
export function groupUpgradesBySlot(upgrades: Upgrade[]): UpgradeGroup[] {
  const map = new Map<string, Upgrade[]>()
  for (const u of upgrades) {
    const arr = map.get(u.slot) ?? []
    arr.push(u)
    map.set(u.slot, arr)
  }
  const sortUps = (a: Upgrade, b: Upgrade) => (a.cost ?? 0) - (b.cost ?? 0) || a.name.localeCompare(b.name)
  return [...map.keys()]
    .sort((a, b) => slotLabel(a).localeCompare(slotLabel(b)))
    .map((slot) => ({ slot, upgrades: (map.get(slot) ?? []).slice().sort(sortUps) }))
}

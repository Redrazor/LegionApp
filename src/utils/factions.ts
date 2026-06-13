import type { Faction, Rank, FactionMeta, RankMeta } from '../types/index.ts'

export const FACTION_META: Record<Faction, FactionMeta> = {
  rebels: { id: 'rebels', name: 'Rebel Alliance', color: 'var(--color-faction-rebels)' },
  empire: { id: 'empire', name: 'Galactic Empire', color: 'var(--color-faction-empire)' },
  republic: { id: 'republic', name: 'Galactic Republic', color: 'var(--color-faction-republic)' },
  separatists: { id: 'separatists', name: 'Separatist Alliance', color: 'var(--color-faction-separatists)' },
  mercenary: { id: 'mercenary', name: 'Mercenaries', color: 'var(--color-faction-mercenary)' },
  mandalorians: { id: 'mandalorians', name: 'Mandalorians', color: 'var(--color-faction-mandalorians)' },
}

export const FACTION_ORDER: Faction[] = ['rebels', 'empire', 'republic', 'separatists', 'mercenary', 'mandalorians']

/**
 * Unit `affiliation` values that make up the **Mandalorian Clans** army (LHQ2's
 * `mandalorians` faction is this battle force). Most of these units carry
 * `faction: 'mercenary'`, so they're flagged Mandalorian-legal by affiliation rather
 * than the faction field — see `isMandalorianClanUnit` / `unitAllowedInFaction`.
 */
export const MANDO_CLANS: ReadonlySet<string> = new Set([
  'Mandalore', 'Clan Kryze', 'Clan Saxon', 'Clan Wren', 'Children of the Watch',
])

export const RANK_ORDER: Rank[] = ['commander', 'operative', 'corps', 'special', 'support', 'heavy']

// Human-readable rank names (limits live per-format in FORMATS — see rankLimits()).
const RANK_NAMES: Record<Rank, string> = {
  commander: 'Commander', operative: 'Operative', corps: 'Corps',
  special: 'Special Forces', support: 'Support', heavy: 'Heavy',
}

export type RankLimits = Record<Rank, { min: number; max: number }>

export interface GameFormat {
  id: string
  name: string
  cap: number // points ceiling
  official: boolean
  ranks: RankLimits
}

const r = (min: number, max: number) => ({ min, max })

// Composition tables verified against AMG Core Rulebook v2.6.0 (eff. 2024-07-19) and
// Recon Rulebook (eff. 2025-04-30). The rank table is identical for Recon=old-500 and
// Standard=old-800; only the points caps moved in the 2024 v2 refresh.
//   Recon 600 / Standard 1000 are AMG-official; Legacy 800 (1st-ed standard) and
//   Grand Army 1600 (community, 2× standard) are kept because the user wants them
//   selectable. There is no points→rank formula — these are discrete lookup tables.
// Ordered ascending by cap (rankLimits relies on this).
export const FORMATS: GameFormat[] = [
  {
    id: 'recon', name: 'Recon', cap: 600, official: true,
    ranks: { commander: r(1, 1), operative: r(0, 1), corps: r(2, 4), special: r(0, 2), support: r(0, 2), heavy: r(0, 1) },
  },
  {
    id: 'legacy', name: 'Standard (800)', cap: 800, official: false,
    ranks: { commander: r(1, 2), operative: r(0, 2), corps: r(3, 6), special: r(0, 3), support: r(0, 3), heavy: r(0, 2) },
  },
  {
    id: 'standard', name: 'Standard', cap: 1000, official: true,
    ranks: { commander: r(1, 2), operative: r(0, 2), corps: r(3, 6), special: r(0, 3), support: r(0, 3), heavy: r(0, 2) },
  },
  {
    id: 'grand', name: 'Grand Army', cap: 1600, official: false,
    ranks: { commander: r(2, 4), operative: r(0, 4), corps: r(6, 12), special: r(0, 6), support: r(0, 6), heavy: r(0, 4) },
  },
]

/** Resolve the format for a points cap: the largest format whose cap ≤ `cap`,
 * floored at the smallest format. Exact for the four named sizes; for a custom
 * cap it clamps down to the nearest defined bracket (AMG defines no scaling formula). */
export function formatForCap(cap: number): GameFormat {
  let chosen = FORMATS[0]
  for (const f of FORMATS) if (f.cap <= cap) chosen = f
  return chosen
}

/**
 * Battle forces replace the standard rank table with their own. We model the
 * difference as a sparse override layered over the base format, since only a few
 * ranks change. The **Mandalorian Clans** battle force (LHQ2 `faction:'mandalorians'`)
 * lowers the Corps minimum to 2 (verified from the LHQ2 source bundle: Corps 2–6 at
 * Standard, 2–4 at Recon — i.e. min 2 across formats; Recon already matched). The max
 * and every other rank are inherited from the format. Keyed by faction because each
 * battle force surfaces as its own faction in the app.
 */
type RankOverride = Partial<Record<Rank, Partial<{ min: number; max: number }>>>
const BATTLE_FORCE_RANKS: Partial<Record<Faction, RankOverride>> = {
  mandalorians: { corps: { min: 2 } },
}

/**
 * Rank min/max limits for a points cap, applying a battle-force override when the
 * army's `faction` has one (e.g. Mandalorian Clans → Corps min 2). Faction is
 * optional so callers that just want the base format table need not pass it.
 */
export function rankLimits(cap: number, faction?: Faction | null): RankLimits {
  const base = formatForCap(cap).ranks
  const override = faction ? BATTLE_FORCE_RANKS[faction] : undefined
  if (!override) return base
  const out = {} as RankLimits
  for (const rank of RANK_ORDER) out[rank] = { ...base[rank], ...override[rank] }
  return out
}

/** Display name for a points cap (e.g. 1000 → "Standard", 750 → "Standard (800)"). */
export function formatName(cap: number): string {
  return formatForCap(cap).name
}

// Standard (1000-pt) limits, kept for the Reference tab and browse filters that show
// generic "per army" counts. Per-format limits in the builder use rankLimits().
export const RANK_META: Record<Rank, RankMeta> = Object.fromEntries(
  RANK_ORDER.map((rank) => {
    const { min, max } = FORMATS.find((f) => f.id === 'standard')!.ranks[rank]
    return [rank, { id: rank, name: RANK_NAMES[rank], min, max }]
  }),
) as Record<Rank, RankMeta>

export function factionName(f: Faction | null | undefined): string {
  return f ? FACTION_META[f].name : ''
}
export function factionColor(f: Faction | null | undefined): string {
  return f ? FACTION_META[f].color : 'var(--color-lg-muted)'
}
export function rankName(r: Rank): string {
  return RANK_META[r]?.name ?? r
}

// Display labels for the 15 upgrade-slot types.
export const SLOT_LABELS: Record<string, string> = {
  command: 'Command', force: 'Force', gear: 'Gear', grenades: 'Grenades',
  hardpoint: 'Hardpoint', 'heavy weapon': 'Heavy Weapon', personnel: 'Personnel',
  pilot: 'Pilot', comms: 'Comms', crew: 'Crew', generator: 'Generator',
  armament: 'Armament', ordnance: 'Ordnance', training: 'Training', programming: 'Programming',
  'squad leader': 'Squad Leader', doctrine: 'Doctrine', clan: 'Clan',
}

export function slotLabel(slot: string): string {
  return SLOT_LABELS[slot] ?? slot.replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Light/dark allegiance for Force users, keyed by lowercased unit name. The only
 * upgrade `requirement` criterion (`forceAffinity`) with no direct unit field, so
 * it's hand-maintained; unlisted Force users fail open (the upgrade is shown).
 * Keep accurate over complete — a wrong tag hides legal powers; a missing one
 * just shows both sides.
 */
export const FORCE_SIDE: Record<string, 'light side' | 'dark side'> = {
  // Light side
  'luke skywalker': 'light side',
  'obi-wan kenobi': 'light side',
  'yoda': 'light side',
  'mace windu': 'light side',
  'ahsoka tano': 'light side',
  'anakin skywalker': 'light side',
  'plo koon': 'light side',
  'ki-adi-mundi': 'light side',
  'aayla secura': 'light side',
  'luminara unduli': 'light side',
  'qui-gon jinn': 'light side',
  'ezra bridger': 'light side',
  'kanan jarrus': 'light side',
  'cal kestis': 'light side',
  'jedi knight': 'light side',
  'jedi knight general': 'light side',
  'padawan': 'light side',
  // Dark side
  'darth vader': 'dark side',
  'emperor palpatine': 'dark side',
  'darth sidious': 'dark side',
  'darth maul': 'dark side',
  'maul': 'dark side',
  'count dooku': 'dark side',
  'asajj ventress': 'dark side',
  'savage opress': 'dark side',
  'grand inquisitor': 'dark side',
  'the grand inquisitor': 'dark side',
  'seventh sister': 'dark side',
  'fifth brother': 'dark side',
}

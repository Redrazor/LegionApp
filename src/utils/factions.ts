import type { Faction, Rank, FactionMeta, RankMeta } from '../types/index.ts'

export const FACTION_META: Record<Faction, FactionMeta> = {
  rebels: { id: 'rebels', name: 'Rebel Alliance', color: 'var(--color-faction-rebels)' },
  empire: { id: 'empire', name: 'Galactic Empire', color: 'var(--color-faction-empire)' },
  republic: { id: 'republic', name: 'Galactic Republic', color: 'var(--color-faction-republic)' },
  separatists: { id: 'separatists', name: 'Separatist Alliance', color: 'var(--color-faction-separatists)' },
  mercenary: { id: 'mercenary', name: 'Mercenaries', color: 'var(--color-faction-mercenary)' },
}

export const FACTION_ORDER: Faction[] = ['rebels', 'empire', 'republic', 'separatists', 'mercenary']

// Standard army composition limits (Star Wars: Legion, 2024 rules).
export const RANK_META: Record<Rank, RankMeta> = {
  commander: { id: 'commander', name: 'Commander', min: 1, max: 2 },
  operative: { id: 'operative', name: 'Operative', min: 0, max: 2 },
  corps: { id: 'corps', name: 'Corps', min: 3, max: 6 },
  special: { id: 'special', name: 'Special Forces', min: 0, max: 3 },
  support: { id: 'support', name: 'Support', min: 0, max: 3 },
  heavy: { id: 'heavy', name: 'Heavy', min: 0, max: 2 },
}

export const RANK_ORDER: Rank[] = ['commander', 'operative', 'corps', 'special', 'support', 'heavy']

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

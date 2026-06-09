// Mapping of tabletopadmiral.com numeric foreign keys to canonical strings.
// Derived during data exploration by majority-vote cross-referencing tabletopadmiral
// unit names against Legion HQ's explicit `faction`/`rank` string fields.

export const FACTION_BY_FKEY: Record<number, string> = {
  1: 'rebels',
  2: 'empire',
  3: 'mercenary', // Hondo Ohnaka (lone entry)
  4: 'republic',
  5: 'separatists',
  6: 'mercenary', // fringe / Shadow Collective / mercenaries
}

export const RANK_BY_FKEY: Record<number, string> = {
  1: 'commander',
  2: 'corps',
  3: 'special', // Special Forces
  4: 'support',
  5: 'heavy',
  6: 'operative',
}

export const UNIT_TYPE_BY_FKEY: Record<number, string> = {
  1: 'trooper',
  2: 'repulsor vehicle',
  3: 'ground vehicle',
  4: 'emplacement trooper',
  5: 'clone trooper',
  6: 'droid trooper',
  7: 'creature trooper',
  9: 'trooper',
}

// Legion HQ uses 'fringe' for mercenary/Shadow-Collective-aligned units.
export const FACTION_BY_LHQ: Record<string, string> = {
  rebels: 'rebels',
  empire: 'empire',
  republic: 'republic',
  separatists: 'separatists',
  fringe: 'mercenary',
}

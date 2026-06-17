// Picks the single weapon to headline for each attack type (ranged / melee) in the Build
// unit row. "Best" is NOT the most dice — it is the highest probability of inflicting
// wounds, i.e. the greatest expected (hits + crits) under the unit's surge chart, using
// the SAME EV engine as the dice roller and Army Stats panel (poolEV). Pure + tested.

import type { Weapon } from '../types/index.ts'
import { poolEV } from './armyStats.ts'

export type AttackSurge = 'crit' | 'hit' | 'blank'

/** Expected wounds (hits + crits, before any defence) a weapon's dice pool inflicts under
 *  `surge`. This is the ranking key for "best weapon". */
export function weaponExpectedWounds(w: Weapon, surge: AttackSurge): number {
  const ev = poolEV(w.dice, surge)
  return ev.hits + ev.crits
}

/** A weapon can be used in melee when its range reaches 0 (range [0], [0,N], …). */
export function isMeleeCapable(w: Weapon): boolean {
  return w.range.length > 0 && w.range[0] === 0
}

/** A weapon can be used at range when it reaches band 1+ — or has no listed range at all
 *  (e.g. Fixed generators), which are ranged attacks, never melee. */
export function isRangedCapable(w: Weapon): boolean {
  return w.range.length === 0 || w.range[w.range.length - 1] >= 1
}

export interface BestWeapons {
  ranged: Weapon | null
  melee: Weapon | null
}

/**
 * The unit's best ranged and best melee weapon, each the one with the highest expected
 * wounds under `surge`. A Versatile weapon (range [0,2]) is a candidate for both pools, so
 * it can headline R and M at once. Weapons with no dice are ignored; ties keep the first
 * weapon seen (stable in catalogue order).
 */
export function bestWeapons(weapons: Weapon[], surge: AttackSurge): BestWeapons {
  let ranged: Weapon | null = null
  let melee: Weapon | null = null
  let rangedEV = -1
  let meleeEV = -1
  for (const w of weapons) {
    if (!w?.dice) continue
    if (w.dice.red + w.dice.black + w.dice.white <= 0) continue
    const ev = weaponExpectedWounds(w, surge)
    if (isMeleeCapable(w) && ev > meleeEV) { meleeEV = ev; melee = w }
    if (isRangedCapable(w) && ev > rangedEV) { rangedEV = ev; ranged = w }
  }
  return { ranged, melee }
}

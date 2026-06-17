import { describe, it, expect } from 'vitest'
import { bestWeapons, isMeleeCapable, isRangedCapable, weaponExpectedWounds } from '../src/utils/bestWeapons.ts'
import type { Weapon } from '../src/types/index.ts'

function w(name: string, range: number[], red = 0, black = 0, white = 0, keywords: string[] = []): Weapon {
  return { name, range, dice: { red, black, white }, keywords }
}

describe('isMeleeCapable / isRangedCapable', () => {
  it('classifies pure melee, pure ranged, versatile and rangeless weapons', () => {
    expect(isMeleeCapable(w('saber', [0], 6))).toBe(true)
    expect(isRangedCapable(w('saber', [0], 6))).toBe(false)

    expect(isMeleeCapable(w('rifle', [1, 3], 0, 0, 4))).toBe(false)
    expect(isRangedCapable(w('rifle', [1, 3], 0, 0, 4))).toBe(true)

    // Versatile [0,2] is both melee and ranged.
    expect(isMeleeCapable(w('pistols', [0, 2], 3))).toBe(true)
    expect(isRangedCapable(w('pistols', [0, 2], 3))).toBe(true)

    // Rangeless (Fixed generator) is a ranged attack, never melee.
    expect(isMeleeCapable(w('generator', [], 0, 1))).toBe(false)
    expect(isRangedCapable(w('generator', [], 0, 1))).toBe(true)
  })
})

describe('weaponExpectedWounds', () => {
  it('ranks by expected hits+crits, not raw dice count', () => {
    // 1 red (EV .75 dmg, no surge) beats 2 white (EV .50): fewer dice but more expected wounds.
    const oneRed = weaponExpectedWounds(w('a', [1, 2], 1, 0, 0), 'blank')
    const twoWhite = weaponExpectedWounds(w('b', [1, 2], 0, 0, 2), 'blank')
    expect(oneRed).toBeGreaterThan(twoWhite)
  })

  it('counts surge conversion toward expected wounds', () => {
    const noSurge = weaponExpectedWounds(w('a', [1, 2], 0, 0, 4), 'blank')
    const surgeHit = weaponExpectedWounds(w('a', [1, 2], 0, 0, 4), 'hit')
    expect(surgeHit).toBeGreaterThan(noSurge)
  })
})

describe('bestWeapons', () => {
  it('picks the highest-expected-wounds weapon for each of ranged and melee', () => {
    const weapons = [
      w('Unarmed', [0], 0, 1, 0), // melee, EV .5
      w('Vibrosword', [0], 3, 0, 0), // melee, EV 2.25 ← best melee
      w('Pistol', [1, 2], 0, 2, 0), // ranged, EV 1.0
      w('Rifle', [1, 3], 0, 0, 5), // ranged, EV 1.25 ← best ranged (more expected than pistol)
    ]
    const best = bestWeapons(weapons, 'blank')
    expect(best.melee?.name).toBe('Vibrosword')
    expect(best.ranged?.name).toBe('Rifle')
  })

  it('lets a versatile weapon headline both pools', () => {
    const best = bestWeapons([w('Dual Pistols', [0, 2], 4)], 'blank')
    expect(best.ranged?.name).toBe('Dual Pistols')
    expect(best.melee?.name).toBe('Dual Pistols')
  })

  it('returns nulls for no weapons / dice-less weapons', () => {
    expect(bestWeapons([], 'blank')).toEqual({ ranged: null, melee: null })
    expect(bestWeapons([w('empty', [0], 0, 0, 0)], 'blank')).toEqual({ ranged: null, melee: null })
  })

  it('shows only the type the unit actually has', () => {
    const meleeOnly = bestWeapons([w('saber', [0], 6)], 'blank')
    expect(meleeOnly.melee?.name).toBe('saber')
    expect(meleeOnly.ranged).toBeNull()
  })
})

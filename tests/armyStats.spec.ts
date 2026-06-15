import { describe, it, expect } from 'vitest'
import { computeArmyStats, baseKeyword, weaponRange, poolEV } from '../src/utils/armyStats.ts'
import { attackEV, defenseEV } from '../src/utils/dice.ts'
import type { Army, Unit, Upgrade, Weapon } from '../src/types/index.ts'

function weapon(over: Partial<Weapon> = {}): Weapon {
  return { name: 'rifle', range: [1, 3], dice: { red: 0, black: 1, white: 0 }, keywords: [], ...over }
}

function unit(id: string, over: Partial<Unit> = {}): Unit {
  return {
    id, slug: id, name: id, title: '', faction: 'empire', rank: 'corps',
    unitType: 'trooper', affiliation: null, affiliations: [], cost: 50, defense: 'white',
    surgeAttack: null, surgeDefense: false, speed: 2, wounds: 5, courage: 1, isUnique: false,
    keywords: [], upgradeBar: [], weapons: [weapon()], cardImage: null, portraitImage: null,
    hasFullData: true, history: [], ...over,
  }
}

function upgrade(id: string, over: Partial<Upgrade> = {}): Upgrade {
  return { id, slug: id, name: id, slot: 'gear', cost: 10, isUnique: false, faction: null, keywords: [], cardImage: null, ...over }
}

function maps(units: Unit[], upgrades: Upgrade[] = []) {
  return {
    unitsById: new Map(units.map((u) => [u.id, u])),
    upgradesById: new Map(upgrades.map((u) => [u.id, u])),
  }
}

function army(units: Army['units'], over: Partial<Army> = {}): Army {
  return { name: 'a', faction: 'empire', battleForce: null, gameSize: 1000, units, commandHand: [], battleDeck: [], ...over }
}

describe('attackEV / defenseEV (deterministic)', () => {
  it('red attack die: 1 crit, 5 hit, 1 surge, 1 blank over 8 faces', () => {
    expect(attackEV('red', 'blank')).toEqual({ hits: 5 / 8, crits: 1 / 8 })
  })
  it('surge folds into the chosen result', () => {
    expect(attackEV('red', 'hit')).toEqual({ hits: 6 / 8, crits: 1 / 8 })
    expect(attackEV('red', 'crit')).toEqual({ hits: 5 / 8, crits: 2 / 8 })
  })
  it('white attack die is the weakest', () => {
    expect(attackEV('white', 'blank')).toEqual({ hits: 1 / 8, crits: 1 / 8 })
  })
  it('defence die: red blocks 3/6, +surge = 4/6; white 1/6 → 2/6', () => {
    expect(defenseEV('red', 'blank')).toBeCloseTo(3 / 6)
    expect(defenseEV('red', 'block')).toBeCloseTo(4 / 6)
    expect(defenseEV('white', 'blank')).toBeCloseTo(1 / 6)
    expect(defenseEV('white', 'block')).toBeCloseTo(2 / 6)
  })
})

describe('baseKeyword', () => {
  it('strips numeric and X value suffixes', () => {
    expect(baseKeyword('Pierce 2')).toBe('Pierce')
    expect(baseKeyword('Pierce X')).toBe('Pierce')
    expect(baseKeyword('Jump 1')).toBe('Jump')
  })
  it('leaves valueless keywords untouched', () => {
    expect(baseKeyword('Fearless')).toBe('Fearless')
    expect(baseKeyword('High Velocity')).toBe('High Velocity')
  })
})

describe('weaponRange', () => {
  it('treats [0] as melee (min=max=0)', () => {
    expect(weaponRange([0])).toEqual({ min: 0, max: 0 })
  })
  it('treats a null max as unlimited', () => {
    expect(weaponRange([1, null as unknown as number])).toEqual({ min: 1, max: Infinity })
  })
  it('treats a null min as 0', () => {
    expect(weaponRange([null as unknown as number, 2])).toEqual({ min: 0, max: 2 })
  })
  it('passes a normal ranged span through', () => {
    expect(weaponRange([1, 3])).toEqual({ min: 1, max: 3 })
  })
})

describe('poolEV', () => {
  it('sums per-colour expected hits/crits', () => {
    const ev = poolEV({ red: 1, black: 1, white: 0 }, 'blank')
    expect(ev.hits).toBeCloseTo(5 / 8 + 3 / 8)
    expect(ev.crits).toBeCloseTo(1 / 8 + 1 / 8)
  })
})

describe('computeArmyStats — composition', () => {
  it('splits unit vs upgrade points and totals', () => {
    const { unitsById, upgradesById } = maps([unit('a', { cost: 100 })], [upgrade('g', { cost: 15 })])
    const a = army([{ uid: '1', unitId: 'a', upgrades: [{ slot: 'gear#0', upgradeId: 'g' }] }])
    const s = computeArmyStats(a, unitsById, upgradesById)
    expect(s.unitPoints).toBe(100)
    expect(s.upgradePoints).toBe(15)
    expect(s.totalPoints).toBe(115)
    expect(s.activations).toBe(1)
    expect(s.avgUnitCost).toBe(115)
  })

  it('buckets points by effective rank and counts each instance', () => {
    const { unitsById, upgradesById } = maps([
      unit('cmd', { rank: 'commander', cost: 80 }),
      unit('c', { rank: 'corps', cost: 50 }),
    ])
    const a = army([
      { uid: '1', unitId: 'cmd', upgrades: [] },
      { uid: '2', unitId: 'c', upgrades: [] },
      { uid: '3', unitId: 'c', upgrades: [] },
    ])
    const s = computeArmyStats(a, unitsById, upgradesById)
    expect(s.activations).toBe(3)
    expect(s.pointsByRank).toEqual([
      { rank: 'commander', label: 'Commander', points: 80 },
      { rank: 'corps', label: 'Corps', points: 100 },
    ])
  })

  it('skips unresolved unit ids', () => {
    const { unitsById, upgradesById } = maps([unit('a')])
    const s = computeArmyStats(army([{ uid: '1', unitId: 'ghost', upgrades: [] }]), unitsById, upgradesById)
    expect(s.activations).toBe(0)
    expect(s.totalPoints).toBe(0)
    expect(s.avgUnitCost).toBe(0)
  })
})

describe('computeArmyStats — offense', () => {
  it('aggregates the attack dice pool and melee/ranged split', () => {
    const melee = unit('m', { weapons: [weapon({ range: [0], dice: { red: 1, black: 0, white: 0 } })] })
    const ranged = unit('r', { weapons: [weapon({ range: [1, 3], dice: { red: 0, black: 2, white: 0 } })] })
    const versatile = unit('v', { weapons: [weapon({ range: [0, 2], dice: { red: 0, black: 0, white: 3 } })] })
    const { unitsById, upgradesById } = maps([melee, ranged, versatile])
    const a = army([
      { uid: '1', unitId: 'm', upgrades: [] },
      { uid: '2', unitId: 'r', upgrades: [] },
      { uid: '3', unitId: 'v', upgrades: [] },
    ])
    const s = computeArmyStats(a, unitsById, upgradesById)
    expect(s.attackPool).toEqual({ red: 1, black: 2, white: 3 })
    expect(s.meleePool).toEqual({ red: 1, black: 0, white: 3 }) // melee + versatile
    expect(s.rangedPool).toEqual({ red: 0, black: 2, white: 3 }) // ranged + versatile
  })

  it('computes expected damage per range band using each unit surge', () => {
    // one black die, range 1-3, hit-surge → contributes at bands 1,2,3 only
    const u = unit('a', { surgeAttack: 'hit', weapons: [weapon({ range: [1, 3], dice: { red: 0, black: 1, white: 0 } })] })
    const { unitsById, upgradesById } = maps([u])
    const s = computeArmyStats(army([{ uid: '1', unitId: 'a', upgrades: [] }]), unitsById, upgradesById)
    const ev = poolEV({ red: 0, black: 1, white: 0 }, 'hit')
    const byLabel = Object.fromEntries(s.rangeBands.map((b) => [b.label, b.expected]))
    expect(byLabel['Melee']).toBe(0)
    expect(byLabel['Range 1']).toBeCloseTo(Math.round((ev.hits + ev.crits) * 10) / 10)
    expect(byLabel['Range 4+']).toBe(0)
  })

  it('tallies notable weapon keywords in display order', () => {
    const u = unit('a', { weapons: [weapon({ keywords: ['Impact 2', 'Pierce 1'] })] })
    const u2 = unit('b', { weapons: [weapon({ keywords: ['Pierce 1'] })] })
    const { unitsById, upgradesById } = maps([u, u2])
    const a = army([{ uid: '1', unitId: 'a', upgrades: [] }, { uid: '2', unitId: 'b', upgrades: [] }])
    const s = computeArmyStats(a, unitsById, upgradesById)
    expect(s.weaponKeywords).toEqual([
      { keyword: 'Pierce', count: 2 },
      { keyword: 'Impact', count: 1 },
    ])
  })
})

describe('computeArmyStats — defence & durability', () => {
  it('counts defence-die mix, wounds, and weighted save', () => {
    const red = unit('red', { defense: 'red', surgeDefense: true, wounds: 6 })
    const white = unit('white', { defense: 'white', surgeDefense: false, wounds: 4 })
    const { unitsById, upgradesById } = maps([red, white])
    const a = army([{ uid: '1', unitId: 'red', upgrades: [] }, { uid: '2', unitId: 'white', upgrades: [] }])
    const s = computeArmyStats(a, unitsById, upgradesById)
    expect(s.totalWounds).toBe(10)
    expect(s.redDefenseUnits).toBe(1)
    expect(s.whiteDefenseUnits).toBe(1)
    expect(s.surgeDefenseUnits).toBe(1)
    const expectSave = (6 * (4 / 6) + 4 * (1 / 6)) / 10
    expect(s.avgDefenseSave).toBeCloseTo(Math.round(expectSave * 100) / 100)
  })

  it('effective HP is wounds / (1 − save)', () => {
    const white = unit('white', { defense: 'white', surgeDefense: false, wounds: 5 }) // save 1/6
    const { unitsById, upgradesById } = maps([white])
    const s = computeArmyStats(army([{ uid: '1', unitId: 'white', upgrades: [] }]), unitsById, upgradesById)
    expect(s.effectiveHP).toBe(Math.round(5 / (1 - 1 / 6)))
  })
})

describe('computeArmyStats — mobility, morale, keywords', () => {
  it('aggregates speed, jump/climb, courage and fearless/courageless', () => {
    const trooper = unit('t', { speed: 2, courage: 1, keywords: ['Jump 1'] })
    const droid = unit('d', { speed: 2, courage: 0, keywords: ['Climb'] }) // courageless
    const fearless = unit('f', { speed: 3, courage: 2, keywords: ['Fearless'] })
    const { unitsById, upgradesById } = maps([trooper, droid, fearless])
    const a = army([
      { uid: '1', unitId: 't', upgrades: [] },
      { uid: '2', unitId: 'd', upgrades: [] },
      { uid: '3', unitId: 'f', upgrades: [] },
    ])
    const s = computeArmyStats(a, unitsById, upgradesById)
    expect(s.avgSpeed).toBe(2.3) // round1(7/3)
    expect(s.speeds).toEqual([{ speed: 2, count: 2 }, { speed: 3, count: 1 }])
    expect(s.jumpUnits).toBe(1)
    expect(s.climbUnits).toBe(1)
    expect(s.fearlessUnits).toBe(1)
    expect(s.couragelessUnits).toBe(1)
    expect(s.avgCourage).toBeCloseTo(1.5) // only the two with courage > 0
  })

  it('builds a unit keyword frequency table sorted by count', () => {
    const a1 = unit('a', { keywords: ['Arsenal 2', 'Nimble'] })
    const a2 = unit('b', { keywords: ['Nimble'] })
    const { unitsById, upgradesById } = maps([a1, a2])
    const a = army([{ uid: '1', unitId: 'a', upgrades: [] }, { uid: '2', unitId: 'b', upgrades: [] }])
    const s = computeArmyStats(a, unitsById, upgradesById)
    expect(s.unitKeywords[0]).toEqual({ keyword: 'Nimble', count: 2 })
    expect(s.unitKeywords).toContainEqual({ keyword: 'Arsenal', count: 1 })
  })

  it('returns zeroed stats for an empty army', () => {
    const { unitsById, upgradesById } = maps([])
    const s = computeArmyStats(army([]), unitsById, upgradesById)
    expect(s.totalPoints).toBe(0)
    expect(s.avgSpeed).toBe(0)
    expect(s.avgCourage).toBe(0)
    expect(s.avgDefenseSave).toBe(0)
    expect(s.effectiveHP).toBe(0)
    expect(s.pointsByRank).toEqual([])
  })
})

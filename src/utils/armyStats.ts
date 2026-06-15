// Army analytics (Feature 4 / Epic F1). Pure, deterministic derivations of a
// built army's statistics — composition, offense (via the dice EV engine),
// defence/durability, mobility/morale, and keyword tallies. Everything here is
// computed from data already in the catalogue (units + upgrades + weapons +
// keywords); no sampling, so the numbers are stable and the spec isn't flaky.
import type { Army, BattleForce, Rank, Unit, Upgrade, Weapon } from '../types/index.ts'
import { attackEV, defenseEV, type AttackColor } from './dice.ts'
import { effectiveRank, unitCost, unitModelCount } from './army.ts'
import { RANK_ORDER, rankName } from './factions.ts'

export interface DicePool { red: number; black: number; white: number }
export interface RankPoints { rank: Rank; label: string; points: number }
export interface RangeBandEV { band: number; label: string; hits: number; crits: number; expected: number }
export interface KeywordTally { keyword: string; count: number }
export interface SpeedTally { speed: number; count: number }

export interface ArmyStats {
  // ── Composition ──
  totalPoints: number
  unitPoints: number
  upgradePoints: number
  activations: number
  models: number // total miniatures across the army
  avgUnitCost: number
  pointsByRank: RankPoints[]
  // ── Offense ──
  attackPool: DicePool // every weapon's dice, melee + ranged
  meleePool: DicePool
  rangedPool: DicePool
  rangeBands: RangeBandEV[] // expected hits+crits of all weapons reaching each band
  weaponKeywords: KeywordTally[]
  // ── Defence / durability ──
  totalWounds: number
  redDefenseUnits: number
  whiteDefenseUnits: number
  surgeDefenseUnits: number
  avgDefenseSave: number // wounds-weighted P(block) per defence die
  effectiveHP: number // Σ wounds / (1 − unit save)
  // ── Mobility & morale ──
  speeds: SpeedTally[]
  avgSpeed: number
  jumpUnits: number
  climbUnits: number
  avgCourage: number
  fearlessUnits: number
  couragelessUnits: number
  // ── Keywords ──
  unitKeywords: KeywordTally[]
}

const EMPTY_POOL = (): DicePool => ({ red: 0, black: 0, white: 0 })

/** Strip a trailing numeric/X value off a keyword so "Pierce 2"/"Pierce X" → "Pierce". */
export function baseKeyword(kw: string): string {
  return kw.replace(/\s+(\d+|X)$/i, '').trim()
}

/** Normalise a weapon's `range` array into a `{min,max}` band span (null max = unlimited). */
export function weaponRange(range: number[]): { min: number; max: number } {
  const min = range[0] == null ? 0 : range[0]
  const rawMax = range.length < 2 ? range[0] : range[1]
  const max = rawMax == null ? Infinity : rawMax
  return { min, max }
}

const RANGE_BANDS: { band: number; label: string }[] = [
  { band: 0, label: 'Melee' },
  { band: 1, label: 'Range 1' },
  { band: 2, label: 'Range 2' },
  { band: 3, label: 'Range 3' },
  { band: 4, label: 'Range 4+' },
]

/** Weapon keywords worth surfacing as an army-wide tally (ordered for display). */
const NOTABLE_WEAPON_KEYWORDS = [
  'Pierce', 'Impact', 'Blast', 'Critical', 'Suppressive', 'High Velocity',
  'Ion', 'Lethal', 'Versatile', 'Cumbersome', 'Fixed Front', 'Immobilize',
  'Long Shot', 'Overrun', 'Overwhelm', 'Poison', 'Ram', 'Scatter', 'Primitive',
]

function addPool(into: DicePool, dice: { red: number; black: number; white: number }) {
  into.red += dice.red || 0
  into.black += dice.black || 0
  into.white += dice.white || 0
}

/**
 * Derive the full statistics breakdown of a built army. Each `ArmyUnit` instance
 * is counted once (a ×3 stack contributes three times) so totals reflect the real
 * list. `bf` (when fielded) only affects how points are bucketed by rank.
 */
export function computeArmyStats(
  army: Army,
  unitsById: Map<string, Unit>,
  upgradesById: Map<string, Upgrade>,
  bf?: BattleForce | null,
): ArmyStats {
  let unitPoints = 0
  let upgradePoints = 0
  const rankPointsMap = {} as Record<Rank, number>
  for (const r of RANK_ORDER) rankPointsMap[r] = 0

  const attackPool = EMPTY_POOL()
  const meleePool = EMPTY_POOL()
  const rangedPool = EMPTY_POOL()
  const bandEV = RANGE_BANDS.map((b) => ({ ...b, hits: 0, crits: 0 }))
  const weaponKwCount = new Map<string, number>()

  let totalWounds = 0
  let redDefenseUnits = 0
  let whiteDefenseUnits = 0
  let surgeDefenseUnits = 0
  let weightedSave = 0 // Σ wounds·save (for the wounds-weighted average)
  let effectiveHP = 0

  let speedSum = 0
  let speedUnits = 0
  const speedMap = new Map<number, number>()
  let jumpUnits = 0
  let climbUnits = 0
  let courageSum = 0
  let courageUnits = 0
  let fearlessUnits = 0
  let couragelessUnits = 0

  const unitKwCount = new Map<string, number>()

  let activations = 0
  let models = 0

  for (const au of army.units) {
    const unit = unitsById.get(au.unitId)
    if (!unit) continue
    activations++
    models += unitModelCount(au, unitsById, upgradesById)

    // ── Composition ──
    unitPoints += unit.cost ?? 0
    for (const up of au.upgrades) upgradePoints += upgradesById.get(up.upgradeId)?.cost ?? 0
    rankPointsMap[effectiveRank(unit, bf)] += unitCost(au, unitsById, upgradesById)

    // ── Offense (unit weapons; upgrades carry no dice in our model) ──
    const surge = unit.surgeAttack ?? 'blank'
    for (const w of unit.weapons ?? []) accumulateWeapon(w, surge, attackPool, meleePool, rangedPool, bandEV, weaponKwCount)

    // ── Defence / durability ──
    const w = unit.wounds ?? 0
    totalWounds += w
    if (unit.defense === 'red') redDefenseUnits++
    else if (unit.defense === 'white') whiteDefenseUnits++
    if (unit.surgeDefense) surgeDefenseUnits++
    const save = unit.defense ? defenseEV(unit.defense, unit.surgeDefense ? 'block' : 'blank') : 0
    weightedSave += w * save
    effectiveHP += save < 1 ? w / (1 - save) : w

    // ── Mobility & morale ──
    if (unit.speed != null) {
      speedSum += unit.speed
      speedUnits++
      speedMap.set(unit.speed, (speedMap.get(unit.speed) ?? 0) + 1)
    }
    if (unit.courage != null && unit.courage > 0) {
      courageSum += unit.courage
      courageUnits++
    } else {
      couragelessUnits++ // courage 0 / dash — droids, vehicles, etc.
    }
    const kwBases = unit.keywords.map(baseKeyword)
    if (kwBases.includes('Jump')) jumpUnits++
    if (kwBases.includes('Climb')) climbUnits++
    if (kwBases.includes('Fearless')) fearlessUnits++

    // ── Keyword tally ──
    for (const base of kwBases) unitKwCount.set(base, (unitKwCount.get(base) ?? 0) + 1)
  }

  const totalPoints = unitPoints + upgradePoints
  const pointsByRank = RANK_ORDER.filter((r) => rankPointsMap[r] > 0).map((r) => ({
    rank: r,
    label: rankName(r),
    points: rankPointsMap[r],
  }))

  const rangeBands: RangeBandEV[] = bandEV.map((b) => ({
    band: b.band,
    label: b.label,
    hits: round1(b.hits),
    crits: round1(b.crits),
    expected: round1(b.hits + b.crits),
  }))

  const weaponKeywords = sortTally(weaponKwCount, NOTABLE_WEAPON_KEYWORDS)
  const unitKeywords = sortTally(unitKwCount)

  const speeds = [...speedMap.entries()].sort((a, b) => a[0] - b[0]).map(([speed, count]) => ({ speed, count }))

  return {
    totalPoints,
    unitPoints,
    upgradePoints,
    activations,
    models,
    avgUnitCost: activations ? Math.round(totalPoints / activations) : 0,
    pointsByRank,
    attackPool,
    meleePool,
    rangedPool,
    rangeBands,
    weaponKeywords,
    totalWounds,
    redDefenseUnits,
    whiteDefenseUnits,
    surgeDefenseUnits,
    avgDefenseSave: totalWounds ? round2(weightedSave / totalWounds) : 0,
    effectiveHP: Math.round(effectiveHP),
    speeds,
    avgSpeed: speedUnits ? round1(speedSum / speedUnits) : 0,
    jumpUnits,
    climbUnits,
    avgCourage: courageUnits ? round1(courageSum / courageUnits) : 0,
    fearlessUnits,
    couragelessUnits,
    unitKeywords,
  }
}

function accumulateWeapon(
  w: Weapon,
  surge: 'crit' | 'hit' | 'blank',
  attackPool: DicePool,
  meleePool: DicePool,
  rangedPool: DicePool,
  bandEV: { band: number; hits: number; crits: number }[],
  weaponKwCount: Map<string, number>,
) {
  addPool(attackPool, w.dice)
  const { min, max } = weaponRange(w.range)
  if (min <= 0) addPool(meleePool, w.dice) // melee-capable (incl. Versatile)
  if (max >= 1) addPool(rangedPool, w.dice) // ranged-capable

  // Expected hits/crits this weapon contributes at each band it reaches.
  const ev = poolEV(w.dice, surge)
  for (const b of bandEV) {
    if (min <= b.band && b.band <= max) {
      b.hits += ev.hits
      b.crits += ev.crits
    }
  }

  for (const kw of w.keywords) {
    const base = baseKeyword(kw)
    weaponKwCount.set(base, (weaponKwCount.get(base) ?? 0) + 1)
  }
}

/** Expected hits + crits of a colour-keyed dice pool under the given surge chart. */
export function poolEV(dice: { red: number; black: number; white: number }, surge: 'crit' | 'hit' | 'blank') {
  let hits = 0
  let crits = 0
  for (const color of ['red', 'black', 'white'] as AttackColor[]) {
    const n = dice[color] || 0
    if (!n) continue
    const e = attackEV(color, surge)
    hits += e.hits * n
    crits += e.crits * n
  }
  return { hits, crits }
}

/** Map → sorted [{keyword,count}], desc by count. `priority` keeps a fixed display order. */
function sortTally(map: Map<string, number>, priority?: string[]): KeywordTally[] {
  const entries = [...map.entries()].map(([keyword, count]) => ({ keyword, count }))
  if (priority) {
    const allowed = new Set(priority)
    return entries
      .filter((e) => allowed.has(e.keyword))
      .sort((a, b) => priority.indexOf(a.keyword) - priority.indexOf(b.keyword))
  }
  return entries.sort((a, b) => b.count - a.count || a.keyword.localeCompare(b.keyword))
}

const round1 = (n: number) => Math.round(n * 10) / 10
const round2 = (n: number) => Math.round(n * 100) / 100

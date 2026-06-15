// ─────────────────────────────────────────────────────────────────────────
// Star Wars: Legion dice model
//
// Attack dice (d8, 8 faces):
//   Red    — 5 Hit, 1 Crit, 1 Surge, 1 Blank
//   Black  — 3 Hit, 1 Crit, 1 Surge, 3 Blank
//   White  — 1 Hit, 1 Crit, 1 Surge, 5 Blank
// Defense dice (d6, 6 faces):
//   Red    — 3 Block, 1 Surge, 2 Blank
//   White  — 1 Block, 1 Surge, 4 Blank
//
// Surge is conditional per unit: a unit's card converts attack surges to a
// Crit or a Hit (or nothing), and defense surges to a Block (or nothing). The
// roller exposes these as per-side toggles since it isn't tied to one unit.
// ─────────────────────────────────────────────────────────────────────────

export type DieType = 'attack' | 'defense'
export type AttackColor = 'red' | 'black' | 'white'
export type DefenseColor = 'red' | 'white'
export type DieColor = AttackColor | DefenseColor

export type AttackFace = 'hit' | 'crit' | 'surge' | 'blank'
export type DefenseFace = 'block' | 'surge' | 'blank'
export type DieFace = AttackFace | DefenseFace

// Faces in display order
export const ATTACK_FACES: AttackFace[] = ['crit', 'hit', 'surge', 'blank']
export const DEFENSE_FACES: DefenseFace[] = ['block', 'surge', 'blank']

// Colours available per side, best → worst
export const ATTACK_COLORS: AttackColor[] = ['red', 'black', 'white']
export const DEFENSE_COLORS: DefenseColor[] = ['red', 'white']

// Surge conversion settings (a side's unit-card surge chart)
export type AttackSurge = 'crit' | 'hit' | 'blank' // surge → crit / hit / none
export type DefenseSurge = 'block' | 'blank' // surge → block / none

// ── Face tables ──────────────────────────────────────────────────────────
const ATTACK_TABLES: Record<AttackColor, AttackFace[]> = {
  // 1 Crit, 5 Hit, 1 Surge, 1 Blank
  red: ['crit', 'hit', 'hit', 'hit', 'hit', 'hit', 'surge', 'blank'],
  // 1 Crit, 3 Hit, 1 Surge, 3 Blank
  black: ['crit', 'hit', 'hit', 'hit', 'surge', 'blank', 'blank', 'blank'],
  // 1 Crit, 1 Hit, 1 Surge, 5 Blank
  white: ['crit', 'hit', 'surge', 'blank', 'blank', 'blank', 'blank', 'blank'],
}

const DEFENSE_TABLES: Record<DefenseColor, DefenseFace[]> = {
  // 3 Block, 1 Surge, 2 Blank
  red: ['block', 'block', 'block', 'surge', 'blank', 'blank'],
  // 1 Block, 1 Surge, 4 Blank
  white: ['block', 'surge', 'blank', 'blank', 'blank', 'blank'],
}

// ── Expected value (pure, deterministic) ────────────────────────────────────
// Average hits/crits/blocks a single die contributes, derived straight from the
// face tables above. Surge faces are folded into the chosen result. Used by the
// Army Stats panel so the numbers are stable (no sampling) and tests aren't flaky.
export function attackEV(color: AttackColor, surge: AttackSurge): { hits: number; crits: number } {
  const table = ATTACK_TABLES[color]
  let hits = 0
  let crits = 0
  for (const face of table) {
    const r = resolveAttackFace(face, surge)
    if (r === 'hit') hits++
    else if (r === 'crit') crits++
  }
  return { hits: hits / table.length, crits: crits / table.length }
}

export function defenseEV(color: DefenseColor, surge: DefenseSurge): number {
  const table = DEFENSE_TABLES[color]
  let blocks = 0
  for (const face of table) if (resolveDefenseFace(face, surge) === 'block') blocks++
  return blocks / table.length
}

// ── Roll a single die ──────────────────────────────────────────────────────
export function rollAttack(color: AttackColor): AttackFace {
  const table = ATTACK_TABLES[color]
  return table[Math.floor(Math.random() * table.length)]
}

export function rollDefense(color: DefenseColor): DefenseFace {
  const table = DEFENSE_TABLES[color]
  return table[Math.floor(Math.random() * table.length)]
}

// ── Interactive die ────────────────────────────────────────────────────────
export interface DieState {
  id: number
  type: DieType
  color: DieColor
  face: AttackFace | DefenseFace
  locked: boolean
  isBonus: boolean
}

// ── Surge resolution ───────────────────────────────────────────────────────
// Resolve a rolled attack face into its final result given the surge chart.
export function resolveAttackFace(face: AttackFace, surge: AttackSurge): 'crit' | 'hit' | 'blank' {
  if (face === 'surge') return surge
  return face // hit | crit | blank pass straight through
}

export function resolveDefenseFace(face: DefenseFace, surge: DefenseSurge): 'block' | 'blank' {
  if (face === 'surge') return surge
  return face // block | blank pass straight through
}

// ── Combat resolution (pure) ───────────────────────────────────────────────
// Order of operations (simplified from the rulebook):
//   1. Resolve attack surges → hits + crits
//   2. Cover cancels hit results (never crits)
//   3. Dodge cancels hit results (never crits)
//   4. Resolve defense surges → blocks
//   5. Pierce cancels block results
//   6. Wounds = max(0, (hits + crits) − blocks)
export interface CombatModifiers {
  atkSurge: AttackSurge
  defSurge: DefenseSurge
  cover: number // cancel up to N hit results
  dodge: number // cancel up to N hit results
  pierce: number // cancel up to N block results
}

export interface CombatResult {
  hits: number // hit results remaining after cover & dodge
  crits: number // crit results
  blocks: number // block results remaining after pierce
  wounds: number // final wounds dealt
}

export function resolveCombat(
  atkPool: { face: AttackFace }[],
  defPool: { face: DefenseFace }[],
  mods: CombatModifiers,
): CombatResult {
  let hits = 0
  let crits = 0
  for (const die of atkPool) {
    const r = resolveAttackFace(die.face, mods.atkSurge)
    if (r === 'hit') hits++
    else if (r === 'crit') crits++
  }

  // Cover then Dodge cancel hit results only — crits are never cancelled here.
  hits = Math.max(0, hits - Math.max(0, mods.cover))
  hits = Math.max(0, hits - Math.max(0, mods.dodge))

  let blocks = 0
  for (const die of defPool) {
    if (resolveDefenseFace(die.face, mods.defSurge) === 'block') blocks++
  }
  blocks = Math.max(0, blocks - Math.max(0, mods.pierce))

  const wounds = Math.max(0, hits + crits - blocks)
  return { hits, crits, blocks, wounds }
}

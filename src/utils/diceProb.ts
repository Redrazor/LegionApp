// Monte-Carlo wound-probability simulator for Star Wars: Legion.
//
// Models a full attack: a mixed-colour attack pool with surge conversion, Aim
// rerolls and Pierce, against a mixed-colour defence pool with surge
// conversion, Cover and Dodge. Aim is played greedily — each aim token rerolls
// up to two dice that currently resolve to a blank (the standard optimal use).

import {
  rollAttack,
  rollDefense,
  resolveAttackFace,
  resolveDefenseFace,
  type AttackColor,
  type DefenseColor,
  type AttackFace,
  type DefenseFace,
  type AttackSurge,
  type DefenseSurge,
} from './dice.ts'

export interface AttackInput {
  red: number
  black: number
  white: number
  surge: AttackSurge
  aims: number // each aim rerolls up to 2 dice
  pierce: number // cancels up to N defence blocks
}

export interface DefenseInput {
  red: number
  white: number
  surge: DefenseSurge
  cover: number // cancels up to N hit results
  dodge: number // cancels up to N hit results
}

export interface SimInput {
  atk: AttackInput
  def: DefenseInput
}

export interface SimResult {
  distribution: number[] // index = wound count, value = number of runs with that result
  cumulative: number[] // index = wound count, value = P(wounds >= i)
  mean: number
  runs: number
}

// Aims reroll up to 2 dice each, preferring dice that resolve to a blank.
function REROLLS_PER_AIM(): number {
  return 2
}

export function simulate(input: SimInput, runs = 50_000): SimResult {
  const { atk, def } = input
  const atkCount = atk.red + atk.black + atk.white
  const maxWounds = atkCount
  const dist = new Array<number>(maxWounds + 1).fill(0)

  // Pre-build the colour list once; faces are rolled fresh each run.
  const colors: AttackColor[] = []
  for (let i = 0; i < atk.red; i++) colors.push('red')
  for (let i = 0; i < atk.black; i++) colors.push('black')
  for (let i = 0; i < atk.white; i++) colors.push('white')

  const defColors: DefenseColor[] = []
  for (let i = 0; i < def.red; i++) defColors.push('red')
  for (let i = 0; i < def.white; i++) defColors.push('white')

  const rerollBudgetBase = Math.max(0, atk.aims) * REROLLS_PER_AIM()

  for (let r = 0; r < runs; r++) {
    // Roll attack pool
    const faces: AttackFace[] = colors.map((c) => rollAttack(c))

    // Aim: reroll resolved-blank dice, up to the aim budget.
    let budget = rerollBudgetBase
    for (let i = 0; i < faces.length && budget > 0; i++) {
      if (resolveAttackFace(faces[i], atk.surge) === 'blank') {
        faces[i] = rollAttack(colors[i])
        budget--
      }
    }

    let hits = 0
    let crits = 0
    for (let i = 0; i < faces.length; i++) {
      const res = resolveAttackFace(faces[i], atk.surge)
      if (res === 'hit') hits++
      else if (res === 'crit') crits++
    }

    // Cover then Dodge cancel hits only.
    hits = Math.max(0, hits - def.cover)
    hits = Math.max(0, hits - def.dodge)

    // Roll defence pool
    let blocks = 0
    for (let i = 0; i < defColors.length; i++) {
      const f: DefenseFace = rollDefense(defColors[i])
      if (resolveDefenseFace(f, def.surge) === 'block') blocks++
    }
    blocks = Math.max(0, blocks - Math.max(0, atk.pierce))

    const wounds = Math.max(0, Math.min(hits + crits - blocks, maxWounds))
    dist[wounds]++
  }

  // Cumulative P(>= i): walk from the top down.
  const cumulative = new Array<number>(maxWounds + 1).fill(0)
  let running = 0
  for (let i = maxWounds; i >= 0; i--) {
    running += dist[i]
    cumulative[i] = running / runs
  }

  const mean = dist.reduce((sum, count, wounds) => sum + count * wounds, 0) / runs

  return { distribution: dist, cumulative, mean, runs }
}

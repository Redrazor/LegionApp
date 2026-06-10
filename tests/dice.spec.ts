import { describe, it, expect } from 'vitest'
import {
  rollAttack,
  rollDefense,
  resolveAttackFace,
  resolveDefenseFace,
  resolveCombat,
  ATTACK_FACES,
  DEFENSE_FACES,
  ATTACK_COLORS,
  DEFENSE_COLORS,
  type AttackFace,
  type DefenseFace,
} from '../src/utils/dice.ts'

describe('rollAttack', () => {
  it('returns a valid AttackFace for every colour', () => {
    for (const color of ATTACK_COLORS) {
      for (let i = 0; i < 50; i++) expect(ATTACK_FACES).toContain(rollAttack(color))
    }
  })

  it('red can roll every attack face over many rolls', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 800; i++) seen.add(rollAttack('red'))
    for (const f of ATTACK_FACES) expect(seen).toContain(f)
  })

  it('white is mostly blanks (5/8) — far fewer hits than red', () => {
    let whiteHits = 0
    let redHits = 0
    for (let i = 0; i < 4000; i++) {
      if (rollAttack('white') === 'hit') whiteHits++
      if (rollAttack('red') === 'hit') redHits++
    }
    expect(redHits).toBeGreaterThan(whiteHits)
  })
})

describe('rollDefense', () => {
  it('returns a valid DefenseFace for every colour', () => {
    for (const color of DEFENSE_COLORS) {
      for (let i = 0; i < 50; i++) expect(DEFENSE_FACES).toContain(rollDefense(color))
    }
  })

  it('red blocks more often than white', () => {
    let redBlocks = 0
    let whiteBlocks = 0
    for (let i = 0; i < 4000; i++) {
      if (rollDefense('red') === 'block') redBlocks++
      if (rollDefense('white') === 'block') whiteBlocks++
    }
    expect(redBlocks).toBeGreaterThan(whiteBlocks)
  })
})

describe('face / colour constants', () => {
  it('ATTACK_FACES is exactly crit, hit, surge, blank', () => {
    expect(ATTACK_FACES).toEqual(['crit', 'hit', 'surge', 'blank'])
  })
  it('DEFENSE_FACES is exactly block, surge, blank', () => {
    expect(DEFENSE_FACES).toEqual(['block', 'surge', 'blank'])
  })
  it('attack colours are red/black/white, defense red/white', () => {
    expect(ATTACK_COLORS).toEqual(['red', 'black', 'white'])
    expect(DEFENSE_COLORS).toEqual(['red', 'white'])
  })
})

describe('resolveAttackFace', () => {
  it('passes hit/crit/blank through unchanged regardless of surge', () => {
    expect(resolveAttackFace('hit', 'crit')).toBe('hit')
    expect(resolveAttackFace('crit', 'blank')).toBe('crit')
    expect(resolveAttackFace('blank', 'hit')).toBe('blank')
  })
  it('converts surge per the surge chart', () => {
    expect(resolveAttackFace('surge', 'crit')).toBe('crit')
    expect(resolveAttackFace('surge', 'hit')).toBe('hit')
    expect(resolveAttackFace('surge', 'blank')).toBe('blank')
  })
})

describe('resolveDefenseFace', () => {
  it('passes block/blank through unchanged', () => {
    expect(resolveDefenseFace('block', 'blank')).toBe('block')
    expect(resolveDefenseFace('blank', 'block')).toBe('blank')
  })
  it('converts surge per the surge chart', () => {
    expect(resolveDefenseFace('surge', 'block')).toBe('block')
    expect(resolveDefenseFace('surge', 'blank')).toBe('blank')
  })
})

describe('resolveCombat', () => {
  const atk = (...faces: AttackFace[]) => faces.map((face) => ({ face }))
  const def = (...faces: DefenseFace[]) => faces.map((face) => ({ face }))
  const NONE = { atkSurge: 'blank', defSurge: 'blank', cover: 0, dodge: 0, pierce: 0 } as const

  it('counts hits and crits as wounds against no defence', () => {
    const r = resolveCombat(atk('hit', 'hit', 'crit'), def(), NONE)
    expect(r).toMatchObject({ hits: 2, crits: 1, blocks: 0, wounds: 3 })
  })

  it('blocks cancel wounds one-for-one', () => {
    const r = resolveCombat(atk('hit', 'hit', 'crit'), def('block', 'block'), NONE)
    expect(r.wounds).toBe(1)
  })

  it('attack surge converts to crit/hit/blank', () => {
    expect(resolveCombat(atk('surge'), def(), { ...NONE, atkSurge: 'crit' }).wounds).toBe(1)
    expect(resolveCombat(atk('surge'), def(), { ...NONE, atkSurge: 'hit' }).wounds).toBe(1)
    expect(resolveCombat(atk('surge'), def(), { ...NONE, atkSurge: 'blank' }).wounds).toBe(0)
  })

  it('defense surge converts to block', () => {
    expect(resolveCombat(atk('hit'), def('surge'), { ...NONE, defSurge: 'block' }).wounds).toBe(0)
    expect(resolveCombat(atk('hit'), def('surge'), { ...NONE, defSurge: 'blank' }).wounds).toBe(1)
  })

  it('cover and dodge cancel hits but never crits', () => {
    const cover = resolveCombat(atk('hit', 'hit', 'crit'), def(), { ...NONE, cover: 5 })
    expect(cover).toMatchObject({ hits: 0, crits: 1, wounds: 1 })
    const dodge = resolveCombat(atk('hit', 'hit', 'crit'), def(), { ...NONE, dodge: 5 })
    expect(dodge).toMatchObject({ hits: 0, crits: 1, wounds: 1 })
  })

  it('pierce removes block results', () => {
    const r = resolveCombat(atk('hit', 'hit'), def('block', 'block'), { ...NONE, pierce: 1 })
    expect(r.blocks).toBe(1)
    expect(r.wounds).toBe(1)
  })

  it('never returns negative wounds', () => {
    const r = resolveCombat(atk('hit'), def('block', 'block', 'block'), NONE)
    expect(r.wounds).toBe(0)
  })
})

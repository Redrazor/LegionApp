import { describe, it, expect } from 'vitest'
import {
  normName, slugify, decodeFaction, decodeRank, decodeUnitType,
  buildUnits, buildUpgrades, buildCommands, buildProducts,
  type TtaUnit, type LhqCard,
} from '../scraper/normalise.ts'

describe('normName', () => {
  it('lowercases and strips punctuation', () => {
    expect(normName("Darth Vader, Dark Lord")).toBe('darth vader dark lord')
  })
  it('drops the "Strike Team" qualifier for matching', () => {
    expect(normName('Rebel Commandos Strike Team')).toBe('rebel commandos')
  })
  it('handles null', () => {
    expect(normName(null)).toBe('')
  })
})

describe('slugify', () => {
  it('combines name + title', () => {
    expect(slugify('Darth Vader', 'Dark Lord of the Sith')).toBe('darth-vader-dark-lord-of-the-sith')
  })
  it('strips quotes and parens', () => {
    expect(slugify('"Chopper" (C1-10P)')).toBe('chopper-c1-10p')
  })
})

describe('fkey decoders', () => {
  it('maps factions', () => {
    expect(decodeFaction(1)).toBe('rebels')
    expect(decodeFaction(2)).toBe('empire')
    expect(decodeFaction(5)).toBe('separatists')
    expect(decodeFaction(6)).toBe('mercenary')
    expect(decodeFaction(undefined)).toBe('mercenary')
  })
  it('maps ranks', () => {
    expect(decodeRank(1)).toBe('commander')
    expect(decodeRank(3)).toBe('special')
    expect(decodeRank(6)).toBe('operative')
  })
  it('maps unit types with fallback', () => {
    expect(decodeUnitType(3)).toBe('ground vehicle')
    expect(decodeUnitType(999)).toBe('trooper')
  })
})

const tta = (over: Partial<TtaUnit> = {}): TtaUnit => ({
  id: 1, name: 'Stormtroopers', faction_fkey: 2, rank_fkey: 2, unit_type_fkey: 1,
  current_cost: 44, health: 1, image_url: 'https://cdn/x.webp', ...over,
})
const lhq = (over: Partial<LhqCard> = {}): LhqCard => ({
  id: 'aa', cardName: 'Stormtroopers', cardType: 'unit', faction: 'empire', rank: 'corps',
  cost: 44, defense: 'white', surges: ['hit'], speed: 2, wounds: 1, courage: 1,
  keywords: ['Precise 1'], upgradeBar: ['heavy weapon', 'personnel'], ...over,
})

describe('buildUnits', () => {
  it('merges tabletopadmiral data with Legion HQ stats by name', () => {
    const units = buildUnits([tta()], [lhq()])
    expect(units).toHaveLength(1)
    const u = units[0]
    expect(u.faction).toBe('empire')
    expect(u.rank).toBe('corps')
    expect(u.cost).toBe(44)
    expect(u.defense).toBe('white')
    expect(u.surgeAttack).toBe('hit')
    expect(u.upgradeBar).toEqual(['heavy weapon', 'personnel'])
    expect(u.keywords).toEqual(['Precise 1'])
    expect(u.cardImage).toMatch(/\/images\/units\/stormtroopers\.webp$/)
    expect(u.hasFullData).toBe(true)
  })

  it('falls back to decoded fkeys for tabletopadmiral-only units', () => {
    const units = buildUnits([tta({ name: 'Brand New Unit', faction_fkey: 5, rank_fkey: 1 })], [])
    expect(units[0].faction).toBe('separatists')
    expect(units[0].rank).toBe('commander')
    expect(units[0].hasFullData).toBe(false)
    expect(units[0].upgradeBar).toEqual([])
  })

  it('appends Legion-HQ-only units with no card scan', () => {
    const units = buildUnits([], [lhq({ cardName: 'Rebel Commandos Strike Team', faction: 'rebels', rank: 'special' })])
    expect(units).toHaveLength(1)
    expect(units[0].faction).toBe('rebels')
    expect(units[0].cardImage).toBeNull()
    expect(units[0].id).toMatch(/^lhq-/)
  })

  it('produces distinct slugs for same-named units with different titles', () => {
    const units = buildUnits(
      [tta({ id: 1, name: 'Darth Vader', title: 'Dark Lord', include_title: true }),
       tta({ id: 2, name: 'Darth Vader', title: "Emperor's Apprentice", include_title: true })],
      [],
    )
    const slugs = units.map((u) => u.slug)
    expect(new Set(slugs).size).toBe(2)
  })

  it('splits defense surge into surgeDefense flag', () => {
    const units = buildUnits([tta()], [lhq({ surges: ['crit', 'block'] })])
    expect(units[0].surgeAttack).toBe('crit')
    expect(units[0].surgeDefense).toBe(true)
  })
})

describe('buildUpgrades', () => {
  it('maps slot, cost and faction restriction', () => {
    const ups = buildUpgrades([
      { id: 'u1', cardName: 'Hope', cardType: 'upgrade', cardSubtype: 'force', cost: 5, faction: 'rebels', keywords: [] },
    ])
    expect(ups[0].slot).toBe('force')
    expect(ups[0].cost).toBe(5)
    expect(ups[0].faction).toBe('rebels')
  })
})

describe('buildCommands', () => {
  it('parses pip count from cardSubtype', () => {
    const cmds = buildCommands([
      { id: 'c1', cardName: 'Ambush', cardType: 'command', cardSubtype: '1', commander: null, faction: null },
      { id: 'c2', cardName: 'Imperial Discipline', cardType: 'command', cardSubtype: '3', commander: 'General Veers', faction: 'empire' },
    ])
    expect(cmds[0].pips).toBe(1)
    expect(cmds[1].pips).toBe(3)
    expect(cmds[1].commander).toBe('General Veers')
  })
})

describe('buildProducts', () => {
  it('generates one expansion per unit grouped by faction', () => {
    const units = buildUnits([tta({ name: 'Stormtroopers', rank_fkey: 2 })], [lhq()])
    const products = buildProducts(units)
    expect(products).toHaveLength(1)
    expect(products[0].faction).toBe('empire')
    expect(products[0].unitSlugs).toEqual([units[0].slug])
    expect(products[0].name).toMatch(/Unit Expansion/)
  })
})

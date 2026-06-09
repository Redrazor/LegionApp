import { describe, it, expect } from 'vitest'
import {
  slugify, mapFaction, normalizeKeyword, rankIndex,
  buildUnits, buildUpgrades, buildCommands, buildProducts,
  type Lhq2Card,
} from '../scraper/normalise.ts'
import { extractCards } from '../scraper/scrape.ts'

function card(over: Partial<Lhq2Card> = {}): Lhq2Card {
  return {
    id: 'aa', cardName: 'Stormtroopers', cardType: 'unit', cardSubtype: 'trooper',
    rank: 'corps', faction: 'empire', cost: 44, isUnique: false, imageName: 'Stormtroopers.webp',
    keywords: ['Precise 1'], upgradeBar: ['heavy weapon', 'personnel'],
    stats: { minicount: 4, hp: 1, defense: 'w', courage: 1, speed: 2, hitsurge: 'h', defsurge: '' },
    weapons: [{ name: 'E-11 Blaster', range: [1, 3], dice: { r: 0, b: 0, w: 1 }, keywords: [] }],
    history: [],
    ...over,
  }
}

describe('slugify', () => {
  it('combines name + title and strips punctuation', () => {
    expect(slugify('Darth Vader', 'Dark Lord of the Sith')).toBe('darth-vader-dark-lord-of-the-sith')
    expect(slugify('"Chopper" (C1-10P)')).toBe('chopper-c1-10p')
  })
})

describe('mapFaction', () => {
  it('passes through canonical factions', () => {
    expect(mapFaction('rebels')).toBe('rebels')
    expect(mapFaction('separatists')).toBe('separatists')
  })
  it('maps mandalorians and unknowns to mercenary', () => {
    expect(mapFaction('mandalorians')).toBe('mercenary')
    expect(mapFaction(undefined)).toBe('mercenary')
    expect(mapFaction('fringe')).toBe('mercenary')
  })
})

describe('normalizeKeyword', () => {
  it('keeps plain strings and renders valued keywords as "Name N"', () => {
    expect(normalizeKeyword('Charge')).toBe('Charge')
    expect(normalizeKeyword({ name: 'Sharpshooter', value: 1 })).toBe('Sharpshooter 1')
    expect(normalizeKeyword({ name: 'Cover' })).toBe('Cover')
  })
})

describe('rankIndex', () => {
  it('orders ranks commander..heavy', () => {
    expect(rankIndex('commander')).toBeLessThan(rankIndex('corps'))
    expect(rankIndex('corps')).toBeLessThan(rankIndex('heavy'))
    expect(rankIndex('unknown')).toBe(99)
  })
})

describe('buildUnits', () => {
  it('maps a card to a unit with decoded stats, weapons and image', () => {
    const [u] = buildUnits([card()])
    expect(u.faction).toBe('empire')
    expect(u.rank).toBe('corps')
    expect(u.cost).toBe(44)
    expect(u.defense).toBe('white')
    expect(u.surgeAttack).toBe('hit')
    expect(u.surgeDefense).toBe(false)
    expect(u.wounds).toBe(1)
    expect(u.speed).toBe(2)
    expect(u.keywords).toEqual(['Precise 1'])
    expect(u.upgradeBar).toEqual(['heavy weapon', 'personnel'])
    expect(u.weapons[0]).toEqual({ name: 'E-11 Blaster', range: [1, 3], dice: { red: 0, black: 0, white: 1 }, keywords: [] })
    expect(u.cardImage).toBe('/images/units/stormtroopers.webp')
    expect(u.hasFullData).toBe(true)
  })

  it('decodes red defense and crit/block surges', () => {
    const [u] = buildUnits([card({ stats: { defense: 'r', hitsurge: 'c', defsurge: 'b', hp: 8, speed: 2, courage: 2 } })])
    expect(u.defense).toBe('red')
    expect(u.surgeAttack).toBe('crit')
    expect(u.surgeDefense).toBe(true)
  })

  it('keeps same-named cards distinct, each with its own data (Han Solo cmd vs op)', () => {
    const units = buildUnits([
      card({ id: 'ac', cardName: 'Han Solo', title: 'Unorthodox General', rank: 'commander', faction: 'rebels', cost: 100, keywords: ['Gunslinger'] }),
      card({ id: 'Fc', cardName: 'Han Solo', title: 'Reluctant Hero', rank: 'operative', faction: 'rebels', cost: 90, keywords: ['Charge'] }),
    ])
    expect(units).toHaveLength(2)
    const cmd = units.find((u) => u.rank === 'commander')!
    const op = units.find((u) => u.rank === 'operative')!
    expect(cmd.cost).toBe(100)
    expect(cmd.keywords).toEqual(['Gunslinger'])
    expect(op.cost).toBe(90)
    expect(op.keywords).toEqual(['Charge'])
    expect(cmd.slug).not.toBe(op.slug)
  })

  it('normalises structured keywords', () => {
    const [u] = buildUnits([card({ keywords: ['Steady', { name: 'Sharpshooter', value: 1 }] })])
    expect(u.keywords).toEqual(['Steady', 'Sharpshooter 1'])
  })

  it('ignores non-unit cards', () => {
    expect(buildUnits([card({ cardType: 'upgrade' })])).toHaveLength(0)
  })
})

describe('buildUpgrades', () => {
  it('maps slot, cost and image', () => {
    const ups = buildUpgrades([
      { id: 'u1', cardName: 'Recon Intel', cardType: 'upgrade', cardSubtype: 'gear', cost: 2, imageName: 'Recon Intel.webp', keywords: [] },
    ])
    expect(ups[0].slot).toBe('gear')
    expect(ups[0].cost).toBe(2)
    expect(ups[0].cardImage).toBe('/images/upgrades/recon-intel.webp')
  })
})

describe('buildCommands', () => {
  it('parses pip count and joins multi-commander arrays', () => {
    const cmds = buildCommands([
      { id: 'c1', cardName: 'Ambush', cardType: 'command', cardSubtype: '1', commander: 'General Veers', faction: 'empire' },
      { id: 'c2', cardName: 'Shared Plan', cardType: 'command', cardSubtype: '2', commander: ['AND', 'Han Solo', 'Luke Skywalker'], faction: 'rebels' },
    ])
    expect(cmds[0].pips).toBe(1)
    expect(cmds[0].commander).toBe('General Veers')
    expect(cmds[1].commander).toBe('Han Solo, Luke Skywalker')
  })
})

describe('buildProducts', () => {
  it('generates one expansion per unit grouped by faction', () => {
    const units = buildUnits([card({ cardName: 'Stormtroopers' })])
    const products = buildProducts(units)
    expect(products).toHaveLength(1)
    expect(products[0].faction).toBe('empire')
    expect(products[0].unitSlugs).toEqual([units[0].slug])
    expect(products[0].name).toMatch(/Unit Expansion/)
  })
})

describe('extractCards', () => {
  it('pulls every card object out of a bundle-shaped string', () => {
    const bundle =
      'var x={"aa":{"id":"aa","cardName":"Leia","cardType":"unit","stats":{"hp":6},"weapons":[{"name":"Blaster"}]},' +
      '"ab":{"id":"ab","cardName":"Recon Intel","cardType":"upgrade"}};doStuff();'
    const cards = extractCards(bundle)
    expect(cards).toHaveLength(2)
    expect(cards.find((c) => c.cardType === 'unit')!.cardName).toBe('Leia')
    expect(cards.find((c) => c.cardType === 'upgrade')!.cardName).toBe('Recon Intel')
  })

  it('handles JS apostrophe escapes', () => {
    const bundle = `{"id":"x","cardName":"Han\\'s Crew","cardType":"unit"}`
    const cards = extractCards(bundle)
    expect(cards[0].cardName).toBe("Han's Crew")
  })
})

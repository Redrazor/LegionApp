import { describe, it, expect } from 'vitest'
import {
  slugify, mapFaction, normalizeKeyword, rankIndex,
  buildUnits, buildUpgrades, buildCommands, buildBattleForces, buildBattleCards,
  type Lhq2Card, type Lhq2BattleForce,
} from '../scraper/normalise.ts'
import { extractCards, extractBattleForces, parseChunkMap } from '../scraper/scrape.ts'

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
    expect(mapFaction('mandalorians')).toBe('mandalorians')
  })
  it('maps unknowns and missing factions to mercenary', () => {
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

  it('splits comma-combined weapon keywords into separate entries', () => {
    const [u] = buildUnits([card({
      weapons: [{ name: 'Mortar', range: [2, 3], dice: { r: 0, b: 2, w: 0 }, keywords: ['Fixed Front, Blast', 'Suppressive'] }],
    })])
    expect(u.weapons[0].keywords).toEqual(['Fixed Front', 'Blast', 'Suppressive'])
  })

  it('blanks a quote-only placeholder weapon name but keeps legit quoted names', () => {
    const [u] = buildUnits([card({
      weapons: [
        { name: '""', range: [0], dice: { r: 0, b: 2, w: 2 }, keywords: ['Versatile'] },
        { name: 'Ax-108 "Ground Buzzer"', range: [1, 2], dice: { r: 0, b: 4, w: 0 }, keywords: [] },
      ],
    })])
    expect(u.weapons[0].name).toBe('')
    expect(u.weapons[1].name).toBe('Ax-108 "Ground Buzzer"')
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

  it('recovers cards whose names carry double-escaped quotes (\\\\" → \\")', () => {
    // The minifier emits \\" where a single \" was meant, which breaks BOTH JSON.parse
    // and `new Function` — this silently dropped 6 real cards (e.g. Ax-108 "Ground Buzzer",
    // General Grievous "Sinister Cyborg") until parseSegment learned to repair it.
    // The bundle bytes here are:  "cardName":"Ax-108 \\"Ground Buzzer\\""
    const bundle = `{"id":"gb","cardName":"Ax-108 \\\\"Ground Buzzer\\\\"","cardType":"upgrade"}`
    const cards = extractCards(bundle)
    expect(cards).toHaveLength(1)
    expect(cards[0].cardName).toBe('Ax-108 "Ground Buzzer"')
  })

  it('keeps a unit with a double-escaped weapon name (the Grievous case)', () => {
    const bundle = `{"id":"ia","cardName":"General Grievous","title":"Sinister Cyborg","cardType":"unit","weapons":[{"name":"\\\\"\\\\"","range":[0]}]}`
    const cards = extractCards(bundle)
    expect(cards).toHaveLength(1)
    expect(cards[0].cardName).toBe('General Grievous')
  })

  it('stamps specialIssue onto units that carry it', () => {
    const units = buildUnits([
      card({ id: 'storm', cardName: 'Stormtroopers', specialIssue: 'Blizzard Force' }),
      card({ id: 'plain', cardName: 'Snowtroopers' }),
    ])
    expect(units.find((u) => u.id === 'storm')!.specialIssue).toBe('Blizzard Force')
    expect(units.find((u) => u.id === 'plain')!.specialIssue).toBeUndefined()
  })
})

function rawBf(over: Partial<Lhq2BattleForce> = {}): Lhq2BattleForce {
  return {
    name: '212th Attack Battalion',
    faction: 'republic',
    linkId: '2t',
    commander: ['gw', 'ue'],
    operative: ['Da'],
    corps: ['fz', 'Bi'],
    special: ['Ay'],
    support: ['mb'],
    heavy: ['gb', 'oo', 'qs'],
    allowedUpgrades: ['uf', 'Io'],
    plainTextRules: ['When an allied non-COMMANDER Vehicle unit attacks…'],
    rules: {},
    'standard mode': {
      commander: [1, 2], operative: [0, 1], corps: [1, 4],
      special: [0, 3], support: [0, 3], heavy: [1, 3],
    },
    '500-point mode': {
      commander: [1, 2], operative: [0, 1], corps: [1, 3],
      special: [0, 2], support: [0, 3], heavy: [1, 2],
    },
    ...over,
  }
}

describe('buildBattleForces', () => {
  it('normalizes mode keys, brackets, and rank-unit lists', () => {
    const [bf] = buildBattleForces([rawBf()])
    expect(bf.linkId).toBe('2t')
    expect(bf.faction).toBe('republic')
    expect(bf.rankUnits.corps).toEqual(['fz', 'Bi'])
    expect(bf.rankUnits.heavy).toEqual(['gb', 'oo', 'qs'])
    expect(bf.modes.standard.corps).toEqual([1, 4])
    expect(bf.modes['500'].corps).toEqual([1, 3])
    expect(bf.rulesText).toHaveLength(1)
  })

  it('captures commOp when present, null otherwise', () => {
    const withCommOp = rawBf({
      linkId: '5t', name: '501st Legion',
      'standard mode': { commander: [1, 2], operative: [0, 2], corps: [1, 4], special: [0, 3], support: [0, 3], heavy: [1, 3], commOp: 2 },
    })
    const [a, b] = buildBattleForces([withCommOp, rawBf()])
    // sorted by faction then name: 501st before 212th? both republic → name order
    const f501 = [a, b].find((x) => x.linkId === '5t')!
    const f212 = [a, b].find((x) => x.linkId === '2t')!
    expect(f501.modes.standard.commOp).toBe(2)
    expect(f212.modes.standard.commOp).toBeNull()
  })

  it('passes rules through verbatim and maps forceAffinity', () => {
    const [bf] = buildBattleForces([rawBf({
      linkId: 'mc', name: 'Mandalorian Clans', faction: 'mandalorians', forceAffinity: '',
      rules: { unitLimits: [{ ids: ['Hq'], count: [0, 2] }], countMercs: true },
    })])
    expect(bf.faction).toBe('mandalorians')
    expect(bf.forceAffinity).toBeNull() // empty string → null
    expect(bf.rules).toEqual({ unitLimits: [{ ids: ['Hq'], count: [0, 2] }], countMercs: true })
  })

  it('defaults absent rank brackets and lists safely', () => {
    const [bf] = buildBattleForces([{ name: 'Sparse', faction: 'empire', linkId: 'sp' }])
    expect(bf.rankUnits.commander).toEqual([])
    expect(bf.modes.standard.corps).toEqual([0, 0])
    expect(bf.modes.standard.commOp).toBeNull()
    expect(bf.allowedUpgrades).toEqual([])
    expect(bf.disallowedUpgrades).toEqual([])
  })
})

describe('parseChunkMap', () => {
  it('extracts the chunk-number → hash map from a main bundle', () => {
    const js = 'r.u=function(e){return"static/js/"+e+"."+{148:"d6bdac75",526:"023fe73c",799:"63d3a998"}[e]+".chunk.js"}'
    const map = parseChunkMap(js)
    expect(map['526']).toBe('023fe73c')
    expect(map['148']).toBe('d6bdac75')
  })
})

describe('extractBattleForces', () => {
  it('brace-matches battle-force objects with unquoted keys and !0/!1', () => {
    const chunk = 'var v={"212th Attack Battalion":{name:"212th Attack Battalion",faction:"republic",' +
      'linkId:"2t",corps:["fz"],allowedUpgrades:["uf"],rules:{countMercs:!0},' +
      '"standard mode":{corps:[1,4]}},"x":{name:"X",faction:"empire",linkId:"xx",rules:{}}};use(v)'
    const bfs = extractBattleForces(chunk)
    expect(bfs).toHaveLength(2)
    const f = bfs.find((b) => b.linkId === '2t')!
    expect(f.name).toBe('212th Attack Battalion')
    expect(f.corps).toEqual(['fz'])
    expect(f.rules).toEqual({ countMercs: true })
  })

  it('skips matches that are not battle-force objects', () => {
    expect(extractBattleForces('var z={foo:1, linkId:undefined}')).toEqual([])
  })
})

describe('buildBattleCards', () => {
  const cards: Lhq2Card[] = [
    { id: 'p1', cardName: 'Breakthrough', cardType: 'battle', cardSubtype: 'primary', keywords: [], imageName: 'Breakthrough.webp' },
    { id: 'p2', cardName: 'Recon Mission', cardType: 'battle', cardSubtype: 'secondary', keywords: ['Recon'], imageName: 'Recon Mission.webp' },
    { id: 'a1', cardName: 'Fortified Position', cardType: 'battle', cardSubtype: 'advantage', keywords: [], faction: 'fringe' },
    { id: 'a2', cardName: 'Fortified Position', cardType: 'battle', cardSubtype: 'advantage', keywords: ['Recon'] },
    { id: 'u1', cardName: 'Stormtroopers', cardType: 'unit' }, // ignored
  ]

  it('keeps the v2 deck types (primary / secondary / advantage)', () => {
    const out = buildBattleCards(cards)
    expect(out).toHaveLength(4)
    expect(out.find((c) => c.id === 'p1')!.subtype).toBe('primary')
    expect(out.find((c) => c.id === 'p2')!.subtype).toBe('secondary')
    expect(out.find((c) => c.id === 'a1')!.subtype).toBe('advantage')
  })

  it('flags Recon-pool cards by keyword and maps faction', () => {
    const out = buildBattleCards(cards)
    expect(out.find((c) => c.id === 'p2')!.isRecon).toBe(true)
    expect(out.find((c) => c.id === 'p1')!.isRecon).toBe(false)
    expect(out.find((c) => c.id === 'a1')!.faction).toBe('mercenary') // fringe → mercenary
    expect(out.find((c) => c.id === 'p1')!.faction).toBeNull()
  })

  it('deduplicates slugs for same-named standard/Recon variants', () => {
    const out = buildBattleCards(cards)
    const forts = out.filter((c) => c.name === 'Fortified Position').map((c) => c.slug)
    expect(forts).toEqual(['fortified-position', 'fortified-position-2'])
  })

  it('derives the card image path from the slug, null when imageless', () => {
    const out = buildBattleCards(cards)
    expect(out.find((c) => c.id === 'p1')!.cardImage).toBe('/images/battle/breakthrough.webp')
    expect(out.find((c) => c.id === 'a2')!.cardImage).toBeNull() // no imageName
  })
})

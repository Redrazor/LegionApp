import { describe, it, expect } from 'vitest'
import {
  validateArmy, unitCost, uniqueNames, findDuplicateUniques,
  cardLimit, limitViolations, hasFieldCommander, entourageBonuses, unmetDetachments,
  encodeArmy, decodeArmy, toCompact, fromCompact,
} from '../src/utils/army.ts'
import { FORMATS, formatForCap, formatName, rankLimits } from '../src/utils/factions.ts'
import type { Army, Unit, Upgrade } from '../src/types/index.ts'

function unit(id: string, over: Partial<Unit> = {}): Unit {
  return {
    id, slug: id, name: id, title: '', faction: 'empire', rank: 'corps',
    unitType: 'trooper', cost: 50, defense: 'white', surgeAttack: null,
    surgeDefense: false, speed: 2, wounds: 5, courage: 1, isUnique: false,
    keywords: [], upgradeBar: [], cardImage: null, portraitImage: null,
    hasFullData: true, history: [], ...over,
  }
}
function upgrade(id: string, over: Partial<Upgrade> = {}): Upgrade {
  return { id, slug: id, name: id, slot: 'gear', cost: 10, isUnique: false, faction: null, keywords: [], cardImage: null, ...over }
}

function makeMaps(units: Unit[], upgrades: Upgrade[] = []) {
  return {
    unitsById: new Map(units.map((u) => [u.id, u])),
    upgradesById: new Map(upgrades.map((u) => [u.id, u])),
  }
}

describe('unitCost', () => {
  it('sums unit cost and upgrade costs', () => {
    const { unitsById, upgradesById } = makeMaps([unit('a', { cost: 100 })], [upgrade('g', { cost: 15 })])
    const cost = unitCost({ uid: 'x', unitId: 'a', upgrades: [{ slot: 'gear#0', upgradeId: 'g' }] }, unitsById, upgradesById)
    expect(cost).toBe(115)
  })
  it('treats missing unit as zero', () => {
    const { unitsById, upgradesById } = makeMaps([])
    expect(unitCost({ uid: 'x', unitId: 'missing', upgrades: [] }, unitsById, upgradesById)).toBe(0)
  })
})

describe('findDuplicateUniques', () => {
  it('detects repeated names', () => {
    expect(findDuplicateUniques(['Vader', 'Vader', 'Luke'])).toEqual(['Vader'])
  })
  it('returns empty when all distinct', () => {
    expect(findDuplicateUniques(['Vader', 'Luke'])).toEqual([])
  })
})

describe('uniqueNames', () => {
  it('collects unique units and unique upgrades only', () => {
    const units = [unit('vader', { isUnique: true }), unit('storm', { isUnique: false })]
    const upgrades = [upgrade('saber', { isUnique: true }), upgrade('grip', { isUnique: false })]
    const { unitsById, upgradesById } = makeMaps(units, upgrades)
    const army: Army = {
      name: '', faction: 'empire', gameSize: 800,
      units: [
        { uid: '1', unitId: 'vader', upgrades: [{ slot: 'force#0', upgradeId: 'saber' }] },
        { uid: '2', unitId: 'storm', upgrades: [{ slot: 'gear#0', upgradeId: 'grip' }] },
      ],
    }
    expect(uniqueNames(army, unitsById, upgradesById).sort()).toEqual(['saber', 'vader'])
  })
})

describe('validateArmy', () => {
  const corps = (id: string) => unit(id, { rank: 'corps', cost: 50 })
  const cmd = (id: string) => unit(id, { rank: 'commander', cost: 80, isUnique: true })

  it('flags missing commander and too few corps', () => {
    const units = [corps('c1')]
    const { unitsById, upgradesById } = makeMaps(units)
    const army: Army = { name: '', faction: 'empire', gameSize: 800, units: [{ uid: '1', unitId: 'c1', upgrades: [] }] }
    const v = validateArmy(army, unitsById, upgradesById)
    expect(v.valid).toBe(false)
    expect(v.items.find((i) => i.label === 'Commander')?.ok).toBe(false)
    expect(v.items.find((i) => i.label === 'Corps')?.ok).toBe(false)
  })

  it('passes a legal minimal list (1 commander + 3 corps)', () => {
    const units = [cmd('v'), corps('c1'), corps('c2'), corps('c3')]
    const { unitsById, upgradesById } = makeMaps(units)
    const army: Army = {
      name: 'Legal', faction: 'empire', gameSize: 800,
      units: units.map((u, i) => ({ uid: String(i), unitId: u.id, upgrades: [] })),
    }
    const v = validateArmy(army, unitsById, upgradesById)
    expect(v.valid).toBe(true)
    expect(v.points).toBe(80 + 50 * 3)
    expect(v.activations).toBe(4)
    expect(v.rankCounts.corps).toBe(3)
  })

  it('flags exceeding the points ceiling', () => {
    const units = [cmd('v'), corps('c1'), corps('c2'), corps('c3')]
    const { unitsById, upgradesById } = makeMaps(units)
    const army: Army = {
      name: '', faction: 'empire', gameSize: 200,
      units: units.map((u, i) => ({ uid: String(i), unitId: u.id, upgrades: [] })),
    }
    const v = validateArmy(army, unitsById, upgradesById)
    expect(v.items.find((i) => i.label === 'Points')?.ok).toBe(false)
    expect(v.valid).toBe(false)
  })

  it('flags too many of a rank (>2 commanders)', () => {
    const units = [cmd('v1'), cmd('v2'), cmd('v3'), corps('c1'), corps('c2'), corps('c3')]
    const { unitsById, upgradesById } = makeMaps(units)
    const army: Army = {
      name: '', faction: 'empire', gameSize: 800,
      units: units.map((u, i) => ({ uid: String(i), unitId: u.id, upgrades: [] })),
    }
    const v = validateArmy(army, unitsById, upgradesById)
    expect(v.rankCounts.commander).toBe(3)
    expect(v.items.find((i) => i.label === 'Commander')?.ok).toBe(false)
  })

  it('detects mixed non-mercenary factions but allows mercenary mixing', () => {
    const units = [
      cmd('v'), corps('c1'), corps('c2'), corps('c3'),
      unit('merc', { rank: 'corps', faction: 'mercenary' }),
    ]
    const { unitsById, upgradesById } = makeMaps(units)
    const armyOk: Army = {
      name: '', faction: 'empire', gameSize: 800,
      units: units.map((u, i) => ({ uid: String(i), unitId: u.id, upgrades: [] })),
    }
    expect(validateArmy(armyOk, unitsById, upgradesById).items.find((i) => i.label === 'Faction')?.ok).toBe(true)

    const rebel = unit('reb', { rank: 'corps', faction: 'rebels' })
    unitsById.set('reb', rebel)
    const armyMixed: Army = {
      name: '', faction: 'empire', gameSize: 800,
      units: [...armyOk.units, { uid: 'x', unitId: 'reb', upgrades: [] }],
    }
    expect(validateArmy(armyMixed, unitsById, upgradesById).items.find((i) => i.label === 'Faction')?.ok).toBe(false)
  })

  it('flags unpriced units and marks the army illegal', () => {
    const units = [cmd('v'), corps('c1'), corps('c2'), unit('mystery', { rank: 'corps', cost: null })]
    const { unitsById, upgradesById } = makeMaps(units)
    const army: Army = {
      name: '', faction: 'empire', gameSize: 800,
      units: units.map((u, i) => ({ uid: String(i), unitId: u.id, upgrades: [] })),
    }
    const v = validateArmy(army, unitsById, upgradesById)
    const unpriced = v.items.find((i) => i.label === 'Unpriced')
    expect(unpriced).toBeDefined()
    expect(unpriced!.ok).toBe(false)
    expect(unpriced!.detail).toMatch(/1 unit/)
    expect(v.valid).toBe(false)
    // points reflect only the costed units, shown with a "+" to signal incompleteness
    expect(v.items.find((i) => i.label === 'Points')?.detail).toBe('180+ / 800')
  })

  it('detects duplicate unique conflicts', () => {
    const units = [cmd('v'), corps('c1'), corps('c2'), corps('c3')]
    const { unitsById, upgradesById } = makeMaps(units)
    const army: Army = {
      name: '', faction: 'empire', gameSize: 800,
      units: [
        { uid: '1', unitId: 'v', upgrades: [] },
        { uid: '2', unitId: 'v', upgrades: [] }, // same unique commander twice
        { uid: '3', unitId: 'c1', upgrades: [] },
        { uid: '4', unitId: 'c2', upgrades: [] },
        { uid: '5', unitId: 'c3', upgrades: [] },
      ],
    }
    const v = validateArmy(army, unitsById, upgradesById)
    expect(v.items.find((i) => i.label === 'Uniques')?.ok).toBe(false)
  })
})

describe('game formats / rankLimits', () => {
  it('resolves each named cap to its own format', () => {
    expect(formatForCap(600).id).toBe('recon')
    expect(formatForCap(800).id).toBe('legacy')
    expect(formatForCap(1000).id).toBe('standard')
    expect(formatForCap(1600).id).toBe('grand')
  })

  it('clamps an arbitrary cap down to the nearest bracket ≤ cap', () => {
    expect(formatForCap(750).id).toBe('recon') // 750 → largest cap ≤ 750 is 600
    expect(formatForCap(999).id).toBe('legacy') // 999 → 800
    expect(formatForCap(1599).id).toBe('standard') // 1599 → 1000
    expect(formatForCap(5000).id).toBe('grand') // above all → largest
  })

  it('floors caps below the smallest bracket to Recon (old 500 armies)', () => {
    expect(formatForCap(500).id).toBe('recon')
    expect(formatForCap(0).id).toBe('recon')
  })

  it('Recon and Standard rank tables match the official rulebooks', () => {
    expect(rankLimits(600)).toEqual({
      commander: { min: 1, max: 1 }, operative: { min: 0, max: 1 }, corps: { min: 2, max: 4 },
      special: { min: 0, max: 2 }, support: { min: 0, max: 2 }, heavy: { min: 0, max: 1 },
    })
    expect(rankLimits(1000)).toEqual({
      commander: { min: 1, max: 2 }, operative: { min: 0, max: 2 }, corps: { min: 3, max: 6 },
      special: { min: 0, max: 3 }, support: { min: 0, max: 3 }, heavy: { min: 0, max: 2 },
    })
  })

  it('exposes ascending caps and human names', () => {
    expect(FORMATS.map((f) => f.cap)).toEqual([600, 800, 1000, 1600])
    expect(formatName(1000)).toBe('Standard')
    expect(formatName(600)).toBe('Recon')
  })
})

describe('validateArmy per-format limits', () => {
  const corps = (id: string) => unit(id, { rank: 'corps', cost: 30 })
  const cmd = (id: string) => unit(id, { rank: 'commander', cost: 80, isUnique: true })

  it('enforces Recon limits at 600 (exactly 1 commander, 2 corps min)', () => {
    // 2 commanders is legal at 800/1000 but illegal in Recon (max 1)
    const units = [cmd('v1'), cmd('v2'), corps('c1'), corps('c2')]
    const { unitsById, upgradesById } = makeMaps(units)
    const army: Army = {
      name: '', faction: 'empire', gameSize: 600,
      units: units.map((u, i) => ({ uid: String(i), unitId: u.id, upgrades: [] })),
    }
    const v = validateArmy(army, unitsById, upgradesById)
    expect(v.items.find((i) => i.label === 'Commander')?.ok).toBe(false)
    expect(v.items.find((i) => i.label === 'Commander')?.detail).toBe('2 (max 1)')
    // 2 corps satisfies the Recon minimum (would be illegal at 1000 which needs 3)
    expect(v.items.find((i) => i.label === 'Corps')?.ok).toBe(true)
  })

  it('the same roster is legal at Recon 600 but short on corps at Standard 1000', () => {
    const units = [cmd('v'), corps('c1'), corps('c2')]
    const { unitsById, upgradesById } = makeMaps(units)
    const make = (cap: number): Army => ({
      name: '', faction: 'empire', gameSize: cap,
      units: units.map((u, i) => ({ uid: String(i), unitId: u.id, upgrades: [] })),
    })
    expect(validateArmy(make(600), unitsById, upgradesById).valid).toBe(true)
    const std = validateArmy(make(1000), unitsById, upgradesById)
    expect(std.valid).toBe(false)
    expect(std.items.find((i) => i.label === 'Corps')?.detail).toBe('2 (need 3)')
  })
})

describe('cardLimit', () => {
  it('is 0 (unlimited) for an ordinary card, 1 for a unique, and the explicit limit otherwise', () => {
    expect(cardLimit({ isUnique: false })).toBe(0)
    expect(cardLimit({ isUnique: true })).toBe(1)
    expect(cardLimit({ isUnique: false, limit: 2 })).toBe(2)
    expect(cardLimit({ isUnique: true, limit: 2 })).toBe(2) // explicit limit wins
  })
})

describe('limitViolations', () => {
  const base = (units: ReturnType<typeof unit>[], upgrades: ReturnType<typeof upgrade>[]) => {
    const { unitsById, upgradesById } = makeMaps(units, upgrades)
    return { unitsById, upgradesById }
  }

  it('flags a duplicate unique (max 1)', () => {
    const { unitsById, upgradesById } = base([unit('vader', { isUnique: true })], [])
    const army: Army = {
      name: '', faction: 'empire', gameSize: 1000,
      units: [
        { uid: '1', unitId: 'vader', upgrades: [] },
        { uid: '2', unitId: 'vader', upgrades: [] },
      ],
    }
    expect(limitViolations(army, unitsById, upgradesById)).toEqual([
      { name: 'vader', count: 2, limit: 1 },
    ])
  })

  it('allows a limited upgrade up to its cap but flags over it, grouping by name', () => {
    // Two distinct upgrade cards sharing the name "Jedi Training", limit 2.
    const ups = [
      upgrade('jt-a', { name: 'Jedi Training', limit: 2 }),
      upgrade('jt-b', { name: 'Jedi Training', limit: 2 }),
    ]
    const { unitsById, upgradesById } = base([unit('a'), unit('b'), unit('c')], ups)
    const within: Army = {
      name: '', faction: 'empire', gameSize: 1000,
      units: [
        { uid: '1', unitId: 'a', upgrades: [{ slot: 'training#0', upgradeId: 'jt-a' }] },
        { uid: '2', unitId: 'b', upgrades: [{ slot: 'training#0', upgradeId: 'jt-b' }] },
      ],
    }
    expect(limitViolations(within, unitsById, upgradesById)).toEqual([]) // 2 ≤ 2

    const over: Army = {
      ...within,
      units: [
        ...within.units,
        { uid: '3', unitId: 'c', upgrades: [{ slot: 'training#0', upgradeId: 'jt-a' }] },
      ],
    }
    expect(limitViolations(over, unitsById, upgradesById)).toEqual([
      { name: 'Jedi Training', count: 3, limit: 2 },
    ])
  })

  it('surfaces in validateArmy as a failing Uniques item', () => {
    const { unitsById, upgradesById } = base([unit('vader', { isUnique: true })], [])
    const army: Army = {
      name: '', faction: 'empire', gameSize: 1000,
      units: [
        { uid: '1', unitId: 'vader', upgrades: [] },
        { uid: '2', unitId: 'vader', upgrades: [] },
      ],
    }
    const item = validateArmy(army, unitsById, upgradesById).items.find((i) => i.label === 'Uniques')
    expect(item?.ok).toBe(false)
    expect(item?.detail).toContain('vader ×2 (max 1)')
  })
})

describe('Field Commander', () => {
  const corps = (id: string) => unit(id, { rank: 'corps', cost: 30 })

  it('hasFieldCommander detects the keyword', () => {
    const units = [corps('a'), unit('fc', { rank: 'corps', keywords: ['Field Commander'] })]
    const { unitsById } = makeMaps(units)
    const army: Army = {
      name: '', faction: 'empire', gameSize: 1000,
      units: units.map((u, i) => ({ uid: String(i), unitId: u.id, upgrades: [] })),
    }
    expect(hasFieldCommander(army, unitsById)).toBe(true)
  })

  it('a 0-commander army is legal when it includes a Field Commander unit', () => {
    const units = [
      unit('fc', { rank: 'corps', keywords: ['Field Commander'] }),
      corps('c1'), corps('c2'), corps('c3'),
    ]
    const { unitsById, upgradesById } = makeMaps(units)
    const army: Army = {
      name: '', faction: 'empire', gameSize: 1000,
      units: units.map((u, i) => ({ uid: String(i), unitId: u.id, upgrades: [] })),
    }
    const cmd = validateArmy(army, unitsById, upgradesById).items.find((i) => i.label === 'Commander')
    expect(cmd?.ok).toBe(true)
    expect(cmd?.detail).toBe('0 / 2 (Field Commander)')
  })

  it('without a Field Commander, 0 commanders fails', () => {
    const units = [unit('x', { rank: 'corps' }), unit('y', { rank: 'corps' }), unit('z', { rank: 'corps' })]
    const { unitsById, upgradesById } = makeMaps(units)
    const army: Army = {
      name: '', faction: 'empire', gameSize: 1000,
      units: units.map((u, i) => ({ uid: String(i), unitId: u.id, upgrades: [] })),
    }
    expect(validateArmy(army, unitsById, upgradesById).items.find((i) => i.label === 'Commander')?.ok).toBe(false)
  })
})

describe('Entourage', () => {
  it('widens the named unit’s rank max by 1', () => {
    const units = [
      unit('a', { rank: 'commander', isUnique: true }),
      unit('b', { rank: 'commander', isUnique: true }),
      unit('c', { rank: 'commander', isUnique: true }),
      unit('ent', { rank: 'corps', keywords: ['Entourage a'] }),
    ]
    const { unitsById, upgradesById } = makeMaps(units)
    const army: Army = {
      name: '', faction: 'empire', gameSize: 1000,
      units: units.map((u, i) => ({ uid: String(i), unitId: u.id, upgrades: [] })),
    }
    expect(entourageBonuses(army, unitsById)).toEqual({ commander: 1 })
    const cmd = validateArmy(army, unitsById, upgradesById).items.find((i) => i.label === 'Commander')
    expect(cmd?.ok).toBe(true) // 3 commanders allowed (2 + 1 entourage)
    expect(cmd?.detail).toBe('3 / 3')
  })

  it('targets the right rank when the named unit shares a name across cards', () => {
    // "Darth Vader" exists as both a commander and an operative card; the bonus
    // must reach commander regardless of catalogue order (regression for the
    // name-index "last card wins" bug).
    const units = [
      unit('vader-cmd', { name: 'Darth Vader', rank: 'commander', isUnique: true }),
      unit('vader-op', { name: 'Darth Vader', rank: 'operative', isUnique: true }),
      unit('tarkin', { rank: 'commander', isUnique: true, keywords: ['Entourage Darth Vader'] }),
    ]
    const { unitsById } = makeMaps(units)
    const army: Army = {
      name: '', faction: 'empire', gameSize: 1000,
      units: [{ uid: '0', unitId: 'tarkin', upgrades: [] }],
    }
    expect(entourageBonuses(army, unitsById).commander).toBe(1)
  })

  it('three commanders without an entourage exceed the Standard max', () => {
    const units = [
      unit('a', { rank: 'commander', isUnique: true }),
      unit('b', { rank: 'commander', isUnique: true }),
      unit('c', { rank: 'commander', isUnique: true }),
    ]
    const { unitsById, upgradesById } = makeMaps(units)
    const army: Army = {
      name: '', faction: 'empire', gameSize: 1000,
      units: units.map((u, i) => ({ uid: String(i), unitId: u.id, upgrades: [] })),
    }
    expect(validateArmy(army, unitsById, upgradesById).items.find((i) => i.label === 'Commander')?.detail).toBe('3 (max 2)')
  })
})

describe('Detachment', () => {
  it('is unmet when the named parent unit is absent, met when present', () => {
    const det = unit('df', { rank: 'special', keywords: ['Detachment Shoretroopers'] })
    const parent = unit('shore', { name: 'Shoretroopers', rank: 'corps' })
    const lone = makeMaps([det])
    const withParent = makeMaps([det, parent])
    const army = (ids: string[]): Army => ({
      name: '', faction: 'empire', gameSize: 1000,
      units: ids.map((id, i) => ({ uid: String(i), unitId: id, upgrades: [] })),
    })
    expect(unmetDetachments(army(['df']), lone.unitsById)).toEqual(['df → needs Shoretroopers'])
    expect(unmetDetachments(army(['df', 'shore']), withParent.unitsById)).toEqual([])
  })

  it('treats a rank token (e.g. "special") as a rank requirement', () => {
    const probe = unit('probe', { rank: 'special', keywords: ['Detachment special'] })
    const sf = unit('sf', { rank: 'special' })
    const maps = makeMaps([probe, sf])
    const army = (ids: string[]): Army => ({
      name: '', faction: 'empire', gameSize: 1000,
      units: ids.map((id, i) => ({ uid: String(i), unitId: id, upgrades: [] })),
    })
    // probe alone: the only special unit is itself → unmet
    expect(unmetDetachments(army(['probe']), maps.unitsById)).toEqual(['probe → needs special'])
    // with another special-rank unit → met
    expect(unmetDetachments(army(['probe', 'sf']), maps.unitsById)).toEqual([])
  })

  it('surfaces in validateArmy as a failing Detachment item', () => {
    const det = unit('df', { rank: 'special', keywords: ['Detachment Shoretroopers'] })
    const { unitsById, upgradesById } = makeMaps([det, unit('c1', { rank: 'corps' })])
    const army: Army = {
      name: '', faction: 'empire', gameSize: 1000,
      units: [
        { uid: '0', unitId: 'df', upgrades: [] },
        { uid: '1', unitId: 'c1', upgrades: [] },
      ],
    }
    const item = validateArmy(army, unitsById, upgradesById).items.find((i) => i.label === 'Detachment')
    expect(item?.ok).toBe(false)
    expect(item?.detail).toContain('needs Shoretroopers')
  })
})

describe('army serialisation', () => {
  it('round-trips through compact form', () => {
    const army: Army = {
      name: 'My List', faction: 'rebels', gameSize: 500,
      units: [{ uid: 'a', unitId: 'luke', upgrades: [{ slot: 'force#0', upgradeId: 'saber' }] }],
    }
    const back = fromCompact(toCompact(army))
    expect(back.name).toBe('My List')
    expect(back.faction).toBe('rebels')
    expect(back.gameSize).toBe(500)
    expect(back.units[0].unitId).toBe('luke')
    expect(back.units[0].upgrades[0]).toEqual({ slot: 'force#0', upgradeId: 'saber' })
  })

  it('round-trips through base64url encoding', () => {
    const army: Army = {
      name: 'Café Crew', faction: 'empire', gameSize: 800,
      units: [{ uid: 'a', unitId: 'vader', upgrades: [] }],
    }
    const decoded = decodeArmy(encodeArmy(army))
    expect(decoded).not.toBeNull()
    expect(decoded!.name).toBe('Café Crew')
    expect(decoded!.units[0].unitId).toBe('vader')
  })

  it('returns null for malformed encoded strings', () => {
    expect(decodeArmy('!!!not-valid!!!')).toBeNull()
  })
})

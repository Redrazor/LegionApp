import { describe, it, expect } from 'vitest'
import {
  validateArmy, unitCost, uniqueNames, findDuplicateUniques,
  cardLimit, limitViolations, hasFieldCommander, entourageBonuses, unmetDetachments,
  unitMeetsRequirements, mercenaryIssues, MERC_RANK_CAP, unitAllowedInFaction, isMandalorianClanUnit,
  encodeArmy, decodeArmy, toCompact, fromCompact, rankChipState, catalogueForRank,
  primaryWeaponDice, detachmentTarget, presentDetachmentParents, groupArmyUnits,
  heavyWeaponTeamUnmet, unitLegalityIssues,
} from '../src/utils/army.ts'
import { FORMATS, formatForCap, formatName, rankLimits } from '../src/utils/factions.ts'
import type { Army, Unit, Upgrade } from '../src/types/index.ts'

function unit(id: string, over: Partial<Unit> = {}): Unit {
  return {
    id, slug: id, name: id, title: '', faction: 'empire', rank: 'corps',
    unitType: 'trooper', affiliation: null, affiliations: [], cost: 50, defense: 'white', surgeAttack: null,
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

describe('groupArmyUnits', () => {
  it('collapses same unit + same loadout into one ×N group', () => {
    const groups = groupArmyUnits([
      { uid: 'a', unitId: 'storm', upgrades: [] },
      { uid: 'b', unitId: 'storm', upgrades: [] },
      { uid: 'c', unitId: 'storm', upgrades: [] },
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].qty).toBe(3)
    expect(groups[0].uids).toEqual(['a', 'b', 'c'])
    expect(groups[0].representative.uid).toBe('a')
  })

  it('keeps differently-equipped copies in separate groups', () => {
    const groups = groupArmyUnits([
      { uid: 'a', unitId: 'storm', upgrades: [{ slot: 'heavy#0', upgradeId: 'dlt' }] },
      { uid: 'b', unitId: 'storm', upgrades: [] },
      { uid: 'c', unitId: 'storm', upgrades: [{ slot: 'heavy#0', upgradeId: 'dlt' }] },
    ])
    expect(groups).toHaveLength(2)
    expect(groups[0].uids).toEqual(['a', 'c']) // both DLT-equipped
    expect(groups[1].uids).toEqual(['b']) // bare
  })

  it('treats loadout as order-independent', () => {
    const groups = groupArmyUnits([
      { uid: 'a', unitId: 'u', upgrades: [{ slot: 'g#0', upgradeId: 'x' }, { slot: 'g#1', upgradeId: 'y' }] },
      { uid: 'b', unitId: 'u', upgrades: [{ slot: 'g#1', upgradeId: 'y' }, { slot: 'g#0', upgradeId: 'x' }] },
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].qty).toBe(2)
  })

  it('separates different units and preserves first-appearance order', () => {
    const groups = groupArmyUnits([
      { uid: 'a', unitId: 'corps', upgrades: [] },
      { uid: 'b', unitId: 'cmd', upgrades: [] },
      { uid: 'c', unitId: 'corps', upgrades: [] },
    ])
    expect(groups.map((g) => g.unitId)).toEqual(['corps', 'cmd'])
    expect(groups[0].qty).toBe(2)
    expect(groups[1].qty).toBe(1)
  })

  it('returns no groups for an empty army', () => {
    expect(groupArmyUnits([])).toEqual([])
  })
})

describe('heavyWeaponTeamUnmet', () => {
  const hwt = unit('warriors', {
    name: 'Mandalorian Warriors',
    keywords: ['Jump 2', 'Heavy Weapon Team', 'Duelist'],
    upgradeBar: ['heavy weapon', 'training', 'gear'],
  })
  const plain = unit('storm', { keywords: ['Precise 1'], upgradeBar: ['heavy weapon', 'gear'] })
  const { unitsById } = makeMaps([hwt, plain])

  it('flags a Heavy Weapon Team unit with an empty heavy-weapon slot', () => {
    const army: Army = {
      name: '', faction: 'mandalorians', gameSize: 1000,
      units: [{ uid: '1', unitId: 'warriors', upgrades: [{ slot: 'training#1', upgradeId: 't' }] }],
    }
    expect(heavyWeaponTeamUnmet(army, unitsById)).toEqual(['Mandalorian Warriors'])
  })

  it('passes when a heavy weapon is equipped', () => {
    const army: Army = {
      name: '', faction: 'mandalorians', gameSize: 1000,
      units: [{ uid: '1', unitId: 'warriors', upgrades: [{ slot: 'heavy weapon#0', upgradeId: 'hw' }] }],
    }
    expect(heavyWeaponTeamUnmet(army, unitsById)).toEqual([])
  })

  it('ignores units without the keyword even with an empty heavy-weapon slot', () => {
    const army: Army = {
      name: '', faction: 'empire', gameSize: 1000,
      units: [{ uid: '1', unitId: 'storm', upgrades: [] }],
    }
    expect(heavyWeaponTeamUnmet(army, unitsById)).toEqual([])
  })

  it('lists each offending unit instance', () => {
    const army: Army = {
      name: '', faction: 'mandalorians', gameSize: 1000,
      units: [
        { uid: '1', unitId: 'warriors', upgrades: [] },
        { uid: '2', unitId: 'warriors', upgrades: [{ slot: 'heavy weapon#0', upgradeId: 'hw' }] },
        { uid: '3', unitId: 'warriors', upgrades: [] },
      ],
    }
    expect(heavyWeaponTeamUnmet(army, unitsById)).toEqual(['Mandalorian Warriors', 'Mandalorian Warriors'])
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

  it('applies the Mandalorian Clans battle-force rank override (Corps min 2)', () => {
    // Standard: Corps 3→2; everything else inherited from the base format.
    expect(rankLimits(1000, 'mandalorians').corps).toEqual({ min: 2, max: 6 })
    expect(rankLimits(1000, 'mandalorians').commander).toEqual({ min: 1, max: 2 })
    // Recon already had Corps min 2 → unchanged.
    expect(rankLimits(600, 'mandalorians').corps).toEqual({ min: 2, max: 4 })
    // Other factions and the no-faction call keep the standard table.
    expect(rankLimits(1000, 'empire').corps).toEqual({ min: 3, max: 6 })
    expect(rankLimits(1000).corps).toEqual({ min: 3, max: 6 })
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

describe('unitAllowedInFaction', () => {
  it('keeps non-mercenaries to their own faction', () => {
    const u = unit('storm', { faction: 'empire' })
    expect(unitAllowedInFaction(u, 'empire')).toBe(true)
    expect(unitAllowedInFaction(u, 'rebels')).toBe(false)
  })

  it('gates mercenaries by their affiliations (the two-Boba case)', () => {
    const bobaEmpire = unit('boba-e', { name: 'Boba Fett', faction: 'mercenary', affiliations: ['empire'] })
    const bobaRebel = unit('boba-r', { name: 'Boba Fett', faction: 'mercenary', affiliations: ['rebels'] })
    expect(unitAllowedInFaction(bobaEmpire, 'empire')).toBe(true)
    expect(unitAllowedInFaction(bobaEmpire, 'rebels')).toBe(false)
    expect(unitAllowedInFaction(bobaRebel, 'empire')).toBe(false)
    expect(unitAllowedInFaction(bobaRebel, 'rebels')).toBe(true)
  })

  it('allows any mercenary into a mercenary-faction army, and none with no affiliations into a standard one', () => {
    const lone = unit('lone', { faction: 'mercenary', affiliations: [] })
    expect(unitAllowedInFaction(lone, 'mercenary')).toBe(true)
    expect(unitAllowedInFaction(lone, 'empire')).toBe(false)
    expect(unitAllowedInFaction(lone, null)).toBe(false)
  })

  it('treats Mandalorian-clan units as native to a mandalorians army regardless of faction', () => {
    // A mercenary clan unit (e.g. Din Djarin) is legal in a Mandalorian Clans army…
    const din = unit('din', { faction: 'mercenary', affiliation: 'Children of the Watch', affiliations: [] })
    expect(unitAllowedInFaction(din, 'mandalorians')).toBe(true)
    // …but a non-clan mercenary is not.
    const blackSun = unit('bs', { faction: 'mercenary', affiliation: 'black sun', affiliations: ['empire'] })
    expect(unitAllowedInFaction(blackSun, 'mandalorians')).toBe(false)
    // A native faction='mandalorians' unit stays legal too.
    const garSaxon = unit('gar', { faction: 'mandalorians', affiliation: 'Clan Saxon' })
    expect(unitAllowedInFaction(garSaxon, 'mandalorians')).toBe(true)
  })
})

describe('isMandalorianClanUnit', () => {
  it('matches the five Mandalorian clan affiliations only', () => {
    for (const aff of ['Mandalore', 'Clan Kryze', 'Clan Saxon', 'Clan Wren', 'Children of the Watch']) {
      expect(isMandalorianClanUnit(unit('u', { affiliation: aff }))).toBe(true)
    }
    expect(isMandalorianClanUnit(unit('u', { affiliation: 'black sun' }))).toBe(false)
    expect(isMandalorianClanUnit(unit('u', { affiliation: null }))).toBe(false)
  })
})

describe('mercenaryIssues', () => {
  const merc = (id: string, over: Partial<Unit> = {}) =>
    unit(id, { faction: 'mercenary', affiliations: ['empire'], ...over })
  const armyOf = (faction: Army['faction'], units: Unit[]): Army => ({
    name: '', faction, gameSize: 1000,
    units: units.map((u, i) => ({ uid: String(i), unitId: u.id, upgrades: [] })),
  })

  it('flags mercenaries whose affiliations exclude the army faction', () => {
    const units = [merc('boba', { affiliations: ['empire'] }), merc('lone', { affiliations: [] })]
    const { unitsById } = makeMaps(units)
    expect(mercenaryIssues(armyOf('empire', units), unitsById).illegalAllies).toEqual(['lone'])
    expect(mercenaryIssues(armyOf('rebels', units), unitsById).illegalAllies.sort()).toEqual(['boba', 'lone'])
  })

  it('fields mercenaries natively in a mercenary-faction army (no affiliation check)', () => {
    const units = [merc('a', { affiliations: [] })]
    const { unitsById } = makeMaps(units)
    expect(mercenaryIssues(armyOf('mercenary', units), unitsById).illegalAllies).toEqual([])
  })

  it('caps mercenaries at ≤2 corps and ≤1 of each other rank', () => {
    expect(MERC_RANK_CAP).toMatchObject({ corps: 2, commander: 1, heavy: 1 })
    const units = [
      merc('c1', { rank: 'corps' }), merc('c2', { rank: 'corps' }), merc('c3', { rank: 'corps' }),
      merc('h1', { rank: 'heavy' }),
    ]
    const { unitsById } = makeMaps(units)
    const issues = mercenaryIssues(armyOf('empire', units), unitsById)
    expect(issues.capExceeded).toEqual([{ rank: 'corps', count: 3, cap: 2 }])
    expect(issues.rankCounts.corps).toBe(3)
  })

  it('treats Mandalorian-clan units as native (no caps, satisfy minimums) in a mandalorians army', () => {
    // Three Mandalorian Warriors (mercenary clan corps) in a Mandalorian Clans army.
    const units = [
      merc('w1', { rank: 'corps', affiliation: 'Mandalore', affiliations: [] }),
      merc('w2', { rank: 'corps', affiliation: 'Mandalore', affiliations: [] }),
      merc('w3', { rank: 'corps', affiliation: 'Mandalore', affiliations: [] }),
    ]
    const { unitsById } = makeMaps(units)
    const issues = mercenaryIssues(armyOf('mandalorians', units), unitsById)
    expect(issues.capExceeded).toEqual([])     // not capped — they're native
    expect(issues.rankCounts.corps).toBe(0)    // excluded from the no-min subtraction
    expect(issues.illegalAllies).toEqual([])
    // A non-clan mercenary in the same army is still an (illegal) ally.
    const mixed = [...units, merc('bs', { affiliation: 'black sun', affiliations: ['empire'] })]
    expect(mercenaryIssues(armyOf('mandalorians', mixed), makeMaps(mixed).unitsById).illegalAllies).toEqual(['bs'])
  })

  it('treats an affiliation-less detachment as native when its parent is fielded', () => {
    // The Support Mandalorian Warriors (a "Detachment Mandalorian Warriors" / Heavy
    // Weapon Team unit) has no affiliation, so it relies on its parent being present.
    const parent = merc('warriors', {
      name: 'Mandalorian Warriors', rank: 'corps', affiliation: 'Mandalore', affiliations: [],
    })
    const detach = merc('warriors-hw', {
      name: 'Mandalorian Warriors', rank: 'support', affiliation: null, affiliations: [],
      keywords: ['Detachment Mandalorian Warriors', 'Heavy Weapon Team'],
    })
    const units = [parent, detach, detach] // two support detachments (would exceed merc cap of 1)
    const { unitsById } = makeMaps([parent, detach])
    const issues = mercenaryIssues(armyOf('mandalorians', units), unitsById)
    expect(issues.illegalAllies).toEqual([]) // not a foreign ally
    expect(issues.capExceeded).toEqual([])   // not subject to the merc per-rank cap
    expect(issues.rankCounts.support).toBe(0)
  })

  it('still flags a detachment whose parent is absent', () => {
    const detach = merc('warriors-hw', {
      name: 'Mandalorian Warriors', rank: 'support', affiliation: null, affiliations: [],
      keywords: ['Detachment Mandalorian Warriors'],
    })
    const { unitsById } = makeMaps([detach])
    // No parent in the list → falls through to the normal (illegal) ally check.
    expect(mercenaryIssues(armyOf('mandalorians', [detach]), unitsById).illegalAllies).toEqual(['Mandalorian Warriors'])
  })
})

describe('unitLegalityIssues', () => {
  const armyOf = (faction: Army['faction'], aus: Army['units']): Army =>
    ({ name: '', faction, gameSize: 1000, units: aus })
  const au = (unitId: string, upgrades: { slot: string; upgradeId: string }[] = []) =>
    ({ uid: unitId + Math.random(), unitId, upgrades })

  it('returns no issues for a plain, legal unit', () => {
    const u = unit('storm', { faction: 'empire' })
    const a = armyOf('empire', [au('storm')])
    expect(unitLegalityIssues(a.units[0], a, makeMaps([u]).unitsById)).toEqual([])
  })

  it('flags a Heavy Weapon Team unit missing its heavy weapon, and clears once equipped', () => {
    const u = unit('arc', { faction: 'republic', keywords: ['Heavy Weapon Team'], upgradeBar: ['heavy weapon'] })
    const { unitsById } = makeMaps([u])
    const empty = armyOf('republic', [au('arc')])
    expect(unitLegalityIssues(empty.units[0], empty, unitsById)).toEqual(['Needs a heavy weapon'])
    const armed = armyOf('republic', [au('arc', [{ slot: 'heavy weapon#0', upgradeId: 'hw' }])])
    expect(unitLegalityIssues(armed.units[0], armed, unitsById)).toEqual([])
  })

  it('flags a detachment whose parent is absent and clears when present', () => {
    const parent = unit('warriors', { name: 'Mandalorian Warriors', faction: 'mercenary', affiliation: 'Mandalore', rank: 'corps' })
    const detach = unit('warriors-hw', {
      name: 'Mandalorian Warriors', faction: 'mercenary', affiliation: null, rank: 'support',
      keywords: ['Detachment Mandalorian Warriors'],
    })
    const { unitsById } = makeMaps([parent, detach])
    const lone = armyOf('mandalorians', [au('warriors-hw')])
    expect(unitLegalityIssues(lone.units[0], lone, unitsById)).toEqual(['Needs Mandalorian Warriors'])
    const withParent = armyOf('mandalorians', [au('warriors'), au('warriors-hw')])
    expect(unitLegalityIssues(withParent.units[1], withParent, unitsById)).toEqual([])
  })

  it('flags a mercenary that cannot ally into the army faction', () => {
    const m = unit('bossk', { faction: 'mercenary', affiliations: ['empire'] })
    const { unitsById } = makeMaps([m])
    const inRebels = armyOf('rebels', [au('bossk')])
    expect(unitLegalityIssues(inRebels.units[0], inRebels, unitsById)).toEqual([`Can't ally here`])
    const inEmpire = armyOf('empire', [au('bossk')])
    expect(unitLegalityIssues(inEmpire.units[0], inEmpire, unitsById)).toEqual([])
  })

  it('flags an unpriced unit', () => {
    const u = unit('new', { faction: 'empire', cost: null })
    const a = armyOf('empire', [au('new')])
    expect(unitLegalityIssues(a.units[0], a, makeMaps([u]).unitsById)).toEqual(['No points cost'])
  })
})

describe('mercenary rules in validateArmy', () => {
  const emp = (id: string, over: Partial<Unit> = {}) => unit(id, { faction: 'empire', ...over })
  const merc = (id: string, over: Partial<Unit> = {}) =>
    unit(id, { faction: 'mercenary', affiliations: ['empire'], ...over })
  const build = (units: Unit[], faction: Army['faction'] = 'empire'): Army => ({
    name: '', faction, gameSize: 1000,
    units: units.map((u, i) => ({ uid: String(i), unitId: u.id, upgrades: [] })),
  })

  it('mercenaries do not satisfy a rank minimum (no-min rule)', () => {
    // 1 commander + 3 corps total, but one corps is a merc → only 2 non-merc corps.
    const units = [
      emp('cmd', { rank: 'commander' }),
      emp('c1', { rank: 'corps' }), emp('c2', { rank: 'corps' }), merc('m1', { rank: 'corps' }),
    ]
    const { unitsById, upgradesById } = makeMaps(units)
    const corps = validateArmy(build(units), unitsById, upgradesById).items.find((i) => i.label === 'Corps')
    expect(corps?.ok).toBe(false)
    expect(corps?.detail).toBe('3 (need 3 non-merc)')
    // Add a 4th, non-merc corps → 3 non-merc → satisfied.
    const ok = [...units, emp('c3', { rank: 'corps' })]
    expect(validateArmy(build(ok), makeMaps(ok).unitsById, upgradesById).items.find((i) => i.label === 'Corps')?.ok).toBe(true)
  })

  it('surfaces an Allies failure for an unaffiliated mercenary', () => {
    const units = [emp('cmd', { rank: 'commander' }), emp('c1', { rank: 'corps' }),
      emp('c2', { rank: 'corps' }), emp('c3', { rank: 'corps' }),
      merc('boba', { rank: 'operative', affiliations: ['separatists'] })]
    const { unitsById, upgradesById } = makeMaps(units)
    const allies = validateArmy(build(units, 'empire'), unitsById, upgradesById).items.find((i) => i.label === 'Allies')
    expect(allies?.ok).toBe(false)
    expect(allies?.detail).toContain('boba')
  })

  it('surfaces a Mercenaries cap failure (3 merc corps)', () => {
    const units = [emp('cmd', { rank: 'commander' }),
      merc('m1', { rank: 'corps' }), merc('m2', { rank: 'corps' }), merc('m3', { rank: 'corps' })]
    const { unitsById, upgradesById } = makeMaps(units)
    const item = validateArmy(build(units), unitsById, upgradesById).items.find((i) => i.label === 'Mercenaries')
    expect(item?.ok).toBe(false)
    expect(item?.detail).toContain('Corps 3 (max 2)')
  })
})

describe('unitMeetsRequirements', () => {
  it('treats absent or empty requirements as always equippable', () => {
    const u = unit('x')
    expect(unitMeetsRequirements(u, undefined)).toBe(true)
    expect(unitMeetsRequirements(u, [])).toBe(true)
  })

  it('matches a single criterion by cardName (case-insensitive)', () => {
    const u = unit('hunter', { name: 'The Bad Batch' })
    expect(unitMeetsRequirements(u, [{ cardName: 'the bad batch' }])).toBe(true)
    expect(unitMeetsRequirements(unit('storm', { name: 'Stormtroopers' }), [{ cardName: 'The Bad Batch' }])).toBe(false)
  })

  it('ANDs the fields within one criterion object', () => {
    const u = unit('clone', { unitType: 'clone trooper', rank: 'corps' })
    expect(unitMeetsRequirements(u, [{ cardSubtype: 'clone trooper', rank: 'corps' }])).toBe(true)
    expect(unitMeetsRequirements(u, [{ cardSubtype: 'clone trooper', rank: 'special' }])).toBe(false)
  })

  it('handles an OR group (Jedi Training: Jedi Knight OR Jedi Knight General)', () => {
    const req = ['OR', { cardName: 'Jedi Knight' }, { cardName: 'Jedi Knight General' }]
    expect(unitMeetsRequirements(unit('jk', { name: 'Jedi Knight' }), req)).toBe(true)
    expect(unitMeetsRequirements(unit('jkg', { name: 'Jedi Knight General' }), req)).toBe(true)
    expect(unitMeetsRequirements(unit('luke', { name: 'Luke Skywalker' }), req)).toBe(false)
  })

  it('handles a nested AND + NOT group (Imperial Special Forces, not Inferno Squad)', () => {
    const req = ['AND', { cardName: 'Imperial Special Forces' }, ['NOT', { title: 'Inferno Squad' }]]
    const isf = (title: string) => unit('isf', { name: 'Imperial Special Forces', title })
    expect(unitMeetsRequirements(isf('Strike Team'), req)).toBe(true)
    expect(unitMeetsRequirements(isf('Inferno Squad'), req)).toBe(false)
    expect(unitMeetsRequirements(unit('other', { name: 'Shoretroopers' }), req)).toBe(false)
  })

  it('handles a nested OR inside AND (Echo: clone trooper of corps OR special rank)', () => {
    const req = ['AND', { cardSubtype: 'clone trooper' }, ['OR', { rank: 'corps' }, { rank: 'special' }]]
    expect(unitMeetsRequirements(unit('a', { unitType: 'clone trooper', rank: 'corps' }), req)).toBe(true)
    expect(unitMeetsRequirements(unit('b', { unitType: 'clone trooper', rank: 'heavy' }), req)).toBe(false)
    expect(unitMeetsRequirements(unit('c', { unitType: 'trooper', rank: 'corps' }), req)).toBe(false)
  })

  it('matches affiliation and a keyword (value-suffixed keywords match the base)', () => {
    const u = unit('mando', { name: 'Mandalorian Warriors', affiliation: 'Mandalore', keywords: ['Sharpshooter 2'] })
    expect(unitMeetsRequirements(u, [{ affiliation: 'Mandalore' }])).toBe(true)
    expect(unitMeetsRequirements(u, [{ affiliation: 'Clan Wren' }])).toBe(false)
    expect(unitMeetsRequirements(u, [{ keywords: ['Sharpshooter'] }])).toBe(true)
    expect(unitMeetsRequirements(u, [{ keywords: ['Nimble'] }])).toBe(false)
  })

  it('gates forceAffinity by the hand-set Force-user list, failing open when unknown', () => {
    const darkReq = [{ forceAffinity: 'dark side' }]
    expect(unitMeetsRequirements(unit('vader', { name: 'Darth Vader' }), darkReq)).toBe(true)
    expect(unitMeetsRequirements(unit('luke', { name: 'Luke Skywalker' }), darkReq)).toBe(false) // light user, dark power
    expect(unitMeetsRequirements(unit('nobody', { name: 'Unlisted Jedi' }), darkReq)).toBe(true) // unknown → fail open
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

describe('primaryWeaponDice', () => {
  const wpn = (red: number, black: number, white: number, name = 'w') => ({ name, range: [1, 3], dice: { red, black, white }, keywords: [] })

  it('returns the dice of the weapon with the most total dice', () => {
    const u = unit('u', { weapons: [wpn(1, 0, 0, 'sidearm'), wpn(0, 2, 3, 'rifle')] })
    expect(primaryWeaponDice(u)).toEqual({ red: 0, black: 2, white: 3 })
  })

  it('returns all-zero when the unit has no weapons', () => {
    expect(primaryWeaponDice(unit('u', { weapons: [] }))).toEqual({ red: 0, black: 0, white: 0 })
  })
})

describe('catalogueForRank', () => {
  const units = [
    unit('storm', { name: 'Stormtroopers', rank: 'corps', cost: 44, faction: 'empire' }),
    unit('snow', { name: 'Snowtroopers', rank: 'corps', cost: 48, faction: 'empire' }),
    unit('vader', { name: 'Darth Vader', rank: 'commander', cost: 190, faction: 'empire' }),
    unit('rebel', { name: 'Rebel Troopers', rank: 'corps', cost: 40, faction: 'rebels' }),
    unit('boba', { name: 'Boba Fett', rank: 'operative', cost: 110, faction: 'mercenary', affiliations: ['empire'] }),
  ]

  it('returns only units of the given rank legal for the faction', () => {
    const corps = catalogueForRank(units, 'empire', 'corps')
    expect(corps.map((u) => u.id)).toEqual(['storm', 'snow']) // rebel corps excluded
  })

  it('sorts cheapest-first then by name', () => {
    const corps = catalogueForRank(
      [unit('b', { name: 'Bravo', cost: 50 }), unit('a', { name: 'Alpha', cost: 50 }), unit('c', { name: 'Cheap', cost: 30 })],
      'empire', 'corps',
    )
    expect(corps.map((u) => u.id)).toEqual(['c', 'a', 'b'])
  })

  it('gates mercenaries by affiliation', () => {
    expect(catalogueForRank(units, 'empire', 'operative').map((u) => u.id)).toEqual(['boba'])
    expect(catalogueForRank(units, 'rebels', 'operative')).toEqual([]) // boba not affiliated with rebels
  })

  it('filters by a case-insensitive query over name + title', () => {
    expect(catalogueForRank(units, 'empire', 'corps', 'SNOW').map((u) => u.id)).toEqual(['snow'])
    expect(catalogueForRank(units, 'empire', 'corps', 'trooper').map((u) => u.id)).toEqual(['storm', 'snow'])
  })

  it('gates Detachment units on their parent being present (named + rank targets)', () => {
    const det = [
      unit('fs', { name: 'Fire Support', rank: 'support', faction: 'mercenary', keywords: ['Detachment Mandalorian Warriors'] }),
      unit('probe', { name: 'Imperial Probe Droid', rank: 'special', faction: 'empire', keywords: ['Detachment special'] }),
    ]
    // With no parents present, neither detachment appears…
    expect(catalogueForRank(det, 'mercenary', 'support', '', new Set())).toEqual([])
    expect(catalogueForRank(det, 'empire', 'special', '', new Set())).toEqual([])
    // …named parent present → the named detachment appears (even with no faction match)…
    expect(catalogueForRank(det, 'mandalorians', 'support', '', new Set(['mandalorian warriors'])).map((u) => u.id)).toEqual(['fs'])
    // …rank parent present → the rank detachment appears.
    expect(catalogueForRank(det, 'empire', 'special', '', new Set(['special'])).map((u) => u.id)).toEqual(['probe'])
  })

  it('without presentParents, does not apply detachment gating (Browse-style)', () => {
    const fs = unit('fs', { name: 'Fire Support', rank: 'support', faction: 'mercenary', keywords: ['Detachment Mandalorian Warriors'] })
    expect(catalogueForRank([fs], 'mercenary', 'support').map((u) => u.id)).toEqual(['fs'])
  })
})

describe('detachmentTarget / presentDetachmentParents', () => {
  it('extracts the Detachment target, or null', () => {
    expect(detachmentTarget(unit('a', { keywords: ['Detachment Mandalorian Warriors', 'Impervious'] }))).toBe('Mandalorian Warriors')
    expect(detachmentTarget(unit('b', { keywords: ['Impervious'] }))).toBeNull()
  })

  it('collects fielded ranks + non-detachment unit names', () => {
    const warriors = unit('w', { name: 'Mandalorian Warriors', rank: 'corps' })
    const fs = unit('fs', { name: 'Fire Support', rank: 'support', keywords: ['Detachment Mandalorian Warriors'] })
    const army: Army = { name: '', faction: 'mandalorians', gameSize: 1000, units: [
      { uid: '1', unitId: 'w', upgrades: [] }, { uid: '2', unitId: 'fs', upgrades: [] },
    ] }
    const set = presentDetachmentParents(army, new Map([['w', warriors], ['fs', fs]]))
    expect(set.has('mandalorian warriors')).toBe(true) // the corps unit's name
    expect(set.has('corps')).toBe(true)                 // its rank
    expect(set.has('support')).toBe(true)               // Fire Support's rank
    expect(set.has('fire support')).toBe(false)         // …but a detachment doesn't satisfy others
  })
})

describe('rankChipState', () => {
  it('flags counts below the minimum as under', () => {
    expect(rankChipState(0, 1, 2)).toBe('under')
    expect(rankChipState(2, 3, 6)).toBe('under')
  })

  it('flags counts above the maximum as over', () => {
    expect(rankChipState(3, 1, 2)).toBe('over')
    expect(rankChipState(7, 3, 6)).toBe('over')
  })

  it('treats counts within [min, max] (inclusive) as ok', () => {
    expect(rankChipState(1, 1, 2)).toBe('ok') // at min
    expect(rankChipState(2, 1, 2)).toBe('ok') // at max
    expect(rankChipState(0, 0, 2)).toBe('ok') // optional rank, empty
    expect(rankChipState(4, 3, 6)).toBe('ok') // mid-range
  })
})

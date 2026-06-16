import { describe, it, expect } from 'vitest'
import {
  validateArmy, unitCost, uniqueNames, findDuplicateUniques,
  cardLimit, limitViolations, hasFieldCommander, entourageBonuses, unmetDetachments,
  unitMeetsRequirements, mercenaryIssues, MERC_RANK_CAP, unitAllowedInFaction, isMandalorianClanUnit,
  encodeArmy, decodeArmy, toCompact, fromCompact, rankChipState, catalogueForRank,
  primaryWeaponDice, detachmentTarget, presentDetachmentParents, groupArmyUnits,
  heavyWeaponTeamUnmet, unitLegalityIssues,
  effectiveRank, effectiveUpgradeBar, slotKeySet, pruneOrphanedUpgrades, upgradeFitsSlot,
  unitModelCount, armyModelCount, upgradeMinisAdded, MINI_ADDING_SLOTS, battleForcePool, battleForceRules,
  commandCommanders, commandCardEligible, eligibleCommandCards, validateCommandHand, fieldedUnitNames,
  battleCardEligible, eligibleBattleCards, validateBattleDeck, usesBattleDeck,
  buildArmySheet, armyToText, armyToListJSON, importArmy, COMPACT_VERSION,
} from '../src/utils/army.ts'
import { FORMATS, formatForCap, formatName, rankLimits } from '../src/utils/factions.ts'
import type { Army, BattleCard, BattleForce, CommandCard, Unit, Upgrade } from '../src/types/index.ts'

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

function makeBattleForce(over: Partial<BattleForce> = {}): BattleForce {
  return {
    linkId: 'tbf', name: 'Test Battle Force', faction: 'empire', forceAffinity: null,
    rankUnits: { commander: [], operative: [], corps: [], special: [], support: [], heavy: [] },
    allowedUpgrades: [], disallowedUpgrades: [], rules: {}, rulesText: [],
    modes: {
      standard: { commander: [1, 2], operative: [0, 2], corps: [3, 6], special: [0, 3], support: [0, 3], heavy: [0, 2], commOp: null },
      '500': { commander: [1, 1], operative: [0, 1], corps: [2, 4], special: [0, 2], support: [0, 2], heavy: [0, 1], commOp: null },
    },
    ...over,
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

  it('uses the battle force rank table (and its mode) when one is given', () => {
    // Mandalorian Clans: Corps 2–6 standard, 2–4 in the 500-point (Recon) mode.
    const mc = makeBattleForce({
      modes: {
        standard: { commander: [1, 2], operative: [0, 2], corps: [2, 6], special: [0, 3], support: [0, 3], heavy: [0, 2], commOp: null },
        '500': { commander: [1, 1], operative: [0, 1], corps: [2, 4], special: [0, 2], support: [0, 2], heavy: [0, 1], commOp: 3 },
      },
    })
    expect(rankLimits(1000, mc).corps).toEqual({ min: 2, max: 6 })
    expect(rankLimits(1000, mc).commander).toEqual({ min: 1, max: 2 })
    expect(rankLimits(600, mc).corps).toEqual({ min: 2, max: 4 }) // Recon → 500-point mode
    // No battle force keeps the standard format table.
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

describe('battle forces', () => {
  // A small battle force: Vader as commander (printed commander), a Scout placed
  // "as Corps" (printed special), one native corps. Allows one extra upgrade.
  const bf = makeBattleForce({
    linkId: 'tf', name: 'Test Force', faction: 'empire',
    rankUnits: { commander: ['vader'], operative: [], corps: ['scout', 'storm'], special: [], support: [], heavy: [] },
    allowedUpgrades: ['special-op'],
    disallowedUpgrades: ['banned'],
    rules: { unitLimits: [{ ids: ['vader'], count: [1, 1] }], addAdditionalUpgradeSlots: [['vader', ['command']]] },
    rulesText: ['A test rule.'],
  })
  const vader = unit('vader', { name: 'Vader', rank: 'commander', isUnique: true, cost: 150, upgradeBar: ['force'] })
  const scout = unit('scout', { name: 'Scout', rank: 'special', cost: 60 }) // printed special, "as Corps" in BF
  const storm = unit('storm', { name: 'Storm', rank: 'corps', cost: 50 })
  const outsider = unit('outsider', { name: 'Outsider', rank: 'corps', cost: 40 })
  const units = [vader, scout, storm, outsider]

  describe('effectiveRank', () => {
    it('uses the battle force rank list, not the printed rank', () => {
      expect(effectiveRank(scout, bf)).toBe('corps') // printed special → corps in BF
      expect(effectiveRank(vader, bf)).toBe('commander')
    })
    it('falls back to the printed rank with no BF, or for an ineligible unit', () => {
      expect(effectiveRank(scout, null)).toBe('special')
      expect(effectiveRank(outsider, bf)).toBe('corps') // not in BF → printed rank
    })
  })

  describe('battleForcePool / battleForceRules', () => {
    it('collects all eligible ids and typed rules', () => {
      expect(battleForcePool(bf)).toEqual(new Set(['vader', 'scout', 'storm']))
      expect(battleForceRules(bf).unitLimits).toHaveLength(1)
      expect(battleForceRules(null)).toEqual({})
    })
  })

  describe('catalogueForRank with a battle force', () => {
    it('returns the BF whitelist for the rank (placing "as Corps" units there)', () => {
      const corps = catalogueForRank(units, 'empire', 'corps', '', undefined, bf)
      expect(corps.map((u) => u.id).sort()).toEqual(['scout', 'storm'])
      expect(catalogueForRank(units, 'empire', 'special', '', undefined, bf)).toEqual([])
    })
    it('excludes special-issue units from a standard (no-BF) army', () => {
      const si = unit('si', { name: 'SpecialOne', rank: 'corps', specialIssue: 'Test Force' })
      const corps = catalogueForRank([si, storm], 'empire', 'corps')
      expect(corps.map((u) => u.id)).toEqual(['storm'])
    })
  })

  describe('effectiveUpgradeBar', () => {
    it('appends battle-force-granted slots to the named unit', () => {
      expect(effectiveUpgradeBar(vader, bf)).toEqual(['force', 'command'])
      expect(effectiveUpgradeBar(storm, bf)).toEqual([]) // not granted any
      expect(effectiveUpgradeBar(vader, null)).toEqual(['force'])
    })

    it('folds in slots granted by currently-equipped upgrades', () => {
      const trooper = unit('t', { upgradeBar: ['personnel', 'gear'] })
      const commsTech = upgrade('ct', { slot: 'personnel', grantedSlots: ['comms'] })
      const { upgradesById } = makeMaps([trooper], [commsTech])
      // nothing equipped → printed bar only
      expect(effectiveUpgradeBar(trooper, null, [], upgradesById)).toEqual(['personnel', 'gear'])
      // equip the comms tech → its `comms` slot appears
      const equipped = [{ slot: 'personnel#0', upgradeId: 'ct' }]
      expect(effectiveUpgradeBar(trooper, null, equipped, upgradesById)).toEqual(['personnel', 'gear', 'comms'])
    })

    it('stacks battle-force + upgrade grants together', () => {
      const grant = upgrade('g', { slot: 'force', grantedSlots: ['gear'] })
      const { upgradesById } = makeMaps([vader], [grant])
      expect(effectiveUpgradeBar(vader, bf, [{ slot: 'force#0', upgradeId: 'g' }], upgradesById))
        .toEqual(['force', 'command', 'gear'])
    })
  })

  describe('self-slotting upgrades (Imperial March / Dug In)', () => {
    const march = upgrade('imperial-march', { name: 'Imperial March', slot: 'training', requirements: [{ faction: 'empire', rank: 'corps' }] })
    const dugIn = upgrade('dug-in', { name: 'Dug In', slot: 'training', requirements: [{ cardSubtype: 'emplacement trooper' }] })
    const { upgradesById } = makeMaps([], [march, dugIn])

    it('adds a dedicated slot to an eligible unit that LACKS a training slot', () => {
      const storm = unit('storm', { faction: 'empire', rank: 'corps', upgradeBar: ['heavy weapon', 'personnel'] })
      expect(effectiveUpgradeBar(storm, null, [], upgradesById)).toEqual(['heavy weapon', 'personnel', 'imperial-march'])
    })

    it('does NOT add a dedicated slot when the unit already has a training slot (it fills it)', () => {
      const storm = unit('storm', { faction: 'empire', rank: 'corps', upgradeBar: ['training', 'gear'] })
      expect(effectiveUpgradeBar(storm, null, [], upgradesById)).toEqual(['training', 'gear'])
    })

    it('does NOT add a dedicated slot when an equipped upgrade GRANTS the training slot (e.g. a Captain)', () => {
      const captain = upgrade('cpt', { name: 'Stormtrooper Captain', slot: 'personnel', grantedSlots: ['training'] })
      const { upgradesById: ub } = makeMaps([], [march, dugIn, captain])
      const storm = unit('storm', { faction: 'empire', rank: 'corps', upgradeBar: ['heavy weapon', 'personnel'] })
      // No captain → dedicated Imperial March slot.
      expect(effectiveUpgradeBar(storm, null, [], ub)).toEqual(['heavy weapon', 'personnel', 'imperial-march'])
      // Captain equipped grants a real Training slot → Imperial March fills THAT, no dedicated slot.
      const equipped = [{ slot: 'personnel#1', upgradeId: 'cpt' }]
      expect(effectiveUpgradeBar(storm, null, equipped, ub)).toEqual(['heavy weapon', 'personnel', 'training'])
    })

    it('does not add a slot to an ineligible unit (wrong faction)', () => {
      const rebel = unit('reb', { faction: 'rebels', rank: 'corps', upgradeBar: ['gear'] })
      expect(effectiveUpgradeBar(rebel, null, [], upgradesById)).toEqual(['gear'])
    })

    it('adds the Dug In slot to an eligible emplacement trooper without a training slot', () => {
      const emp = unit('emp', { faction: 'empire', rank: 'support', unitType: 'emplacement trooper', upgradeBar: ['gear'] })
      expect(effectiveUpgradeBar(emp, null, [], upgradesById)).toEqual(['gear', 'dug-in'])
    })

    it('upgradeFitsSlot: self-slotting upgrade fits both its printed slot AND its dedicated slot', () => {
      expect(upgradeFitsSlot(march, 'training')).toBe(true) // fills a real training slot when present
      expect(upgradeFitsSlot(march, 'imperial-march')).toBe(true) // dedicated slug-slot
      expect(upgradeFitsSlot(march, 'gear')).toBe(false)
    })

    it('upgradeFitsSlot: a normal upgrade only fits its printed slot, never a dedicated slot', () => {
      const gear = upgrade('grip', { slot: 'gear' })
      expect(upgradeFitsSlot(gear, 'gear')).toBe(true)
      expect(upgradeFitsSlot(gear, 'imperial-march')).toBe(false)
    })
  })

  describe('slotKeySet', () => {
    it('keys each slot by its bar position (matching the card`s v-for index)', () => {
      expect([...slotKeySet(['gear', 'gear', 'comms'])]).toEqual(['gear#0', 'gear#1', 'comms#2'])
    })
  })

  describe('pruneOrphanedUpgrades', () => {
    const trooper = unit('t', { upgradeBar: ['personnel'] })
    const commsTech = upgrade('ct', { slot: 'personnel', grantedSlots: ['comms'] })
    const comms = upgrade('cm', { slot: 'comms' })
    const { upgradesById } = makeMaps([trooper], [commsTech, comms])

    it('keeps upgrades whose slots still exist', () => {
      const equipped = [{ slot: 'personnel#0', upgradeId: 'ct' }, { slot: 'comms#1', upgradeId: 'cm' }]
      expect(pruneOrphanedUpgrades(trooper, null, equipped, upgradesById)).toEqual(equipped)
    })

    it('drops an upgrade left in a slot whose granting upgrade was removed', () => {
      // comms tech gone; the comms upgrade it had enabled is now orphaned
      const equipped = [{ slot: 'comms#1', upgradeId: 'cm' }]
      expect(pruneOrphanedUpgrades(trooper, null, equipped, upgradesById)).toEqual([])
    })
  })

  describe('model count', () => {
    const corps = unit('c', { miniCount: 4 })
    const hero = unit('h', { miniCount: 1 })
    const noCount = unit('n', { miniCount: null })
    const heavy = upgrade('hw', { slot: 'heavy weapon' })
    const person = upgrade('pn', { slot: 'personnel' })
    const gear = upgrade('gr', { slot: 'gear' })
    const { unitsById, upgradesById } = makeMaps([corps, hero, noCount], [heavy, person, gear])

    it('exports the inferred mini-adding slot types', () => {
      expect(MINI_ADDING_SLOTS).toEqual(['heavy weapon', 'personnel'])
    })

    it('counts a unit`s printed minis', () => {
      expect(unitModelCount({ uid: '1', unitId: 'c', upgrades: [] }, unitsById, upgradesById)).toBe(4)
    })

    it('adds one mini per equipped heavy-weapon / personnel upgrade, not gear', () => {
      const au = { uid: '1', unitId: 'c', upgrades: [
        { slot: 'heavy weapon#0', upgradeId: 'hw' },
        { slot: 'personnel#1', upgradeId: 'pn' },
        { slot: 'gear#2', upgradeId: 'gr' },
      ] }
      expect(unitModelCount(au, unitsById, upgradesById)).toBe(6) // 4 base + heavy + personnel
    })

    it('adds the curated squad count for "Squad" personnel upgrades (e.g. +5)', () => {
      const squad = upgrade('sq', { slug: 'stormtrooper-squad', slot: 'personnel' })
      const maps2 = makeMaps([corps], [squad])
      const au = { uid: '1', unitId: 'c', upgrades: [{ slot: 'personnel#0', upgradeId: 'sq' }] }
      expect(unitModelCount(au, maps2.unitsById, maps2.upgradesById)).toBe(9) // 4 base + 5 squad
      expect(upgradeMinisAdded(squad)).toBe(5)
    })

    it('defaults a unit with no printed count to 1', () => {
      expect(unitModelCount({ uid: '1', unitId: 'n', upgrades: [] }, unitsById, upgradesById)).toBe(1)
    })

    it('sums every unit instance for the army total', () => {
      const army: Army = {
        name: '', faction: 'empire', battleForce: null, gameSize: 1000, commandHand: [], battleDeck: [],
        units: [
          { uid: '1', unitId: 'c', upgrades: [{ slot: 'heavy weapon#0', upgradeId: 'hw' }] }, // 5
          { uid: '2', unitId: 'c', upgrades: [] }, // 4
          { uid: '3', unitId: 'h', upgrades: [] }, // 1
        ],
      }
      expect(armyModelCount(army, unitsById, upgradesById)).toBe(10)
    })
  })

  describe('validateArmy with a battle force', () => {
    const { unitsById, upgradesById } = makeMaps(units)
    const army = (ids: string[]): Army => ({
      name: '', faction: 'empire', battleForce: 'tf', gameSize: 1000,
      units: ids.map((id, i) => ({ uid: `u${i}`, unitId: id, upgrades: [] })),
    })

    it('uses the BF rank table and counts by effective rank', () => {
      const v = validateArmy(army(['vader', 'scout', 'storm']), unitsById, upgradesById, bf)
      const corps = v.items.find((i) => i.label === 'Corps')!
      expect(corps.detail).toBe('2 (need 3)') // scout (as corps) + storm, BF corps min 3
      expect(v.rankCounts.corps).toBe(2) // scout counts as corps despite its printed special rank
      expect(v.rankCounts.special).toBe(0)
    })

    it('flags units not on the battle force roster', () => {
      const v = validateArmy(army(['vader', 'outsider']), unitsById, upgradesById, bf)
      const row = v.items.find((i) => i.label === 'Battle force')!
      expect(row.ok).toBe(false)
      expect(row.detail).toContain('Outsider')
      expect(unitLegalityIssues(army(['outsider']).units[0], army(['outsider']), unitsById, bf))
        .toContain('Not in Test Force')
    })

    it('enforces per-unit-id limits', () => {
      const v = validateArmy(army(['scout', 'storm']), unitsById, upgradesById, bf)
      const lim = v.items.find((i) => i.label === 'Vader')!
      expect(lim.ok).toBe(false) // needs 1 Vader, has 0
      expect(lim.detail).toBe('0 (need 1)')
    })

    it('enforces the combined Cmd+Op cap when set', () => {
      const capped = makeBattleForce({
        rankUnits: { commander: ['vader', 'storm'], operative: [], corps: [], special: [], support: [], heavy: [] },
        modes: { ...bf.modes, standard: { ...bf.modes.standard, commOp: 1 } },
      })
      const a: Army = { name: '', faction: 'empire', battleForce: 'tbf', gameSize: 1000,
        units: [{ uid: 'a', unitId: 'vader', upgrades: [] }, { uid: 'b', unitId: 'storm', upgrades: [] }] }
      const v = validateArmy(a, unitsById, upgradesById, capped)
      const row = v.items.find((i) => i.label === 'Cmd + Op')!
      expect(row.ok).toBe(false)
      expect(row.detail).toBe('2 / 1')
    })

    it('enforces minimum-3-Wookiees', () => {
      const wbf = makeBattleForce({
        rankUnits: { commander: [], operative: [], corps: ['ww'], special: [], support: [], heavy: [] },
        rules: { minimum3Wookiees: true },
      })
      const ww = unit('ww', { name: 'Wookiee Warriors', unitType: 'wookiee trooper', rank: 'corps' })
      const maps = makeMaps([ww])
      const a: Army = { name: '', faction: 'rebels', battleForce: 'tbf', gameSize: 1000,
        units: [{ uid: 'a', unitId: 'ww', upgrades: [] }, { uid: 'b', unitId: 'ww', upgrades: [] }] }
      const row = validateArmy(a, maps.unitsById, maps.upgradesById, wbf).items.find((i) => i.label === 'Wookiees')!
      expect(row.ok).toBe(false)
      expect(row.detail).toBe('2 / 3 min')
    })
  })

  describe('compact round-trip', () => {
    it('preserves the battle force', () => {
      const a: Army = { name: 'X', faction: 'empire', battleForce: 'mc', gameSize: 1000, units: [] }
      expect(toCompact(a).b).toBe('mc')
      expect(fromCompact(toCompact(a)).battleForce).toBe('mc')
    })
    it('omits the battle force when none is set, defaulting to null on load', () => {
      const a: Army = { name: 'X', faction: 'empire', battleForce: null, gameSize: 1000, units: [] }
      expect('b' in toCompact(a)).toBe(false)
      expect(fromCompact(toCompact(a)).battleForce).toBeNull()
    })
  })
})

describe('command hand', () => {
  const cmd = (id: string, over: Partial<CommandCard> = {}): CommandCard => ({
    id, slug: id, name: id, pips: 1, commander: '', faction: null, cardImage: null, ...over,
  })
  // Army with Vader (commander) fielded, faction empire.
  const vader = unit('vader', { name: 'Darth Vader', rank: 'commander' })
  const { unitsById } = makeMaps([vader])
  const army = (hand: string[] = []): Army => ({
    name: '', faction: 'empire', battleForce: null, gameSize: 1000,
    units: [{ uid: 'a', unitId: 'vader', upgrades: [] }], commandHand: hand,
  })

  describe('commandCardEligible', () => {
    const fielded = fieldedUnitNames(army(), unitsById)
    it('allows a commander card whose commander is fielded', () => {
      expect(commandCardEligible(cmd('v1', { commander: 'Darth Vader' }), army(), fielded)).toBe(true)
      expect(commandCardEligible(cmd('l1', { commander: 'Luke Skywalker' }), army(), fielded)).toBe(false)
    })
    it('splits multi-commander cards and matches any', () => {
      expect(commandCommanders(cmd('x', { commander: 'Han Solo, Darth Vader' }))).toEqual(['Han Solo', 'Darth Vader'])
      expect(commandCardEligible(cmd('x', { commander: 'Han Solo, Darth Vader' }), army(), fielded)).toBe(true)
    })
    it('allows faction-generic cards for the army faction, and universal cards always', () => {
      expect(commandCardEligible(cmd('fe', { faction: 'empire' }), army(), fielded)).toBe(true)
      expect(commandCardEligible(cmd('fr', { faction: 'rebels' }), army(), fielded)).toBe(false)
      expect(commandCardEligible(cmd('u', { faction: null }), army(), fielded)).toBe(true)
    })
    it('never offers Standing Orders / 4-pip cards (auto-included)', () => {
      expect(commandCardEligible(cmd('so', { pips: 4, name: 'Standing Orders' }), army(), fielded)).toBe(false)
    })
  })

  describe('eligibleCommandCards', () => {
    it('returns eligible pip 1–3 cards, pip-sorted, excluding Standing Orders', () => {
      const commands = [
        cmd('so', { pips: 4, name: 'Standing Orders' }),
        cmd('v3', { pips: 3, commander: 'Darth Vader' }),
        cmd('u1', { pips: 1, faction: null }),
        cmd('rebel', { pips: 1, faction: 'rebels' }),
      ]
      const out = eligibleCommandCards(commands, army(), unitsById)
      expect(out.map((c) => c.id)).toEqual(['u1', 'v3']) // rebel + standing orders excluded; pip-sorted
    })
  })

  describe('validateCommandHand', () => {
    const commands = [
      cmd('a1', { pips: 1, faction: null }), cmd('a2', { pips: 1, faction: null }),
      cmd('b1', { pips: 2, faction: null }), cmd('b2', { pips: 2, faction: null }),
      cmd('c1', { pips: 3, faction: null }), cmd('c2', { pips: 3, faction: null }),
    ]
    const byId = new Map(commands.map((c) => [c.id, c]))
    const fielded = fieldedUnitNames(army(), unitsById)

    it('is valid at exactly 2/2/2 with no dupes', () => {
      const v = validateCommandHand(army(['a1', 'a2', 'b1', 'b2', 'c1', 'c2']), byId, fielded)
      expect(v.complete).toBe(true)
      expect(v.valid).toBe(true)
    })
    it('is incomplete below 2 of a pip', () => {
      const v = validateCommandHand(army(['a1', 'b1', 'b2', 'c1', 'c2']), byId, fielded)
      expect(v.byPip[1]).toBe(1)
      expect(v.complete).toBe(false)
      expect(v.valid).toBe(false)
    })
    it('flags duplicates and ineligible cards', () => {
      const dup = validateCommandHand(army(['a1', 'a1', 'b1', 'b2', 'c1', 'c2']), byId, fielded)
      expect(dup.hasDuplicates).toBe(true)
      const badById = new Map([...byId, ['r1', cmd('r1', { pips: 1, faction: 'rebels' })]])
      const inel = validateCommandHand(army(['r1', 'a2', 'b1', 'b2', 'c1', 'c2']), badById, fielded)
      expect(inel.ineligible).toContain('r1')
      expect(inel.valid).toBe(false)
    })
  })

  describe('validateArmy command-hand row', () => {
    const commands = [
      cmd('a1', { pips: 1, faction: null }), cmd('a2', { pips: 1, faction: null }),
      cmd('b1', { pips: 2, faction: null }), cmd('b2', { pips: 2, faction: null }),
      cmd('c1', { pips: 3, faction: null }), cmd('c2', { pips: 3, faction: null }),
    ]
    const byId = new Map(commands.map((c) => [c.id, c]))
    it('adds a Command hand row reading n/7 (incl. Standing Orders) once units exist', () => {
      const v = validateArmy(army(['a1', 'a2', 'b1', 'b2', 'c1', 'c2']), unitsById, new Map(), null, byId)
      const row = v.items.find((i) => i.label === 'Command hand')!
      expect(row.ok).toBe(true)
      expect(row.detail).toBe('7 / 7')
    })
    it('omits the row when no commandsById is provided', () => {
      const v = validateArmy(army([]), unitsById, new Map(), null)
      expect(v.items.find((i) => i.label === 'Command hand')).toBeUndefined()
    })
  })

  describe('compact round-trip', () => {
    it('preserves the command hand, omitting it when empty', () => {
      const a = army(['a1', 'b1'])
      expect(toCompact(a).c).toEqual(['a1', 'b1'])
      expect(fromCompact(toCompact(a)).commandHand).toEqual(['a1', 'b1'])
      expect('c' in toCompact(army([]))).toBe(false)
      expect(fromCompact(toCompact(army([]))).commandHand).toEqual([])
    })
  })
})

describe('battle deck', () => {
  const bc = (id: string, over: Partial<BattleCard> = {}): BattleCard => ({
    id, slug: id, name: id, subtype: 'primary', keywords: [], faction: null, isRecon: false, cardImage: null, ...over,
  })
  const army = (deck: string[] = [], faction: Army['faction'] = 'empire', gameSize = 1000): Army => ({
    name: '', faction, battleForce: null, gameSize,
    units: [{ uid: 'a', unitId: 'u', upgrades: [] }], commandHand: [], battleDeck: deck,
  })

  describe('usesBattleDeck', () => {
    it('is true for Standard formats and false for Recon (600)', () => {
      expect(usesBattleDeck(1000)).toBe(true)
      expect(usesBattleDeck(800)).toBe(true)
      expect(usesBattleDeck(1600)).toBe(true)
      expect(usesBattleDeck(600)).toBe(false)
    })
  })

  describe('battleCardEligible / eligibleBattleCards', () => {
    it('excludes Recon-pool cards and faction-mismatched cards', () => {
      expect(battleCardEligible(bc('a'), army())).toBe(true) // null faction
      expect(battleCardEligible(bc('r', { isRecon: true }), army())).toBe(false)
      expect(battleCardEligible(bc('e', { faction: 'empire' }), army())).toBe(true)
      expect(battleCardEligible(bc('reb', { faction: 'rebels' }), army())).toBe(false)
    })
    it('returns eligible cards name-sorted', () => {
      const out = eligibleBattleCards([bc('z', { name: 'Zeta' }), bc('a', { name: 'Alpha' }), bc('r', { isRecon: true })], army())
      expect(out.map((c) => c.name)).toEqual(['Alpha', 'Zeta'])
    })
  })

  describe('validateBattleDeck', () => {
    const cards = [
      ...['p1', 'p2', 'p3'].map((id) => bc(id, { subtype: 'primary' })),
      ...['s1', 's2', 's3'].map((id) => bc(id, { subtype: 'secondary' })),
      ...['a1', 'a2', 'a3'].map((id) => bc(id, { subtype: 'advantage' })),
    ]
    const byId = new Map(cards.map((c) => [c.id, c]))
    it('is valid at exactly 3 of each subtype, no dupes', () => {
      const v = validateBattleDeck(army(['p1', 'p2', 'p3', 's1', 's2', 's3', 'a1', 'a2', 'a3']), byId)
      expect(v.complete).toBe(true)
      expect(v.valid).toBe(true)
      expect(v.bySubtype).toEqual({ primary: 3, secondary: 3, advantage: 3 })
    })
    it('is incomplete below 3 of a subtype', () => {
      const v = validateBattleDeck(army(['p1', 'p2', 's1', 's2', 's3', 'a1', 'a2', 'a3']), byId)
      expect(v.bySubtype.primary).toBe(2)
      expect(v.valid).toBe(false)
    })
    it('flags duplicates and ineligible (Recon/faction) cards', () => {
      const dup = validateBattleDeck(army(['p1', 'p1', 'p3', 's1', 's2', 's3', 'a1', 'a2', 'a3']), byId)
      expect(dup.hasDuplicates).toBe(true)
      const bad = new Map([...byId, ['rec', bc('rec', { subtype: 'primary', isRecon: true })]])
      const v = validateBattleDeck(army(['rec', 'p2', 'p3', 's1', 's2', 's3', 'a1', 'a2', 'a3']), bad)
      expect(v.ineligible).toContain('rec')
      expect(v.valid).toBe(false)
    })
  })

  describe('validateArmy battle-deck row', () => {
    const cards = [
      ...['p1', 'p2', 'p3'].map((id) => bc(id, { subtype: 'primary' })),
      ...['s1', 's2', 's3'].map((id) => bc(id, { subtype: 'secondary' })),
      ...['a1', 'a2', 'a3'].map((id) => bc(id, { subtype: 'advantage' })),
    ]
    const byId = new Map(cards.map((c) => [c.id, c]))
    const full = ['p1', 'p2', 'p3', 's1', 's2', 's3', 'a1', 'a2', 'a3']
    it('adds a Battle deck row in Standard reading n/9', () => {
      const v = validateArmy(army(full), new Map([['u', unit('u')]]), new Map(), null, undefined, byId)
      const row = v.items.find((i) => i.label === 'Battle deck')!
      expect(row.ok).toBe(true)
      expect(row.detail).toBe('9 / 9')
    })
    it('omits the row in Recon (600)', () => {
      const v = validateArmy(army(full, 'empire', 600), new Map([['u', unit('u')]]), new Map(), null, undefined, byId)
      expect(v.items.find((i) => i.label === 'Battle deck')).toBeUndefined()
    })
  })

  describe('compact round-trip', () => {
    it('preserves the battle deck, omitting it when empty', () => {
      const a = army(['p1', 's1'])
      expect(toCompact(a).d).toEqual(['p1', 's1'])
      expect(fromCompact(toCompact(a)).battleDeck).toEqual(['p1', 's1'])
      expect('d' in toCompact(army([]))).toBe(false)
      expect(fromCompact(toCompact(army([]))).battleDeck).toEqual([])
    })
  })
})

describe('buildArmySheet', () => {
  const vader = unit('vader', { name: 'Darth Vader', title: 'Dark Lord', rank: 'commander', cost: 190, portraitImage: '/images/portraits/darth-vader.webp' })
  const storm = unit('storm', { name: 'Stormtroopers', rank: 'corps', cost: 44 })
  const ups = [upgrade('saber', { name: 'Force Reflexes', cost: 5 })]
  const { unitsById, upgradesById } = makeMaps([vader, storm], ups)
  const commandsById = new Map<string, CommandCard>([
    ['c1', { id: 'c1', slug: 'c1', name: 'New Ways', pips: 1, commander: 'Darth Vader', faction: null, cardImage: null }],
    ['so', { id: 'so', slug: 'so', name: 'Standing Orders', pips: 4, commander: '', faction: null, cardImage: null }],
  ])
  const battleCardsById = new Map<string, BattleCard>([
    ['b1', { id: 'b1', slug: 'b1', name: 'Breakthrough', subtype: 'primary', keywords: [], faction: null, isRecon: false, cardImage: null }],
    ['b2', { id: 'b2', slug: 'b2', name: 'Recon Mission', subtype: 'secondary', keywords: [], faction: null, isRecon: false, cardImage: null }],
  ])
  const army: Army = {
    name: 'Test List', faction: 'empire', battleForce: null, gameSize: 1000,
    units: [
      { uid: '1', unitId: 'vader', upgrades: [{ slot: 'force#0', upgradeId: 'saber' }] },
      { uid: '2', unitId: 'storm', upgrades: [] },
      { uid: '3', unitId: 'storm', upgrades: [] },
    ],
    commandHand: ['c1'], battleDeck: ['b2', 'b1'],
  }

  it('groups units by rank into ×N rows with resolved upgrades + costs', () => {
    const s = buildArmySheet(army, unitsById, upgradesById, commandsById, battleCardsById, null)
    expect(s.name).toBe('Test List')
    expect(s.factionName).toBe('Galactic Empire')
    expect(s.formatName).toBe('Standard')
    expect(s.points).toBe(190 + 5 + 44 + 44)
    expect(s.activations).toBe(3)
    const cmd = s.ranks.find((r) => r.rank === 'commander')!
    expect(cmd.units[0]).toMatchObject({ name: 'Darth Vader', title: 'Dark Lord', qty: 1, cost: 195, portrait: '/images/portraits/darth-vader.webp' })
    expect(cmd.units[0].upgrades).toEqual([{ name: 'Force Reflexes', cost: 5, slot: 'Gear' }])
    const corps = s.ranks.find((r) => r.rank === 'corps')!
    expect(corps.units[0]).toMatchObject({ name: 'Stormtroopers', qty: 2, cost: 88 })
  })

  it('orders the command hand by pip with Standing Orders last, and the deck by type', () => {
    const s = buildArmySheet(army, unitsById, upgradesById, commandsById, battleCardsById, null)
    expect(s.commandHand.map((c) => ({ pip: c.pip, name: c.name }))).toEqual([{ pip: 1, name: 'New Ways' }, { pip: 4, name: 'Standing Orders' }])
    expect(s.battleDeck.map((c) => c.name)).toEqual(['Breakthrough', 'Recon Mission']) // primary before secondary
    expect(s.showBattleDeck).toBe(true)
  })

  it('hides the battle deck in Recon and names the battle force', () => {
    const bf = makeBattleForce({ name: 'Blizzard Force' })
    const recon = buildArmySheet({ ...army, gameSize: 600 }, unitsById, upgradesById, commandsById, battleCardsById, bf)
    expect(recon.showBattleDeck).toBe(false)
    expect(recon.battleForceName).toBe('Blizzard Force')
    expect(recon.formatName).toBe('Recon')
  })

  it('carries card images on the command hand + battle deck', () => {
    const cmds = new Map<string, CommandCard>([
      ['c1', { id: 'c1', slug: 'c1', name: 'New Ways', pips: 1, commander: 'Darth Vader', faction: null, cardImage: '/images/commands/new-ways.webp' }],
    ])
    const cards = new Map<string, BattleCard>([
      ['b1', { id: 'b1', slug: 'b1', name: 'Breakthrough', subtype: 'primary', keywords: [], faction: null, isRecon: false, cardImage: '/images/battle/breakthrough.webp' }],
    ])
    const s = buildArmySheet({ ...army, commandHand: ['c1'], battleDeck: ['b1'] }, unitsById, upgradesById, cmds, cards, null)
    expect(s.commandHand[0].cardImage).toBe('/images/commands/new-ways.webp')
    expect(s.battleDeck[0].cardImage).toBe('/images/battle/breakthrough.webp')
  })

  it('dedupes unit + upgrade card images by id, counting army-wide copies', () => {
    const s = buildArmySheet(army, unitsById, upgradesById, commandsById, battleCardsById, null)
    // two Stormtroopers collapse to one entry with qty 2; vader once
    expect(s.unitCards).toEqual([
      { name: 'Darth Vader', cardImage: null, qty: 1 },
      { name: 'Stormtroopers', cardImage: null, qty: 2 },
    ])
    // the single equipped saber upgrade
    expect(s.upgradeCards).toEqual([{ name: 'Force Reflexes', cardImage: null, qty: 1 }])
  })

  it('builds an alphabetical keyword reference from units, weapons + upgrades (only when a glossary is given)', () => {
    const kwUnit = unit('kw', {
      rank: 'special', keywords: ['Sharpshooter 2'],
      weapons: [{ name: 'rifle', range: [1, 3], dice: { red: 0, black: 2, white: 0 }, keywords: ['Impact 1'] }],
    })
    const kwUp = upgrade('comms', { name: 'Comms', keywords: ['Arsenal 1'] })
    const { unitsById: u2, upgradesById: up2 } = makeMaps([kwUnit], [kwUp])
    const glossary = { Sharpshooter: 'Reduce cover.', Impact: 'Convert hits.', Arsenal: 'Extra weapon.' }
    const a2: Army = {
      name: 'KW', faction: 'empire', battleForce: null, gameSize: 1000,
      units: [{ uid: '1', unitId: 'kw', upgrades: [{ slot: 'gear#0', upgradeId: 'comms' }] }],
      commandHand: [], battleDeck: [],
    }
    // no glossary → empty
    expect(buildArmySheet(a2, u2, up2, commandsById, battleCardsById, null).keywords).toEqual([])
    // glossary → resolved, deduped to base names, alphabetical
    const s = buildArmySheet(a2, u2, up2, commandsById, battleCardsById, null, glossary)
    expect(s.keywords).toEqual([
      { name: 'Arsenal', text: 'Extra weapon.' },
      { name: 'Impact', text: 'Convert hits.' },
      { name: 'Sharpshooter', text: 'Reduce cover.' },
    ])
  })

  describe('armyToText', () => {
    it('renders a readable list with header, ranked units, upgrades, command hand + deck', () => {
      const txt = armyToText(buildArmySheet(army, unitsById, upgradesById, commandsById, battleCardsById, null))
      expect(txt).toContain('Test List [Galactic Empire]')
      expect(txt).toContain('Standard — 283/1000 pts, 3 activations')
      expect(txt).toContain('COMMANDER')
      expect(txt).toContain('• Darth Vader, Dark Lord (195)')
      expect(txt).toContain('    - [Gear] Force Reflexes (5)')
      expect(txt).toContain('• Stormtroopers ×2 (88)') // grouped ×N
      expect(txt).toContain('COMMAND HAND')
      expect(txt).toContain('• 1 New Ways')
      expect(txt).toContain('• 4 Standing Orders')
      expect(txt).toContain('BATTLE DECK')
      expect(txt).toContain('• [primary] Breakthrough')
    })

    it('omits the battle deck section in Recon and names the battle force', () => {
      const bf = makeBattleForce({ name: 'Blizzard Force' })
      const txt = armyToText(buildArmySheet({ ...army, gameSize: 600 }, unitsById, upgradesById, commandsById, battleCardsById, bf))
      expect(txt).toContain('Test List [Galactic Empire — Blizzard Force]')
      expect(txt).not.toContain('BATTLE DECK')
    })
  })

  describe('armyToListJSON', () => {
    it('emits the name-based TTS/Longshanks payload (faction enum, names, auto Standing Orders, subtype→deck slots)', () => {
      const json = armyToListJSON(army, unitsById, upgradesById, commandsById, battleCardsById)
      expect(json).toMatchObject({
        author: 'LegionApp',
        listname: 'Test List',
        points: 283,
        armyFaction: 'imperial',
        contingencies: [],
      })
      expect(json.units).toEqual([
        { name: 'Darth Vader', upgrades: ['Force Reflexes'], loadout: [] },
        { name: 'Stormtroopers', upgrades: [], loadout: [] }, // one entry per instance, not grouped
        { name: 'Stormtroopers', upgrades: [], loadout: [] },
      ])
      expect(json.commandCards).toEqual(['New Ways', 'Standing Orders']) // Standing Orders always appended
      expect(json.battlefieldDeck.objective).toEqual(['Breakthrough']) // primary → objective
      expect(json.battlefieldDeck.deployment).toEqual(['Recon Mission']) // secondary → deployment
      expect(json.battlefieldDeck.conditions).toEqual([]) // no advantage cards
    })

    it('maps mercenary faction to an empty armyFaction string', () => {
      const json = armyToListJSON({ ...army, faction: 'mercenary' }, unitsById, upgradesById, commandsById, battleCardsById)
      expect(json.armyFaction).toBe('')
    })
  })

  describe('importArmy', () => {
    const catalog = {
      units: [vader, storm],
      upgrades: ups,
      commands: [...commandsById.values()],
      battleCards: [...battleCardsById.values()],
    }

    it('round-trips a native LegionApp file losslessly (ids preserved)', () => {
      const file = JSON.stringify(toCompact(army), null, 2)
      const res = importArmy(file, catalog)!
      expect(res.source).toBe('native')
      expect(res.warnings).toEqual([])
      expect(res.army.faction).toBe('empire')
      expect(res.army.gameSize).toBe(1000)
      expect(res.army.units.map((u) => u.unitId)).toEqual(['vader', 'storm', 'storm'])
      expect(res.army.units[0].upgrades).toEqual([{ slot: 'force#0', upgradeId: 'saber' }])
      expect(res.army.commandHand).toEqual(['c1'])
      expect(res.army.battleDeck).toEqual(['b2', 'b1'])
    })

    it('flags unknown ids in a native file but keeps them', () => {
      const file = JSON.stringify(toCompact({ ...army, units: [{ uid: '1', unitId: 'ghost', upgrades: [] }] }))
      const res = importArmy(file, catalog)!
      expect(res.source).toBe('native')
      expect(res.army.units[0].unitId).toBe('ghost')
      expect(res.warnings.some((w) => w.includes('ghost'))).toBe(true)
    })

    it('imports a TTS/Longshanks JSON by name, rebuilding upgrades + command hand + deck', () => {
      const json = JSON.stringify(armyToListJSON(army, unitsById, upgradesById, commandsById, battleCardsById))
      const res = importArmy(json, catalog)!
      expect(res.source).toBe('tts')
      expect(res.army.faction).toBe('empire')
      expect(res.army.units.map((u) => u.unitId)).toEqual(['vader', 'storm', 'storm'])
      expect(res.army.units[0].upgrades).toEqual([{ slot: 'gear#0', upgradeId: 'saber' }]) // re-slotted by upgrade.slot
      expect(res.army.commandHand).toEqual(['c1']) // Standing Orders dropped (auto)
      expect(res.army.battleDeck.sort()).toEqual(['b1', 'b2'])
      expect(res.warnings.some((w) => w.includes('Standard'))).toBe(true) // cap not stored
    })

    it('warns on unmatched card names instead of dropping them silently', () => {
      const res = importArmy(JSON.stringify({
        armyFaction: 'imperial',
        units: [{ name: 'Darth Vader', upgrades: ['Nonexistent Gear'] }, { name: 'Ghost Unit', upgrades: [] }],
        commandCards: ['Unknown Card', 'Standing Orders'],
        battlefieldDeck: { objective: ['No Such Mission'] },
      }), catalog)!
      expect(res.army.units.map((u) => u.unitId)).toEqual(['vader']) // ghost dropped
      expect(res.army.units[0].upgrades).toEqual([]) // bad upgrade dropped
      expect(res.warnings).toEqual(expect.arrayContaining([
        expect.stringContaining('Ghost Unit'),
        expect.stringContaining('Nonexistent Gear'),
        expect.stringContaining('Unknown Card'),
        expect.stringContaining('No Such Mission'),
      ]))
    })

    it('maps empty armyFaction back to Mercenary with a note', () => {
      const res = importArmy(JSON.stringify({ armyFaction: '', units: [] }), catalog)!
      expect(res.army.faction).toBe('mercenary')
      expect(res.warnings.some((w) => w.includes('Mercenary'))).toBe(true)
    })

    it('returns null for non-JSON or unrecognised shapes', () => {
      expect(importArmy('not json', catalog)).toBeNull()
      expect(importArmy('{"hello":"world"}', catalog)).toBeNull()
    })
  })
})

describe('compact version (v2)', () => {
  const army: Army = { name: 'X', faction: 'empire', battleForce: 'mc', gameSize: 1000, units: [], commandHand: ['c1'], battleDeck: ['b1'] }
  it('stamps the schema version on encode', () => {
    expect(toCompact(army).v).toBe(COMPACT_VERSION)
    expect(COMPACT_VERSION).toBe(2)
  })
  it('decodes a legacy v1 compact (no version, no b/c/d) with safe defaults', () => {
    const legacy = { n: 'Old', f: 'rebels' as const, g: 800, u: [['luke', []]] as [string, [string, string][]][] }
    const decoded = fromCompact(legacy)
    expect(decoded.battleForce).toBeNull()
    expect(decoded.commandHand).toEqual([])
    expect(decoded.battleDeck).toEqual([])
    expect(decoded.units).toHaveLength(1)
  })
  it('round-trips a v2 army through encode/decode', () => {
    const back = decodeArmy(encodeArmy(army))!
    expect(back.battleForce).toBe('mc')
    expect(back.commandHand).toEqual(['c1'])
    expect(back.battleDeck).toEqual(['b1'])
  })
})

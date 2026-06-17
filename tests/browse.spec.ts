import { describe, it, expect } from 'vitest'
import {
  browseCharacters, commandCharacters, commandMatchesCharacter, commandFaction, searchCommands, groupCommandsByFaction,
  upgradeCharacters, upgradeNamesUnit, upgradeForCharacter, searchUpgrades, groupUpgradesBySlot,
} from '../src/utils/browse.ts'
import type { CommandCard, Unit, Upgrade, UpgradeRequirementList } from '../src/types/index.ts'

function unit(over: Partial<Unit> = {}): Unit {
  return {
    id: 'u', slug: 'u', name: 'U', title: '', faction: 'empire', rank: 'corps',
    unitType: 'trooper', affiliation: null, affiliations: [], cost: 50, defense: 'white', surgeAttack: null,
    surgeDefense: false, speed: 2, wounds: 5, courage: 1, miniCount: 1, isUnique: false,
    keywords: [], upgradeBar: [], weapons: [], cardImage: null, portraitImage: null,
    hasFullData: true, history: [], ...over,
  }
}
function cmd(over: Partial<CommandCard> = {}): CommandCard {
  return { id: 'c', slug: 'c', name: 'C', pips: 2, commander: null, faction: null, cardImage: null, ...over }
}
function upg(over: Partial<Upgrade> = {}): Upgrade {
  return { id: 'g', slug: 'g', name: 'G', slot: 'gear', cost: 10, isUnique: false, faction: null, keywords: [], grantedSlots: [], cardImage: null, ...over }
}

describe('browseCharacters', () => {
  it('collects commanders + operatives, deduped by name and sorted', () => {
    const units = [
      unit({ name: 'Vader', rank: 'commander', faction: 'empire' }),
      unit({ name: 'Boba Fett', rank: 'operative', faction: 'mercenary' }),
      unit({ name: 'Vader', rank: 'commander', faction: 'empire' }), // dup name
      unit({ name: 'Stormtrooper', rank: 'corps' }),                  // not a leader
    ]
    expect(browseCharacters(units)).toEqual([
      { name: 'Boba Fett', faction: 'mercenary' },
      { name: 'Vader', faction: 'empire' },
    ])
  })
})

describe('commandCharacters', () => {
  it('lists distinct commander names across cards (multi-name split), sorted', () => {
    const cards = [
      cmd({ commander: 'Darth Vader' }),
      cmd({ commander: 'Luke Skywalker, Leia Organa' }),
      cmd({ commander: 'Darth Vader' }),
      cmd({ commander: null }),
    ]
    expect(commandCharacters(cards)).toEqual(['Darth Vader', 'Leia Organa', 'Luke Skywalker'])
  })
})

describe('upgradeCharacters', () => {
  it('lists distinct cardName references across upgrade requirements, sorted', () => {
    const ups = [
      upg({ requirements: [{ cardName: 'Han Solo' }] }),
      upg({ requirements: ['OR', { cardName: 'Chewbacca' }, { cardName: 'Han Solo' }] }),
      upg({ requirements: [{ cardSubtype: 'trooper' }] }), // no cardName
      upg({}),                                              // no requirements
    ]
    expect(upgradeCharacters(ups)).toEqual(['Chewbacca', 'Han Solo'])
  })
})

describe('commandMatchesCharacter', () => {
  it('matches single and multi-name cards case-insensitively', () => {
    expect(commandMatchesCharacter(cmd({ commander: 'Darth Vader' }), 'darth vader')).toBe(true)
    expect(commandMatchesCharacter(cmd({ commander: 'Luke Skywalker, Leia Organa' }), 'Leia Organa')).toBe(true)
    expect(commandMatchesCharacter(cmd({ commander: 'Darth Vader' }), 'Luke')).toBe(false)
    expect(commandMatchesCharacter(cmd({ commander: null }), 'Vader')).toBe(false)
  })
})

describe('commandFaction', () => {
  const facOf = (n: string) => (n === 'Darth Vader' ? 'empire' as const : null)
  it('uses the card faction, else derives from a commander, else null', () => {
    expect(commandFaction(cmd({ faction: 'rebels' }), facOf)).toBe('rebels')
    expect(commandFaction(cmd({ faction: null, commander: 'Darth Vader' }), facOf)).toBe('empire')
    expect(commandFaction(cmd({ faction: null, commander: null }), facOf)).toBeNull()
  })
})

describe('searchCommands', () => {
  const facOf = () => null
  const cards = [
    cmd({ id: 'a', name: 'Master of Evil', faction: 'empire', commander: 'Darth Vader', pips: 3 }),
    cmd({ id: 'b', name: 'Implacable', faction: 'empire', commander: 'Darth Vader', pips: 1 }),
    cmd({ id: 'c', name: 'Ambush', faction: null, commander: null, pips: 1 }), // universal
    cmd({ id: 'd', name: 'Covert Observation', faction: 'rebels', commander: null }),
  ]
  it('filters by name query, faction, and character independently', () => {
    expect(searchCommands(cards, { query: 'master', faction: '', character: '' }, facOf).map((c) => c.id)).toEqual(['a'])
    expect(searchCommands(cards, { query: '', faction: 'rebels', character: '' }, facOf).map((c) => c.id)).toEqual(['d'])
    expect(searchCommands(cards, { query: '', faction: '', character: 'Darth Vader' }, facOf).map((c) => c.id).sort()).toEqual(['a', 'b'])
    expect(searchCommands(cards, { query: '', faction: '', character: '' }, facOf)).toHaveLength(4)
  })

  it('free-text also matches the commander name (cards are not named after their commander)', () => {
    // "Vader" appears in no card name but is the commander of a + b.
    expect(searchCommands(cards, { query: 'vader', faction: '', character: '' }, facOf).map((c) => c.id).sort()).toEqual(['a', 'b'])
  })
})

describe('groupCommandsByFaction', () => {
  const facOf = (n: string) => (n === 'Darth Vader' ? 'empire' as const : null)
  it('buckets by faction (universal last) and sorts by pip then name', () => {
    const cards = [
      cmd({ id: 'u1', name: 'Standing Orders', pips: 4 }),                       // universal
      cmd({ id: 'e2', name: 'Master of Evil', commander: 'Darth Vader', pips: 3 }), // empire (derived)
      cmd({ id: 'e1', name: 'Implacable', commander: 'Darth Vader', pips: 1 }),     // empire (derived)
      cmd({ id: 'r1', name: 'Sorry About the Mess', faction: 'rebels', pips: 2 }),
    ]
    const groups = groupCommandsByFaction(cards, facOf)
    expect(groups.map((g) => g.faction)).toEqual(['rebels', 'empire', null])
    expect(groups.find((g) => g.faction === 'empire')!.cards.map((c) => c.id)).toEqual(['e1', 'e2']) // pip order
  })
})

describe('upgradeNamesUnit', () => {
  it('finds a cardName criterion anywhere in the requirements tree', () => {
    expect(upgradeNamesUnit([{ cardName: 'Luke Skywalker' }], 'luke skywalker')).toBe(true)
    expect(upgradeNamesUnit(['OR', { cardName: 'Han Solo' }, { cardName: 'Chewbacca' }], 'Chewbacca')).toBe(true)
    expect(upgradeNamesUnit([{ cardSubtype: 'clone trooper' }], 'Rex')).toBe(false)
    expect(upgradeNamesUnit(undefined, 'Rex')).toBe(false)
  })
})

describe('upgradeForCharacter', () => {
  it('associates an upgrade only when it names a unit that can equip it', () => {
    const luke = unit({ name: 'Luke Skywalker', faction: 'rebels' })
    const named = upg({ requirements: [{ cardName: 'Luke Skywalker' }] })
    expect(upgradeForCharacter(named, 'Luke Skywalker', [luke])).toBe(true)
    // names Luke but requires empire → no rebel-Luke unit qualifies, so not associated.
    const crossFaction = upg({ requirements: ['AND', { cardName: 'Luke Skywalker' }, { faction: 'empire' }] })
    expect(upgradeForCharacter(crossFaction, 'Luke Skywalker', [luke])).toBe(false)
    // a generic upgrade (no cardName) is never character-associated.
    expect(upgradeForCharacter(upg({ requirements: [{ cardSubtype: 'trooper' }] }), 'Luke Skywalker', [luke])).toBe(false)
  })
})

describe('searchUpgrades', () => {
  const han = unit({ name: 'Han Solo', faction: 'rebels' })
  const units = [han]
  const ups = [
    upg({ id: 'a', name: 'Hunk of Junk', slot: 'gear', cost: 5, requirements: [{ cardName: 'Han Solo' }] }),
    upg({ id: 'b', name: 'Emergency Stims', slot: 'gear', cost: 8 }),         // generic
    upg({ id: 'c', name: 'Recon Intel', slot: 'training', cost: 2 }),
  ]
  it('filters by slot, name and character', () => {
    expect(searchUpgrades(ups, units, { query: '', slot: 'gear', character: '' }).map((u) => u.id)).toEqual(['a', 'b'])
    expect(searchUpgrades(ups, units, { query: 'stims', slot: '', character: '' }).map((u) => u.id)).toEqual(['b'])
    expect(searchUpgrades(ups, units, { query: '', slot: '', character: 'Han Solo' }).map((u) => u.id)).toEqual(['a'])
    expect(searchUpgrades(ups, units, { query: '', slot: '', character: '' })).toHaveLength(3)
  })

  it('free-text also matches a unit the upgrade is restricted to', () => {
    // "Han" is in no upgrade name but Hunk of Junk is restricted to Han Solo.
    expect(searchUpgrades(ups, units, { query: 'han', slot: '', character: '' }).map((u) => u.id)).toEqual(['a'])
  })
})

describe('groupUpgradesBySlot', () => {
  it('groups by slot (label-alphabetical) and sorts by cost then name', () => {
    const ups = [
      upg({ id: 'g2', name: 'Targeting Scopes', slot: 'gear', cost: 8 }),
      upg({ id: 'g1', name: 'Emergency Stims', slot: 'gear', cost: 8 }), // same cost → name order
      upg({ id: 't1', name: 'Aggressive Tactics', slot: 'training', cost: 10 }),
    ]
    const groups = groupUpgradesBySlot(ups)
    expect(groups.map((g) => g.slot)).toEqual(['gear', 'training'])
    expect(groups[0].upgrades.map((u) => u.id)).toEqual(['g1', 'g2'])
  })
})

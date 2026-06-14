import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useArmyStore } from '../src/stores/army.ts'
import { useCollectionStore } from '../src/stores/collection.ts'
import { useFavoritesStore } from '../src/stores/favorites.ts'

beforeEach(() => setActivePinia(createPinia()))

describe('army store', () => {
  it('adds and removes units', () => {
    const s = useArmyStore()
    s.setFaction('empire')
    s.addUnit('vader')
    s.addUnit('storm')
    expect(s.draft.units).toHaveLength(2)
    const uid = s.draft.units[0].uid
    s.removeUnit(uid)
    expect(s.draft.units).toHaveLength(1)
  })

  it('clears units when switching faction with units present', () => {
    const s = useArmyStore()
    s.setFaction('empire')
    s.addUnit('storm')
    s.setFaction('rebels')
    expect(s.draft.faction).toBe('rebels')
    expect(s.draft.units).toHaveLength(0)
  })

  it('duplicates a unit with its loadout via addCopy', () => {
    const s = useArmyStore()
    s.setFaction('empire')
    s.addUnit('storm')
    const uid = s.draft.units[0].uid
    s.setUpgrade(uid, 'heavy', 0, 'dlt')
    s.addCopy(uid)
    expect(s.draft.units).toHaveLength(2)
    const copy = s.draft.units[1]
    expect(copy.uid).not.toBe(uid) // distinct instance
    expect(copy.unitId).toBe('storm')
    expect(copy.upgrades).toEqual([{ slot: 'heavy#0', upgradeId: 'dlt' }])
    // Deep copy — mutating the copy must not affect the source.
    copy.upgrades[0].upgradeId = 'other'
    expect(s.upgradeInSlot(uid, 'heavy', 0)).toBe('dlt')
  })

  it('addCopy on an unknown uid is a no-op', () => {
    const s = useArmyStore()
    s.setFaction('empire')
    s.addUnit('storm')
    s.addCopy('nope')
    expect(s.draft.units).toHaveLength(1)
  })

  it('equips and clears upgrades per slot index', () => {
    const s = useArmyStore()
    s.setFaction('empire')
    s.addUnit('vader')
    const uid = s.draft.units[0].uid
    s.setUpgrade(uid, 'force', 0, 'saber')
    s.setUpgrade(uid, 'force', 1, 'anger')
    expect(s.upgradeInSlot(uid, 'force', 0)).toBe('saber')
    expect(s.upgradeInSlot(uid, 'force', 1)).toBe('anger')
    s.setUpgrade(uid, 'force', 0, null)
    expect(s.upgradeInSlot(uid, 'force', 0)).toBeNull()
    expect(s.upgradeInSlot(uid, 'force', 1)).toBe('anger')
  })

  it('saves, loads and deletes armies', () => {
    const s = useArmyStore()
    s.setFaction('empire')
    s.setName('List A')
    s.addUnit('vader')
    const idx = s.saveCurrent()
    expect(s.saved).toHaveLength(1)
    expect(s.activeIndex).toBe(idx)

    s.newArmy()
    expect(s.draft.units).toHaveLength(0)
    expect(s.activeIndex).toBe(-1)

    s.loadSaved(0)
    expect(s.draft.name).toBe('List A')
    expect(s.draft.units).toHaveLength(1)

    s.deleteSaved(0)
    expect(s.saved).toHaveLength(0)
    expect(s.activeIndex).toBe(-1)
  })

  it('updates an existing saved army in place', () => {
    const s = useArmyStore()
    s.setFaction('rebels')
    s.addUnit('luke')
    s.saveCurrent()
    s.addUnit('rebel-troopers')
    s.saveCurrent()
    expect(s.saved).toHaveLength(1)
    expect(s.saved[0].u).toHaveLength(2)
  })
})

describe('collection store', () => {
  it('tracks owned quantities and clamps to zero', () => {
    const c = useCollectionStore()
    expect(c.isOwned('exp-x')).toBe(false)
    c.increment('exp-x')
    expect(c.quantity('exp-x')).toBe(1)
    expect(c.isOwned('exp-x')).toBe(true)
    c.increment('exp-x')
    expect(c.quantity('exp-x')).toBe(2)
    c.decrement('exp-x')
    c.decrement('exp-x')
    c.decrement('exp-x')
    expect(c.quantity('exp-x')).toBe(0)
    expect(c.isOwned('exp-x')).toBe(false)
  })

  it('imports and resets owned data', () => {
    const c = useCollectionStore()
    c.importOwned({ 'exp-a': 1, 'exp-b': 3 })
    expect(c.quantity('exp-b')).toBe(3)
    c.reset()
    expect(c.quantity('exp-a')).toBe(0)
  })
})

describe('favorites store', () => {
  it('toggles favorites', () => {
    const f = useFavoritesStore()
    expect(f.isFavorite('vader')).toBe(false)
    f.toggle('vader')
    expect(f.isFavorite('vader')).toBe(true)
    f.toggle('vader')
    expect(f.isFavorite('vader')).toBe(false)
  })
})

describe('army store — battle force', () => {
  it('keeps units when setting a battle force (warn + keep-flag), and resets it on faction change', () => {
    const s = useArmyStore()
    s.setFaction('mandalorians')
    s.addUnit('din')
    s.setBattleForce('mc')
    expect(s.draft.battleForce).toBe('mc')
    expect(s.draft.units).toHaveLength(1) // not cleared
    s.setBattleForce(null)
    expect(s.draft.battleForce).toBeNull()
    s.setBattleForce('mc')
    s.setFaction('empire') // changing faction drops the battle force
    expect(s.draft.battleForce).toBeNull()
  })
})

describe('battleForces store', () => {
  it('indexes by linkId and filters by faction', async () => {
    const { useBattleForcesStore } = await import('../src/stores/battleForces.ts')
    const s = useBattleForcesStore()
    s.battleForces = [
      { linkId: 'mc', name: 'Mandalorian Clans', faction: 'mandalorians' } as never,
      { linkId: 'bf', name: 'Blizzard Force', faction: 'empire' } as never,
      { linkId: 'tf', name: 'Tempest Force', faction: 'empire' } as never,
    ]
    expect(s.byId.get('mc')?.name).toBe('Mandalorian Clans')
    expect(s.forFaction('empire').map((b) => b.name)).toEqual(['Blizzard Force', 'Tempest Force'])
    expect(s.forFaction(null)).toEqual([])
  })
})

describe('army store — command hand', () => {
  it('toggles command cards on/off and clears them on faction change', () => {
    const s = useArmyStore()
    s.setFaction('empire')
    s.toggleCommandCard('v1')
    s.toggleCommandCard('v2')
    expect(s.draft.commandHand).toEqual(['v1', 'v2'])
    s.toggleCommandCard('v1') // toggle off
    expect(s.draft.commandHand).toEqual(['v2'])
    s.setFaction('rebels')
    expect(s.draft.commandHand).toEqual([]) // cleared with faction
  })

  it('clearCommandHand empties the hand', () => {
    const s = useArmyStore()
    s.setFaction('empire')
    s.toggleCommandCard('x')
    s.clearCommandHand()
    expect(s.draft.commandHand).toEqual([])
  })
})

describe('army store — battle deck', () => {
  it('toggles battle cards and keeps them across faction change', () => {
    const s = useArmyStore()
    s.setFaction('empire')
    s.toggleBattleCard('p1')
    s.toggleBattleCard('s1')
    expect(s.draft.battleDeck).toEqual(['p1', 's1'])
    s.toggleBattleCard('p1')
    expect(s.draft.battleDeck).toEqual(['s1'])
    s.setFaction('rebels') // battle deck is mostly faction-agnostic → kept
    expect(s.draft.battleDeck).toEqual(['s1'])
    s.clearBattleDeck()
    expect(s.draft.battleDeck).toEqual([])
  })
})

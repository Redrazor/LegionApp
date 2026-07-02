import { describe, it, expect } from 'vitest'
import {
  createRoomState, ensureGuest, setPlayerArmy, setPlayerName, slotFor,
} from '../server/playState.ts'
import type { Army } from '../src/types/index.ts'

const army = (name: string): Army => ({
  name, faction: 'empire', battleForce: null, gameSize: 1000, units: [], commandHand: [], battleDeck: [], doctrines: [],
})

describe('createRoomState', () => {
  it('starts with a named host and no guest', () => {
    expect(createRoomState('Alice')).toEqual({ host: { name: 'Alice', army: null }, guest: null })
  })
  it('defaults an empty host name', () => {
    expect(createRoomState('').host.name).toBe('Host')
  })
})

describe('ensureGuest', () => {
  it('adds a guest slot when absent', () => {
    const s = ensureGuest(createRoomState('Alice'), 'Bob')
    expect(s.guest).toEqual({ name: 'Bob', army: null })
  })
  it('is idempotent — keeps the existing guest', () => {
    const first = ensureGuest(createRoomState('Alice'), 'Bob')
    const second = ensureGuest(first, 'Carol')
    expect(second.guest?.name).toBe('Bob')
  })
})

describe('setPlayerArmy', () => {
  it('sets the host army', () => {
    const s = setPlayerArmy(createRoomState('Alice'), 'host', army('Rebels'))
    expect(s.host.army?.name).toBe('Rebels')
  })
  it('sets the guest army once the guest exists', () => {
    const s = setPlayerArmy(ensureGuest(createRoomState('Alice'), 'Bob'), 'guest', army('Empire'))
    expect(s.guest?.army?.name).toBe('Empire')
  })
  it('no-ops setting a guest army before the guest joins', () => {
    const s = setPlayerArmy(createRoomState('Alice'), 'guest', army('Empire'))
    expect(s.guest).toBeNull()
  })
  it('clears an army with null', () => {
    const withArmy = setPlayerArmy(createRoomState('Alice'), 'host', army('Rebels'))
    expect(setPlayerArmy(withArmy, 'host', null).host.army).toBeNull()
  })
  it('does not mutate the input state', () => {
    const base = createRoomState('Alice')
    setPlayerArmy(base, 'host', army('Rebels'))
    expect(base.host.army).toBeNull()
  })
})

describe('setPlayerName', () => {
  it('renames and trims', () => {
    expect(setPlayerName(createRoomState('Alice'), 'host', '  Zed  ').host.name).toBe('Zed')
  })
  it('falls back to a role default when blank', () => {
    expect(setPlayerName(createRoomState('Alice'), 'host', '   ').host.name).toBe('Host')
  })
})

describe('slotFor', () => {
  it('reads host and guest slots', () => {
    const s = ensureGuest(createRoomState('Alice'), 'Bob')
    expect(slotFor(s, 'host')?.name).toBe('Alice')
    expect(slotFor(s, 'guest')?.name).toBe('Bob')
  })
  it('returns null for an absent guest', () => {
    expect(slotFor(createRoomState('Alice'), 'guest')).toBeNull()
  })
})

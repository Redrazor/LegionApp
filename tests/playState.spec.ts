import { describe, it, expect } from 'vitest'
import {
  createRoomState, ensureGuest, setPlayerArmy, setPlayerName, slotFor, setMission, clearMission,
  ensureGame, advanceGamePhase, scoreVp, resetGame,
} from '../server/playState.ts'
import { pendingStandardMission } from '../src/utils/mission.ts'
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

describe('setMission / clearMission', () => {
  it('attaches and clears the mission immutably', () => {
    const base = createRoomState('Alice')
    const m = pendingStandardMission(1)
    const withMission = setMission(base, m)
    expect(withMission.mission).toBe(m)
    expect(base.mission).toBeUndefined() // input untouched
    expect(clearMission(withMission).mission).toBeNull()
  })
  it('setting or clearing the mission drops any game in progress', () => {
    const started = advanceGamePhase(createRoomState('Alice'), 1)
    expect(started.game).not.toBeNull()
    expect(setMission(started, pendingStandardMission(2)).game).toBeNull()
    expect(clearMission(started).game).toBeNull()
  })
})

describe('game reducers (Phase 4)', () => {
  it('ensureGame lazily creates a fresh game and is idempotent', () => {
    const base = createRoomState('Alice')
    expect(base.game).toBeUndefined()
    const g1 = ensureGame(base, 10)
    expect(g1.game).toMatchObject({ round: 1, phase: 'command', vp: { host: 0, guest: 0 } })
    const g2 = ensureGame(g1, 20)
    expect(g2).toBe(g1) // idempotent — same reference
  })

  it('advanceGamePhase creates the game on first call then advances it', () => {
    const s1 = advanceGamePhase(createRoomState('Alice'), 1)
    expect(s1.game?.phase).toBe('activation')
    const s2 = advanceGamePhase(s1, 2)
    expect(s2.game?.phase).toBe('end')
  })

  it('scoreVp sets a player VP (creating the game if needed) and logs it', () => {
    const s = scoreVp(createRoomState('Alice'), 'host', 4, 5)
    expect(s.game?.vp).toEqual({ host: 4, guest: 0 })
    expect(s.game?.log.at(-1)).toMatchObject({ kind: 'vp', actor: 'host' })
  })

  it('resetGame clears the tracker', () => {
    const started = scoreVp(createRoomState('Alice'), 'guest', 2, 1)
    expect(resetGame(started).game).toBeNull()
  })

  it('does not mutate the input state', () => {
    const base = createRoomState('Alice')
    advanceGamePhase(base, 1)
    scoreVp(base, 'host', 3, 1)
    expect(base.game).toBeUndefined()
  })
})

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import {
  ensurePlayRoomsTable, insertRoom, getRoomById, getRoomByCode,
  updateRoomState, deleteRoom, sweepExpiredRooms, generateUniqueCode, reconPools,
  battleCardSubtypes,
} from '../server/db/playRooms.ts'
import { dropTables, createTables } from '../server/db/seed.ts'
import { createRoomState, setPlayerArmy } from '../server/playState.ts'
import { createRoomManager } from '../server/rooms.ts'
import type { Army, RoomState } from '../src/types/index.ts'

type Sqlite = InstanceType<typeof Database>
let sqlite: Sqlite

beforeEach(() => {
  sqlite = new Database(':memory:')
  ensurePlayRoomsTable(sqlite)
})
afterEach(() => sqlite.close())

const state = (): RoomState => createRoomState('Alice')

describe('play_rooms CRUD', () => {
  it('inserts and reads a room by id and by code', () => {
    insertRoom(sqlite, 'id-1', 'ABCD', state(), 1000)
    expect(getRoomById(sqlite, 'id-1')?.code).toBe('ABCD')
    expect(getRoomByCode(sqlite, 'abcd')?.id).toBe('id-1') // case-insensitive
    expect(getRoomById(sqlite, 'missing')).toBeUndefined()
  })

  it('round-trips the state blob as parsed JSON', () => {
    insertRoom(sqlite, 'id-1', 'ABCD', setPlayerArmy(state(), 'host', null), 1000)
    const back = getRoomById(sqlite, 'id-1')
    expect(back?.state.host.name).toBe('Alice')
    expect(back?.state.guest).toBeNull()
  })

  it('updates state and bumps updated_at', () => {
    insertRoom(sqlite, 'id-1', 'ABCD', state(), 1000)
    const next = setPlayerArmy(state(), 'host', null)
    next.host.name = 'Renamed'
    updateRoomState(sqlite, 'id-1', next, 2000)
    const back = getRoomById(sqlite, 'id-1')
    expect(back?.state.host.name).toBe('Renamed')
    expect(back?.updatedAt).toBe(2000)
  })

  it('deletes a room', () => {
    insertRoom(sqlite, 'id-1', 'ABCD', state(), 1000)
    deleteRoom(sqlite, 'id-1')
    expect(getRoomById(sqlite, 'id-1')).toBeUndefined()
  })
})

describe('sweepExpiredRooms', () => {
  it('removes only rooms older than the TTL', () => {
    insertRoom(sqlite, 'old', 'AAAA', state(), 1000)
    insertRoom(sqlite, 'new', 'BBBB', state(), 9000)
    const removed = sweepExpiredRooms(sqlite, 1000, 10000) // cutoff = 9000
    expect(removed).toBe(1)
    expect(getRoomById(sqlite, 'old')).toBeUndefined()
    expect(getRoomById(sqlite, 'new')).toBeDefined()
  })
})

describe('generateUniqueCode', () => {
  it('returns a 4-char code from the safe alphabet', () => {
    const code = generateUniqueCode(sqlite, () => 0)
    expect(code).toHaveLength(4)
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/)
  })

  it('skips a code that already exists', () => {
    // rand()=0 → 'AAAA'; occupy it, then the generator must retry to a new code.
    insertRoom(sqlite, 'id-1', 'AAAA', state(), 1000)
    const seq = [0, 0, 0, 0, /* AAAA taken → retry */ 0.5, 0.5, 0.5, 0.5]
    let i = 0
    const code = generateUniqueCode(sqlite, () => seq[i++])
    expect(code).not.toBe('AAAA')
  })
})

describe('reconPools', () => {
  it('groups is_recon battle cards by subtype', () => {
    createTables(sqlite) // provides battle_cards
    const ins = sqlite.prepare('INSERT INTO battle_cards (id, name, subtype, is_recon) VALUES (?, ?, ?, ?)')
    ins.run('p1', 'Bunker Assault', 'primary', 1)
    ins.run('s1', 'Recon Mission', 'secondary', 1)
    ins.run('a1', 'Advanced Intel', 'advantage', 1)
    ins.run('a2', 'Cunning Deployment', 'advantage', 1)
    ins.run('std', 'Payload', 'primary', 0) // non-recon must be excluded
    const pools = reconPools(sqlite)
    expect(pools.primary).toEqual(['p1'])
    expect(pools.secondary).toEqual(['s1'])
    expect(pools.advantage.sort()).toEqual(['a1', 'a2'])
  })
})

describe('battleCardSubtypes', () => {
  it('maps every battle-card id to its subtype', () => {
    createTables(sqlite)
    const ins = sqlite.prepare('INSERT INTO battle_cards (id, name, subtype, is_recon) VALUES (?, ?, ?, ?)')
    ins.run('pX', 'Obj', 'primary', 0)
    ins.run('sX', 'Sec', 'secondary', 0)
    ins.run('aX', 'Adv', 'advantage', 1)
    const map = battleCardSubtypes(sqlite)
    expect(map.get('pX')).toBe('primary')
    expect(map.get('sX')).toBe('secondary')
    expect(map.get('aX')).toBe('advantage')
    expect(map.get('missing')).toBeUndefined()
  })
})

describe('Standard mission draft (room manager)', () => {
  // Two DISTINCT decks so we can prove each side's cards come from its own deck.
  const DECK_A = ['pA1', 'pA2', 'pA3', 'sA1', 'sA2', 'sA3', 'aA1', 'aA2', 'aA3']
  const DECK_B = ['pB1', 'pB2', 'pB3', 'sB1', 'sB2', 'sB3', 'aB1', 'aB2', 'aB3']
  const advA = ['aA1', 'aA2', 'aA3']
  const advB = ['aB1', 'aB2', 'aB3']
  const priA = ['pA1', 'pA2', 'pA3']
  const priB = ['pB1', 'pB2', 'pB3']
  const secA = ['sA1', 'sA2', 'sA3']
  const secB = ['sB1', 'sB2', 'sB3']

  const mkArmy = (deck: string[]): Army => ({
    name: 'Army', faction: 'empire', battleForce: null, gameSize: 1000,
    units: [], commandHand: [], battleDeck: deck, doctrines: [],
  })

  function seedDecks() {
    createTables(sqlite)
    const ins = sqlite.prepare('INSERT INTO battle_cards (id, name, subtype, is_recon) VALUES (?, ?, ?, ?)')
    const subtypeFor = (id: string) => (id[0] === 'p' ? 'primary' : id[0] === 's' ? 'secondary' : 'advantage')
    for (const id of [...DECK_A, ...DECK_B]) ins.run(id, id, subtypeFor(id), 0)
  }

  it('opens the reveal phase for the Blue player, then draws each side’s Advantage from its OWN deck', () => {
    seedDecks()
    const rooms = createRoomManager(sqlite)
    const { snapshot } = rooms.create('sock-host', 'Alice')
    rooms.join('sock-guest', snapshot.code, 'Bob')
    rooms.updateArmy('sock-host', mkArmy(DECK_A))
    rooms.updateArmy('sock-guest', mkArmy(DECK_B))

    const drawn = rooms.drawMission('sock-host')!
    const m = drawn.state.mission!
    // Standard game → interactive draft opens in the reveal phase (Blue picks Objective/Secondary).
    expect(m.format).toBe('standard')
    expect(m.pending).toBeFalsy()
    expect(m.draft?.phase).toBe('reveal')
    expect(m.bluePlayer === 'host' || m.bluePlayer === 'guest').toBe(true)
    expect(m.primary).toBeNull()
    expect(m.secondary).toBeNull()

    // The Blue player reveals their Objective first; the opponent reveals their Secondary.
    const blue = m.bluePlayer!
    const blueSocket = blue === 'host' ? 'sock-host' : 'sock-guest'
    const modified = rooms.modifyMission(blueSocket, 'reveal-primary')!
    const m2 = modified.state.mission!
    expect(m2.draft?.phase).toBe('modify')

    // GUARANTEE: each player's Advantage is drawn from that player's own deck.
    expect(advA).toContain(m2.advantage.host)
    expect(advB).toContain(m2.advantage.guest)

    // Objective from Blue's deck; Secondary from the opponent's deck.
    const bluePri = blue === 'host' ? priA : priB
    const oppSec = blue === 'host' ? secB : secA
    expect(bluePri).toContain(m2.primary)
    expect(oppSec).toContain(m2.secondary)
  })

  it('rejects a reveal from the non-Blue player (server enforces the turn)', () => {
    seedDecks()
    const rooms = createRoomManager(sqlite)
    const { snapshot } = rooms.create('sock-host', 'Alice')
    rooms.join('sock-guest', snapshot.code, 'Bob')
    rooms.updateArmy('sock-host', mkArmy(DECK_A))
    rooms.updateArmy('sock-guest', mkArmy(DECK_B))
    const m = rooms.drawMission('sock-host')!.state.mission!
    const notBlue = m.bluePlayer === 'host' ? 'sock-guest' : 'sock-host'
    // Off-turn reveal is a no-op → the room manager returns null (no broadcast).
    expect(rooms.modifyMission(notBlue, 'reveal-primary')).toBeNull()
    expect(getRoomById(sqlite, snapshot.id)!.state.mission!.draft?.phase).toBe('reveal')
  })

  it('requires both players to have a complete battle deck (else pending)', () => {
    seedDecks()
    const rooms = createRoomManager(sqlite)
    const { snapshot } = rooms.create('sock-host', 'Alice')
    rooms.join('sock-guest', snapshot.code, 'Bob')
    rooms.updateArmy('sock-host', mkArmy(DECK_A))
    rooms.updateArmy('sock-guest', mkArmy(['pB1', 'sB1'])) // guest deck missing an Advantage
    const m = rooms.drawMission('sock-host')!.state.mission!
    expect(m.pending).toBe(true)
    expect(m.draft).toBeNull()
  })
})

describe('durability across a catalogue reseed', () => {
  it('play_rooms survives seed.ts dropTables + createTables', () => {
    createTables(sqlite) // catalogue tables
    insertRoom(sqlite, 'id-1', 'ABCD', state(), 1000)
    // Simulate a server reboot's reseed, which drops+recreates ONLY catalogue tables.
    dropTables(sqlite)
    createTables(sqlite)
    // The live room must still be here.
    expect(getRoomById(sqlite, 'id-1')?.code).toBe('ABCD')
  })
})

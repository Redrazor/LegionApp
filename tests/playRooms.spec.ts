import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import {
  ensurePlayRoomsTable, insertRoom, getRoomById, getRoomByCode,
  updateRoomState, deleteRoom, sweepExpiredRooms, generateUniqueCode,
} from '../server/db/playRooms.ts'
import { dropTables, createTables } from '../server/db/seed.ts'
import { createRoomState, setPlayerArmy } from '../server/playState.ts'
import type { RoomState } from '../src/types/index.ts'

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

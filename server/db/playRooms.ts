// Durable store for Play multiplayer rooms. CRITICAL: this table is created with
// `CREATE TABLE IF NOT EXISTS` and is deliberately NOT part of seed.ts's dropTables()
// — the catalogue reseeds from public/data on every server boot, but live games must
// survive that. Rooms persist until explicitly ended or swept by the 24h TTL.

import type Database from 'better-sqlite3'
import type { RoomState } from '../../src/types/index.ts'

type Sqlite = InstanceType<typeof Database>

export interface StoredRoom {
  id: string
  code: string
  state: RoomState
  createdAt: number
  updatedAt: number
}

interface Row {
  id: string
  code: string
  state: string
  created_at: number
  updated_at: number
}

export function ensurePlayRoomsTable(sqlite: Sqlite): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS play_rooms (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      state TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_play_rooms_updated ON play_rooms(updated_at);
  `)
}

function hydrate(row: Row | undefined): StoredRoom | undefined {
  if (!row) return undefined
  return {
    id: row.id,
    code: row.code,
    state: JSON.parse(row.state) as RoomState,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function insertRoom(sqlite: Sqlite, id: string, code: string, state: RoomState, now: number): StoredRoom {
  sqlite
    .prepare('INSERT INTO play_rooms (id, code, state, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, code, JSON.stringify(state), now, now)
  return { id, code, state, createdAt: now, updatedAt: now }
}

export function getRoomById(sqlite: Sqlite, id: string): StoredRoom | undefined {
  return hydrate(sqlite.prepare('SELECT * FROM play_rooms WHERE id = ?').get(id) as Row | undefined)
}

export function getRoomByCode(sqlite: Sqlite, code: string): StoredRoom | undefined {
  return hydrate(sqlite.prepare('SELECT * FROM play_rooms WHERE code = ?').get(code.toUpperCase()) as Row | undefined)
}

export function updateRoomState(sqlite: Sqlite, id: string, state: RoomState, now: number): void {
  sqlite
    .prepare('UPDATE play_rooms SET state = ?, updated_at = ? WHERE id = ?')
    .run(JSON.stringify(state), now, id)
}

export function deleteRoom(sqlite: Sqlite, id: string): void {
  sqlite.prepare('DELETE FROM play_rooms WHERE id = ?').run(id)
}

/** Delete rooms untouched for longer than `maxAgeMs`. Returns the number removed. */
export function sweepExpiredRooms(sqlite: Sqlite, maxAgeMs: number, now: number): number {
  const res = sqlite.prepare('DELETE FROM play_rooms WHERE updated_at < ?').run(now - maxAgeMs)
  return res.changes
}

/** The fixed Recon battle-card decks, grouped by subtype, read from the seeded catalogue. */
export function reconPools(sqlite: Sqlite): { primary: string[]; secondary: string[]; advantage: string[] } {
  const rows = sqlite
    .prepare('SELECT id, subtype FROM battle_cards WHERE is_recon = 1')
    .all() as { id: string; subtype: string }[]
  const pools = { primary: [] as string[], secondary: [] as string[], advantage: [] as string[] }
  for (const r of rows) {
    if (r.subtype === 'primary') pools.primary.push(r.id)
    else if (r.subtype === 'secondary') pools.secondary.push(r.id)
    else if (r.subtype === 'advantage') pools.advantage.push(r.id)
  }
  return pools
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I

/** A random 4-char join code guaranteed unique against the table. `rand` is injectable for tests. */
export function generateUniqueCode(sqlite: Sqlite, rand: () => number = Math.random): string {
  for (let attempt = 0; attempt < 50; attempt++) {
    let code = ''
    for (let i = 0; i < 4; i++) code += CODE_CHARS[Math.floor(rand() * CODE_CHARS.length)]
    if (!getRoomByCode(sqlite, code)) return code
  }
  throw new Error('Unable to allocate a unique room code')
}

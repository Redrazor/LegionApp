// Room manager for Play multiplayer. Bridges live sockets to the DURABLE room store
// (db/playRooms.ts) and layers transient presence on top. The persisted state survives
// disconnects and server-lifetime restarts ("resume until destroyed"); presence is
// in-memory and grace-buffered so a brief drop/refresh doesn't flip a player offline.
//
// The socket layer (index.ts) stays thin: it calls these methods and emits whatever
// snapshots they return.

import { randomUUID } from 'crypto'
import type Database from 'better-sqlite3'
import type { Army, PlayerRole, RoomSnapshot, RoomPresence } from '../src/types/index.ts'
import {
  ensurePlayRoomsTable, insertRoom, getRoomById, getRoomByCode,
  updateRoomState, deleteRoom, sweepExpiredRooms, generateUniqueCode, reconPools, type StoredRoom,
} from './db/playRooms.ts'
import { createRoomState, ensureGuest, setPlayerArmy, setPlayerName, setMission, clearMission } from './playState.ts'
import { missionFormat, drawReconMission, pendingStandardMission } from '../src/utils/mission.ts'

type Sqlite = InstanceType<typeof Database>

interface SlotConn { socketId: string | null; graceTimer: ReturnType<typeof setTimeout> | null }
interface RoomConn { host: SlotConn; guest: SlotConn }

export interface RoomManagerOptions {
  graceMs?: number // presence grace before a dropped player shows offline
  ttlMs?: number // inactivity age before a room is swept
  /** Called when a room's presence changes after a grace period expires. */
  onPresenceExpire?: (roomId: string) => void
}

export interface JoinResult {
  ok: boolean
  role?: PlayerRole
  snapshot?: RoomSnapshot
  error?: 'not-found' | 'full'
}

export function createRoomManager(sqlite: Sqlite, opts: RoomManagerOptions = {}) {
  const graceMs = opts.graceMs ?? 30_000
  const ttlMs = opts.ttlMs ?? 24 * 60 * 60 * 1000

  ensurePlayRoomsTable(sqlite)

  const conns = new Map<string, RoomConn>() // roomId → live connections
  const socketIndex = new Map<string, { roomId: string; role: PlayerRole }>()

  function connFor(roomId: string): RoomConn {
    let c = conns.get(roomId)
    if (!c) {
      c = { host: { socketId: null, graceTimer: null }, guest: { socketId: null, graceTimer: null } }
      conns.set(roomId, c)
    }
    return c
  }

  function presenceFor(roomId: string): RoomPresence {
    const c = conns.get(roomId)
    return { host: !!c?.host.socketId, guest: !!c?.guest.socketId }
  }

  function snapshotFor(roomId: string): RoomSnapshot | null {
    const room = getRoomById(sqlite, roomId)
    if (!room) return null
    return { id: room.id, code: room.code, state: room.state, presence: presenceFor(roomId) }
  }

  function attach(roomId: string, role: PlayerRole, socketId: string): void {
    const slot = connFor(roomId)[role]
    if (slot.graceTimer) { clearTimeout(slot.graceTimer); slot.graceTimer = null }
    slot.socketId = socketId
    socketIndex.set(socketId, { roomId, role })
  }

  function toSnapshot(room: StoredRoom): RoomSnapshot {
    return { id: room.id, code: room.code, state: room.state, presence: presenceFor(room.id) }
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  function create(socketId: string, name: string): { role: PlayerRole; snapshot: RoomSnapshot } {
    const id = randomUUID()
    const code = generateUniqueCode(sqlite)
    const room = insertRoom(sqlite, id, code, createRoomState(name || 'Host'), Date.now())
    attach(id, 'host', socketId)
    return { role: 'host', snapshot: toSnapshot(room) }
  }

  function join(socketId: string, code: string, name: string): JoinResult {
    const room = getRoomByCode(sqlite, code)
    if (!room) return { ok: false, error: 'not-found' }
    const presence = presenceFor(room.id)
    // A live, occupied guest slot means the room is full to newcomers.
    if (room.state.guest && presence.guest) return { ok: false, error: 'full' }
    const state = ensureGuest(room.state, name || 'Guest')
    updateRoomState(sqlite, room.id, state, Date.now())
    attach(room.id, 'guest', socketId)
    return { ok: true, role: 'guest', snapshot: snapshotFor(room.id)! }
  }

  /** Re-attach a returning socket to its slot (resume). Client supplies the persisted role. */
  function rejoin(socketId: string, roomId: string, role: PlayerRole): RoomSnapshot | null {
    const room = getRoomById(sqlite, roomId)
    if (!room) return null
    if (role === 'guest' && !room.state.guest) return null
    attach(roomId, role, socketId)
    return snapshotFor(roomId)
  }

  // ── State mutations ──────────────────────────────────────────────────────────

  function updateArmy(socketId: string, army: Army | null): RoomSnapshot | null {
    const idx = socketIndex.get(socketId)
    if (!idx) return null
    const room = getRoomById(sqlite, idx.roomId)
    if (!room) return null
    const state = setPlayerArmy(room.state, idx.role, army)
    updateRoomState(sqlite, idx.roomId, state, Date.now())
    return snapshotFor(idx.roomId)
  }

  function renamePlayer(socketId: string, name: string): RoomSnapshot | null {
    const idx = socketIndex.get(socketId)
    if (!idx) return null
    const room = getRoomById(sqlite, idx.roomId)
    if (!room) return null
    const state = setPlayerName(room.state, idx.role, name)
    updateRoomState(sqlite, idx.roomId, state, Date.now())
    return snapshotFor(idx.roomId)
  }

  // ── Mission ──────────────────────────────────────────────────────────────────

  /** Draw the game's mission. Format is derived from both armies (Recon iff both Recon-sized). */
  function drawMission(socketId: string): RoomSnapshot | null {
    const idx = socketIndex.get(socketId)
    if (!idx) return null
    const room = getRoomById(sqlite, idx.roomId)
    if (!room) return null
    const format = missionFormat(room.state.host.army, room.state.guest?.army ?? null)
    const mission = format === 'recon'
      ? drawReconMission(reconPools(sqlite), Math.random, Date.now())
      : pendingStandardMission(Date.now())
    updateRoomState(sqlite, idx.roomId, setMission(room.state, mission), Date.now())
    return snapshotFor(idx.roomId)
  }

  function resetMission(socketId: string): RoomSnapshot | null {
    const idx = socketIndex.get(socketId)
    if (!idx) return null
    const room = getRoomById(sqlite, idx.roomId)
    if (!room) return null
    updateRoomState(sqlite, idx.roomId, clearMission(room.state), Date.now())
    return snapshotFor(idx.roomId)
  }

  // ── Teardown ─────────────────────────────────────────────────────────────────

  /** Explicit End game: delete the room and report who to notify. */
  function endGame(socketId: string): { roomId: string; code: string } | null {
    const idx = socketIndex.get(socketId)
    if (!idx) return null
    const room = getRoomById(sqlite, idx.roomId)
    deleteRoom(sqlite, idx.roomId)
    const c = conns.get(idx.roomId)
    if (c) {
      if (c.host.graceTimer) clearTimeout(c.host.graceTimer)
      if (c.guest.graceTimer) clearTimeout(c.guest.graceTimer)
    }
    conns.delete(idx.roomId)
    for (const [sid, v] of socketIndex) if (v.roomId === idx.roomId) socketIndex.delete(sid)
    return room ? { roomId: room.id, code: room.code } : { roomId: idx.roomId, code: '' }
  }

  /** Socket dropped: keep the slot "connected" for the grace window, then mark offline. */
  function disconnect(socketId: string): { roomId: string; role: PlayerRole } | null {
    const idx = socketIndex.get(socketId)
    if (!idx) return null
    socketIndex.delete(socketId)
    const slot = connFor(idx.roomId)[idx.role]
    if (slot.socketId !== socketId) return null // already replaced by a rejoin
    slot.graceTimer = setTimeout(() => {
      slot.socketId = null
      slot.graceTimer = null
      opts.onPresenceExpire?.(idx.roomId)
    }, graceMs)
    return { roomId: idx.roomId, role: idx.role }
  }

  function roomOf(socketId: string): { roomId: string; role: PlayerRole } | undefined {
    return socketIndex.get(socketId)
  }

  function sweep(): number {
    return sweepExpiredRooms(sqlite, ttlMs, Date.now())
  }

  return {
    create, join, rejoin, updateArmy, renamePlayer, drawMission, resetMission, endGame, disconnect,
    roomOf, snapshotFor, presenceFor, sweep,
  }
}

export type RoomManager = ReturnType<typeof createRoomManager>

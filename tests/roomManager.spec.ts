import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import { createRoomManager } from '../server/rooms.ts'
import type { Army } from '../src/types/index.ts'

type Sqlite = InstanceType<typeof Database>
let sqlite: Sqlite

beforeEach(() => { sqlite = new Database(':memory:') })
afterEach(() => { sqlite.close(); vi.useRealTimers() })

const army = (name: string): Army => ({
  name, faction: 'rebels', battleForce: null, gameSize: 1000, units: [], commandHand: [], battleDeck: [], doctrines: [],
})

describe('createRoomManager — lifecycle', () => {
  it('creates a room with a host present and no guest', () => {
    const mgr = createRoomManager(sqlite)
    const { role, snapshot } = mgr.create('sock-host', 'Alice')
    expect(role).toBe('host')
    expect(snapshot.code).toMatch(/^[A-Z0-9]{4}$/)
    expect(snapshot.state.host.name).toBe('Alice')
    expect(snapshot.state.guest).toBeNull()
    expect(snapshot.presence).toEqual({ host: true, guest: false })
  })

  it('lets a second socket join by code', () => {
    const mgr = createRoomManager(sqlite)
    const { snapshot } = mgr.create('sock-host', 'Alice')
    const res = mgr.join('sock-guest', snapshot.code, 'Bob')
    expect(res.ok).toBe(true)
    expect(res.role).toBe('guest')
    expect(res.snapshot?.state.guest?.name).toBe('Bob')
    expect(res.snapshot?.presence).toEqual({ host: true, guest: true })
  })

  it('rejects joining an unknown code', () => {
    const mgr = createRoomManager(sqlite)
    expect(mgr.join('s', 'ZZZZ', 'Bob')).toEqual({ ok: false, error: 'not-found' })
  })

  it('rejects a third player as full', () => {
    const mgr = createRoomManager(sqlite)
    const { snapshot } = mgr.create('sock-host', 'Alice')
    mgr.join('sock-guest', snapshot.code, 'Bob')
    expect(mgr.join('sock-third', snapshot.code, 'Eve')).toEqual({ ok: false, error: 'full' })
  })

  it('syncs an army and persists it', () => {
    const mgr = createRoomManager(sqlite)
    mgr.create('sock-host', 'Alice')
    const snap = mgr.updateArmy('sock-host', army('Echo Base'))
    expect(snap?.state.host.army?.name).toBe('Echo Base')
    // A fresh manager over the same DB sees the persisted army (resume across restart).
    const mgr2 = createRoomManager(sqlite)
    expect(mgr2.snapshotFor(snap!.id)?.state.host.army?.name).toBe('Echo Base')
  })

  it('ends a game, deleting the room', () => {
    const mgr = createRoomManager(sqlite)
    const { snapshot } = mgr.create('sock-host', 'Alice')
    mgr.endGame('sock-host')
    expect(mgr.snapshotFor(snapshot.id)).toBeNull()
  })
})

describe('createRoomManager — presence & resume', () => {
  it('keeps a player online during the grace window, then marks offline', () => {
    vi.useFakeTimers()
    const onPresenceExpire = vi.fn()
    const mgr = createRoomManager(sqlite, { graceMs: 1000, onPresenceExpire })
    const { snapshot } = mgr.create('sock-host', 'Alice')
    mgr.join('sock-guest', snapshot.code, 'Bob')

    mgr.disconnect('sock-guest')
    // Still "online" during grace.
    expect(mgr.presenceFor(snapshot.id).guest).toBe(true)
    expect(onPresenceExpire).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1000)
    expect(mgr.presenceFor(snapshot.id).guest).toBe(false)
    expect(onPresenceExpire).toHaveBeenCalledWith(snapshot.id)
  })

  it('rejoin within grace cancels the offline flip', () => {
    vi.useFakeTimers()
    const onPresenceExpire = vi.fn()
    const mgr = createRoomManager(sqlite, { graceMs: 1000, onPresenceExpire })
    const { snapshot } = mgr.create('sock-host', 'Alice')
    mgr.join('sock-guest', snapshot.code, 'Bob')

    mgr.disconnect('sock-guest')
    const resumed = mgr.rejoin('sock-guest-2', snapshot.id, 'guest')
    expect(resumed?.presence.guest).toBe(true)

    vi.advanceTimersByTime(2000)
    expect(onPresenceExpire).not.toHaveBeenCalled()
    expect(mgr.presenceFor(snapshot.id).guest).toBe(true)
  })

  it('lets a new player take the guest slot once the old one has gone offline', () => {
    vi.useFakeTimers()
    const mgr = createRoomManager(sqlite, { graceMs: 1000 })
    const { snapshot } = mgr.create('sock-host', 'Alice')
    mgr.join('sock-guest', snapshot.code, 'Bob')
    mgr.disconnect('sock-guest')
    vi.advanceTimersByTime(1000) // Bob now offline
    // Slot is occupied in state but no live socket → a rejoin/join can reclaim it.
    const res = mgr.join('sock-guest-new', snapshot.code, 'Carol')
    expect(res.ok).toBe(true)
  })

  it('returns null when resuming a room that no longer exists', () => {
    const mgr = createRoomManager(sqlite)
    expect(mgr.rejoin('s', 'nonexistent-id', 'host')).toBeNull()
  })
})

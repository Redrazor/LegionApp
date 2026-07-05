import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import { createRoomManager } from '../server/rooms.ts'
import { createTables } from '../server/db/seed.ts'
import type { Army } from '../src/types/index.ts'

type Sqlite = InstanceType<typeof Database>
let sqlite: Sqlite

beforeEach(() => { sqlite = new Database(':memory:') })
afterEach(() => { sqlite.close(); vi.useRealTimers() })

const army = (name: string, gameSize = 1000): Army => ({
  name, faction: 'rebels', battleForce: null, gameSize, units: [], commandHand: [], battleDeck: [], doctrines: [],
})

function seedReconCards(db: Sqlite) {
  createTables(db)
  const ins = db.prepare('INSERT INTO battle_cards (id, name, subtype, is_recon) VALUES (?, ?, ?, ?)')
  for (const [id, sub] of [['p1', 'primary'], ['p2', 'primary'], ['s1', 'secondary'], ['s2', 'secondary'], ['a1', 'advantage'], ['a2', 'advantage'], ['a3', 'advantage']] as const) {
    ins.run(id, id, sub, 1)
  }
}

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

describe('createRoomManager — mission', () => {
  function setup600() {
    seedReconCards(sqlite)
    const mgr = createRoomManager(sqlite)
    const { snapshot } = mgr.create('sock-host', 'Alice')
    mgr.join('sock-guest', snapshot.code, 'Bob')
    mgr.updateArmy('sock-host', army('A', 600))
    mgr.updateArmy('sock-guest', army('B', 600))
    return { mgr, id: snapshot.id }
  }

  it('draws a Recon mission when both armies are Recon-sized', () => {
    const { mgr } = setup600()
    const snap = mgr.drawMission('sock-host')
    expect(snap?.state.mission?.format).toBe('recon')
    expect(snap?.state.mission?.pending).toBeUndefined()
    expect(snap?.state.mission?.primary).toMatch(/^p[12]$/)
    expect(snap?.state.mission?.secondary).toMatch(/^s[12]$/)
    expect(snap?.state.mission?.advantage.host).not.toBe(snap?.state.mission?.advantage.guest)
    expect(['host', 'guest']).toContain(snap?.state.mission?.bluePlayer)
  })

  it('yields the Standard placeholder when armies are not Recon-sized', () => {
    seedReconCards(sqlite)
    const mgr = createRoomManager(sqlite)
    const { snapshot } = mgr.create('sock-host', 'Alice')
    mgr.join('sock-guest', snapshot.code, 'Bob')
    mgr.updateArmy('sock-host', army('A', 1000))
    mgr.updateArmy('sock-guest', army('B', 1000))
    const snap = mgr.drawMission('sock-host')
    expect(snap?.state.mission).toMatchObject({ format: 'standard', pending: true })
  })

  it('resetMission clears the drawn mission', () => {
    const { mgr } = setup600()
    mgr.drawMission('sock-host')
    const snap = mgr.resetMission('sock-host')
    expect(snap?.state.mission).toBeNull()
  })

  it('persists the mission (a fresh manager over the same DB sees it)', () => {
    const { mgr, id } = setup600()
    mgr.drawMission('sock-host')
    const mgr2 = createRoomManager(sqlite)
    expect(mgr2.snapshotFor(id)?.state.mission?.format).toBe('recon')
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

describe('createRoomManager — turn + VP tracker (Phase 4)', () => {
  it('advances the phase clock, creating the game on first call', () => {
    const mgr = createRoomManager(sqlite)
    mgr.create('sock-host', 'Alice')
    const s1 = mgr.advancePhase('sock-host')
    expect(s1?.state.game?.phase).toBe('activation')
    const s2 = mgr.advancePhase('sock-host')
    expect(s2?.state.game?.phase).toBe('end')
  })

  it('scores VP for a player and persists it across a rejoin', () => {
    const mgr = createRoomManager(sqlite)
    const { snapshot } = mgr.create('sock-host', 'Alice')
    mgr.scorePlayerVp('sock-host', 'host', 5)
    const resumed = mgr.rejoin('sock-host-2', snapshot.id, 'host')
    expect(resumed?.state.game?.vp.host).toBe(5)
    expect(resumed?.state.game?.log.some((e) => e.kind === 'vp')).toBe(true)
  })

  it('resets the tracker back to no game', () => {
    const mgr = createRoomManager(sqlite)
    mgr.create('sock-host', 'Alice')
    mgr.advancePhase('sock-host')
    expect(mgr.resetTracker('sock-host')?.state.game).toBeNull()
  })

  it('returns null for tracker actions from an unknown socket', () => {
    const mgr = createRoomManager(sqlite)
    expect(mgr.advancePhase('ghost')).toBeNull()
    expect(mgr.scorePlayerVp('ghost', 'host', 1)).toBeNull()
    expect(mgr.resetTracker('ghost')).toBeNull()
  })
})

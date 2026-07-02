import { usePlayRoom } from './usePlayRoom.ts'
import { usePlaySessionStore } from '../stores/playSession.ts'
import type { Army } from '../types/index.ts'

// Glue between the authoritative socket transport (usePlayRoom) and the session store.
// The UI calls these mode-aware actions; server snapshots flow back into the store.

export function usePlayConnection() {
  const room = usePlayRoom()
  const store = usePlaySessionStore()

  room.onRoomState((snap) => store.applySnapshot(snap))
  room.onRoomEnded(() => store.roomEnded())

  async function host(name: string): Promise<{ ok: boolean; error?: string }> {
    const carry = store.selfArmy // carry an already-imported solo army into the room
    const ack = await room.createRoom(name)
    if (!ack.ok || !ack.role || !ack.snapshot) return { ok: false, error: ack.error ?? 'create-failed' }
    store.enterRoom(ack.role, ack.snapshot)
    if (carry) room.sendArmy(carry)
    return { ok: true }
  }

  async function join(code: string, name: string): Promise<{ ok: boolean; error?: string }> {
    const carry = store.selfArmy
    const ack = await room.joinRoom(code, name)
    if (!ack.ok || !ack.role || !ack.snapshot) return { ok: false, error: ack.error ?? 'join-failed' }
    store.enterRoom(ack.role, ack.snapshot)
    if (carry) room.sendArmy(carry)
    return { ok: true }
  }

  /** Auto-resume a persisted room after a page reload. */
  async function resume(): Promise<void> {
    if (!store.roomId || !store.role) return
    try {
      const ack = await room.rejoinRoom(store.roomId, store.role)
      if (!ack.ok) store.end() // room gone (ended or TTL-swept)
    } catch {
      // server unreachable — keep the persisted room and let the user retry
    }
  }

  /** Import an army — sends to the server in a room, or stores locally in solo mode. */
  function importArmy(army: Army): void {
    if (store.inRoom) room.sendArmy(army)
    else store.setSelfArmy(army)
  }

  /** Return the local player to the importer without leaving the room / ending solo. */
  function changeArmy(): void {
    if (store.inRoom) room.sendArmy(null)
    else store.clearSelfArmy()
  }

  function rename(name: string): void {
    if (store.inRoom) room.setName(name)
    else store.setSelfName(name)
  }

  /** End the game: destroys the room server-side (both players) or ends the solo session. */
  function leave(): void {
    if (store.inRoom) room.endGame()
    store.end()
  }

  return { room, store, host, join, resume, importArmy, changeArmy, rename, leave }
}

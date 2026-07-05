import { usePlayRoom } from './usePlayRoom.ts'
import { usePlaySessionStore } from '../stores/playSession.ts'
import { useBattleCardsStore } from '../stores/battleCards.ts'
import {
  missionFormat, drawReconMission, pendingStandardMission, reconPoolsFrom,
  startStandardDraft, standardDraftReady, applyMissionModify,
} from '../utils/mission.ts'
import type { Army, MissionModifyAction, PlayerRole } from '../types/index.ts'

// Glue between the authoritative socket transport (usePlayRoom) and the session store.
// The UI calls these mode-aware actions; server snapshots flow back into the store.

export function usePlayConnection() {
  const room = usePlayRoom()
  const store = usePlaySessionStore()
  const battleCards = useBattleCardsStore()

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

  /** Import an army — sends to the server in a room, or stores locally in solo mode. In solo,
   *  `savedIndex` links the session to its Build saved list so Play can re-sync later edits. */
  function importArmy(army: Army, savedIndex: number | null = null): void {
    if (store.inRoom) room.sendArmy(army)
    else store.setSelfArmy(army, savedIndex)
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

  const subtypeOf = (id: string) => battleCards.byId.get(id)?.subtype ?? null

  /** Draw (or start) the game's mission. Room: server-authoritative. Solo: run locally —
   *  Recon draws immediately; Standard opens the interactive draft off the solo player's
   *  own battle deck (a single deck backs both sides), or a pending prompt if it's empty. */
  function drawMission(): void {
    if (store.inRoom) { room.drawMission(); return }
    const format = missionFormat(store.selfArmy)
    let mission
    if (format === 'recon') {
      mission = drawReconMission(reconPoolsFrom(battleCards.battleCards), Math.random, Date.now())
    } else {
      const deck = store.selfArmy?.battleDeck ?? []
      mission = standardDraftReady(deck, null, subtypeOf)
        ? startStandardDraft(deck, null, subtypeOf, Math.random, Date.now())
        : pendingStandardMission(Date.now())
    }
    store.setLocalMission(mission)
  }

  /** Modify the Standard mission during the draft. Room: server applies it for the caller's
   *  role on their turn. Solo: apply locally as whichever side is currently to act. */
  function modifyMission(action: MissionModifyAction): void {
    if (store.inRoom) { room.modifyMission(action); return }
    const m = store.mission
    if (!m?.draft || m.draft.phase === 'built') return
    store.setLocalMission(applyMissionModify(m, m.draft.turn, action, Math.random, Date.now()))
  }

  function resetMission(): void {
    if (store.inRoom) { room.resetMission(); return }
    store.setLocalMission(null)
  }

  // ── Turn + VP tracker (Phase 4) ────────────────────────────────────────────────
  // Room: server-authoritative (mutate → broadcast). Solo: apply locally via the store's
  // reducers. VP is addressed by absolute PlayerRole; the tracker maps Blue/Red rails to it.

  function advancePhase(): void {
    if (store.inRoom) { room.advancePhase(); return }
    store.advanceLocalPhase()
  }

  function setVp(player: PlayerRole, value: number): void {
    if (store.inRoom) { room.scoreVp(player, value); return }
    store.setLocalVp(player, value)
  }

  function adjustVp(player: PlayerRole, delta: number): void {
    const current = store.game?.vp[player] ?? 0
    setVp(player, current + delta)
  }

  function resetGame(): void {
    if (store.inRoom) { room.resetGame(); return }
    store.resetLocalGame()
  }

  /** End the game: destroys the room server-side (both players) or ends the solo session. */
  function leave(): void {
    if (store.inRoom) room.endGame()
    store.end()
  }

  return {
    room, store, host, join, resume, importArmy, changeArmy, rename,
    drawMission, modifyMission, resetMission, advancePhase, setVp, adjustVp, resetGame, leave,
  }
}

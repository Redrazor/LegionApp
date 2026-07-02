import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Army, PlayerRole, RoomSnapshot } from '../types/index.ts'
import { createSession, type PlaySession } from '../utils/playSession.ts'

/**
 * Holds the active Play session in one of two modes:
 *  - **solo** (Phase 1) — a local, single-device session; `self.army` is mutated directly.
 *  - **room** (Phase 2) — mirrors the server-authoritative room. `roomId`/`role` persist so
 *    a reload auto-rejoins and resumes; `applySnapshot` maps the shared host/guest state onto
 *    this player's self/opponent view. Army/name changes go to the server (via usePlayRoom)
 *    and flow back as snapshots — the store never mutates room state locally.
 */
export const usePlaySessionStore = defineStore(
  'playSession',
  () => {
    const session = ref<PlaySession | null>(null)
    const roomId = ref<string | null>(null)
    const roomCode = ref<string | null>(null)
    const role = ref<PlayerRole | null>(null)
    const opponentOnline = ref(false)

    const active = computed(() => session.value !== null)
    const inRoom = computed(() => roomId.value !== null)
    const mode = computed<'idle' | 'solo' | 'room'>(() =>
      inRoom.value ? 'room' : session.value ? 'solo' : 'idle',
    )
    const selfArmy = computed(() => session.value?.self.army ?? null)
    const opponentArmy = computed(() => session.value?.opponent.army ?? null)

    // ── Solo mode (Phase 1) ────────────────────────────────────────────────────
    function start(selfName?: string) {
      session.value = createSession(selfName)
    }

    function setSelfArmy(army: Army) {
      if (!session.value) session.value = createSession()
      session.value.self.army = army
    }

    function setSelfName(name: string) {
      if (session.value) session.value.self.name = name.trim() || 'You'
    }

    function clearSelfArmy() {
      if (session.value) session.value.self.army = null
    }

    /** Tear everything down — solo or room — back to the setup screen. */
    function end() {
      session.value = null
      roomId.value = null
      roomCode.value = null
      role.value = null
      opponentOnline.value = false
    }

    // ── Room mode (Phase 2) ────────────────────────────────────────────────────
    function enterRoom(myRole: PlayerRole, snapshot: RoomSnapshot) {
      role.value = myRole
      applySnapshot(snapshot)
    }

    /** Map the authoritative host/guest state onto this player's self/opponent view. */
    function applySnapshot(snap: RoomSnapshot) {
      if (!role.value) return
      const mine = role.value === 'host' ? snap.state.host : snap.state.guest
      const theirs = role.value === 'host' ? snap.state.guest : snap.state.host
      session.value = {
        id: snap.id,
        createdAt: session.value?.createdAt ?? Date.now(),
        self: { name: mine?.name ?? 'You', army: mine?.army ?? null },
        opponent: { name: theirs?.name ?? 'Opponent', army: theirs?.army ?? null },
      }
      roomId.value = snap.id
      roomCode.value = snap.code
      opponentOnline.value = role.value === 'host' ? snap.presence.guest : snap.presence.host
    }

    /** Room was ended (by either player or TTL) — drop to idle. */
    function roomEnded() {
      end()
    }

    return {
      session, roomId, roomCode, role, opponentOnline,
      active, inRoom, mode, selfArmy, opponentArmy,
      start, setSelfArmy, setSelfName, clearSelfArmy, end,
      enterRoom, applySnapshot, roomEnded,
    }
  },
  {
    persist: {
      paths: ['session', 'roomId', 'roomCode', 'role'],
    } as never,
  },
)

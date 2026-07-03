import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Army, PlayerRole, RoomSnapshot, MissionState } from '../types/index.ts'
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
    const mission = ref<MissionState | null>(null)

    const active = computed(() => session.value !== null)
    const inRoom = computed(() => roomId.value !== null)
    const mode = computed<'idle' | 'solo' | 'room'>(() =>
      inRoom.value ? 'room' : session.value ? 'solo' : 'idle',
    )
    const selfArmy = computed(() => session.value?.self.army ?? null)
    const opponentArmy = computed(() => session.value?.opponent.army ?? null)
    const bothArmiesReady = computed(() => !!selfArmy.value && !!opponentArmy.value)
    // Mission can be picked once armies are ready: both in a room, just yours when solo.
    const canPickMission = computed(() => (inRoom.value ? bothArmiesReady.value : !!selfArmy.value))

    // Mission getters mapped to THIS player's perspective. Solo has no role, so "self" is
    // the host side of the draw.
    const effectiveRole = computed<PlayerRole>(() => role.value ?? 'host')
    const missionReady = computed(() => !!mission.value && !mission.value.pending && !!mission.value.primary)
    const blueIsSelf = computed(() => !!mission.value && mission.value.bluePlayer === effectiveRole.value)
    const selfAdvantage = computed(() =>
      mission.value ? (effectiveRole.value === 'host' ? mission.value.advantage.host : mission.value.advantage.guest) : null,
    )
    const opponentAdvantage = computed(() =>
      mission.value ? (effectiveRole.value === 'host' ? mission.value.advantage.guest : mission.value.advantage.host) : null,
    )

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

    /** Set/clear the mission locally (solo mode — room mode sets it via applySnapshot). */
    function setLocalMission(m: MissionState | null) {
      mission.value = m
    }

    /** Tear everything down — solo or room — back to the setup screen. */
    function end() {
      session.value = null
      roomId.value = null
      roomCode.value = null
      role.value = null
      opponentOnline.value = false
      mission.value = null
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
      mission.value = snap.state.mission ?? null
    }

    /** Room was ended (by either player or TTL) — drop to idle. */
    function roomEnded() {
      end()
    }

    return {
      session, roomId, roomCode, role, opponentOnline, mission,
      active, inRoom, mode, selfArmy, opponentArmy, bothArmiesReady, canPickMission,
      missionReady, blueIsSelf, selfAdvantage, opponentAdvantage,
      start, setSelfArmy, setSelfName, clearSelfArmy, setLocalMission, end,
      enterRoom, applySnapshot, roomEnded,
    }
  },
  {
    persist: {
      // `mission` persists so a solo game's mission survives a reload; in a room it's
      // re-applied from the server snapshot on rejoin anyway.
      paths: ['session', 'roomId', 'roomCode', 'role', 'mission'],
    } as never,
  },
)

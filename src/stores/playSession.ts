import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Army, PlayerRole, RoomSnapshot, MissionState, GameState, GamePhase } from '../types/index.ts'
import { createSession, type PlaySession } from '../utils/playSession.ts'
import { createGameState, advancePhase, setVp } from '../utils/playGame.ts'

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
    // Phase 4 turn/VP tracker. Room mode mirrors it from the snapshot; solo holds it here.
    const game = ref<GameState | null>(null)
    // Which saved list (Build store index) a solo army came from, so Play can re-sync it
    // when the underlying list is edited (e.g. a battle deck built later). null = a
    // standalone import (share link) with no saved-list link.
    const soloSavedIndex = ref<number | null>(null)

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

    // ── Turn + VP tracker (Phase 4) ─────────────────────────────────────────────
    // The tracker shows once a mission is ready; VP rails are keyed by Blue/Red (from the
    // mission's Blue player), while the underlying game stores VP by host/guest role.
    const bluePlayer = computed<PlayerRole>(() => mission.value?.bluePlayer ?? 'host')
    const redPlayer = computed<PlayerRole>(() => (bluePlayer.value === 'host' ? 'guest' : 'host'))
    const round = computed(() => game.value?.round ?? 1)
    const phase = computed<GamePhase>(() => game.value?.phase ?? 'command')
    const gameOver = computed(() => game.value?.over ?? false)
    const gameLog = computed(() => game.value?.log ?? [])
    const blueVp = computed(() => game.value?.vp[bluePlayer.value] ?? 0)
    const redVp = computed(() => game.value?.vp[redPlayer.value] ?? 0)

    // ── Standard draft (DOC56 p.19) view state ──────────────────────────────────
    const standardDraft = computed(() => mission.value?.draft ?? null)
    const draftBuilt = computed(() => standardDraft.value?.phase === 'built')
    // Whose choices the local UI drives: in a room always yourself; solo, the side to act
    // (the one human plays both sides, so the board follows the active player).
    const draftActor = computed<PlayerRole>(() => {
      const d = standardDraft.value
      if (!d?.solo) return effectiveRole.value
      return d.phase === 'built' ? 'host' : d.turn // freeze to a stable side once built
    })
    const draftActorAdvantage = computed(() => (mission.value ? mission.value.advantage[draftActor.value] : null))
    const draftOpponentAdvantage = computed(() =>
      mission.value ? mission.value.advantage[draftActor.value === 'host' ? 'guest' : 'host'] : null,
    )
    const draftActorIsBlue = computed(() => !!mission.value && mission.value.bluePlayer === draftActor.value)
    const draftRevealing = computed(() => standardDraft.value?.phase === 'reveal')
    // Can the local player act right now? Solo: always (they play both). Room: only on your
    // turn (which, in the reveal phase, is the Blue player's).
    const draftCanAct = computed(() => {
      const d = standardDraft.value
      if (!d || d.phase === 'built') return false
      return d.solo || d.turn === effectiveRole.value
    })
    const draftModsLeft = computed(() => {
      const d = standardDraft.value
      return d ? Math.max(0, 2 - d.modsUsed[d.turn]) : 0
    })

    // ── Solo mode (Phase 1) ────────────────────────────────────────────────────
    function start(selfName?: string) {
      session.value = createSession(selfName)
    }

    function setSelfArmy(army: Army, savedIndex: number | null = null) {
      if (!session.value) session.value = createSession()
      session.value.self.army = army
      soloSavedIndex.value = savedIndex
      mission.value = null // a new/changed army invalidates any drawn or pending mission
      game.value = null // …and the tracker built on it
    }

    function setSelfName(name: string) {
      if (session.value) session.value.self.name = name.trim() || 'You'
    }

    function clearSelfArmy() {
      if (session.value) session.value.self.army = null
      soloSavedIndex.value = null
      mission.value = null
      game.value = null
    }

    /** Set/clear the mission locally (solo mode — room mode sets it via applySnapshot).
     *  A new/redrawn/cleared mission always restarts the tracker (fresh game). */
    function setLocalMission(m: MissionState | null) {
      mission.value = m
      game.value = null
    }

    // ── Solo tracker reducers (room mode drives these server-side via usePlayConnection) ──
    /** Advance the phase clock, lazily starting the game on the first action. */
    function advanceLocalPhase() {
      game.value = advancePhase(game.value ?? createGameState(Date.now()), Date.now())
    }
    /** Set a player's VP to an absolute value. */
    function setLocalVp(player: PlayerRole, value: number) {
      game.value = setVp(game.value ?? createGameState(Date.now()), player, value, Date.now())
    }
    /** Restart the tracker (next action starts a fresh game). */
    function resetLocalGame() {
      game.value = null
    }

    /** Tear everything down — solo or room — back to the setup screen. */
    function end() {
      session.value = null
      roomId.value = null
      roomCode.value = null
      role.value = null
      opponentOnline.value = false
      mission.value = null
      game.value = null
      soloSavedIndex.value = null
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
      game.value = snap.state.game ?? null
    }

    /** Room was ended (by either player or TTL) — drop to idle. */
    function roomEnded() {
      end()
    }

    return {
      session, roomId, roomCode, role, opponentOnline, mission, game, soloSavedIndex,
      active, inRoom, mode, effectiveRole, selfArmy, opponentArmy, bothArmiesReady, canPickMission,
      missionReady, blueIsSelf, selfAdvantage, opponentAdvantage,
      standardDraft, draftBuilt, draftRevealing, draftActor, draftActorAdvantage, draftOpponentAdvantage,
      draftActorIsBlue, draftCanAct, draftModsLeft,
      bluePlayer, redPlayer, round, phase, gameOver, gameLog, blueVp, redVp,
      start, setSelfArmy, setSelfName, clearSelfArmy, setLocalMission, end,
      advanceLocalPhase, setLocalVp, resetLocalGame,
      enterRoom, applySnapshot, roomEnded,
    }
  },
  {
    persist: {
      // `mission` + `game` persist so a solo session survives a reload; in a room they're
      // re-applied from the server snapshot on rejoin anyway.
      paths: ['session', 'roomId', 'roomCode', 'role', 'mission', 'game', 'soloSavedIndex'],
    } as never,
  },
)

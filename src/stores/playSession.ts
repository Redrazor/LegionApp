import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Army } from '../types/index.ts'
import { createSession, type PlaySession } from '../utils/playSession.ts'

/**
 * Holds the active Play session. Phase 1 is single-device — it tracks the local
 * player's imported army and persists to localStorage so a refresh resumes the game.
 * Phase 2 will make the server authoritative and sync `opponent` over the socket;
 * this store is deliberately shaped as that sync unit from the start.
 */
export const usePlaySessionStore = defineStore(
  'playSession',
  () => {
    const session = ref<PlaySession | null>(null)

    const active = computed(() => session.value !== null)
    const selfArmy = computed(() => session.value?.self.army ?? null)

    /** Begin a new session (idempotent-safe: replaces any current one). */
    function start(selfName?: string) {
      session.value = createSession(selfName)
    }

    /** Load the local player's army into the session, starting one if needed. */
    function setSelfArmy(army: Army) {
      if (!session.value) session.value = createSession()
      session.value.self.army = army
    }

    function setSelfName(name: string) {
      if (session.value) session.value.self.name = name.trim() || 'You'
    }

    /** Drop the local player's army back to the importer without ending the session. */
    function clearSelfArmy() {
      if (session.value) session.value.self.army = null
    }

    /** Tear the whole session down (back to the setup screen). */
    function end() {
      session.value = null
    }

    return { session, active, selfArmy, start, setSelfArmy, setSelfName, clearSelfArmy, end }
  },
  {
    persist: {
      paths: ['session'],
    } as never,
  },
)

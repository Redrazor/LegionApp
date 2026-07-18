<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useHead } from '@vueuse/head'
import { storeToRefs } from 'pinia'
import { usePlayConnection } from '../composables/usePlayConnection.ts'
import { useArmyStore } from '../stores/army.ts'
import { useUnitsStore } from '../stores/units.ts'
import { useUpgradesStore } from '../stores/upgrades.ts'
import { useBattleForcesStore } from '../stores/battleForces.ts'
import { useBattleCardsStore } from '../stores/battleCards.ts'
import { fromCompact } from '../utils/army.ts'
import PlaySetup from '../components/play/PlaySetup.vue'
import PlayRoster from '../components/play/PlayRoster.vue'
import PlayLobby from '../components/play/PlayLobby.vue'
import PlayMission from '../components/play/PlayMission.vue'
import PlayTracker from '../components/play/PlayTracker.vue'
import PlayLog from '../components/play/PlayLog.vue'
import type { Army } from '../types/index.ts'

const conn = usePlayConnection()
const { store } = conn
const { mode, selfArmy, session, missionReady } = storeToRefs(store)

const unitsStore = useUnitsStore()
const upgradesStore = useUpgradesStore()
const battleForcesStore = useBattleForcesStore()
const battleCardsStore = useBattleCardsStore()

const busy = ref(false)
const error = ref('')

const JOIN_ERRORS: Record<string, string> = {
  'not-found': 'No room with that code — check it and try again.',
  full: 'That room is already full.',
}

const armyStore = useArmyStore()

// Re-sync a solo session's army from the saved list it came from, so edits made in Build
// after the session started (e.g. building the battle deck) are picked up. Only fires when
// the saved list actually changed; setSelfArmy then also drops the now-stale mission.
function resyncSoloArmy() {
  if (store.mode !== 'solo') return
  const idx = store.soloSavedIndex
  if (idx == null) return
  const compact = armyStore.saved[idx]
  if (!compact) return
  const fresh = fromCompact(compact)
  // Guard against index drift (a saved list was deleted/reordered): only re-sync when the
  // list at this index is still the same army by name, never swap to a different one.
  if (fresh.name !== store.selfArmy?.name) return
  if (JSON.stringify(fresh) !== JSON.stringify(store.selfArmy)) {
    store.setSelfArmy(fresh, idx)
  }
}

onMounted(() => {
  unitsStore.load()
  upgradesStore.load()
  battleForcesStore.load()
  battleCardsStore.load()
  resyncSoloArmy() // reflect Build-tab edits (battle deck, roster) into an active solo session
  conn.resume() // auto-rejoin a persisted room after a reload
})

async function onHost(name: string) {
  busy.value = true; error.value = ''
  try {
    const res = await conn.host(name)
    if (!res.ok) error.value = 'Could not create the room — is the server reachable?'
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

async function onJoin({ code, name }: { code: string; name: string }) {
  busy.value = true; error.value = ''
  try {
    const res = await conn.join(code, name)
    if (!res.ok) error.value = JOIN_ERRORS[res.error ?? ''] ?? 'Could not join the room.'
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

function onImport(army: Army, savedIndex: number | null) {
  conn.importArmy(army, savedIndex)
}

useHead({
  title: 'Play — LegionApp',
  meta: [
    { name: 'description', content: 'Run your Star Wars: Legion games from your phone — import a saved army and play solo or share a room code to track the battle with an opponent in real time.' },
    { property: 'og:title', content: 'Play — LegionApp' },
    { property: 'og:description', content: 'Import a saved Star Wars: Legion army and play solo or in a real-time room with an opponent.' },
    { property: 'og:url', content: 'https://www.legion-app.com/play' },
  ],
  link: [{ rel: 'canonical', href: 'https://www.legion-app.com/play' }],
})
</script>

<template>
  <div class="py-6 sm:py-8">
    <!-- Multiplayer room -->
    <PlayLobby
      v-if="mode === 'room'"
      @import="onImport"
      @change="conn.changeArmy()"
      @end="conn.leave()"
      @draw-mission="conn.drawMission()"
      @modify-mission="conn.modifyMission($event)"
      @reset-mission="conn.resetMission()"
      @advance-phase="conn.advancePhase()"
      @set-round="conn.setRound($event)"
      @set-vp="(p) => conn.setVp(p.player, p.value)"
      @reset-game="conn.resetGame()"
      @adjust-token="(p) => conn.adjustToken(p.player, p.uid, p.token, p.delta, p.unitName)"
      @clear-turn-tokens="conn.clearTurnTokens()"
    />

    <!-- Solo, army loaded — mission draw + tracker + roster -->
    <div v-else-if="mode === 'solo' && selfArmy" class="mx-auto max-w-2xl">
      <PlayMission @draw="conn.drawMission()" @modify="conn.modifyMission($event)" @reset="conn.resetMission()" />
      <template v-if="missionReady">
        <PlayTracker
          @advance="conn.advancePhase()"
          @set-round="conn.setRound($event)"
          @set-vp="(p) => conn.setVp(p.player, p.value)"
          @reset="conn.resetGame()"
        />
        <PlayLog />
      </template>
      <PlayRoster
        :army="selfArmy"
        :player-name="session?.self.name ?? 'You'"
        :self-role="store.effectiveRole"
        @change="conn.changeArmy()"
        @end="conn.leave()"
        @adjust-token="(p) => conn.adjustToken(p.player, p.uid, p.token, p.delta, p.unitName)"
        @clear-turn-tokens="conn.clearTurnTokens()"
      />
    </div>

    <!-- Idle / solo without an army yet -->
    <PlaySetup
      v-else
      :busy="busy"
      :error="error"
      @import="onImport"
      @host="onHost"
      @join="onJoin"
    />
  </div>
</template>

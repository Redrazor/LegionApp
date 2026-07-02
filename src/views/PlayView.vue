<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useHead } from '@vueuse/head'
import { storeToRefs } from 'pinia'
import { usePlayConnection } from '../composables/usePlayConnection.ts'
import { useArmyStore } from '../stores/army.ts'
import { useUnitsStore } from '../stores/units.ts'
import { useUpgradesStore } from '../stores/upgrades.ts'
import { useBattleForcesStore } from '../stores/battleForces.ts'
import PlaySetup from '../components/play/PlaySetup.vue'
import PlayRoster from '../components/play/PlayRoster.vue'
import PlayLobby from '../components/play/PlayLobby.vue'
import type { Army } from '../types/index.ts'

const conn = usePlayConnection()
const { store } = conn
const { mode, selfArmy, session } = storeToRefs(store)

const unitsStore = useUnitsStore()
const upgradesStore = useUpgradesStore()
const battleForcesStore = useBattleForcesStore()

const busy = ref(false)
const error = ref('')

const JOIN_ERRORS: Record<string, string> = {
  'not-found': 'No room with that code — check it and try again.',
  full: 'That room is already full.',
}

onMounted(() => {
  useArmyStore() // instantiate the persisted saved-lists store
  unitsStore.load()
  upgradesStore.load()
  battleForcesStore.load()
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

function onImport(army: Army) {
  conn.importArmy(army)
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
    />

    <!-- Solo, army loaded -->
    <PlayRoster
      v-else-if="mode === 'solo' && selfArmy"
      :army="selfArmy"
      :player-name="session?.self.name ?? 'You'"
      @change="conn.changeArmy()"
      @end="conn.leave()"
    />

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

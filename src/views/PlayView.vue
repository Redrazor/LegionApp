<script setup lang="ts">
import { onMounted } from 'vue'
import { useHead } from '@vueuse/head'
import { usePlaySessionStore } from '../stores/playSession.ts'
import { useArmyStore } from '../stores/army.ts'
import { useUnitsStore } from '../stores/units.ts'
import { useUpgradesStore } from '../stores/upgrades.ts'
import { useBattleForcesStore } from '../stores/battleForces.ts'
import PlaySetup from '../components/play/PlaySetup.vue'
import PlayRoster from '../components/play/PlayRoster.vue'
import type { Army } from '../types/index.ts'

const play = usePlaySessionStore()
const unitsStore = useUnitsStore()
const upgradesStore = useUpgradesStore()
const battleForcesStore = useBattleForcesStore()

// The importer + roster both need the catalogue to resolve names/points.
onMounted(() => {
  useArmyStore() // ensure the persisted saved-lists store is instantiated
  unitsStore.load()
  upgradesStore.load()
  battleForcesStore.load()
})

function onImport(army: Army) {
  play.setSelfArmy(army)
}

useHead({
  title: 'Play — LegionApp',
  meta: [
    { name: 'description', content: 'Run your Star Wars: Legion games from your phone — import a saved army and track the battle. More game-tracking tools are rolling out phase by phase.' },
    { property: 'og:title', content: 'Play — LegionApp' },
    { property: 'og:description', content: 'Import a saved Star Wars: Legion army and run your game from your phone.' },
    { property: 'og:url', content: 'https://www.legion-app.com/play' },
  ],
  link: [{ rel: 'canonical', href: 'https://www.legion-app.com/play' }],
})
</script>

<template>
  <div class="py-6 sm:py-8">
    <PlayRoster
      v-if="play.selfArmy"
      :army="play.selfArmy"
      :player-name="play.session?.self.name ?? 'You'"
      @change="play.clearSelfArmy()"
      @end="play.end()"
    />
    <PlaySetup v-else @import="onImport" />
  </div>
</template>

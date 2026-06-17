<script setup lang="ts">
import { computed, onMounted, reactive, watch } from 'vue'
import { useHead } from '@vueuse/head'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useUpgradesStore } from '../stores/upgrades.ts'
import { useUnitsStore } from '../stores/units.ts'
import { useKeywordsStore } from '../stores/keywords.ts'
import { slotLabel } from '../utils/factions.ts'
import { searchUpgrades, groupUpgradesBySlot, upgradeCharacters } from '../utils/browse.ts'
import BrowseTabs from '../components/browse/BrowseTabs.vue'
import UpgradeCardTile from '../components/browse/UpgradeCardTile.vue'

const route = useRoute()
const router = useRouter()
const upgradesStore = useUpgradesStore()
const unitsStore = useUnitsStore()
const keywordsStore = useKeywordsStore()
const { loading } = storeToRefs(upgradesStore)

const filters = reactive({ query: '', slot: '', character: '' })

onMounted(() => {
  upgradesStore.load()
  unitsStore.load()
  keywordsStore.load()
  if (typeof route.query.slot === 'string') filters.slot = route.query.slot
  if (typeof route.query.character === 'string') filters.character = route.query.character
  if (typeof route.query.q === 'string') filters.query = route.query.q
})

watch(
  () => ({ ...filters }),
  (f) => {
    const query: Record<string, string> = {}
    if (f.slot) query.slot = f.slot
    if (f.character) query.character = f.character
    if (f.query) query.q = f.query
    router.replace({ query }).catch(() => {})
  },
  { deep: true },
)

// Distinct slots present, label-sorted, for the slot filter.
const slots = computed(() => {
  const set = new Set(upgradesStore.upgrades.map((u) => u.slot))
  return [...set].sort((a, b) => slotLabel(a).localeCompare(slotLabel(b)))
})
const characters = computed(() => upgradeCharacters(upgradesStore.upgrades))
const filtered = computed(() => searchUpgrades(upgradesStore.upgrades, unitsStore.units, filters))
const groups = computed(() => groupUpgradesBySlot(filtered.value))

function reset() {
  filters.query = ''
  filters.slot = ''
  filters.character = ''
}

useHead({
  title: 'Browse Upgrade Cards — LegionApp',
  meta: [
    { name: 'description', content: 'Browse every Star Wars: Legion upgrade card, grouped by slot — filter by a commander or operative to see the upgrades restricted to them.' },
    { property: 'og:title', content: 'Browse Upgrade Cards — LegionApp' },
    { property: 'og:url', content: 'https://www.legion-app.com/browse/upgrades' },
  ],
  link: [{ rel: 'canonical', href: 'https://www.legion-app.com/browse/upgrades' }],
})
</script>

<template>
  <div>
    <BrowseTabs />

    <!-- Filters -->
    <div class="mb-5 flex flex-wrap items-center gap-2">
      <input
        v-model="filters.query"
        placeholder="Search by upgrade or character…"
        class="min-w-[160px] flex-1 rounded-lg border border-lg-border bg-lg-surface px-3 py-2 text-sm text-lg-text placeholder:text-lg-muted/60 focus:border-lg-accent/60 focus:outline-none"
      />
      <select v-model="filters.slot" class="rounded-lg border border-lg-border bg-lg-surface px-3 py-2 text-sm text-lg-text focus:border-lg-accent/60 focus:outline-none">
        <option value="">All slots</option>
        <option v-for="s in slots" :key="s" :value="s">{{ slotLabel(s) }}</option>
      </select>
      <select v-model="filters.character" class="max-w-[200px] rounded-lg border border-lg-border bg-lg-surface px-3 py-2 text-sm text-lg-text focus:border-lg-accent/60 focus:outline-none">
        <option value="">Any character</option>
        <option v-for="c in characters" :key="c" :value="c">{{ c }}</option>
      </select>
      <button v-if="filters.query || filters.slot || filters.character" class="rounded-lg border border-lg-border px-3 py-2 text-sm text-lg-muted hover:text-lg-accent" @click="reset">Reset</button>
      <span class="ml-auto text-xs text-lg-muted">{{ filtered.length }} cards</span>
    </div>

    <div v-if="loading" class="py-20 text-center text-lg-muted">Loading upgrades…</div>
    <div v-else-if="filtered.length === 0" class="py-20 text-center text-lg-muted">No upgrades match your filters.</div>

    <div v-else class="space-y-8">
      <section v-for="group in groups" :key="group.slot">
        <h2 class="mb-3 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-widest text-lg-accent">
          <span class="h-3 w-1 rounded bg-lg-accent" />
          {{ slotLabel(group.slot) }}
          <span class="text-xs font-normal text-lg-muted">({{ group.upgrades.length }})</span>
        </h2>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          <UpgradeCardTile v-for="u in group.upgrades" :key="u.id" :upgrade="u" />
        </div>
      </section>
    </div>

    <!-- Lightbox drawer (child route) -->
    <RouterView />
  </div>
</template>

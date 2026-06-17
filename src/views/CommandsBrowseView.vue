<script setup lang="ts">
import { computed, onMounted, reactive, watch } from 'vue'
import { useHead } from '@vueuse/head'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useCommandsStore } from '../stores/commands.ts'
import { useUnitsStore } from '../stores/units.ts'
import { FACTION_META, FACTION_ORDER } from '../utils/factions.ts'
import { searchCommands, groupCommandsByFaction, commandCharacters } from '../utils/browse.ts'
import type { Faction } from '../types/index.ts'
import BrowseTabs from '../components/browse/BrowseTabs.vue'
import CommandCardTile from '../components/browse/CommandCardTile.vue'

const route = useRoute()
const router = useRouter()
const commandsStore = useCommandsStore()
const unitsStore = useUnitsStore()
const { loading } = storeToRefs(commandsStore)

const filters = reactive({ query: '', faction: '' as Faction | '', character: '' })

onMounted(() => {
  commandsStore.load()
  unitsStore.load()
  if (typeof route.query.faction === 'string') filters.faction = route.query.faction as Faction
  if (typeof route.query.character === 'string') filters.character = route.query.character
  if (typeof route.query.q === 'string') filters.query = route.query.q
})

watch(
  () => ({ ...filters }),
  (f) => {
    const query: Record<string, string> = {}
    if (f.faction) query.faction = f.faction
    if (f.character) query.character = f.character
    if (f.query) query.q = f.query
    router.replace({ query }).catch(() => {})
  },
  { deep: true },
)

// name (lowercased) → faction, for resolving a commander card's faction when it's null.
const commanderFactionMap = computed(() => {
  const map = new Map<string, Faction>()
  for (const u of unitsStore.units) {
    if (u.rank === 'commander' || u.rank === 'operative') map.set(u.name.toLowerCase(), u.faction)
  }
  return map
})
const commanderFaction = (name: string) => commanderFactionMap.value.get(name.toLowerCase()) ?? null

const characters = computed(() => commandCharacters(commandsStore.commands))
const filtered = computed(() => searchCommands(commandsStore.commands, filters, commanderFaction))
const groups = computed(() => groupCommandsByFaction(filtered.value, commanderFaction))

function reset() {
  filters.query = ''
  filters.faction = ''
  filters.character = ''
}

useHead({
  title: 'Browse Command Cards — LegionApp',
  meta: [
    { name: 'description', content: 'Browse every Star Wars: Legion command card, grouped by faction with pip values — filter by a commander or operative to see their cards.' },
    { property: 'og:title', content: 'Browse Command Cards — LegionApp' },
    { property: 'og:url', content: 'https://www.legion-app.com/browse/commands' },
  ],
  link: [{ rel: 'canonical', href: 'https://www.legion-app.com/browse/commands' }],
})
</script>

<template>
  <div>
    <BrowseTabs />

    <!-- Filters -->
    <div class="mb-5 flex flex-wrap items-center gap-2">
      <input
        v-model="filters.query"
        placeholder="Search by card or commander…"
        class="min-w-[160px] flex-1 rounded-lg border border-lg-border bg-lg-surface px-3 py-2 text-sm text-lg-text placeholder:text-lg-muted/60 focus:border-lg-accent/60 focus:outline-none"
      />
      <select v-model="filters.faction" class="rounded-lg border border-lg-border bg-lg-surface px-3 py-2 text-sm text-lg-text focus:border-lg-accent/60 focus:outline-none">
        <option value="">All factions</option>
        <option v-for="f in FACTION_ORDER" :key="f" :value="f">{{ FACTION_META[f].name }}</option>
      </select>
      <select v-model="filters.character" class="max-w-[200px] rounded-lg border border-lg-border bg-lg-surface px-3 py-2 text-sm text-lg-text focus:border-lg-accent/60 focus:outline-none">
        <option value="">Any commander</option>
        <option v-for="c in characters" :key="c" :value="c">{{ c }}</option>
      </select>
      <button v-if="filters.query || filters.faction || filters.character" class="rounded-lg border border-lg-border px-3 py-2 text-sm text-lg-muted hover:text-lg-accent" @click="reset">Reset</button>
      <span class="ml-auto text-xs text-lg-muted">{{ filtered.length }} cards</span>
    </div>

    <div v-if="loading" class="py-20 text-center text-lg-muted">Loading command cards…</div>
    <div v-else-if="filtered.length === 0" class="py-20 text-center text-lg-muted">No command cards match your filters.</div>

    <div v-else class="space-y-8">
      <section v-for="group in groups" :key="group.faction ?? 'universal'">
        <h2
          class="mb-3 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-widest"
          :style="{ color: group.faction ? FACTION_META[group.faction].color : 'var(--color-lg-muted)' }"
        >
          <span class="h-3 w-1 rounded" :style="{ background: group.faction ? FACTION_META[group.faction].color : 'var(--color-lg-muted)' }" />
          {{ group.faction ? FACTION_META[group.faction].name : 'Universal' }}
          <span class="text-xs font-normal text-lg-muted">({{ group.cards.length }})</span>
        </h2>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          <CommandCardTile v-for="c in group.cards" :key="c.id" :card="c" />
        </div>
      </section>
    </div>

    <!-- Lightbox drawer (child route) -->
    <RouterView />
  </div>
</template>

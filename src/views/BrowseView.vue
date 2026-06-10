<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useUnitsStore } from '../stores/units.ts'
import { useProductsStore } from '../stores/products.ts'
import { useCollectionStore } from '../stores/collection.ts'
import { useFavoritesStore } from '../stores/favorites.ts'
import { useKeywordsStore } from '../stores/keywords.ts'
import { useSearch } from '../composables/useSearch.ts'
import { FACTION_META } from '../utils/factions.ts'
import type { Unit } from '../types/index.ts'
import UnitCard from '../components/browse/UnitCard.vue'
import FilterBar from '../components/browse/FilterBar.vue'

const route = useRoute()
const router = useRouter()
const unitsStore = useUnitsStore()
const productsStore = useProductsStore()
const collection = useCollectionStore()
const favorites = useFavoritesStore()
const keywordsStore = useKeywordsStore()
const { units, loading } = storeToRefs(unitsStore)

// Map each unit slug to whether the owning expansion is owned.
const ownedSlugs = computed(() => {
  const set = new Set<string>()
  for (const p of productsStore.products) {
    if (collection.isOwned(p.code)) for (const s of p.unitSlugs) set.add(s)
  }
  return set
})

const { filters, grouped, filtered, reset, activeFilterCount } = useSearch(units, {
  isOwned: (u: Unit) => ownedSlugs.value.has(u.slug),
  isFavorite: (u: Unit) => favorites.isFavorite(u.id),
})

onMounted(() => {
  unitsStore.load()
  productsStore.load()
  keywordsStore.load()
  // Hydrate filters from URL query (shareable links).
  if (typeof route.query.faction === 'string') filters.faction = route.query.faction as never
  if (typeof route.query.rank === 'string') filters.rank = route.query.rank as never
  if (typeof route.query.keyword === 'string') filters.keyword = route.query.keyword
  if (typeof route.query.q === 'string') filters.query = route.query.q
})

// Reflect filters in the URL.
watch(
  () => ({ ...filters }),
  (f) => {
    const query: Record<string, string> = {}
    if (f.faction) query.faction = f.faction
    if (f.rank) query.rank = f.rank
    if (f.keyword) query.keyword = f.keyword
    if (f.query) query.q = f.query
    router.replace({ query }).catch(() => {})
  },
  { deep: true },
)
</script>

<template>
  <div>
    <FilterBar
      :filters="filters"
      :keywords="unitsStore.allKeywords"
      :result-count="filtered.length"
      :active-count="activeFilterCount"
      @reset="reset"
    />

    <div v-if="loading" class="py-20 text-center text-lg-muted">Loading units…</div>

    <div v-else-if="filtered.length === 0" class="py-20 text-center text-lg-muted">
      No units match your filters.
    </div>

    <div v-else class="space-y-8">
      <section v-for="group in grouped" :key="group.faction">
        <h2
          class="mb-3 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-widest"
          :style="{ color: FACTION_META[group.faction].color }"
        >
          <span class="h-3 w-1 rounded" :style="{ background: FACTION_META[group.faction].color }" />
          {{ FACTION_META[group.faction].name }}
          <span class="text-xs font-normal text-lg-muted">({{ group.units.length }})</span>
        </h2>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          <UnitCard v-for="unit in group.units" :key="unit.id" :unit="unit" />
        </div>
      </section>
    </div>

    <!-- Profile drawer (child route) -->
    <RouterView />
  </div>
</template>

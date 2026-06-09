<script setup lang="ts">
import { computed } from 'vue'
import type { SearchFilters } from '../../composables/useSearch.ts'
import { FACTION_ORDER, RANK_ORDER, FACTION_META, RANK_META } from '../../utils/factions.ts'

const props = defineProps<{
  filters: SearchFilters
  keywords: string[]
  resultCount: number
  activeCount: number
}>()
const emit = defineEmits<{ reset: [] }>()

const factions = FACTION_ORDER.map((f) => ({ id: f, name: FACTION_META[f].name }))
const ranks = RANK_ORDER.map((r) => ({ id: r, name: RANK_META[r].name }))

const f = computed(() => props.filters)
</script>

<template>
  <div class="sticky top-[57px] z-30 -mx-4 mb-4 border-b border-lg-border bg-lg-bg/95 px-4 py-3 backdrop-blur-sm">
    <!-- Search -->
    <div class="flex items-center gap-2">
      <div class="relative flex-1">
        <input
          v-model="f.query"
          type="search"
          placeholder="Search units, titles, keywords…"
          class="w-full rounded-lg border border-lg-border bg-lg-surface px-3 py-2 text-sm text-lg-text placeholder:text-lg-muted/60 focus:border-lg-gold/60 focus:outline-none"
        />
      </div>
      <button
        v-if="activeCount > 0 || f.query"
        class="rounded-lg border border-lg-border bg-lg-surface px-3 py-2 text-xs font-medium text-lg-muted hover:text-lg-gold"
        @click="emit('reset')"
      >Clear</button>
    </div>

    <!-- Faction pills -->
    <div class="mt-2 flex flex-wrap gap-1.5">
      <button
        v-for="fac in factions" :key="fac.id"
        class="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
        :class="f.faction === fac.id
          ? 'border-lg-gold bg-lg-gold/15 text-lg-gold'
          : 'border-lg-border bg-lg-surface text-lg-muted hover:text-lg-text'"
        @click="f.faction = f.faction === fac.id ? '' : fac.id"
      >{{ fac.name }}</button>
    </div>

    <!-- Rank + keyword + toggles -->
    <div class="mt-2 flex flex-wrap items-center gap-2">
      <select
        v-model="f.rank"
        class="rounded-lg border border-lg-border bg-lg-surface px-2.5 py-1.5 text-xs text-lg-text focus:border-lg-gold/60 focus:outline-none"
      >
        <option value="">All ranks</option>
        <option v-for="r in ranks" :key="r.id" :value="r.id">{{ r.name }}</option>
      </select>

      <input
        v-model="f.keyword"
        list="keyword-list"
        placeholder="Keyword…"
        class="w-32 rounded-lg border border-lg-border bg-lg-surface px-2.5 py-1.5 text-xs text-lg-text placeholder:text-lg-muted/60 focus:border-lg-gold/60 focus:outline-none"
      />
      <datalist id="keyword-list">
        <option v-for="k in keywords" :key="k" :value="k" />
      </datalist>

      <label class="flex items-center gap-1.5 text-xs text-lg-muted">
        <input v-model="f.favoritesOnly" type="checkbox" class="accent-lg-gold" /> Favorites
      </label>
      <label class="flex items-center gap-1.5 text-xs text-lg-muted">
        <input v-model="f.ownedOnly" type="checkbox" class="accent-lg-gold" /> Owned
      </label>

      <span class="ml-auto text-xs text-lg-muted">{{ resultCount }} units</span>
    </div>
  </div>
</template>

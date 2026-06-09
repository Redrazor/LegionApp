<script setup lang="ts">
import type { Unit } from '../../types/index.ts'
import { factionColor, rankName } from '../../utils/factions.ts'
import { useFavoritesStore } from '../../stores/favorites.ts'

defineProps<{ unit: Unit }>()
const favorites = useFavoritesStore()
</script>

<template>
  <RouterLink
    :to="`/browse/${unit.slug}`"
    class="group relative flex flex-col overflow-hidden rounded-xl border border-lg-border bg-lg-surface transition-all hover:border-lg-accent/50 hover:-translate-y-0.5"
  >
    <!-- Accent strip -->
    <div class="h-1 w-full" :style="{ background: factionColor(unit.faction) }" />

    <!-- Image / fallback -->
    <div class="relative aspect-[1.41/1] w-full overflow-hidden bg-lg-dark">
      <img
        v-if="unit.cardImage"
        :src="unit.cardImage"
        :alt="unit.name"
        loading="lazy"
        class="h-full w-full object-cover object-top"
      />
      <div v-else class="flex h-full w-full items-center justify-center px-3 text-center">
        <span class="font-display text-sm font-bold uppercase tracking-wide text-lg-muted">{{ unit.name }}</span>
      </div>

      <!-- Cost badge -->
      <span class="absolute right-2 top-2 rounded-md bg-lg-dark/90 px-1.5 py-0.5 font-display text-xs font-bold text-lg-accent">
        {{ unit.cost ?? '—' }}
      </span>

      <!-- Favorite -->
      <button
        class="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-md bg-lg-dark/80 text-base transition-colors"
        :class="favorites.isFavorite(unit.id) ? 'text-lg-accent' : 'text-lg-text/40 hover:text-lg-text/80'"
        :aria-label="favorites.isFavorite(unit.id) ? 'Remove favorite' : 'Add favorite'"
        @click.prevent.stop="favorites.toggle(unit.id)"
      >{{ favorites.isFavorite(unit.id) ? '★' : '☆' }}</button>
    </div>

    <!-- Meta -->
    <div class="flex flex-1 flex-col gap-1 p-2.5">
      <div class="flex items-start gap-1">
        <span v-if="unit.isUnique" class="mt-0.5 text-lg-accent" title="Unique">◈</span>
        <span class="text-sm font-semibold leading-tight text-lg-text group-hover:text-lg-accent">{{ unit.name }}</span>
      </div>
      <span v-if="unit.title" class="text-[11px] italic leading-tight text-lg-muted">{{ unit.title }}</span>
      <div class="mt-auto flex items-center gap-2 pt-1 text-[11px] text-lg-muted">
        <span class="rounded bg-lg-dark px-1.5 py-0.5 font-medium">{{ rankName(unit.rank) }}</span>
        <span v-if="unit.wounds" title="Wounds">♥ {{ unit.wounds }}</span>
      </div>
    </div>
  </RouterLink>
</template>

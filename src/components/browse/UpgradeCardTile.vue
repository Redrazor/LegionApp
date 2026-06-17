<script setup lang="ts">
import type { Upgrade } from '../../types/index.ts'
import { imageUrl } from '../../utils/imageUrl.ts'
import { slotLabel } from '../../utils/factions.ts'

defineProps<{ upgrade: Upgrade }>()
</script>

<template>
  <RouterLink
    :to="`/browse/upgrades/${upgrade.slug}`"
    class="group relative flex flex-col overflow-hidden rounded-xl border border-lg-border bg-lg-surface transition-all hover:border-lg-accent/50 hover:-translate-y-0.5"
  >
    <!-- Card scan / fallback -->
    <div class="relative aspect-[1.41/1] w-full overflow-hidden bg-lg-dark">
      <img
        v-if="upgrade.cardImage"
        :src="imageUrl(upgrade.cardImage)"
        :alt="upgrade.name"
        loading="lazy"
        class="h-full w-full object-cover object-top"
      />
      <div v-else class="flex h-full w-full items-center justify-center px-3 text-center">
        <span class="font-display text-sm font-bold uppercase tracking-wide text-lg-muted">{{ upgrade.name }}</span>
      </div>
      <!-- Cost badge -->
      <span v-if="upgrade.cost != null" class="absolute right-2 top-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-lg-bg/85 px-1.5 text-xs font-bold tabular-nums text-lg-accent ring-1 ring-lg-accent/40">
        {{ upgrade.cost }}
      </span>
    </div>
    <div class="flex items-center justify-between gap-2 px-3 py-2">
      <span class="truncate text-sm font-semibold text-lg-text">{{ upgrade.name }}</span>
      <span class="flex-none rounded bg-lg-dark px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-lg-muted">{{ slotLabel(upgrade.slot) }}</span>
    </div>
  </RouterLink>
</template>

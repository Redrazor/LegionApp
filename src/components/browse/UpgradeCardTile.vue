<script setup lang="ts">
import type { Upgrade } from '../../types/index.ts'
import { imageUrl } from '../../utils/imageUrl.ts'
import { slotLabel } from '../../utils/factions.ts'
import MissingCardImage from '../ui/MissingCardImage.vue'

defineProps<{ upgrade: Upgrade }>()
</script>

<template>
  <RouterLink
    :to="`/browse/upgrades/${upgrade.slug}`"
    class="group relative flex flex-col overflow-hidden rounded-xl border border-lg-border bg-lg-surface transition-all hover:border-lg-accent/50 hover:-translate-y-0.5"
  >
    <!-- Full card scan so the rules text is readable in the list; branded placeholder when
         no first-party image is available yet. -->
    <div class="relative w-full">
      <div v-if="upgrade.cardImage" class="aspect-[5/7] w-full overflow-hidden bg-lg-dark">
        <img
          :src="imageUrl(upgrade.cardImage)"
          :alt="upgrade.name"
          loading="lazy"
          class="h-full w-full object-cover object-center"
        />
      </div>
      <MissingCardImage v-else portrait />
      <!-- Cost badge -->
      <span v-if="upgrade.cost != null" class="absolute right-2 top-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-lg-bg/85 px-1.5 text-xs font-bold tabular-nums text-lg-accent ring-1 ring-lg-accent/40">
        {{ upgrade.cost }}
      </span>
      <!-- Removed-from-play badge -->
      <span v-if="upgrade.removed" class="absolute left-2 top-2 inline-flex items-center rounded bg-red-900/80 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-100 ring-1 ring-red-400/40">
        Removed
      </span>
    </div>
    <div class="flex items-center justify-between gap-2 px-3 py-2">
      <span class="truncate text-sm font-semibold text-lg-text">{{ upgrade.name }}</span>
      <span class="flex-none rounded bg-lg-dark px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-lg-muted">{{ slotLabel(upgrade.slot) }}</span>
    </div>
  </RouterLink>
</template>

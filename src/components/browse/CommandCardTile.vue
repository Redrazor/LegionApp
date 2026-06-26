<script setup lang="ts">
import type { CommandCard } from '../../types/index.ts'
import { imageUrl } from '../../utils/imageUrl.ts'
import MissingCardImage from '../ui/MissingCardImage.vue'

defineProps<{ card: CommandCard }>()
</script>

<template>
  <RouterLink
    :to="`/browse/commands/${card.slug}`"
    class="group relative flex flex-col overflow-hidden rounded-xl border border-lg-border bg-lg-surface transition-all hover:border-lg-accent/50 hover:-translate-y-0.5"
  >
    <!-- Full card scan so the rules text is readable in the list; branded placeholder when
         no first-party image is available yet. -->
    <div class="relative w-full">
      <div v-if="card.cardImage" class="aspect-[5/7] w-full overflow-hidden bg-lg-dark">
        <img
          :src="imageUrl(card.cardImage)"
          :alt="card.name"
          loading="lazy"
          class="h-full w-full object-cover object-center"
        />
      </div>
      <MissingCardImage v-else portrait :faction="card.faction" />
      <!-- Pip badge -->
      <span class="absolute left-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-lg-bg/85 text-sm font-bold tabular-nums text-lg-accent ring-1 ring-lg-accent/40">
        {{ card.pips }}
      </span>
    </div>
    <div class="flex flex-col gap-0.5 px-3 py-2">
      <span class="truncate text-sm font-semibold text-lg-text">{{ card.name }}</span>
      <span v-if="card.commander" class="truncate text-[11px] text-lg-muted">{{ card.commander }}</span>
    </div>
  </RouterLink>
</template>

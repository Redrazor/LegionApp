<script setup lang="ts">
import { ref } from 'vue'
import type { Unit } from '../../types/index.ts'
import { factionColor } from '../../utils/factions.ts'
import { imageUrl } from '../../utils/imageUrl.ts'

// Round unit "badge": a self-hosted portrait (cropped from the unit's card scan by
// `npm run portraits`) in a faction-coloured ring. If the portrait is missing or fails
// to load, it shows a neutral "no portrait" silhouette rather than guessing a crop.
// Shared by the catalogue row and the army-list card so the builder speaks one visual
// language. `size` is a Tailwind width/height utility.
withDefaults(defineProps<{ unit: Unit; size?: string }>(), { size: 'h-14 w-14' })
const portraitFailed = ref(false)
</script>

<template>
  <span
    class="relative flex-none rounded-full p-[2px]"
    :style="{ background: `linear-gradient(145deg, ${factionColor(unit.faction)}, transparent 70%)` }"
  >
    <img
      v-if="unit.portraitImage && !portraitFailed"
      :src="imageUrl(unit.portraitImage)" :alt="unit.name" loading="lazy"
      class="aspect-square h-full w-full rounded-full bg-lg-dark object-cover ring-1 ring-black/30"
      :class="size"
      @error="portraitFailed = true"
    />
    <span
      v-else
      class="grid aspect-square place-items-center rounded-full bg-lg-dark ring-1 ring-black/30"
      :class="size"
      role="img" :aria-label="`${unit.name} — no portrait`"
    >
      <svg class="h-1/2 w-1/2 text-lg-muted/60" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.42 0-8 2.69-8 6v2h16v-2c0-3.31-3.58-6-8-6Z" />
      </svg>
    </span>
  </span>
</template>

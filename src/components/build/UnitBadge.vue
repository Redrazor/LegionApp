<script setup lang="ts">
import { ref } from 'vue'
import type { Unit } from '../../types/index.ts'
import { factionColor } from '../../utils/factions.ts'

// Round unit "badge": a self-hosted bust portrait in a faction-coloured ring. Falls
// back to a crop of the card's right-hand art (background-position past the rules
// text), then to initials. Shared by the catalogue row and the army-list card so the
// builder speaks one visual language. `size` is a Tailwind width/height utility.
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
      :src="unit.portraitImage" :alt="unit.name" loading="lazy"
      class="aspect-square h-full w-full rounded-full bg-lg-dark object-cover ring-1 ring-black/30"
      :class="size"
      @error="portraitFailed = true"
    />
    <span
      v-else-if="unit.cardImage"
      class="block aspect-square rounded-full bg-lg-dark bg-no-repeat ring-1 ring-black/30"
      :class="size"
      :style="{ backgroundImage: `url(${unit.cardImage})`, backgroundSize: '270%', backgroundPosition: '86% 9%' }"
      role="img" :aria-label="unit.name"
    />
    <span v-else class="grid aspect-square place-items-center rounded-full bg-lg-dark px-1 text-center text-[8px] text-lg-muted ring-1 ring-black/30" :class="size">{{ unit.name }}</span>
  </span>
</template>

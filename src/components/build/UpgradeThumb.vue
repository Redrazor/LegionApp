<script setup lang="ts">
import type { Upgrade } from '../../types/index.ts'
import { imageUrl } from '../../utils/imageUrl.ts'

// Small upgrade "card" thumbnail: a crop of the upgrade card's art band (the upper
// ~60%), dropping the header bar + the lower white text/stats so the artwork reads as
// large as possible. Rectangular (a mini card), not a round badge.
withDefaults(defineProps<{ upgrade: Upgrade; size?: string }>(), { size: 'h-16 w-12' })
</script>

<template>
  <span
    v-if="upgrade.cardImage"
    class="block flex-none overflow-hidden rounded-md border border-lg-border bg-lg-dark bg-no-repeat"
    :class="size"
    :style="{ backgroundImage: `url(${imageUrl(upgrade.cardImage)})`, backgroundSize: '195% auto', backgroundPosition: 'center 19%' }"
    role="img" :aria-label="upgrade.name"
  />
  <span v-else class="grid flex-none place-items-center rounded-md border border-lg-border bg-lg-dark px-0.5 text-center text-[7px] leading-tight text-lg-muted" :class="size">{{ upgrade.name }}</span>
</template>

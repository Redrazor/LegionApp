<script setup lang="ts">
import { computed } from 'vue'
import type { Faction } from '../../types/index.ts'
import { factionColor } from '../../utils/factions.ts'

// Branded "image pending" placeholder shown IN PLACE of a card scan when no first-party
// AMG image is available (Feature 13 — Legion HQ / other-app scans are expunged, never
// shown). Faction-tinted; `portrait` flips to the command/upgrade card aspect.
const props = defineProps<{ faction?: Faction | null; portrait?: boolean }>()

const accent = computed(() => (props.faction ? factionColor(props.faction) : '#e8853b'))
</script>

<template>
  <div
    class="flex flex-col items-center justify-center gap-2 rounded-xl border text-center"
    :class="portrait ? 'aspect-[5/7]' : 'aspect-[1.43/1]'"
    :style="{
      borderColor: 'color-mix(in srgb, ' + accent + ' 45%, transparent)',
      background: 'radial-gradient(circle at 50% 35%, color-mix(in srgb, ' + accent + ' 14%, #14161b), #0c0d10)',
    }"
  >
    <svg viewBox="0 0 24 24" class="h-9 w-9 opacity-70" :style="{ color: accent }" fill="none" stroke="currentColor" stroke-width="1.5">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 15l4-4 4 4M13 13l3-3 5 5" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="9" cy="9" r="1.4" />
    </svg>
    <div class="px-4">
      <div class="text-xs font-semibold uppercase tracking-wide" :style="{ color: accent }">Official card image pending</div>
      <p class="mt-1 text-[11px] leading-snug text-lg-muted">First-party AMG card not yet available.</p>
    </div>
  </div>
</template>

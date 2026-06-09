<script setup lang="ts">
import { slotLabel } from '../../utils/factions.ts'

defineProps<{ slots: string[] }>()

// Compact abbreviation per slot type for the icon chip.
const ABBR: Record<string, string> = {
  command: 'CMD', force: 'FRC', gear: 'GR', grenades: 'GRN', hardpoint: 'HP',
  'heavy weapon': 'HW', personnel: 'PER', pilot: 'PLT', comms: 'CMS', crew: 'CRW',
  generator: 'GEN', armament: 'ARM', ordnance: 'ORD', training: 'TRN', programming: 'PRG',
}
function abbr(slot: string): string {
  return ABBR[slot] ?? slot.slice(0, 3).toUpperCase()
}
</script>

<template>
  <div v-if="slots.length" class="flex flex-wrap gap-1">
    <span
      v-for="(slot, i) in slots" :key="i"
      class="inline-flex items-center rounded border border-lg-border bg-lg-dark px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-lg-muted"
      :title="slotLabel(slot)"
    >{{ abbr(slot) }}</span>
  </div>
</template>

<script setup lang="ts">
import type { Unit } from '../../types/index.ts'
import UnitBadge from './UnitBadge.vue'
import UnitIndicators from './UnitIndicators.vue'

// One catalogue row: a round portrait badge, name/title, glanceable indicators, cost
// and a [+] add button. Tapping the row body views the unit (→ profile drawer); [+]
// adds it (disabled when the rank is full — viewing stays available).
defineProps<{ unit: Unit; disabled: boolean; showSpeed?: boolean }>()
defineEmits<{ add: [unitId: string]; view: [unitId: string] }>()
</script>

<template>
  <div class="flex items-center gap-2.5 rounded-lg border border-lg-border/70 bg-lg-surface/40 p-1.5 transition-colors hover:border-lg-accent/40 hover:bg-lg-text/5">
    <button class="flex min-w-0 flex-1 items-center gap-2.5 text-left" :title="`View ${unit.name}`" @click="$emit('view', unit.id)">
      <UnitBadge :unit="unit" />
      <span class="min-w-0 flex-1">
        <span class="flex items-center gap-1">
          <span v-if="unit.isUnique" class="text-xs text-lg-accent" title="Unique">◈</span>
          <span class="truncate text-sm font-semibold text-lg-text">{{ unit.name }}</span>
        </span>
        <span v-if="unit.title" class="block truncate text-[11px] italic text-lg-muted">{{ unit.title }}</span>
        <UnitIndicators class="mt-1" :unit="unit" :show-speed="showSpeed" />
      </span>
      <span class="flex-none self-start font-display text-sm font-bold text-lg-accent">{{ unit.cost ?? '—' }}</span>
    </button>
    <button
      class="flex-none rounded-lg border border-lg-accent/40 bg-lg-accent/15 px-2.5 py-1 text-xs font-semibold text-lg-accent transition-colors hover:bg-lg-accent/25 disabled:cursor-not-allowed disabled:border-lg-border disabled:bg-transparent disabled:text-lg-muted"
      :disabled="disabled"
      :title="disabled ? 'Rank is at its maximum' : `Add ${unit.name}`"
      @click="$emit('add', unit.id)"
    >+</button>
  </div>
</template>

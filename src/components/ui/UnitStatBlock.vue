<script setup lang="ts">
import type { Unit } from '../../types/index.ts'

const props = defineProps<{ unit: Unit; size?: 'sm' | 'md' }>()

function dash(v: number | null): string {
  return v == null ? '—' : String(v)
}
const surge = () =>
  props.unit.surgeAttack === 'crit' ? '→ Crit' : props.unit.surgeAttack === 'hit' ? '→ Hit' : '—'
</script>

<template>
  <div class="grid grid-cols-5 gap-2 text-center">
    <!-- Defense -->
    <div class="rounded-lg bg-lg-dark p-2">
      <div class="text-[10px] uppercase tracking-wide text-lg-muted">Defense</div>
      <div class="mt-1 flex justify-center">
        <span
          v-if="unit.defense"
          class="inline-block h-5 w-5 rotate-45 rounded-sm border"
          :class="unit.defense === 'red'
            ? 'bg-faction-rebels/80 border-faction-rebels'
            : 'bg-white/90 border-white/60'"
        />
        <span v-else class="text-sm text-lg-text/70">—</span>
      </div>
    </div>
    <!-- Wounds -->
    <div class="rounded-lg bg-lg-dark p-2">
      <div class="text-[10px] uppercase tracking-wide text-lg-muted">Wounds</div>
      <div class="mt-0.5 font-display text-lg font-bold text-lg-text">{{ dash(unit.wounds) }}</div>
    </div>
    <!-- Courage / Resilience -->
    <div class="rounded-lg bg-lg-dark p-2">
      <div class="text-[10px] uppercase tracking-wide text-lg-muted">Courage</div>
      <div class="mt-0.5 font-display text-lg font-bold text-lg-text">
        {{ unit.courage && unit.courage > 0 ? unit.courage : '—' }}
      </div>
    </div>
    <!-- Speed -->
    <div class="rounded-lg bg-lg-dark p-2">
      <div class="text-[10px] uppercase tracking-wide text-lg-muted">Speed</div>
      <div class="mt-0.5 font-display text-lg font-bold text-lg-text">{{ dash(unit.speed) }}</div>
    </div>
    <!-- Surge -->
    <div class="rounded-lg bg-lg-dark p-2">
      <div class="text-[10px] uppercase tracking-wide text-lg-muted">Surge</div>
      <div class="mt-1 text-xs font-semibold text-lg-text/90">{{ surge() }}</div>
      <div v-if="unit.surgeDefense" class="text-[9px] text-lg-holo">def → block</div>
    </div>
  </div>
</template>

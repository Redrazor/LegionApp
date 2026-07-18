<script setup lang="ts">
import { computed } from 'vue'
import type { Unit } from '../../types/index.ts'

// Compact at-a-glance stat strip for a roster row (Phase 5): defense-die colour, attack &
// defense surge (and what they surge to), speed, wounds, courage — so the key combat cues
// are visible without opening the card. Mirrors UnitStatBlock's visual language, shrunk.
const props = defineProps<{ unit: Unit }>()

const num = (v: number | null | undefined) => (v == null ? '—' : String(v))
const courage = computed(() => (props.unit.courage && props.unit.courage > 0 ? String(props.unit.courage) : '—'))
const surgeAtk = computed(() =>
  props.unit.surgeAttack === 'crit' ? 'Crit' : props.unit.surgeAttack === 'hit' ? 'Hit' : null,
)
</script>

<template>
  <div class="flex flex-wrap items-center gap-1 text-[10px]">
    <!-- Defense die colour -->
    <span
      class="inline-flex items-center gap-1 rounded bg-lg-dark px-1.5 py-0.5"
      :title="unit.defense ? `${unit.defense} defense die` : 'No defense die'"
    >
      <span class="text-[8px] uppercase tracking-wide text-lg-muted">Def</span>
      <span
        v-if="unit.defense"
        class="inline-block h-2.5 w-2.5 rotate-45 rounded-[1px] border"
        :class="unit.defense === 'red' ? 'bg-faction-rebels/80 border-faction-rebels' : 'bg-white border-neutral-400'"
      />
      <span v-else class="font-bold text-lg-text/70">—</span>
    </span>

    <!-- Speed / Wounds / Courage -->
    <span class="inline-flex items-center gap-1 rounded bg-lg-dark px-1.5 py-0.5">
      <span class="text-[8px] uppercase tracking-wide text-lg-muted">Spd</span>
      <span class="font-bold text-lg-text">{{ num(unit.speed) }}</span>
    </span>
    <span class="inline-flex items-center gap-1 rounded bg-lg-dark px-1.5 py-0.5">
      <span class="text-[8px] uppercase tracking-wide text-lg-muted">Wnd</span>
      <span class="font-bold text-lg-text">{{ num(unit.wounds) }}</span>
    </span>
    <span class="inline-flex items-center gap-1 rounded bg-lg-dark px-1.5 py-0.5">
      <span class="text-[8px] uppercase tracking-wide text-lg-muted">Cou</span>
      <span class="font-bold text-lg-text">{{ courage }}</span>
    </span>

    <!-- Surge conversions (only shown when the unit surges) -->
    <span
      v-if="surgeAtk"
      class="inline-flex items-center gap-1 rounded bg-lg-dark px-1.5 py-0.5"
      :title="`Attack surge converts to ${surgeAtk}`"
    >
      <span class="text-[8px] uppercase tracking-wide text-lg-muted">Atk</span>
      <span class="font-semibold text-lg-holo">→ {{ surgeAtk }}</span>
    </span>
    <span
      v-if="unit.surgeDefense"
      class="inline-flex items-center gap-1 rounded bg-lg-dark px-1.5 py-0.5"
      title="Defense surge converts to Block"
    >
      <span class="text-[8px] uppercase tracking-wide text-lg-muted">Def</span>
      <span class="font-semibold text-lg-holo">→ Block</span>
    </span>
  </div>
</template>

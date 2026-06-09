<script setup lang="ts">
import type { Weapon } from '../../types/index.ts'

defineProps<{ weapons: Weapon[] }>()

function rangeLabel(range: number[]): string {
  if (!range.length) return '—'
  if (range.length === 1) return range[0] === 0 ? 'Melee' : `${range[0]}`
  const [a, b] = range
  return a === 0 ? `Melee–${b}` : `${a}–${b}`
}
</script>

<template>
  <div class="space-y-2">
    <div
      v-for="(w, i) in weapons" :key="i"
      class="rounded-lg border border-lg-border bg-lg-dark p-2.5"
    >
      <div class="flex items-center justify-between gap-2">
        <span class="text-sm font-semibold text-lg-text">{{ w.name }}</span>
        <span class="text-xs text-lg-muted">Range {{ rangeLabel(w.range) }}</span>
      </div>
      <div class="mt-1.5 flex items-center gap-3">
        <!-- Dice -->
        <div class="flex items-center gap-1.5">
          <span v-if="w.dice.red" class="flex items-center gap-0.5 text-xs">
            <span class="inline-block h-3.5 w-3.5 rounded-sm bg-faction-rebels" /> {{ w.dice.red }}
          </span>
          <span v-if="w.dice.black" class="flex items-center gap-0.5 text-xs">
            <span class="inline-block h-3.5 w-3.5 rounded-sm bg-neutral-800 border border-neutral-600" /> {{ w.dice.black }}
          </span>
          <span v-if="w.dice.white" class="flex items-center gap-0.5 text-xs">
            <span class="inline-block h-3.5 w-3.5 rounded-sm bg-neutral-100 border border-neutral-400" /> {{ w.dice.white }}
          </span>
          <span v-if="!w.dice.red && !w.dice.black && !w.dice.white" class="text-xs text-lg-muted">—</span>
        </div>
        <!-- Weapon keywords -->
        <div v-if="w.keywords.length" class="flex flex-wrap gap-1">
          <span
            v-for="k in w.keywords" :key="k"
            class="rounded bg-lg-panel border border-lg-border px-1.5 py-0.5 text-[10px] text-lg-text/80"
          >{{ k }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

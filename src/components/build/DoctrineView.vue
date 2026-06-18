<script setup lang="ts">
import { computed } from 'vue'
import type { BattleForceDoctrineOption } from '../../types/index.ts'

// The battle-force doctrine picker (its own Build view/segment). A force's "Choose N of
// the following" options are picked like a capped multi-select: tap an option to add/remove
// it; once `pick` are chosen, the rest dim out. Each option shows its verbatim rules text.
const props = defineProps<{
  pick: number // how many options must be chosen
  options: BattleForceDoctrineOption[] // the force's full option list
  selected: string[] // chosen option ids
  forceName: string // battle force name, for the header
  hasUnits: boolean // whether the army has any units yet
}>()
const emit = defineEmits<{ toggle: [optionId: string] }>()

const selectedSet = computed(() => new Set(props.selected))
const chosen = computed(() => props.options.filter((o) => selectedSet.value.has(o.id)).length)
const atCap = computed(() => chosen.value >= props.pick)
</script>

<template>
  <div class="space-y-5">
    <header class="flex items-center justify-between">
      <h2 class="font-display text-sm font-bold uppercase tracking-widest text-lg-text">Doctrines</h2>
      <span class="text-xs font-semibold" :class="chosen === pick ? 'text-lg-accent' : 'text-lg-muted'">{{ chosen }} / {{ pick }}</span>
    </header>

    <p class="text-xs text-lg-muted">
      {{ forceName }} — choose {{ pick }} of the following.
    </p>

    <p v-if="!hasUnits" class="rounded-lg border border-dashed border-lg-border py-6 text-center text-sm text-lg-muted">
      Add units to your army to choose its doctrines.
    </p>

    <div v-else class="space-y-2">
      <button
        v-for="opt in options" :key="opt.id"
        class="block w-full rounded-lg border p-3 text-left transition-all disabled:cursor-not-allowed"
        :class="selectedSet.has(opt.id)
          ? 'border-lg-accent ring-1 ring-lg-accent'
          : atCap
          ? 'border-lg-border opacity-40'
          : 'border-lg-border hover:border-lg-accent/50'"
        :disabled="!selectedSet.has(opt.id) && atCap"
        @click="emit('toggle', opt.id)"
      >
        <div class="mb-1 flex items-center gap-2">
          <span
            class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
            :class="selectedSet.has(opt.id) ? 'bg-lg-accent text-lg-bg' : 'border border-lg-border text-transparent'"
          >✓</span>
          <span class="font-display text-sm font-bold uppercase tracking-wide text-lg-text">{{ opt.name }}</span>
        </div>
        <p class="pl-6 text-xs leading-relaxed text-lg-muted">{{ opt.text }}</p>
      </button>
    </div>
  </div>
</template>

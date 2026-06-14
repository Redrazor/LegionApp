<script setup lang="ts">
import { computed } from 'vue'
import type { BattleCard, BattleCardSubtype } from '../../types/index.ts'
import { imageUrl } from '../../utils/imageUrl.ts'

// The battle-deck builder (its own Build view/segment). A legal deck is 3 cards of
// each type — Primary Objective, Secondary Objective, Advantage — colour-coded by
// type. Picked deck-builder style: tap to add/remove; once a type has 3, the rest of
// that type dim out. Standard formats only (Recon has no battle deck).
const props = defineProps<{
  eligible: BattleCard[] // selectable cards (Standard pool, eligibility-filtered)
  selected: string[] // chosen card ids
  hasUnits: boolean
}>()
const emit = defineEmits<{ toggle: [cardId: string] }>()

const SUBTYPES: { key: BattleCardSubtype; label: string; varName: string }[] = [
  { key: 'primary', label: 'Primary Objective', varName: '--color-obj-primary' },
  { key: 'secondary', label: 'Secondary Objective', varName: '--color-obj-secondary' },
  { key: 'advantage', label: 'Advantage', varName: '--color-obj-advantage' },
]

const selectedSet = computed(() => new Set(props.selected))
const byType = computed(() => {
  const map: Record<BattleCardSubtype, BattleCard[]> = { primary: [], secondary: [], advantage: [] }
  for (const c of props.eligible) map[c.subtype]?.push(c)
  return map
})
function typeCount(key: BattleCardSubtype): number {
  return props.eligible.filter((c) => c.subtype === key && selectedSet.value.has(c.id)).length
}
const total = computed(() => props.selected.length)
</script>

<template>
  <div class="space-y-5">
    <header class="flex items-center justify-between">
      <h2 class="font-display text-sm font-bold uppercase tracking-widest text-lg-text">Battle Deck</h2>
      <span class="text-xs font-semibold" :class="total === 9 ? 'text-lg-accent' : 'text-lg-muted'">{{ total }} / 9</span>
    </header>

    <p v-if="!hasUnits" class="rounded-lg border border-dashed border-lg-border py-6 text-center text-sm text-lg-muted">
      Add units to your army to start building a battle deck.
    </p>

    <template v-else>
      <section v-for="t in SUBTYPES" :key="t.key">
        <h3 class="mb-2 flex items-center gap-2 font-display text-xs font-bold uppercase tracking-widest" :style="{ color: `var(${t.varName})` }">
          <span class="inline-block h-2.5 w-2.5 rounded-sm" :style="{ background: `var(${t.varName})` }" />
          {{ t.label }}
          <span class="font-normal text-lg-muted">{{ typeCount(t.key) }} / 3</span>
        </h3>
        <!-- Cards render at their natural ratio (Primary Objectives are double-height,
             so a fixed aspect ratio would crop them). Fewer columns = larger cards. -->
        <div v-if="byType[t.key].length" class="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <button
            v-for="card in byType[t.key]" :key="card.id"
            class="group relative h-fit overflow-hidden rounded-lg border-2 text-left transition-all disabled:cursor-not-allowed"
            :style="selectedSet.has(card.id) ? { borderColor: `var(${t.varName})` } : {}"
            :class="selectedSet.has(card.id)
              ? ''
              : typeCount(t.key) >= 3
              ? 'border-lg-border opacity-40'
              : 'border-lg-border hover:border-lg-muted'"
            :disabled="!selectedSet.has(card.id) && typeCount(t.key) >= 3"
            @click="emit('toggle', card.id)"
          >
            <img
              v-if="card.cardImage" :src="imageUrl(card.cardImage)" :alt="card.name"
              class="block w-full h-auto" loading="lazy"
            />
            <div v-else class="flex aspect-[5/7] w-full items-center justify-center bg-lg-dark p-2 text-center text-[11px] text-lg-muted">{{ card.name }}</div>
            <span
              v-if="selectedSet.has(card.id)"
              class="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-lg-bg"
              :style="{ background: `var(${t.varName})` }"
            >✓</span>
            <span class="block truncate px-1.5 py-1 text-[11px] font-medium text-lg-text">{{ card.name }}</span>
          </button>
        </div>
        <p v-else class="rounded-lg border border-dashed border-lg-border py-3 text-center text-xs text-lg-muted">
          No eligible {{ t.label }} cards.
        </p>
      </section>
    </template>
  </div>
</template>

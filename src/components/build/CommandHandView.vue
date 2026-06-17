<script setup lang="ts">
import { computed } from 'vue'
import type { CommandCard } from '../../types/index.ts'
import { imageUrl } from '../../utils/imageUrl.ts'

// The command-hand builder (its own Build view/segment). A legal hand is 2 cards of
// each of pips 1/2/3 plus the auto-included Standing Orders (4 pip). Cards are picked
// deck-builder style: tap an eligible card to add/remove it; once a pip has its 2,
// the rest of that pip dim out.
const props = defineProps<{
  eligible: CommandCard[] // selectable cards (pips 1–3, already eligibility-filtered)
  selected: string[] // chosen card ids
  standingOrders: CommandCard | null // the auto 4-pip card, shown fixed
  hasCommander: boolean // whether the army has any units yet
}>()
const emit = defineEmits<{ toggle: [cardId: string] }>()

const PIPS = [1, 2, 3] as const
const selectedSet = computed(() => new Set(props.selected))

const byPip = computed(() => {
  const map: Record<number, CommandCard[]> = { 1: [], 2: [], 3: [] }
  for (const c of props.eligible) if (map[c.pips]) map[c.pips].push(c)
  return map
})
function pipCount(pip: number): number {
  return props.eligible.filter((c) => c.pips === pip && selectedSet.value.has(c.id)).length
}
const total = computed(() => props.selected.length + (props.standingOrders ? 1 : 0))
</script>

<template>
  <div class="space-y-5">
    <header class="flex items-center justify-between">
      <h2 class="font-display text-sm font-bold uppercase tracking-widest text-lg-text">Command Hand</h2>
      <span class="text-xs font-semibold" :class="total === 7 ? 'text-lg-accent' : 'text-lg-muted'">{{ total }} / 7</span>
    </header>

    <p v-if="!hasCommander" class="rounded-lg border border-dashed border-lg-border py-6 text-center text-sm text-lg-muted">
      Add units to your army to unlock their command cards.
    </p>

    <template v-else>
      <section v-for="pip in PIPS" :key="pip">
        <h3 class="mb-2 flex items-center gap-2 font-display text-xs font-bold uppercase tracking-widest text-lg-text/80">
          {{ pip }} Pip
          <span class="font-normal" :class="pipCount(pip) === 2 ? 'text-lg-accent' : 'text-lg-muted'">{{ pipCount(pip) }} / 2</span>
        </h3>
        <div v-if="byPip[pip].length" class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <button
            v-for="card in byPip[pip]" :key="card.id"
            class="group relative overflow-hidden rounded-lg border text-left transition-all disabled:cursor-not-allowed"
            :class="selectedSet.has(card.id)
              ? 'border-lg-accent ring-1 ring-lg-accent'
              : pipCount(pip) >= 2
              ? 'border-lg-border opacity-40'
              : 'border-lg-border hover:border-lg-accent/50'"
            :disabled="!selectedSet.has(card.id) && pipCount(pip) >= 2"
            @click="emit('toggle', card.id)"
          >
            <img
              v-if="card.cardImage" :src="imageUrl(card.cardImage)" :alt="card.name"
              class="aspect-[5/7] w-full object-cover" loading="lazy"
            />
            <div v-else class="flex aspect-[5/7] w-full items-center justify-center bg-lg-dark p-2 text-center text-[11px] text-lg-muted">{{ card.name }}</div>
            <span
              v-if="selectedSet.has(card.id)"
              class="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-lg-accent text-[11px] font-bold text-lg-bg"
            >✓</span>
            <span class="block truncate px-1.5 py-1 text-xs font-medium text-lg-text">{{ card.name }}</span>
          </button>
        </div>
        <p v-else class="rounded-lg border border-dashed border-lg-border py-3 text-center text-xs text-lg-muted">
          No eligible {{ pip }}-pip cards — field a commander to unlock theirs.
        </p>
      </section>

      <!-- Standing Orders is always part of every command hand. -->
      <section v-if="standingOrders">
        <h3 class="mb-2 font-display text-xs font-bold uppercase tracking-widest text-lg-text/80">Always included</h3>
        <div class="flex items-center gap-3 rounded-lg border border-lg-border bg-lg-surface p-2">
          <img
            v-if="standingOrders.cardImage" :src="imageUrl(standingOrders.cardImage)" :alt="standingOrders.name"
            class="h-16 w-auto rounded object-contain" loading="lazy"
          />
          <div>
            <p class="text-sm font-semibold text-lg-text">{{ standingOrders.name }}</p>
            <p class="text-[11px] text-lg-muted">4 Pip · auto-included in every hand</p>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

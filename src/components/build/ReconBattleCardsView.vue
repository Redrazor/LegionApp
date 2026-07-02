<script setup lang="ts">
import { ref } from 'vue'
import type { BattleCard, BattleCardSubtype } from '../../types/index.ts'
import { imageUrl } from '../../utils/imageUrl.ts'

// Read-only counterpart to BattleDeckView, shown in Recon (600 pt) where there is no
// deck-building: Recon uses ONE fixed, shared set of Battle Cards drawn at the table
// (Recon Rulebook, eff. 4.30.2025), so this panel just surfaces that set for reference
// + printing. Tap a card to view it full-screen (its rules live on the image).
const props = defineProps<{
  groups: { subtype: BattleCardSubtype; cards: BattleCard[] }[]
}>()

const LABELS: Record<BattleCardSubtype, { label: string; varName: string }> = {
  primary: { label: 'Primary Objective', varName: '--color-obj-primary' },
  secondary: { label: 'Secondary Objective', varName: '--color-obj-secondary' },
  advantage: { label: 'Advantage', varName: '--color-obj-advantage' },
}

const total = () => props.groups.reduce((n, g) => n + g.cards.length, 0)

// Self-contained full-card zoom (these cards carry their rules text on the image).
const zoomed = ref<BattleCard | null>(null)
</script>

<template>
  <div class="space-y-5">
    <header class="flex flex-wrap items-center gap-x-2 gap-y-1">
      <h2 class="font-display text-sm font-bold uppercase tracking-widest text-lg-text">Recon Battle Cards</h2>
      <span class="rounded-full border border-lg-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-lg-muted">Reference</span>
      <span class="ml-auto text-xs font-semibold text-lg-muted">{{ total() }} cards</span>
    </header>

    <!-- Recon format explainer: what changes vs a Standard game (Recon Rulebook). -->
    <div class="rounded-lg border border-lg-accent/30 bg-lg-accent/8 p-3 text-xs leading-relaxed text-lg-muted">
      <p class="mb-1.5 font-semibold text-lg-accent">Recon uses this fixed set — cards are drawn at the table, not chosen.</p>
      <p>
        Unlike a Standard game you don't build a battle deck: Recon plays with this single shared set of Battle
        Cards (and Standard battle cards can't be used in Recon). During setup, players randomly draw 1 primary
        + 1 secondary from the shared decks and 1 advantage each — so this tab is a read-only reference of the
        whole set. It's a 600-point skirmish on a 3′×3′ battlefield with tighter ranks (exactly 1 Commander,
        0–1 Operative, 2–4 Corps, 0–2 Special Forces, 0–2 Support, 0–1 Heavy); your command hand is built normally.
      </p>
    </div>

    <section v-for="g in groups" :key="g.subtype">
      <h3
        class="mb-2 flex items-center gap-2 font-display text-xs font-bold uppercase tracking-widest"
        :style="{ color: `var(${LABELS[g.subtype].varName})` }"
      >
        <span class="inline-block h-2.5 w-2.5 rounded-sm" :style="{ background: `var(${LABELS[g.subtype].varName})` }" />
        {{ LABELS[g.subtype].label }}
      </h3>
      <!-- Cards render at their natural ratio (Primary Objectives are double-height). -->
      <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <button
          v-for="card in g.cards" :key="card.id"
          class="group h-fit overflow-hidden rounded-lg border-2 border-lg-border text-left transition-all hover:border-lg-muted"
          @click="zoomed = card"
        >
          <img
            v-if="card.cardImage" :src="imageUrl(card.cardImage)" :alt="card.name"
            class="block h-auto w-full" loading="lazy"
          />
          <div v-else class="flex aspect-[5/7] w-full items-center justify-center bg-lg-dark p-2 text-center text-[11px] text-lg-muted">{{ card.name }}</div>
          <span class="block truncate px-1.5 py-1 text-xs font-medium text-lg-text">{{ card.name }}</span>
        </button>
      </div>
    </section>

    <!-- Full-card zoom (rules text is on the image). Teleported to escape any overflow. -->
    <Teleport to="body">
      <div
        v-if="zoomed"
        class="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        @click="zoomed = null"
      >
        <figure class="flex max-h-full flex-col items-center gap-2">
          <img
            v-if="zoomed.cardImage" :src="imageUrl(zoomed.cardImage)" :alt="zoomed.name"
            class="max-h-[88vh] w-auto max-w-full rounded-lg shadow-2xl"
          />
          <figcaption class="font-display text-sm font-semibold uppercase tracking-widest text-lg-text/90">{{ zoomed.name }}</figcaption>
        </figure>
        <button class="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-lg text-white/80 hover:bg-white/10" aria-label="Close" @click.stop="zoomed = null">✕</button>
      </div>
    </Teleport>
  </div>
</template>

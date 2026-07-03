<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { usePlaySessionStore } from '../../stores/playSession.ts'
import { useBattleCardsStore } from '../../stores/battleCards.ts'
import { missionFormat } from '../../utils/mission.ts'
import { imageUrl } from '../../utils/imageUrl.ts'
import type { BattleCard } from '../../types/index.ts'

defineEmits<{ (e: 'draw'): void; (e: 'reset'): void }>()

const store = usePlaySessionStore()
const battleCards = useBattleCardsStore()
const { mission, missionReady, blueIsSelf, selfAdvantage, opponentAdvantage, selfArmy, opponentArmy } = storeToRefs(store)

const format = computed(() => missionFormat(selfArmy.value, opponentArmy.value))
const card = (id: string | null): BattleCard | null => (id ? battleCards.byId.get(id) ?? null : null)

// The four cards shown once a Recon mission is drawn, in reveal order.
const cards = computed(() => {
  const m = mission.value
  if (!m || !missionReady.value) return []
  return [
    { key: 'primary', label: 'Primary', varName: '--color-obj-primary', card: card(m.primary), dim: false },
    { key: 'secondary', label: 'Secondary', varName: '--color-obj-secondary', card: card(m.secondary), dim: false },
    { key: 'adv-self', label: 'Your Advantage', varName: '--color-obj-advantage', card: card(selfAdvantage.value), dim: false },
    { key: 'adv-opp', label: "Opponent's Advantage", varName: '--color-obj-advantage', card: card(opponentAdvantage.value), dim: true },
  ]
})

const zoomed = ref<BattleCard | null>(null)
</script>

<template>
  <section class="mb-4 rounded-xl border border-lg-border bg-lg-surface p-4">
    <h2 class="mb-3 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-widest text-lg-text">
      Mission
      <span class="rounded-full border border-lg-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-lg-muted">
        {{ format === 'recon' ? 'Recon' : 'Standard' }}
      </span>
    </h2>

    <!-- Not drawn yet -->
    <div v-if="!mission">
      <p v-if="format === 'recon'" class="mb-3 text-sm text-lg-muted">
        Draw the mission: a roll-off sets the Blue player, who draws the shared Primary + Secondary
        objectives, then each player draws an Advantage.
      </p>
      <p v-else class="mb-3 text-sm text-lg-muted">
        Standard games use a Primary/Secondary/Advantage veto-draft. That flow is coming soon — draw to
        see the placeholder for now.
      </p>
      <button class="w-full rounded-lg bg-lg-accent px-4 py-2.5 text-sm font-semibold text-lg-dark" @click="$emit('draw')">
        Draw mission
      </button>
    </div>

    <!-- Standard placeholder -->
    <div v-else-if="mission.pending" class="space-y-3">
      <div class="rounded-lg border border-dashed border-lg-border bg-lg-dark/40 px-4 py-6 text-center text-sm text-lg-muted">
        <p class="mb-1 font-semibold text-lg-text/80">Standard mission draft — coming soon</p>
        <p>The Primary / Secondary / Advantage veto-draft isn't wired up yet. Recon games draw automatically.</p>
      </div>
      <button class="w-full rounded-lg border border-lg-border px-4 py-2 text-sm text-lg-muted hover:text-lg-accent" @click="$emit('reset')">
        Clear
      </button>
    </div>

    <!-- Recon mission drawn -->
    <div v-else>
      <div class="mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"
        :class="blueIsSelf ? 'border-sky-500/40 bg-sky-500/10 text-sky-300' : 'border-lg-border bg-lg-dark/40 text-lg-muted'">
        <span class="h-2.5 w-2.5 rounded-full bg-sky-400" />
        {{ blueIsSelf ? 'You are the Blue player — pick your table edge and deploy first.' : 'Your opponent is Blue.' }}
      </div>

      <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div v-for="c in cards" :key="c.key" :class="c.dim && 'opacity-70'">
          <p class="mb-1 truncate font-display text-[10px] font-bold uppercase tracking-widest" :style="{ color: `var(${c.varName})` }">{{ c.label }}</p>
          <button
            class="block w-full overflow-hidden rounded-lg border-2 border-lg-border text-left transition-colors hover:border-lg-muted"
            @click="c.card && (zoomed = c.card)"
          >
            <img v-if="c.card?.cardImage" :src="imageUrl(c.card.cardImage)" :alt="c.card.name" class="block h-auto w-full" loading="lazy" />
            <div v-else class="flex aspect-[5/7] w-full items-center justify-center bg-lg-dark p-2 text-center text-[11px] text-lg-muted">
              {{ c.card?.name ?? '—' }}
            </div>
          </button>
          <p class="mt-0.5 truncate text-[11px] text-lg-text/80">{{ c.card?.name ?? '—' }}</p>
        </div>
      </div>

      <button class="mt-3 w-full rounded-lg border border-lg-border px-4 py-2 text-sm text-lg-muted hover:text-lg-accent" @click="$emit('reset')">
        Redraw mission
      </button>
    </div>

    <!-- Full-card zoom -->
    <Teleport to="body">
      <div v-if="zoomed" class="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" @click="zoomed = null">
        <figure class="flex max-h-full flex-col items-center gap-2">
          <img v-if="zoomed.cardImage" :src="imageUrl(zoomed.cardImage)" :alt="zoomed.name" class="max-h-[88vh] w-auto max-w-full rounded-lg shadow-2xl" />
          <figcaption class="font-display text-sm font-semibold uppercase tracking-widest text-lg-text/90">{{ zoomed.name }}</figcaption>
        </figure>
        <button class="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-lg text-white/80 hover:bg-white/10" aria-label="Close" @click.stop="zoomed = null">✕</button>
      </div>
    </Teleport>
  </section>
</template>

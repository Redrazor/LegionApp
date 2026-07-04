<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'
import { usePlaySessionStore } from '../../stores/playSession.ts'
import { useBattleCardsStore } from '../../stores/battleCards.ts'
import { missionFormat } from '../../utils/mission.ts'
import { imageUrl } from '../../utils/imageUrl.ts'
import type { BattleCard, MissionModifyAction } from '../../types/index.ts'

defineEmits<{ (e: 'draw'): void; (e: 'reset'): void; (e: 'modify', action: MissionModifyAction): void }>()

const store = usePlaySessionStore()
const battleCards = useBattleCardsStore()
const {
  mission, missionReady, blueIsSelf, selfAdvantage, opponentAdvantage, selfArmy, opponentArmy,
  standardDraft, draftBuilt, draftRevealing, draftActorAdvantage, draftOpponentAdvantage, draftActorIsBlue,
  draftCanAct, draftModsLeft,
} = storeToRefs(store)

const format = computed(() => missionFormat(selfArmy.value, opponentArmy.value))
const card = (id: string | null): BattleCard | null => (id ? battleCards.byId.get(id) ?? null : null)

// The four cards shown once a Recon mission is drawn, in reveal order.
const cards = computed(() => {
  const m = mission.value
  if (!m || !missionReady.value || m.draft) return []
  return [
    { key: 'primary', label: 'Primary', varName: '--color-obj-primary', card: card(m.primary), dim: false },
    { key: 'secondary', label: 'Secondary', varName: '--color-obj-secondary', card: card(m.secondary), dim: false },
    { key: 'adv-self', label: 'Your Advantage', varName: '--color-obj-advantage', card: card(selfAdvantage.value), dim: false },
    { key: 'adv-opp', label: "Opponent's Advantage", varName: '--color-obj-advantage', card: card(opponentAdvantage.value), dim: true },
  ]
})

// The mission-in-progress (or built) cards for the Standard draft, from the active
// player's perspective (Objective + Secondary are shared; each side has an Advantage).
const draftCards = computed(() => {
  const m = mission.value
  if (!m?.draft) return []
  return [
    { key: 'primary', label: 'Objective', varName: '--color-obj-primary', card: card(m.primary), dim: false },
    { key: 'secondary', label: 'Secondary', varName: '--color-obj-secondary', card: card(m.secondary), dim: false },
    { key: 'adv-self', label: 'Your Advantage', varName: '--color-obj-advantage', card: card(draftActorAdvantage.value), dim: false },
    { key: 'adv-opp', label: "Opponent's Advantage", varName: '--color-obj-advantage', card: card(draftOpponentAdvantage.value), dim: true },
  ]
})

// The six modification options (DOC56 p.19). `steal` is hidden when the actor already holds Blue.
const modifyActions = computed<{ action: MissionModifyAction; label: string; show: boolean }[]>(() => [
  { action: 'swap-primary', label: 'Swap Objective', show: true },
  { action: 'swap-secondary', label: 'Swap Secondary', show: true },
  { action: 'swap-advantage', label: 'Swap your Advantage', show: true },
  { action: 'swap-opponent-advantage', label: "Swap opponent's Advantage", show: true },
  { action: 'steal-blue', label: 'Take the Blue token', show: !draftActorIsBlue.value },
  { action: 'pass', label: 'Pass', show: true },
])

// Whose modification it is, worded for solo (both sides played locally) vs a room.
const turnLabel = computed(() => {
  const d = standardDraft.value
  if (!d || d.phase === 'built') return ''
  const left = `${draftModsLeft.value} modification${draftModsLeft.value === 1 ? '' : 's'} left`
  if (d.solo) return `${draftActorIsBlue.value ? 'Blue' : 'Red'} player’s turn — ${left}`
  return draftCanAct.value ? `Your turn to modify — ${left}` : 'Opponent is modifying…'
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
        Build the Standard mission: a roll-off sets the Blue player, cards are revealed from each
        player’s battle deck, then you alternate modifying the mission — two changes each.
      </p>
      <button class="w-full rounded-lg bg-lg-accent px-4 py-2.5 text-sm font-semibold text-lg-dark" @click="$emit('draw')">
        {{ format === 'recon' ? 'Draw mission' : 'Start mission draft' }}
      </button>
    </div>

    <!-- Standard: a battle deck isn't built yet -->
    <div v-else-if="mission.pending" class="space-y-3">
      <div class="rounded-lg border border-dashed border-lg-border bg-lg-dark/40 px-4 py-6 text-center text-sm text-lg-muted">
        <p class="mb-1 font-semibold text-lg-text/80">Battle deck needed</p>
        <p>Standard missions are drafted from each player’s battle deck (3 Primary + 3 Secondary + 3 Advantage). Build one in the
          <RouterLink to="/build" class="text-lg-accent underline">Build</RouterLink> tab’s Battle Deck, then start the draft.
        </p>
      </div>
      <button class="w-full rounded-lg border border-lg-border px-4 py-2 text-sm text-lg-muted hover:text-lg-accent" @click="$emit('reset')">
        Clear
      </button>
    </div>

    <!-- Standard interactive draft (modify in progress or built) -->
    <div v-else-if="mission.draft">
      <!-- Blue player -->
      <div class="mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"
        :class="draftActorIsBlue ? 'border-sky-500/40 bg-sky-500/10 text-sky-300' : 'border-lg-border bg-lg-dark/40 text-lg-muted'">
        <span class="h-2.5 w-2.5 rounded-full bg-sky-400" />
        {{ draftActorIsBlue ? 'Blue player — picks table edge & deploys first' : 'Opponent holds the Blue token' }}
      </div>

      <!-- Reveal phase — the Blue player chooses which objective to reveal first -->
      <div v-if="draftRevealing">
        <div v-if="draftCanAct" class="space-y-3">
          <p class="text-center text-xs font-semibold uppercase tracking-widest text-lg-accent">Blue player — reveal your first objective</p>
          <div class="grid grid-cols-2 gap-2">
            <button
              class="rounded-lg border border-lg-border bg-lg-dark/40 px-3 py-3 text-sm font-medium text-lg-text/90 transition-colors hover:border-lg-accent/60 hover:text-lg-accent"
              @click="$emit('modify', 'reveal-primary')"
            >Reveal Objective</button>
            <button
              class="rounded-lg border border-lg-border bg-lg-dark/40 px-3 py-3 text-sm font-medium text-lg-text/90 transition-colors hover:border-lg-accent/60 hover:text-lg-accent"
              @click="$emit('modify', 'reveal-secondary')"
            >Reveal Secondary</button>
          </div>
          <p class="text-center text-[11px] text-lg-muted">Your opponent then reveals the other type from their deck, and each player reveals an Advantage.</p>
        </div>
        <p v-else class="rounded-lg border border-dashed border-lg-border px-3 py-3 text-center text-xs text-lg-muted">
          Blue player is choosing which objective to reveal first…
        </p>
      </div>

      <template v-else>
      <!-- Turn / progress -->
      <p v-if="!draftBuilt" class="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-lg-accent">
        {{ turnLabel }}
      </p>

      <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div v-for="c in draftCards" :key="c.key" :class="c.dim && 'opacity-70'">
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

      <!-- Modify actions -->
      <div v-if="!draftBuilt" class="mt-3">
        <div v-if="draftCanAct" class="grid grid-cols-2 gap-2">
          <button
            v-for="a in modifyActions.filter((x) => x.show)" :key="a.action"
            class="rounded-lg border border-lg-border bg-lg-dark/40 px-3 py-2 text-xs font-medium text-lg-text/90 transition-colors hover:border-lg-accent/60 hover:text-lg-accent"
            @click="$emit('modify', a.action)"
          >
            {{ a.label }}
          </button>
        </div>
        <p v-else class="rounded-lg border border-dashed border-lg-border px-3 py-3 text-center text-xs text-lg-muted">
          Waiting for your opponent to take their modification…
        </p>
      </div>

      <!-- Built: setup order -->
      <div v-else class="mt-3">
        <div class="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-3">
          <p class="mb-2 font-display text-xs font-bold uppercase tracking-widest text-emerald-300">Mission built — set up</p>
          <ol class="list-decimal space-y-1 pl-5 text-[13px] text-lg-text/85">
            <li>Blue player chooses a long table edge — their side is allied Territory, the opposite is enemy.</li>
            <li>Resolve the Objective card’s setup instructions.</li>
            <li>Resolve the Secondary Objective card’s setup instructions.</li>
            <li>Each player resolves their Advantage card’s setup, Blue player first.</li>
          </ol>
        </div>
        <button class="mt-3 w-full rounded-lg border border-lg-border px-4 py-2 text-sm text-lg-muted hover:text-lg-accent" @click="$emit('reset')">
          Restart draft
        </button>
      </div>
      </template>
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

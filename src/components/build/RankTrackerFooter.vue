<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Rank, CommandCard, BattleCard, BattleCardSubtype } from '../../types/index.ts'
import type { ValidationItem } from '../../utils/army.ts'
import { rankChipState } from '../../utils/army.ts'
import { FORMATS, RANK_ORDER } from '../../utils/factions.ts'

// The permanent Build "Roster Canvas" footer: 6 rank chips (count·min–max with
// over/under colouring), live totals + format switcher + Save/Share/Print, a tap
// target that expands the footer upward to reveal the validation checklist, and a
// second "Cards" drawer summarising the picked command hand + battle deck.
const props = defineProps<{
  ranks: Record<Rank, { count: number; min: number; max: number; detachments: number; entourage: number }>
  points: number
  cap: number
  remaining: number
  pointsPct: number
  activations: number
  models: number
  valid: boolean
  items: ValidationItem[]
  canExport: boolean
  saveLabel: string
  shareMsg?: string
  // Picked cards, for the at-a-glance "Cards" drawer.
  commandHandCards: CommandCard[] // the chosen command cards (excl. Standing Orders)
  standingOrders: CommandCard | null
  battleDeckCards: BattleCard[] // the chosen battle cards
  showBattleDeck: boolean // false in Recon (no battle deck)
}>()

const emit = defineEmits<{
  setGameSize: [cap: number]
  save: []
  share: []
  print: []
  export: []
  import: []
  stats: []
}>()

const checklistOpen = ref(false)
const cardsOpen = ref(false)
// On mobile the secondary actions (Stats/Print/Export/Import) live in a "More"
// bottom-sheet so the action row doesn't overflow a 360–390px viewport.
const moreOpen = ref(false)
// The game-format picker is a small dropdown that opens upward (the footer is
// pinned to the bottom of the viewport, so a downward menu would be clipped).
const formatOpen = ref(false)
const currentFormat = computed(() => FORMATS.find((fm) => fm.cap === props.cap))
// The drawers are mutually exclusive so the footer never stacks more than one.
function toggleChecklist() {
  checklistOpen.value = !checklistOpen.value
  if (checklistOpen.value) {
    cardsOpen.value = false
    moreOpen.value = false
    formatOpen.value = false
  }
}
function toggleCards() {
  cardsOpen.value = !cardsOpen.value
  if (cardsOpen.value) {
    checklistOpen.value = false
    moreOpen.value = false
    formatOpen.value = false
  }
}
function toggleMore() {
  moreOpen.value = !moreOpen.value
  if (moreOpen.value) {
    checklistOpen.value = false
    cardsOpen.value = false
    formatOpen.value = false
  }
}
function toggleFormat() {
  formatOpen.value = !formatOpen.value
  if (formatOpen.value) {
    checklistOpen.value = false
    cardsOpen.value = false
    moreOpen.value = false
  }
}
function selectFormat(c: number) {
  emit('setGameSize', c)
  formatOpen.value = false
}
// Fire a secondary action from the More sheet, then close it.
function fromMore(action: 'stats' | 'print' | 'export' | 'import') {
  moreOpen.value = false
  if (action === 'stats') emit('stats')
  else if (action === 'print') emit('print')
  else if (action === 'export') emit('export')
  else emit('import')
}

// Command hand grouped by pip (1/2/3) for the summary; Standing Orders shown apart.
const commandByPip = computed(() => {
  const map: Record<number, CommandCard[]> = { 1: [], 2: [], 3: [] }
  for (const c of props.commandHandCards) if (map[c.pips]) map[c.pips].push(c)
  return map
})
const commandTotal = computed(() => props.commandHandCards.length + (props.standingOrders ? 1 : 0))

const SUBTYPES: { key: BattleCardSubtype; label: string; varName: string }[] = [
  { key: 'primary', label: 'Primary', varName: '--color-obj-primary' },
  { key: 'secondary', label: 'Secondary', varName: '--color-obj-secondary' },
  { key: 'advantage', label: 'Advantage', varName: '--color-obj-advantage' },
]
const deckByType = computed(() => {
  const map: Record<BattleCardSubtype, BattleCard[]> = { primary: [], secondary: [], advantage: [] }
  for (const c of props.battleDeckCards) map[c.subtype]?.push(c)
  return map
})

// Compact rank labels for the chips (full names are in the checklist overlay).
const RANK_ABBR: Record<Rank, string> = {
  commander: 'Cmd', operative: 'Op', corps: 'Corps',
  special: 'Spec', support: 'Sup', heavy: 'Heavy',
}

const chipClass: Record<ReturnType<typeof rankChipState>, string> = {
  ok: 'border-lg-border bg-lg-surface text-lg-muted',
  under: 'border-faction-rebels/40 bg-faction-rebels/10 text-faction-rebels',
  over: 'border-faction-rebels bg-faction-rebels/15 text-faction-rebels ring-1 ring-faction-rebels/50',
}
</script>

<template>
  <div>
    <!-- Expanding validation checklist: grows the footer upward (0fr → 1fr) -->
    <div
      class="grid transition-[grid-template-rows] duration-300 ease-out"
      :style="{ gridTemplateRows: checklistOpen ? '1fr' : '0fr' }"
    >
      <div class="overflow-hidden">
        <div class="mb-2.5 max-h-[50vh] overflow-y-auto border-b border-lg-border pb-2.5">
          <div class="mb-1.5 flex items-center justify-between">
            <h3 class="text-xs font-bold uppercase tracking-widest text-lg-muted">Army Status</h3>
            <button class="grid h-10 w-10 place-items-center text-lg-muted hover:text-lg-accent" aria-label="Close" @click="checklistOpen = false">✕</button>
          </div>
          <ul class="space-y-1.5">
            <li v-for="(item, i) in items" :key="i" class="flex items-center justify-between gap-2 text-sm">
              <span class="flex items-center gap-1.5">
                <span :class="item.ok ? 'text-lg-valid' : 'text-faction-rebels'">{{ item.ok ? '✓' : '✕' }}</span>
                <span class="text-lg-text/80">{{ item.label }}</span>
              </span>
              <span class="text-right text-xs" :class="item.ok ? 'text-lg-muted' : 'text-faction-rebels'">{{ item.detail }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Cards drawer: at-a-glance command hand + battle deck (grows upward) -->
    <div
      class="grid transition-[grid-template-rows] duration-300 ease-out"
      :style="{ gridTemplateRows: cardsOpen ? '1fr' : '0fr' }"
    >
      <div class="overflow-hidden">
        <div class="mb-2.5 max-h-[55vh] overflow-y-auto border-b border-lg-border pb-2.5">
          <div class="mb-1.5 flex items-center justify-between">
            <h3 class="text-xs font-bold uppercase tracking-widest text-lg-muted">Cards</h3>
            <button class="grid h-10 w-10 place-items-center text-lg-muted hover:text-lg-accent" aria-label="Close" @click="cardsOpen = false">✕</button>
          </div>
          <div class="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <!-- Command hand -->
            <div>
              <p class="mb-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-lg-text/70">
                Command Hand <span :class="commandTotal === 7 ? 'text-lg-accent' : 'text-lg-muted'">{{ commandTotal }} / 7</span>
              </p>
              <ul class="space-y-1">
                <li v-for="pip in [1, 2, 3]" :key="pip" class="space-y-1">
                  <template v-for="c in commandByPip[pip]" :key="c.id">
                    <span class="flex items-center gap-1.5 text-xs">
                      <span class="inline-flex h-4 w-4 flex-none items-center justify-center rounded-full bg-lg-accent/80 text-[10px] font-bold text-lg-bg tabular-nums">{{ c.pips }}</span>
                      <span class="truncate text-lg-text/85">{{ c.name }}</span>
                    </span>
                  </template>
                </li>
                <li v-if="standingOrders" class="flex items-center gap-1.5 text-xs">
                  <span class="inline-flex h-4 w-4 flex-none items-center justify-center rounded-full border border-lg-border text-[10px] font-bold text-lg-muted tabular-nums">4</span>
                  <span class="truncate text-lg-muted">{{ standingOrders.name }} <span class="opacity-60">· auto</span></span>
                </li>
                <li v-if="!commandHandCards.length" class="text-xs text-lg-muted/70">No cards picked yet.</li>
              </ul>
            </div>
            <!-- Battle deck -->
            <div v-if="showBattleDeck">
              <p class="mb-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-lg-text/70">
                Battle Deck <span :class="battleDeckCards.length === 9 ? 'text-lg-accent' : 'text-lg-muted'">{{ battleDeckCards.length }} / 9</span>
              </p>
              <ul class="space-y-1">
                <template v-for="t in SUBTYPES" :key="t.key">
                  <li v-for="c in deckByType[t.key]" :key="c.id" class="flex items-center gap-1.5 text-xs">
                    <span class="h-3 w-0.5 flex-none rounded-full" :style="{ background: `var(${t.varName})` }" />
                    <span class="truncate" :style="{ color: `var(${t.varName})` }">{{ c.name }}</span>
                  </li>
                </template>
                <li v-if="!battleDeckCards.length" class="text-xs text-lg-muted/70">No cards picked yet.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- "More" actions drawer (mobile only): secondary actions as full-width rows -->
    <div
      class="grid transition-[grid-template-rows] duration-300 ease-out sm:hidden"
      :style="{ gridTemplateRows: moreOpen ? '1fr' : '0fr' }"
    >
      <div class="overflow-hidden">
        <div class="mb-2.5 max-h-[50vh] overflow-y-auto border-b border-lg-border pb-2.5">
          <div class="mb-1.5 flex items-center justify-between">
            <h3 class="text-xs font-bold uppercase tracking-widest text-lg-muted">More</h3>
            <button class="grid h-10 w-10 place-items-center text-lg-muted hover:text-lg-accent" aria-label="Close" @click="moreOpen = false">✕</button>
          </div>
          <div class="space-y-1.5">
            <button class="flex w-full items-center rounded-lg border border-lg-border bg-lg-surface px-3 py-3 text-sm font-semibold text-lg-text hover:text-lg-accent disabled:opacity-40" :disabled="!canExport" @click="fromMore('stats')">Stats</button>
            <button class="flex w-full items-center rounded-lg border border-lg-border bg-lg-surface px-3 py-3 text-sm font-semibold text-lg-text hover:text-lg-accent disabled:opacity-40" :disabled="!canExport" @click="fromMore('print')">Print</button>
            <button class="flex w-full items-center rounded-lg border border-lg-border bg-lg-surface px-3 py-3 text-sm font-semibold text-lg-text hover:text-lg-accent disabled:opacity-40" :disabled="!canExport" @click="fromMore('export')">Export</button>
            <button class="flex w-full items-center rounded-lg border border-lg-border bg-lg-surface px-3 py-3 text-sm font-semibold text-lg-text hover:text-lg-accent" @click="fromMore('import')">Import</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Rank chips -->
    <div class="flex flex-wrap items-center gap-1.5">
      <span
        v-for="rank in RANK_ORDER" :key="rank"
        class="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums"
        :class="chipClass[rankChipState(ranks[rank].count, ranks[rank].min, ranks[rank].max, ranks[rank].detachments, ranks[rank].entourage)]"
        :title="`${RANK_ABBR[rank]} — ${ranks[rank].count} of ${ranks[rank].min}–${ranks[rank].max}${ranks[rank].entourage ? ` (${ranks[rank].entourage} entourage)` : ''}`"
      >
        {{ RANK_ABBR[rank] }}
        <span class="font-bold">{{ ranks[rank].count - ranks[rank].entourage }}</span>
        <span v-if="ranks[rank].entourage" class="text-lg-holo">+{{ ranks[rank].entourage }}</span>
        <span class="opacity-60">·{{ ranks[rank].min }}–{{ ranks[rank].max }}</span>
      </span>
    </div>

    <!-- Totals + controls — all left-aligned. -->
    <div class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2">
      <!-- Points / cap / remaining / legality — kept on a single line. -->
      <button
        class="flex items-baseline gap-1.5 whitespace-nowrap rounded-lg px-1 py-1.5 text-left hover:bg-lg-text/5"
        :title="checklistOpen ? 'Hide validation checklist' : 'Show validation checklist'"
        :aria-expanded="checklistOpen"
        @click="toggleChecklist"
      >
        <span class="font-display text-2xl font-bold leading-none" :class="points > cap ? 'text-faction-rebels' : 'text-lg-accent'">{{ points }}</span>
        <span class="text-sm text-lg-muted">/ {{ cap }}</span>
        <span class="text-xs" :class="remaining < 0 ? 'text-faction-rebels' : 'text-lg-muted'">({{ remaining }} left)</span>
        <span class="hidden text-xs text-lg-muted sm:inline">· {{ activations }} act · {{ models }} models</span>
        <span
          class="ml-0.5 rounded-full px-2 py-0.5 text-xs font-semibold"
          :class="valid ? 'bg-lg-valid/15 text-lg-valid' : 'bg-faction-rebels/15 text-faction-rebels'"
        >{{ valid ? 'Legal' : 'Illegal' }}</span>
        <span
          class="text-lg-muted/70 transition-transform duration-300"
          :class="checklistOpen ? 'rotate-180' : ''"
          aria-hidden="true"
        >⌃</span>
      </button>

      <!-- Cards drawer toggle: command hand + battle deck at a glance -->
      <button
        class="flex items-center gap-1 rounded-lg border border-lg-border px-2 py-1.5 text-xs font-semibold hover:border-lg-accent/40"
        :title="cardsOpen ? 'Hide cards' : 'Show command hand & battle deck'"
        :aria-expanded="cardsOpen"
        @click="toggleCards"
      >
        <span class="uppercase tracking-wider text-lg-muted">Cards</span>
        <span :class="commandTotal === 7 ? 'text-lg-accent' : 'text-lg-muted'">{{ commandTotal }}/7</span>
        <span v-if="showBattleDeck" class="text-lg-muted/50">·</span>
        <span v-if="showBattleDeck" :class="battleDeckCards.length === 9 ? 'text-lg-accent' : 'text-lg-muted'">{{ battleDeckCards.length }}/9</span>
        <span class="text-lg-muted/70 transition-transform duration-300" :class="cardsOpen ? 'rotate-180' : ''" aria-hidden="true">⌃</span>
      </button>

      <!-- Game-format picker: a dropdown that opens upward. -->
      <div class="relative">
        <button
          class="flex items-center gap-1 whitespace-nowrap rounded-lg border border-lg-border bg-lg-surface px-2.5 py-1.5 text-xs font-semibold text-lg-muted hover:border-lg-accent/40 hover:text-lg-accent"
          :title="`Game format — ${currentFormat?.name ?? ''} · ${cap} pts`"
          :aria-expanded="formatOpen"
          @click="toggleFormat"
        >
          <span class="text-lg-text">{{ currentFormat?.name ?? 'Format' }}</span>
          <span class="text-lg-muted/70">{{ cap }}</span>
          <span class="text-lg-muted/70 transition-transform duration-300" :class="formatOpen ? 'rotate-180' : ''" aria-hidden="true">⌃</span>
        </button>
        <template v-if="formatOpen">
          <!-- click-catcher backdrop -->
          <div class="fixed inset-0 z-40" @click="formatOpen = false" />
          <div class="absolute bottom-full left-0 z-50 mb-2 min-w-[12rem] overflow-hidden rounded-lg border border-lg-border bg-lg-surface shadow-xl">
            <button
              v-for="fm in FORMATS" :key="fm.id"
              class="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-sm transition-colors"
              :class="cap === fm.cap ? 'bg-lg-accent/15 text-lg-accent' : 'text-lg-text hover:bg-lg-text/5'"
              @click="selectFormat(fm.cap)"
            >
              <span class="font-medium">{{ fm.name }}</span>
              <span class="text-xs text-lg-muted">{{ fm.cap }} pts</span>
            </button>
          </div>
        </template>
      </div>

      <!-- Desktop/tablet: all actions inline. -->
      <div class="hidden items-center gap-2 sm:flex">
        <button class="rounded-lg bg-lg-accent/15 border border-lg-accent/40 px-3 py-1.5 text-sm font-semibold text-lg-accent hover:bg-lg-accent/25" @click="emit('save')">{{ saveLabel }}</button>
        <button class="rounded-lg border border-lg-border bg-lg-surface px-3 py-1.5 text-sm text-lg-muted hover:text-lg-accent disabled:opacity-40" :disabled="!canExport" @click="emit('share')">Share</button>
        <button class="rounded-lg border border-lg-border bg-lg-surface px-3 py-1.5 text-sm text-lg-muted hover:text-lg-accent disabled:opacity-40" :disabled="!canExport" @click="emit('stats')">Stats</button>
        <button class="rounded-lg border border-lg-border bg-lg-surface px-3 py-1.5 text-sm text-lg-muted hover:text-lg-accent disabled:opacity-40" :disabled="!canExport" @click="emit('print')">Print</button>
        <button class="rounded-lg border border-lg-border bg-lg-surface px-3 py-1.5 text-sm text-lg-muted hover:text-lg-accent disabled:opacity-40" :disabled="!canExport" @click="emit('export')">Export</button>
        <button class="rounded-lg border border-lg-border bg-lg-surface px-3 py-1.5 text-sm text-lg-muted hover:text-lg-accent" @click="emit('import')">Import</button>
      </div>

      <!-- Mobile: Save/Share + a ••• "More" sheet for the rest. -->
      <div class="flex items-center gap-2 sm:hidden">
        <button class="rounded-lg bg-lg-accent/15 border border-lg-accent/40 px-3 py-1.5 text-sm font-semibold text-lg-accent hover:bg-lg-accent/25" @click="emit('save')">{{ saveLabel }}</button>
        <button class="rounded-lg border border-lg-border bg-lg-surface px-3 py-1.5 text-sm text-lg-muted hover:text-lg-accent disabled:opacity-40" :disabled="!canExport" @click="emit('share')">Share</button>
        <button
          class="grid h-9 w-10 place-items-center rounded-lg border border-lg-border bg-lg-surface text-sm font-bold text-lg-muted hover:text-lg-accent"
          :title="moreOpen ? 'Hide more actions' : 'More actions'"
          :aria-expanded="moreOpen"
          aria-label="More actions"
          @click="toggleMore"
        >•••</button>
      </div>
    </div>

    <!-- Points progress -->
    <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-lg-dark">
      <div
        class="h-full rounded-full transition-all"
        :class="points > cap ? 'bg-faction-rebels' : 'bg-lg-accent'"
        :style="{ width: pointsPct + '%' }"
      />
    </div>
    <p v-if="shareMsg" class="mt-1 break-all text-xs text-lg-holo">{{ shareMsg }}</p>
  </div>
</template>

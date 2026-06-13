<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { BattleForce, Faction, Unit } from '../../types/index.ts'
import { useUpgradesStore } from '../../stores/upgrades.ts'
import { slotLabel } from '../../utils/factions.ts'
import UpgradeThumb from './UpgradeThumb.vue'

// Contextual upgrade picker that lives in the LEFT catalogue pane (replaces the old
// side drawer): the valid upgrades for one slot of one unit, each shown as a small
// card-art thumbnail + name + what it does (keywords). Picking equips and closes;
// the ✕ closes without changing anything. BuildView only mounts this when there is at
// least one candidate, so there is no empty state to land on.
const props = defineProps<{ slot: string; faction: Faction; unit: Unit; battleForce: BattleForce | null; equippedIds: string[]; filled: boolean }>()
const emit = defineEmits<{ pick: [upgradeId: string]; clear: []; close: [] }>()

const upgradesStore = useUpgradesStore()
const query = ref('')

const candidates = computed(() => {
  const q = query.value.trim().toLowerCase()
  return upgradesStore
    .forSlot(props.slot, props.faction, props.unit, props.battleForce)
    .filter((u) => !q || u.name.toLowerCase().includes(q) || u.keywords.some((k) => k.toLowerCase().includes(q)))
    .sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0) || a.name.localeCompare(b.name))
})

// Inspect gallery: a full-card carousel over the candidates. `inspectIndex` is the
// position in `candidates`; null = closed. Swipe / arrows / chevrons navigate; the
// Select button equips the currently-shown card.
const inspectIndex = ref<number | null>(null)
const inspected = computed(() => (inspectIndex.value != null ? candidates.value[inspectIndex.value] ?? null : null))
const inspectDisabled = computed(() => !!inspected.value && inspected.value.isUnique && props.equippedIds.includes(inspected.value.id))

function inspectPrev() { if (inspectIndex.value != null && inspectIndex.value > 0) inspectIndex.value-- }
function inspectNext() { if (inspectIndex.value != null && inspectIndex.value < candidates.value.length - 1) inspectIndex.value++ }
function selectInspected() { if (inspected.value && !inspectDisabled.value) { emit('pick', inspected.value.id); inspectIndex.value = null } }

let touchX = 0
function onTouchStart(e: TouchEvent) { touchX = e.changedTouches[0].clientX }
function onTouchEnd(e: TouchEvent) {
  const dx = e.changedTouches[0].clientX - touchX
  if (Math.abs(dx) > 40) (dx > 0 ? inspectPrev : inspectNext)()
}
function onKey(e: KeyboardEvent) {
  if (inspectIndex.value == null) return
  if (e.key === 'ArrowLeft') inspectPrev()
  else if (e.key === 'ArrowRight') inspectNext()
  else if (e.key === 'Escape') inspectIndex.value = null
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="flex h-full flex-col no-print">
    <!-- Header -->
    <div class="mb-3 flex flex-none items-center justify-between gap-2">
      <div class="min-w-0">
        <h2 class="font-display text-sm font-bold uppercase tracking-widest text-lg-accent">{{ slotLabel(slot) }} upgrade</h2>
        <p class="truncate text-[11px] text-lg-muted">for {{ unit.name }}</p>
      </div>
      <button class="grid h-8 w-8 flex-none place-items-center rounded-lg text-lg-muted hover:bg-lg-text/8 hover:text-lg-accent" aria-label="Close" @click="emit('close')">✕</button>
    </div>

    <input
      v-model="query"
      type="search"
      placeholder="Search upgrades…"
      class="mb-3 w-full flex-none rounded-lg border border-lg-border bg-lg-dark px-3 py-2 text-sm text-lg-text placeholder:text-lg-muted/60 focus:border-lg-accent/60 focus:outline-none"
    />

    <div class="flex-1 space-y-1 overflow-y-auto">
      <button
        v-if="filled"
        class="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-lg-border p-2 text-sm text-lg-muted transition-colors hover:border-faction-rebels/50 hover:text-faction-rebels"
        @click="emit('clear')"
      >Remove upgrade</button>

      <div
        v-for="(u, i) in candidates" :key="u.id"
        class="flex items-stretch gap-2.5 rounded-lg border border-lg-border/70 bg-lg-surface/40 p-1.5 transition-colors hover:border-lg-accent/40 hover:bg-lg-text/5"
        :class="{ 'opacity-40': u.isUnique && equippedIds.includes(u.id) }"
      >
        <button
          class="flex min-w-0 flex-1 items-center gap-2.5 text-left disabled:cursor-not-allowed"
          :disabled="u.isUnique && equippedIds.includes(u.id)"
          :title="`Equip ${u.name}`"
          @click="emit('pick', u.id)"
        >
          <UpgradeThumb :upgrade="u" />
          <span class="min-w-0 flex-1">
            <span class="flex items-center gap-1">
              <span v-if="u.isUnique" class="text-xs text-lg-accent" title="Unique">◈</span>
              <span class="truncate text-sm font-semibold text-lg-text">{{ u.name }}</span>
            </span>
            <span v-if="u.keywords.length" class="mt-0.5 block text-[11px] leading-snug text-lg-muted">{{ u.keywords.join(' · ') }}</span>
          </span>
          <span class="flex-none self-start font-display text-sm font-bold text-lg-accent">{{ u.cost ?? 0 }}</span>
        </button>
        <button
          class="flex-none self-center rounded-md border border-lg-border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-lg-muted transition-colors hover:border-lg-accent/50 hover:text-lg-accent"
          :title="`Inspect ${u.name}`"
          @click="inspectIndex = i"
        >Inspect</button>
      </div>
    </div>

    <!-- Inspect gallery: swipeable carousel of the candidate cards + a Select button -->
    <Teleport to="body">
      <div v-if="inspected" class="fixed inset-0 z-[65] flex flex-col items-center justify-center gap-3 p-4">
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" @click="inspectIndex = null" />
        <button class="absolute right-4 top-4 z-20 grid h-9 w-9 place-items-center rounded-full bg-lg-dark/80 text-lg-muted hover:text-lg-accent" aria-label="Close" @click="inspectIndex = null">✕</button>

        <!-- Card + chevrons -->
        <div class="relative z-10 flex items-center" @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd">
          <button
            class="absolute -left-2 z-20 grid h-14 w-14 place-items-center rounded-full bg-lg-dark/80 text-3xl leading-none text-lg-accent ring-1 ring-lg-accent/40 transition-colors hover:bg-lg-accent/20 disabled:opacity-25 sm:-left-14"
            :disabled="inspectIndex === 0" aria-label="Previous" @click="inspectPrev"
          >‹</button>
          <img
            v-if="inspected.cardImage" :src="inspected.cardImage" :alt="inspected.name"
            class="max-h-[72vh] w-auto max-w-[88vw] rounded-xl border border-lg-border shadow-2xl"
          />
          <div v-else class="grid h-[60vh] w-[42vh] place-items-center rounded-xl border border-lg-border bg-lg-surface text-center text-lg-muted">{{ inspected.name }}</div>
          <button
            class="absolute -right-2 z-20 grid h-14 w-14 place-items-center rounded-full bg-lg-dark/80 text-3xl leading-none text-lg-accent ring-1 ring-lg-accent/40 transition-colors hover:bg-lg-accent/20 disabled:opacity-25 sm:-right-14"
            :disabled="inspectIndex === candidates.length - 1" aria-label="Next" @click="inspectNext"
          >›</button>
        </div>

        <!-- Footer: position · name/cost · Select -->
        <div class="relative z-10 flex w-full max-w-md items-center justify-between gap-3 rounded-xl border border-lg-border bg-lg-surface/95 px-4 py-2.5">
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-lg-text">{{ inspected.name }} <span class="font-display text-lg-accent">{{ inspected.cost ?? 0 }}</span></p>
            <p class="text-[11px] text-lg-muted">{{ (inspectIndex ?? 0) + 1 }} / {{ candidates.length }}</p>
          </div>
          <button
            class="flex-none rounded-lg border border-lg-accent/40 bg-lg-accent/15 px-4 py-1.5 text-sm font-semibold text-lg-accent transition-colors hover:bg-lg-accent/25 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="inspectDisabled" @click="selectInspected"
          >{{ inspectDisabled ? 'Equipped' : 'Select' }}</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

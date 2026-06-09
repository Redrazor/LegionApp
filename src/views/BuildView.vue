<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useArmyStore } from '../stores/army.ts'
import { useUnitsStore } from '../stores/units.ts'
import { useUpgradesStore } from '../stores/upgrades.ts'
import { useArmyValidation } from '../composables/useArmyValidation.ts'
import { FACTION_ORDER, FACTION_META, RANK_ORDER, RANK_META, rankName } from '../utils/factions.ts'
import { encodeArmy, decodeArmy } from '../utils/army.ts'
import type { Faction, Rank } from '../types/index.ts'
import ArmyUnitCard from '../components/build/ArmyUnitCard.vue'
import UnitPickerDrawer from '../components/build/UnitPickerDrawer.vue'

const armyStore = useArmyStore()
const unitsStore = useUnitsStore()
const upgradesStore = useUpgradesStore()
const { draft, saved, activeIndex } = storeToRefs(armyStore)
const { validation, pointsRemaining } = useArmyValidation()

const pickingRank = ref<Rank | null>(null)
const shareMsg = ref('')

onMounted(() => {
  unitsStore.load()
  upgradesStore.load()
  // Import a shared army from the URL (?a=...)
  const params = new URLSearchParams(window.location.search)
  const a = params.get('a')
  if (a) {
    const army = decodeArmy(a)
    if (army) {
      armyStore.loadDraft(army)
      activeIndex.value = -1
      history.replaceState(null, '', '/build')
    }
  }
})

const unitsByRank = computed(() => {
  const map: Record<Rank, typeof draft.value.units> = {
    commander: [], operative: [], corps: [], special: [], support: [], heavy: [],
  }
  for (const au of draft.value.units) {
    const u = unitsStore.byId.get(au.unitId)
    if (u) map[u.rank].push(au)
  }
  return map
})

function pickUnit(unitId: string) {
  armyStore.addUnit(unitId)
  pickingRank.value = null
}

async function share() {
  const url = `${window.location.origin}/build?a=${encodeArmy(draft.value)}`
  try {
    await navigator.clipboard.writeText(url)
    shareMsg.value = 'Link copied!'
  } catch {
    shareMsg.value = url
  }
  setTimeout(() => (shareMsg.value = ''), 3000)
}

const pointsPct = computed(() =>
  Math.min(100, Math.round((validation.value.points / draft.value.gameSize) * 100)),
)

function printSheet() {
  window.print()
}
</script>

<template>
  <!-- Faction selection gate -->
  <div v-if="!draft.faction" class="mx-auto max-w-lg py-10 text-center">
    <h1 class="font-display text-2xl font-bold uppercase tracking-wider text-lg-text">Build an Army</h1>
    <p class="mt-2 text-sm text-lg-muted">Choose a faction to begin.</p>
    <div class="mt-6 grid gap-3 sm:grid-cols-2">
      <button
        v-for="f in FACTION_ORDER" :key="f"
        class="flex items-center gap-3 rounded-xl border border-lg-border bg-lg-surface p-4 text-left transition-all hover:-translate-y-0.5 hover:border-lg-gold/50"
        @click="armyStore.setFaction(f as Faction)"
      >
        <span class="h-10 w-1.5 rounded" :style="{ background: FACTION_META[f].color }" />
        <span class="font-display font-bold uppercase tracking-wide text-lg-text">{{ FACTION_META[f].name }}</span>
      </button>
    </div>
  </div>

  <div v-else>
    <!-- Header controls -->
    <div class="mb-4 flex flex-wrap items-center gap-3 no-print">
      <input
        :value="draft.name"
        placeholder="Army name…"
        class="flex-1 min-w-[180px] rounded-lg border border-lg-border bg-lg-surface px-3 py-2 text-sm font-semibold text-lg-text placeholder:text-lg-muted/60 focus:border-lg-gold/60 focus:outline-none"
        @input="armyStore.setName(($event.target as HTMLInputElement).value)"
      />
      <div class="flex overflow-hidden rounded-lg border border-lg-border">
        <button
          v-for="size in [800, 500]" :key="size"
          class="px-3 py-2 text-xs font-semibold transition-colors"
          :class="draft.gameSize === size ? 'bg-lg-gold/20 text-lg-gold' : 'bg-lg-surface text-lg-muted'"
          @click="armyStore.setGameSize(size)"
        >{{ size === 800 ? 'Standard 800' : 'Skirmish 500' }}</button>
      </div>
      <button class="rounded-lg border border-lg-border bg-lg-surface px-3 py-2 text-xs font-medium text-lg-muted hover:text-lg-gold" @click="armyStore.newArmy()">New</button>
    </div>

    <!-- Sticky summary -->
    <div class="sticky top-[57px] z-30 -mx-4 mb-4 border-y border-lg-border bg-lg-bg/95 px-4 py-2.5 backdrop-blur-sm">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-baseline gap-2">
          <span class="font-display text-xl font-bold" :class="validation.points > draft.gameSize ? 'text-faction-rebels' : 'text-lg-gold'">
            {{ validation.points }}
          </span>
          <span class="text-sm text-lg-muted">/ {{ draft.gameSize }}</span>
          <span class="text-xs" :class="pointsRemaining < 0 ? 'text-faction-rebels' : 'text-lg-muted'">
            ({{ pointsRemaining }} left)
          </span>
        </div>
        <div class="flex items-center gap-3 text-xs text-lg-muted">
          <span>{{ validation.activations }} activations</span>
          <span
            class="rounded-full px-2 py-0.5 font-semibold"
            :class="validation.valid ? 'bg-lg-valid/15 text-lg-valid' : 'bg-faction-rebels/15 text-faction-rebels'"
          >{{ validation.valid ? 'Legal' : 'Illegal' }}</span>
        </div>
      </div>
      <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-lg-dark">
        <div
          class="h-full rounded-full transition-all"
          :class="validation.points > draft.gameSize ? 'bg-faction-rebels' : 'bg-lg-gold'"
          :style="{ width: pointsPct + '%' }"
        />
      </div>
    </div>

    <div class="grid gap-5 lg:grid-cols-[1fr_300px]">
      <!-- Rank sections -->
      <div class="space-y-5">
        <section v-for="rank in RANK_ORDER" :key="rank">
          <div class="mb-2 flex items-center justify-between">
            <h2 class="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-widest text-lg-text/80">
              {{ rankName(rank) }}
              <span class="text-xs font-normal text-lg-muted">
                {{ unitsByRank[rank].length }}<span v-if="RANK_META[rank].min > 0 || RANK_META[rank].max">
                  · {{ RANK_META[rank].min }}–{{ RANK_META[rank].max }}</span>
              </span>
            </h2>
            <button
              class="rounded-lg border border-lg-border bg-lg-surface px-2.5 py-1 text-xs font-medium text-lg-gold hover:bg-lg-gold/10 no-print"
              :disabled="unitsByRank[rank].length >= RANK_META[rank].max"
              :class="{ 'opacity-30': unitsByRank[rank].length >= RANK_META[rank].max }"
              @click="pickingRank = rank"
            >+ Add</button>
          </div>
          <div v-if="unitsByRank[rank].length" class="space-y-2">
            <ArmyUnitCard
              v-for="au in unitsByRank[rank]" :key="au.uid"
              :army-unit="au" :faction="draft.faction"
            />
          </div>
          <div v-else class="rounded-lg border border-dashed border-lg-border py-4 text-center text-xs text-lg-muted">
            No {{ rankName(rank) }} units
          </div>
        </section>
      </div>

      <!-- Sidebar: validation + saved -->
      <aside class="space-y-4">
        <div class="rounded-xl border border-lg-border bg-lg-surface p-4">
          <h3 class="mb-2 text-xs font-bold uppercase tracking-widest text-lg-muted">Army Status</h3>
          <ul class="space-y-1.5">
            <li v-for="(item, i) in validation.items" :key="i" class="flex items-center justify-between text-sm">
              <span class="flex items-center gap-1.5">
                <span :class="item.ok ? 'text-lg-valid' : 'text-faction-rebels'">{{ item.ok ? '✓' : '✕' }}</span>
                <span class="text-lg-text/80">{{ item.label }}</span>
              </span>
              <span class="text-xs" :class="item.ok ? 'text-lg-muted' : 'text-faction-rebels'">{{ item.detail }}</span>
            </li>
          </ul>
        </div>

        <div class="flex gap-2 no-print">
          <button class="flex-1 rounded-lg bg-lg-gold/15 border border-lg-gold/40 px-3 py-2 text-sm font-semibold text-lg-gold hover:bg-lg-gold/25" @click="armyStore.saveCurrent()">
            {{ activeIndex >= 0 ? 'Update' : 'Save' }}
          </button>
          <button class="rounded-lg border border-lg-border bg-lg-surface px-3 py-2 text-sm text-lg-muted hover:text-lg-gold" :disabled="!draft.units.length" @click="share">Share</button>
          <button class="rounded-lg border border-lg-border bg-lg-surface px-3 py-2 text-sm text-lg-muted hover:text-lg-gold" :disabled="!draft.units.length" @click="printSheet">Print</button>
        </div>
        <p v-if="shareMsg" class="break-all text-xs text-lg-holo no-print">{{ shareMsg }}</p>

        <div v-if="saved.length" class="rounded-xl border border-lg-border bg-lg-surface p-4 no-print">
          <h3 class="mb-2 text-xs font-bold uppercase tracking-widest text-lg-muted">Saved Armies</h3>
          <ul class="space-y-1">
            <li v-for="(a, i) in saved" :key="i" class="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5" :class="{ 'bg-lg-gold/10': i === activeIndex }">
              <button class="min-w-0 flex-1 truncate text-left text-lg-text/85" @click="armyStore.loadSaved(i)">
                {{ a.n || 'Untitled' }}
                <span class="text-xs text-lg-muted">· {{ FACTION_META[a.f as Faction]?.name ?? '' }}</span>
              </button>
              <button class="flex-none text-xs text-lg-muted hover:text-faction-rebels" @click="armyStore.deleteSaved(i)">✕</button>
            </li>
          </ul>
        </div>
      </aside>
    </div>

    <UnitPickerDrawer
      v-if="pickingRank"
      :faction="draft.faction"
      :rank="pickingRank"
      @pick="pickUnit"
      @close="pickingRank = null"
    />
  </div>
</template>

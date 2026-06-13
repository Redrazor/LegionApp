<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useArmyStore } from '../stores/army.ts'
import { useUnitsStore } from '../stores/units.ts'
import { useUpgradesStore } from '../stores/upgrades.ts'
import { useArmyValidation } from '../composables/useArmyValidation.ts'
import { FACTION_ORDER, FACTION_META, RANK_ORDER, rankLimits, rankName } from '../utils/factions.ts'
import { encodeArmy, decodeArmy, entourageBonuses, presentDetachmentParents, groupArmyUnits } from '../utils/army.ts'
import type { Faction, Rank } from '../types/index.ts'
import ArmyUnitCard from '../components/build/ArmyUnitCard.vue'
import BuildLayout from '../components/build/BuildLayout.vue'
import RankTrackerFooter from '../components/build/RankTrackerFooter.vue'
import RankCatalogue from '../components/build/RankCatalogue.vue'
import UpgradeCatalogue from '../components/build/UpgradeCatalogue.vue'
import UnitProfile from '../components/browse/UnitProfile.vue'
import { useBreakpoint } from '../composables/useBreakpoint.ts'

const armyStore = useArmyStore()
const unitsStore = useUnitsStore()
const upgradesStore = useUpgradesStore()
const { draft, saved, activeIndex } = storeToRefs(armyStore)
const { validation, pointsRemaining } = useArmyValidation()
const { isMobile, isDesktop } = useBreakpoint()

const shareMsg = ref('')
// Slug of the unit whose profile drawer is open (catalogue "view"); null = closed.
const viewingSlug = ref<string | null>(null)
function viewUnit(unitId: string) {
  viewingSlug.value = unitsStore.byId.get(unitId)?.slug ?? null
}

// Contextual upgrade picking: a chosen army-unit slot takes over the left pane.
const picking = ref<{ uid: string; slot: string; index: number } | null>(null)
const pickingCtx = computed(() => {
  if (!picking.value) return null
  const au = armyStore.findUnit(picking.value.uid)
  const unit = au && unitsStore.byId.get(au.unitId)
  if (!au || !unit) return null
  return {
    unit,
    equippedIds: au.upgrades.map((u) => u.upgradeId),
    filled: armyStore.upgradeInSlot(picking.value.uid, picking.value.slot, picking.value.index) != null,
  }
})
function onPickUpgrade(p: { uid: string; slot: string; index: number }) {
  picking.value = p
}
function applyUpgrade(upgradeId: string | null) {
  if (picking.value) armyStore.setUpgrade(picking.value.uid, picking.value.slot, picking.value.index, upgradeId)
  picking.value = null
}

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

// Same units, collapsed into render-time `×N` groups (same unit + same loadout)
// for the army-pane cards. The underlying ArmyUnit entries stay distinct.
const groupedByRank = computed(() => {
  const out = {} as Record<Rank, ReturnType<typeof groupArmyUnits>>
  for (const rank of RANK_ORDER) out[rank] = groupArmyUnits(unitsByRank.value[rank])
  return out
})

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

// Per-format rank limits for the currently selected points cap, with Entourage
// bonuses folded into each rank's max so the catalogue "+ Add" gating and the
// header caps match validateArmy (e.g. Tarkin's "Entourage Darth Vader" → 1–3).
const limits = computed(() => {
  const base = rankLimits(draft.value.gameSize, draft.value.faction)
  const bonus = entourageBonuses(draft.value, unitsStore.byId)
  const out = {} as Record<Rank, { min: number; max: number }>
  for (const rank of RANK_ORDER) {
    out[rank] = { min: base[rank].min, max: base[rank].max + (bonus[rank] ?? 0) }
  }
  return out
})

const pointsPct = computed(() =>
  Math.min(100, Math.round((validation.value.points / draft.value.gameSize) * 100)),
)

// Parents present in the army, for Detachment availability in the catalogue (a
// "Detachment X" unit appears only once X is fielded).
const presentParents = computed(() => presentDetachmentParents(draft.value, unitsStore.byId))

// Current army unit count per rank (catalogue tab counters + "+" max gating).
const counts = computed(() => {
  const out = {} as Record<Rank, number>
  for (const rank of RANK_ORDER) out[rank] = unitsByRank.value[rank].length
  return out
})

// Per-rank {count, min, max} for the footer's rank-tracker chips (max already
// folds in Entourage via `limits`).
const ranks = computed(() => {
  const out = {} as Record<Rank, { count: number; min: number; max: number }>
  for (const rank of RANK_ORDER) {
    out[rank] = { count: counts.value[rank], min: limits.value[rank].min, max: limits.value[rank].max }
  }
  return out
})

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
        class="flex items-center gap-3 rounded-xl border border-lg-border bg-lg-surface p-4 text-left transition-all hover:-translate-y-0.5 hover:border-lg-accent/50"
        @click="armyStore.setFaction(f as Faction)"
      >
        <span class="h-10 w-1.5 rounded" :style="{ background: FACTION_META[f].color }" />
        <span class="font-display font-bold uppercase tracking-wide text-lg-text">{{ FACTION_META[f].name }}</span>
      </button>
    </div>
  </div>

  <BuildLayout v-else :force-pane="picking ? 'catalogue' : null">
    <!-- Header controls -->
    <template #header>
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <input
          :value="draft.name"
          placeholder="Army name…"
          class="flex-1 min-w-[180px] rounded-lg border border-lg-border bg-lg-surface px-3 py-2 text-sm font-semibold text-lg-text placeholder:text-lg-muted/60 focus:border-lg-accent/60 focus:outline-none"
          @input="armyStore.setName(($event.target as HTMLInputElement).value)"
        />
        <button class="rounded-lg border border-lg-border bg-lg-surface px-3 py-2 text-xs font-medium text-lg-muted hover:text-lg-accent" @click="armyStore.newArmy()">New</button>
      </div>
    </template>

    <!-- Catalogue pane — the unit catalogue, or the contextual upgrade picker when a
         slot is selected (tap a unit's [+] to add; tap an army-unit slot to upgrade). -->
    <template #catalogue>
      <UpgradeCatalogue
        v-if="picking && pickingCtx"
        :slot="picking.slot"
        :faction="draft.faction"
        :unit="pickingCtx.unit"
        :equipped-ids="pickingCtx.equippedIds"
        :filled="pickingCtx.filled"
        @pick="applyUpgrade"
        @clear="applyUpgrade(null)"
        @close="picking = null"
      />
      <RankCatalogue
        v-else
        :units="unitsStore.units"
        :faction="draft.faction"
        :counts="counts"
        :limits="limits"
        :present-parents="presentParents"
        :is-mobile="isMobile"
        :is-desktop="isDesktop"
        @add="armyStore.addUnit"
        @view="viewUnit"
      />
    </template>

    <!-- Army pane: rank sections + validation + saved -->
    <template #army>
      <div class="space-y-5">
        <section v-for="rank in RANK_ORDER" :key="rank">
          <h2 class="mb-2 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-widest text-lg-text/80">
            {{ rankName(rank) }}
            <span class="text-xs font-normal text-lg-muted">
              {{ unitsByRank[rank].length }}<span v-if="limits[rank].min > 0 || limits[rank].max">
                · {{ limits[rank].min }}–{{ limits[rank].max }}</span>
            </span>
          </h2>
          <div v-if="groupedByRank[rank].length" class="space-y-2">
            <ArmyUnitCard
              v-for="group in groupedByRank[rank]" :key="group.key"
              :group="group" :faction="draft.faction"
              :can-add="counts[rank] < limits[rank].max"
              @pick-upgrade="onPickUpgrade"
              @view="viewUnit"
            />
          </div>
          <div v-else class="rounded-lg border border-dashed border-lg-border py-4 text-center text-xs text-lg-muted">
            No {{ rankName(rank) }} units
          </div>
        </section>

        <!-- Validation checklist now opens from the footer (tap the totals). -->
        <div v-if="saved.length" class="rounded-xl border border-lg-border bg-lg-surface p-4 no-print">
          <h3 class="mb-2 text-xs font-bold uppercase tracking-widest text-lg-muted">Saved Armies</h3>
          <ul class="space-y-1">
            <li v-for="(a, i) in saved" :key="i" class="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-lg-text/8" :class="{ 'bg-lg-accent/10': i === activeIndex }">
              <button class="min-w-0 flex-1 truncate text-left text-lg-text/85" @click="armyStore.loadSaved(i)">
                {{ a.n || 'Untitled' }}
                <span class="text-xs text-lg-muted">· {{ FACTION_META[a.f as Faction]?.name ?? '' }}</span>
              </button>
              <button class="flex-none text-xs text-lg-muted hover:text-faction-rebels" @click="armyStore.deleteSaved(i)">✕</button>
            </li>
          </ul>
        </div>
      </div>
    </template>

    <!-- Pinned rank-tracker footer: chips, totals, format switcher, actions -->
    <template #footer>
      <RankTrackerFooter
        :ranks="ranks"
        :points="validation.points"
        :cap="draft.gameSize"
        :remaining="pointsRemaining"
        :points-pct="pointsPct"
        :activations="validation.activations"
        :valid="validation.valid"
        :items="validation.items"
        :can-export="!!draft.units.length"
        :save-label="activeIndex >= 0 ? 'Update' : 'Save'"
        :share-msg="shareMsg"
        @set-game-size="armyStore.setGameSize"
        @save="armyStore.saveCurrent()"
        @share="share"
        @print="printSheet"
      />
    </template>

    <!-- Catalogue/army "view" → reuse Browse's unit profile drawer (simplified: keeps
         keyword definitions, drops errata + available-upgrades to stay focused). -->
    <UnitProfile v-if="viewingSlug" :slug="viewingSlug" simplified @close="viewingSlug = null" />
  </BuildLayout>
</template>

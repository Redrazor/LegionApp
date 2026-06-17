<script setup lang="ts">
import { computed } from 'vue'
import type { ArmyUnitGroup } from '../../utils/army.ts'
import { unitLegalityIssues, effectiveUpgradeBar, unitModelCount } from '../../utils/army.ts'
import type { BattleForce, Faction } from '../../types/index.ts'
import { useUnitsStore } from '../../stores/units.ts'
import { useUpgradesStore } from '../../stores/upgrades.ts'
import { useArmyStore } from '../../stores/army.ts'
import { slotLabel } from '../../utils/factions.ts'
import UnitBadge from './UnitBadge.vue'
import UnitIndicators from './UnitIndicators.vue'

// One card per render-time `×N` group (same unit + same loadout). The stepper adds
// or removes whole copies; editing a slot acts on the representative, which splits
// it into its own group. `canAdd` mirrors the catalogue's rank-full gating.
const props = defineProps<{ group: ArmyUnitGroup; faction: Faction; battleForce: BattleForce | null; canAdd: boolean }>()
const emit = defineEmits<{
  pickUpgrade: [payload: { uid: string; slot: string; index: number }]
  view: [unitId: string, uid: string]
}>()

const unitsStore = useUnitsStore()
const upgradesStore = useUpgradesStore()
const armyStore = useArmyStore()

const armyUnit = computed(() => props.group.representative)
const qty = computed(() => props.group.qty)
const unit = computed(() => unitsStore.byId.get(armyUnit.value.unitId))

// Per-copy cost; the group total multiplies by qty.
const lineCost = computed(() => {
  let c = unit.value?.cost ?? 0
  for (const u of armyUnit.value.upgrades) c += upgradesStore.byId.get(u.upgradeId)?.cost ?? 0
  return c
})
const groupCost = computed(() => lineCost.value * qty.value)

// Per-unit legality (all members of a ×N group are identical, so one verdict). Live —
// clears as soon as the missing condition (e.g. a mandatory heavy weapon) is met.
const issues = computed(() => unitLegalityIssues(armyUnit.value, armyStore.draft, unitsStore.byId, props.battleForce))

// Upgrade bar incl. extra slots granted by the battle force AND by the upgrades
// currently equipped on this unit (e.g. a Comms Technician adds a `comms` slot).
const upgradeBar = computed(() =>
  unit.value ? effectiveUpgradeBar(unit.value, props.battleForce, armyUnit.value.upgrades, upgradesStore.byId) : [],
)

// Per-unit miniature count including any mini-adding upgrades equipped on this unit.
const modelCount = computed(() => unitModelCount(armyUnit.value, unitsStore.byId, upgradesStore.byId))

function equipped(slot: string, index: number) {
  const id = armyStore.upgradeInSlot(armyUnit.value.uid, slot, index)
  return id ? upgradesStore.byId.get(id) ?? null : null
}

// Whether a slot has any legal upgrade to offer — a slot with none isn't openable.
function hasCandidates(slot: string): boolean {
  return !!unit.value && upgradesStore.forSlot(slot, props.faction, unit.value, props.battleForce).length > 0
}

function addCopy() {
  armyStore.addCopy(armyUnit.value.uid)
}
function removeOne() {
  armyStore.removeUnit(props.group.uids[props.group.uids.length - 1])
}
function removeGroup() {
  for (const uid of props.group.uids) armyStore.removeUnit(uid)
}
</script>

<template>
  <div
    v-if="unit"
    class="relative overflow-hidden rounded-xl border p-3 transition-colors"
    :class="issues.length ? 'border-faction-rebels/70 bg-faction-rebels/5' : 'border-lg-border bg-lg-surface'"
  >
    <!-- Illegal watermark: large, faint, behind the content -->
    <span
      v-if="issues.length"
      class="pointer-events-none absolute -right-3 top-1/2 -translate-y-1/2 select-none font-display text-4xl font-black uppercase tracking-widest text-faction-rebels/10"
      aria-hidden="true"
    >Illegal</span>

    <!-- Illegal banner: badge + the unmet condition(s) -->
    <div
      v-if="issues.length"
      class="relative mb-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]"
      role="alert"
    >
      <span class="rounded bg-faction-rebels px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">⚠ Illegal</span>
      <span class="font-medium text-faction-rebels">{{ issues.join(' · ') }}</span>
    </div>

    <div class="relative flex items-start gap-3">
      <!-- Model count leads the row -->
      <div
        class="flex flex-none flex-col items-center justify-center rounded-lg border border-lg-border bg-lg-dark px-2 py-1 leading-none text-lg-text/80"
        :title="`${modelCount} miniature${modelCount === 1 ? '' : 's'} in this unit`"
      >
        <svg viewBox="0 0 16 16" class="h-3 w-3" fill="currentColor" aria-hidden="true">
          <circle cx="8" cy="3.5" r="2.5" />
          <path d="M3 15v-2a5 5 0 0 1 10 0v2z" />
        </svg>
        <span class="font-display text-sm font-bold tabular-nums">{{ modelCount }}</span>
      </div>
      <button class="flex min-w-0 flex-1 items-start gap-3 text-left" :title="`View ${unit.name}`" @click="emit('view', unit.id, armyUnit.uid)">
        <UnitBadge :unit="unit" />
        <span class="min-w-0 flex-1">
          <span class="flex items-center gap-1">
            <span v-if="unit.isUnique" class="text-lg-accent text-xs">◈</span>
            <span class="truncate font-semibold text-lg-text">{{ unit.name }}</span>
            <span v-if="qty > 1" class="flex-none rounded bg-lg-accent/15 px-1.5 text-[11px] font-bold text-lg-accent">×{{ qty }}</span>
          </span>
          <span v-if="unit.title" class="block truncate text-[11px] italic text-lg-muted">{{ unit.title }}</span>
          <UnitIndicators class="mt-1" :unit="unit" :show-speed="true" :models="modelCount" :hide-models="true" />
        </span>
      </button>
      <div class="flex flex-none flex-col items-end gap-1.5">
        <span class="font-display text-sm font-bold text-lg-accent">{{ groupCost }}</span>
        <!-- Quantity stepper (non-uniques only); uniques cap at 1. -->
        <div v-if="!unit.isUnique" class="flex items-center gap-1 no-print">
          <button
            class="flex h-9 w-9 items-center justify-center rounded border border-lg-border text-lg-muted transition-colors hover:border-lg-accent/40 hover:text-lg-text"
            aria-label="Remove one copy"
            @click="removeOne"
          >−</button>
          <span class="min-w-[1.25rem] text-center font-display text-xs font-bold text-lg-text">{{ qty }}</span>
          <button
            class="flex h-9 w-9 items-center justify-center rounded border border-lg-border text-lg-muted transition-colors enabled:hover:border-lg-accent/40 enabled:hover:text-lg-text disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Add one copy"
            :disabled="!canAdd"
            @click="addCopy"
          >+</button>
        </div>
        <button
          class="grid h-9 w-9 place-items-center rounded-lg text-xs text-lg-muted hover:text-faction-rebels no-print"
          :aria-label="qty > 1 ? `Remove all ${qty} copies` : 'Remove unit'"
          :title="qty > 1 ? `Remove all ${qty}` : 'Remove'"
          @click="removeGroup"
        >🗑</button>
      </div>
    </div>

    <!-- Upgrade slots — click opens the contextual picker in the left pane -->
    <div v-if="upgradeBar.length" class="relative mt-3 flex flex-wrap gap-1.5">
      <button
        v-for="(slot, i) in upgradeBar" :key="i"
        class="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-2 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        :class="equipped(slot, i)
          ? 'border-lg-accent/50 bg-lg-accent/10 text-lg-text'
          : 'border-dashed border-lg-border bg-lg-dark text-lg-muted enabled:hover:border-lg-accent/40'"
        :disabled="!equipped(slot, i) && !hasCandidates(slot)"
        @click="emit('pickUpgrade', { uid: armyUnit.uid, slot, index: i })"
      >
        <span class="text-[9px] font-bold uppercase tracking-wide text-lg-muted">{{ slotLabel(slot) }}</span>
        <template v-if="equipped(slot, i)">
          <span class="font-display font-bold text-lg-accent">{{ equipped(slot, i)!.cost ?? 0 }}</span>
          <span class="font-medium">{{ equipped(slot, i)!.name }}</span>
        </template>
        <span v-else>+</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ArmyUnitGroup } from '../../utils/army.ts'
import type { Faction } from '../../types/index.ts'
import { useUnitsStore } from '../../stores/units.ts'
import { useUpgradesStore } from '../../stores/upgrades.ts'
import { useArmyStore } from '../../stores/army.ts'
import { slotLabel } from '../../utils/factions.ts'
import UnitBadge from './UnitBadge.vue'
import UnitIndicators from './UnitIndicators.vue'

// One card per render-time `×N` group (same unit + same loadout). The stepper adds
// or removes whole copies; editing a slot acts on the representative, which splits
// it into its own group. `canAdd` mirrors the catalogue's rank-full gating.
const props = defineProps<{ group: ArmyUnitGroup; faction: Faction; canAdd: boolean }>()
const emit = defineEmits<{
  pickUpgrade: [payload: { uid: string; slot: string; index: number }]
  view: [unitId: string]
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

function equipped(slot: string, index: number) {
  const id = armyStore.upgradeInSlot(armyUnit.value.uid, slot, index)
  return id ? upgradesStore.byId.get(id) ?? null : null
}

// Whether a slot has any legal upgrade to offer — a slot with none isn't openable.
function hasCandidates(slot: string): boolean {
  return !!unit.value && upgradesStore.forSlot(slot, props.faction, unit.value).length > 0
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
  <div v-if="unit" class="rounded-xl border border-lg-border bg-lg-surface p-3">
    <div class="flex items-start gap-3">
      <button class="flex min-w-0 flex-1 items-start gap-3 text-left" :title="`View ${unit.name}`" @click="emit('view', unit.id)">
        <UnitBadge :unit="unit" />
        <span class="min-w-0 flex-1">
          <span class="flex items-center gap-1">
            <span v-if="unit.isUnique" class="text-lg-accent text-xs">◈</span>
            <span class="truncate font-semibold text-lg-text">{{ unit.name }}</span>
            <span v-if="qty > 1" class="flex-none rounded bg-lg-accent/15 px-1.5 text-[11px] font-bold text-lg-accent">×{{ qty }}</span>
          </span>
          <span v-if="unit.title" class="block truncate text-[11px] italic text-lg-muted">{{ unit.title }}</span>
          <UnitIndicators class="mt-1" :unit="unit" :show-speed="true" />
        </span>
      </button>
      <div class="flex flex-none flex-col items-end gap-1.5">
        <span class="font-display text-sm font-bold text-lg-accent">{{ groupCost }}</span>
        <!-- Quantity stepper (non-uniques only); uniques cap at 1. -->
        <div v-if="!unit.isUnique" class="flex items-center gap-1 no-print">
          <button
            class="flex h-5 w-5 items-center justify-center rounded border border-lg-border text-lg-muted transition-colors hover:border-lg-accent/40 hover:text-lg-text"
            aria-label="Remove one copy"
            @click="removeOne"
          >−</button>
          <span class="min-w-[1.25rem] text-center font-display text-xs font-bold text-lg-text">{{ qty }}</span>
          <button
            class="flex h-5 w-5 items-center justify-center rounded border border-lg-border text-lg-muted transition-colors enabled:hover:border-lg-accent/40 enabled:hover:text-lg-text disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Add one copy"
            :disabled="!canAdd"
            @click="addCopy"
          >+</button>
        </div>
        <button
          class="text-xs text-lg-muted hover:text-faction-rebels no-print"
          :aria-label="qty > 1 ? `Remove all ${qty} copies` : 'Remove unit'"
          :title="qty > 1 ? `Remove all ${qty}` : 'Remove'"
          @click="removeGroup"
        >🗑</button>
      </div>
    </div>

    <!-- Upgrade slots — click opens the contextual picker in the left pane -->
    <div v-if="unit.upgradeBar.length" class="mt-3 flex flex-wrap gap-1.5">
      <button
        v-for="(slot, i) in unit.upgradeBar" :key="i"
        class="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40"
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

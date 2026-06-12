<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ArmyUnit, Faction } from '../../types/index.ts'
import { useUnitsStore } from '../../stores/units.ts'
import { useUpgradesStore } from '../../stores/upgrades.ts'
import { useArmyStore } from '../../stores/army.ts'
import { slotLabel } from '../../utils/factions.ts'
import UpgradePickerDrawer from './UpgradePickerDrawer.vue'

const props = defineProps<{ armyUnit: ArmyUnit; faction: Faction }>()

const unitsStore = useUnitsStore()
const upgradesStore = useUpgradesStore()
const armyStore = useArmyStore()

const unit = computed(() => unitsStore.byId.get(props.armyUnit.unitId))

const picking = ref<{ slot: string; index: number } | null>(null)

const lineCost = computed(() => {
  let c = unit.value?.cost ?? 0
  for (const u of props.armyUnit.upgrades) c += upgradesStore.byId.get(u.upgradeId)?.cost ?? 0
  return c
})

// All currently-equipped upgrade ids on this unit (for unique-in-slot disabling).
const equippedIds = computed(() => props.armyUnit.upgrades.map((u) => u.upgradeId))

function equipped(slot: string, index: number) {
  const id = armyStore.upgradeInSlot(props.armyUnit.uid, slot, index)
  return id ? upgradesStore.byId.get(id) ?? null : null
}

function onPick(upgradeId: string) {
  if (picking.value) armyStore.setUpgrade(props.armyUnit.uid, picking.value.slot, picking.value.index, upgradeId)
  picking.value = null
}
function onClear() {
  if (picking.value) armyStore.setUpgrade(props.armyUnit.uid, picking.value.slot, picking.value.index, null)
  picking.value = null
}
</script>

<template>
  <div v-if="unit" class="rounded-xl border border-lg-border bg-lg-surface p-3">
    <div class="flex items-start gap-3">
      <img v-if="unit.cardImage" :src="unit.cardImage" :alt="unit.name" loading="lazy" class="h-14 w-20 flex-none rounded object-cover" />
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-1">
          <span v-if="unit.isUnique" class="text-lg-accent text-xs">◈</span>
          <span class="truncate font-semibold text-lg-text">{{ unit.name }}</span>
        </div>
        <span v-if="unit.title" class="block truncate text-[11px] italic text-lg-muted">{{ unit.title }}</span>
      </div>
      <div class="flex flex-none flex-col items-end gap-1">
        <span class="font-display text-sm font-bold text-lg-accent">{{ lineCost }}</span>
        <button
          class="text-xs text-lg-muted hover:text-faction-rebels no-print"
          aria-label="Remove unit"
          @click="armyStore.removeUnit(armyUnit.uid)"
        >Remove</button>
      </div>
    </div>

    <!-- Upgrade slots -->
    <div v-if="unit.upgradeBar.length" class="mt-3 flex flex-wrap gap-1.5">
      <button
        v-for="(slot, i) in unit.upgradeBar" :key="i"
        class="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors"
        :class="equipped(slot, i)
          ? 'border-lg-accent/50 bg-lg-accent/10 text-lg-text'
          : 'border-dashed border-lg-border bg-lg-dark text-lg-muted hover:border-lg-accent/40'"
        @click="picking = { slot, index: i }"
      >
        <span class="text-[9px] font-bold uppercase tracking-wide text-lg-muted">{{ slotLabel(slot) }}</span>
        <span v-if="equipped(slot, i)" class="font-medium">{{ equipped(slot, i)!.name }}</span>
        <span v-else>+</span>
      </button>
    </div>

    <UpgradePickerDrawer
      v-if="picking"
      :slot="picking.slot"
      :faction="faction"
      :equipped-ids="equippedIds"
      :unit="unit"
      @pick="onPick"
      @clear="onClear"
      @close="picking = null"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUnitsStore } from '../../stores/units.ts'
import { useUpgradesStore } from '../../stores/upgrades.ts'
import { useBattleForcesStore } from '../../stores/battleForces.ts'
import { armyPoints, unitCost, groupArmyUnits } from '../../utils/army.ts'
import { FACTION_META, factionColor, formatForCap } from '../../utils/factions.ts'
import UnitBadge from '../build/UnitBadge.vue'
import type { Army } from '../../types/index.ts'

const props = defineProps<{ army: Army; playerName: string }>()
defineEmits<{ (e: 'change'): void; (e: 'end'): void }>()

const unitsStore = useUnitsStore()
const upgradesStore = useUpgradesStore()
const battleForcesStore = useBattleForcesStore()

const bf = computed(() => (props.army.battleForce ? battleForcesStore.byId.get(props.army.battleForce) ?? null : null))
const points = computed(() => armyPoints(props.army, unitsStore.byId, upgradesStore.byId, bf.value))
const format = computed(() => formatForCap(props.army.gameSize))

// Collapse identical loadouts to ×N rows (rules-correct entries stay distinct underneath).
const groups = computed(() =>
  groupArmyUnits(props.army.units).map((g) => {
    const unit = unitsStore.byId.get(g.unitId) ?? null
    return {
      key: g.key,
      unit,
      qty: g.qty,
      cost: unitCost(g.representative, unitsStore.byId, upgradesStore.byId, { army: props.army, bf: bf.value }),
      upgrades: g.representative.upgrades
        .map((u) => upgradesStore.byId.get(u.upgradeId)?.name)
        .filter((n): n is string => !!n),
    }
  }),
)
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <!-- Army header -->
    <div class="mb-4 rounded-xl border border-lg-border bg-lg-surface p-4">
      <div class="flex items-center gap-3">
        <span class="h-10 w-1.5 flex-none rounded" :style="{ background: factionColor(army.faction) }" />
        <div class="min-w-0 flex-1">
          <p class="text-[11px] uppercase tracking-widest text-lg-muted">{{ playerName }}</p>
          <h1 class="truncate font-display text-xl font-bold text-lg-text">{{ army.name || 'Untitled army' }}</h1>
          <p class="truncate text-xs text-lg-muted">
            {{ army.faction ? FACTION_META[army.faction].name : 'No faction' }} · {{ format.name }}
          </p>
        </div>
        <div class="flex-none text-right">
          <span class="font-display text-lg font-bold text-lg-accent">{{ points }}</span>
          <span class="text-sm text-lg-muted/70">/{{ army.gameSize }}</span>
        </div>
      </div>
    </div>

    <!-- Roster -->
    <ul class="space-y-2">
      <li
        v-for="g in groups" :key="g.key"
        class="flex items-center gap-3 rounded-lg border border-lg-border bg-lg-surface px-3 py-2.5"
      >
        <UnitBadge v-if="g.unit" :unit="g.unit" size="h-11 w-11" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold text-lg-text">
            <span v-if="g.qty > 1" class="text-lg-accent">{{ g.qty }}× </span>{{ g.unit?.name ?? 'Unknown unit' }}
          </p>
          <p v-if="g.upgrades.length" class="truncate text-xs text-lg-muted">{{ g.upgrades.join(', ') }}</p>
        </div>
        <span class="flex-none font-display text-sm text-lg-muted">{{ g.cost }}</span>
      </li>
    </ul>

    <!-- Actions -->
    <div class="mt-6 flex gap-2">
      <button
        class="flex-1 rounded-lg border border-lg-border px-4 py-2.5 text-sm text-lg-muted hover:text-lg-accent"
        @click="$emit('change')"
      >
        Change list
      </button>
      <button
        class="flex-1 rounded-lg border border-lg-border px-4 py-2.5 text-sm text-lg-muted hover:text-red-400"
        @click="$emit('end')"
      >
        End session
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useUnitsStore } from '../../stores/units.ts'
import { useUpgradesStore } from '../../stores/upgrades.ts'
import { useBattleForcesStore } from '../../stores/battleForces.ts'
import { usePlaySessionStore } from '../../stores/playSession.ts'
import { armyPoints, unitCost } from '../../utils/army.ts'
import { FACTION_META, factionColor, formatForCap } from '../../utils/factions.ts'
import PlayUnitRow from './PlayUnitRow.vue'
import UnitProfile from '../browse/UnitProfile.vue'
import type { Army, PlayerRole, TokenType } from '../../types/index.ts'

// Interactive roster (Phase 5). Renders one row per unit INSTANCE (each ArmyUnit.uid is its
// own table piece with its own status tokens), split into my-army / opponent tabs when both
// armies are present (a room). Token reads come from the shared game state; edits are emitted
// up to the parent (which owns the connection). Tapping a unit opens the card drawer.
const props = withDefaults(
  defineProps<{
    army: Army
    playerName: string
    selfRole?: PlayerRole
    opponentArmy?: Army | null
    opponentName?: string
    opponentRole?: PlayerRole
    endLabel?: string
  }>(),
  { selfRole: 'host', opponentArmy: null, opponentName: 'Opponent', opponentRole: 'guest', endLabel: 'End session' },
)

const emit = defineEmits<{
  (e: 'change'): void
  (e: 'end'): void
  (e: 'adjust-token', payload: { player: PlayerRole; uid: string; token: TokenType; delta: number; unitName: string }): void
  (e: 'clear-turn-tokens'): void
}>()

const unitsStore = useUnitsStore()
const upgradesStore = useUpgradesStore()
const battleForcesStore = useBattleForcesStore()
const store = usePlaySessionStore()

const tab = ref<'self' | 'opponent'>('self')
const hasOpponent = computed(() => !!props.opponentArmy)
const viewingSlug = ref<string | null>(null)

interface Side {
  army: Army
  name: string
  role: PlayerRole
}
const self = computed<Side>(() => ({ army: props.army, name: props.playerName, role: props.selfRole }))
const active = computed<Side>(() =>
  tab.value === 'opponent' && props.opponentArmy
    ? { army: props.opponentArmy, name: props.opponentName, role: props.opponentRole }
    : self.value,
)

const bf = computed(() =>
  active.value.army.battleForce ? battleForcesStore.byId.get(active.value.army.battleForce) ?? null : null,
)
const points = computed(() => armyPoints(active.value.army, unitsStore.byId, upgradesStore.byId, bf.value))
const format = computed(() => formatForCap(active.value.army.gameSize))

// One row per unit instance. Identical units get a "· N" ordinal so the two Stormtrooper
// squads (each with independent tokens) are distinguishable on the board.
const rows = computed(() => {
  const seen: Record<string, number> = {}
  const total: Record<string, number> = {}
  for (const u of active.value.army.units) total[u.unitId] = (total[u.unitId] ?? 0) + 1
  return active.value.army.units.map((au) => {
    const unit = unitsStore.byId.get(au.unitId) ?? null
    const n = (seen[au.unitId] = (seen[au.unitId] ?? 0) + 1)
    const base = unit?.name ?? 'Unknown unit'
    const label = total[au.unitId] > 1 ? `${base} · ${n}` : base
    return {
      uid: au.uid,
      unit,
      label,
      cost: unitCost(au, unitsStore.byId, upgradesStore.byId, { army: active.value.army, bf: bf.value }),
      upgrades: au.upgrades
        .map((x) => upgradesStore.byId.get(x.upgradeId)?.name)
        .filter((v): v is string => !!v),
    }
  })
})

const tokensForActive = computed(() => store.tokensFor(active.value.role))

function onAdjust(uid: string, label: string, token: TokenType, delta: number) {
  emit('adjust-token', { player: active.value.role, uid, token, delta, unitName: label })
}
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <!-- Tabs (room only — solo has just your army) -->
    <div v-if="hasOpponent" class="mb-3 flex gap-1 rounded-lg border border-lg-border bg-lg-surface p-1">
      <button
        v-for="t in (['self', 'opponent'] as const)" :key="t"
        class="flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition"
        :class="tab === t ? 'bg-lg-accent/15 text-lg-accent' : 'text-lg-muted hover:text-lg-text'"
        @click="tab = t"
      >
        {{ t === 'self' ? 'My army' : opponentName }}
      </button>
    </div>

    <!-- Army header -->
    <div class="mb-4 rounded-xl border border-lg-border bg-lg-surface p-4">
      <div class="flex items-center gap-3">
        <span class="h-10 w-1.5 flex-none rounded" :style="{ background: factionColor(active.army.faction) }" />
        <div class="min-w-0 flex-1">
          <p class="text-[11px] uppercase tracking-widest text-lg-muted">{{ active.name }}</p>
          <h1 class="truncate font-display text-xl font-bold text-lg-text">{{ active.army.name || 'Untitled army' }}</h1>
          <p class="truncate text-xs text-lg-muted">
            {{ active.army.faction ? FACTION_META[active.army.faction].name : 'No faction' }} · {{ format.name }}
          </p>
        </div>
        <div class="flex-none text-right">
          <span class="font-display text-lg font-bold text-lg-accent">{{ points }}</span>
          <span class="text-sm text-lg-muted/70">/{{ active.army.gameSize }}</span>
        </div>
      </div>
    </div>

    <!-- Clear turn tokens (aim/dodge/standby also auto-clear each round) -->
    <div class="mb-3 flex items-center justify-between gap-2">
      <p class="text-[11px] uppercase tracking-widest text-lg-muted">{{ rows.length }} units</p>
      <button
        class="rounded-md border border-lg-border px-2.5 py-1 text-xs text-lg-muted hover:text-lg-accent"
        @click="emit('clear-turn-tokens')"
      >
        Clear turn tokens
      </button>
    </div>

    <!-- Roster -->
    <ul class="space-y-2">
      <PlayUnitRow
        v-for="g in rows" :key="g.uid"
        :unit="g.unit"
        :label="g.label"
        :upgrades="g.upgrades"
        :counts="tokensForActive[g.uid] ?? {}"
        @adjust="(token, delta) => onAdjust(g.uid, g.label, token, delta)"
        @view="viewingSlug = g.unit?.slug ?? null"
      />
    </ul>

    <!-- Actions (self army only) -->
    <div class="mt-6 flex gap-2">
      <button
        class="flex-1 rounded-lg border border-lg-border px-4 py-2.5 text-sm text-lg-muted hover:text-lg-accent"
        @click="emit('change')"
      >
        Change list
      </button>
      <button
        class="flex-1 rounded-lg border border-lg-border px-4 py-2.5 text-sm text-lg-muted hover:text-red-400"
        @click="emit('end')"
      >
        {{ endLabel }}
      </button>
    </div>

    <!-- Unit card drawer (reuses Browse's profile; simplified) -->
    <UnitProfile v-if="viewingSlug" :slug="viewingSlug" simplified @close="viewingSlug = null" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import DiceColumn from './DiceColumn.vue'
import type { AttackMods, DefenseMods } from './DiceColumn.vue'
import DieFace from './DieFace.vue'
import { resolveCombat } from '../../utils/dice.ts'
import type { DieState, AttackFace, DefenseFace } from '../../utils/dice.ts'
import { useRollHistoryStore } from '../../stores/rollHistory.ts'

const atkSummary = ref<Record<string, number>>({})
const defSummary = ref<Record<string, number>>({})
const atkPool = ref<DieState[]>([])
const defPool = ref<DieState[]>([])
const atkMods = ref<AttackMods>({ surge: 'blank', aims: 0, pierce: 0 })
const defMods = ref<DefenseMods>({ surge: 'blank', cover: 0, dodge: 0 })

const result = computed(() =>
  resolveCombat(
    atkPool.value.map((d) => ({ face: d.face as AttackFace })),
    defPool.value.map((d) => ({ face: d.face as DefenseFace })),
    {
      atkSurge: atkMods.value.surge,
      defSurge: defMods.value.surge,
      cover: defMods.value.cover,
      dodge: defMods.value.dodge,
      pierce: atkMods.value.pierce,
    },
  ),
)
const wounds = computed(() => result.value.wounds)

const hasRolled = computed(() => atkPool.value.length > 0 || defPool.value.length > 0)

const history = useRollHistoryStore()
const logOpen = ref(false)

const pendingAtk = ref(false)
const pendingDef = ref(false)

function onAtkRolled() {
  pendingAtk.value = true
  maybePushEntry()
}
function onDefRolled() {
  pendingDef.value = true
  maybePushEntry()
}
function maybePushEntry() {
  if (!pendingAtk.value || !pendingDef.value) return
  setTimeout(() => {
    history.push(atkSummary.value, defSummary.value, wounds.value)
    pendingAtk.value = false
    pendingDef.value = false
  }, 600)
}

watch([atkSummary, defSummary, wounds], () => {
  history.updateCurrent(atkSummary.value, defSummary.value, wounds.value)
}, { deep: true })

function summaryLine(summary: Record<string, number>): string {
  return (
    Object.entries(summary)
      .filter(([, v]) => v > 0)
      .map(([f, v]) => `${v}× ${f}`)
      .join(', ') || '—'
  )
}
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8">
      <DiceColumn
        type="attack"
        @update:summary="atkSummary = $event"
        @update:pool="atkPool = $event"
        @update:mods="atkMods = $event as AttackMods"
        @rolled="onAtkRolled"
      />
      <DiceColumn
        type="defense"
        @update:summary="defSummary = $event"
        @update:pool="defPool = $event"
        @update:mods="defMods = $event as DefenseMods"
        @rolled="onDefRolled"
      />
    </div>

    <!-- Duel Result -->
    <div v-if="hasRolled" class="rounded-xl border border-lg-border bg-black/20 p-4">
      <p class="mb-3 text-[10px] uppercase tracking-widest text-lg-text/40">Result</p>
      <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div class="flex items-baseline gap-2">
          <span class="text-4xl font-black text-lg-accent">{{ wounds }}</span>
          <span class="text-sm text-lg-text/50">wound{{ wounds !== 1 ? 's' : '' }}</span>
        </div>
        <div class="flex items-center gap-4 text-sm text-lg-text/70">
          <span class="flex items-center gap-1.5"><DieFace type="attack" color="red" face="hit" :size="20" /> {{ result.hits }} hit{{ result.hits !== 1 ? 's' : '' }}</span>
          <span class="flex items-center gap-1.5"><DieFace type="attack" color="red" face="crit" :size="20" /> {{ result.crits }} crit{{ result.crits !== 1 ? 's' : '' }}</span>
          <span class="flex items-center gap-1.5"><DieFace type="defense" color="red" face="block" :size="20" /> {{ result.blocks }} block{{ result.blocks !== 1 ? 's' : '' }}</span>
        </div>
      </div>
    </div>

    <!-- Roll history -->
    <div v-if="history.entries.length > 0" class="rounded-xl border border-lg-border bg-black/20">
      <button class="flex w-full items-center justify-between px-3 py-2.5 text-left" @click="logOpen = !logOpen">
        <span class="text-[10px] uppercase tracking-widest text-lg-text/40">Roll History ({{ history.entries.length }})</span>
        <div class="flex items-center gap-2">
          <button class="text-[10px] text-lg-text/30 transition-colors hover:text-lg-text" @click.stop="history.clear()">Clear</button>
          <span class="text-[10px] text-lg-text/30">{{ logOpen ? '▲' : '▼' }}</span>
        </div>
      </button>

      <div v-if="logOpen" class="divide-y divide-lg-border/50 border-t border-lg-border">
        <div v-for="(entry, i) in history.entries" :key="entry.id" class="flex items-start justify-between gap-3 px-3 py-2">
          <div class="min-w-0 flex-1">
            <div class="mb-0.5 text-[10px] text-lg-text/30">Atk: {{ summaryLine(entry.atk) }}</div>
            <div class="text-[10px] text-lg-text/30">Def: {{ summaryLine(entry.def) }}</div>
          </div>
          <div class="flex flex-shrink-0 flex-col items-end gap-0.5">
            <span class="text-sm font-bold text-lg-text">{{ entry.wounds }} <span class="text-xs font-normal text-lg-text/50">wound{{ entry.wounds !== 1 ? 's' : '' }}</span></span>
            <div class="flex items-center gap-1">
              <span v-if="i === 0" class="h-1.5 w-1.5 animate-pulse rounded-full bg-lg-accent" title="Live" />
              <span class="text-[10px] text-lg-text/20">{{ entry.time }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

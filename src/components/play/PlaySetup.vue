<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useArmyStore } from '../../stores/army.ts'
import { useUnitsStore } from '../../stores/units.ts'
import { useUpgradesStore } from '../../stores/upgrades.ts'
import { useBattleForcesStore } from '../../stores/battleForces.ts'
import { armyPoints, fromCompact } from '../../utils/army.ts'
import { importFromSaved, importFromCode } from '../../utils/playSession.ts'
import { FACTION_META, factionColor, formatForCap } from '../../utils/factions.ts'
import type { Army } from '../../types/index.ts'

const emit = defineEmits<{ (e: 'import', army: Army): void }>()

const armyStore = useArmyStore()
const unitsStore = useUnitsStore()
const upgradesStore = useUpgradesStore()
const battleForcesStore = useBattleForcesStore()
const { saved } = storeToRefs(armyStore)

// Resolve each saved (compact) list into a display summary: name, faction, format
// and live points total (reusing Build's own armyPoints so numbers always agree).
const savedSummaries = computed(() =>
  saved.value.map((c, index) => {
    const army = fromCompact(c)
    const bf = army.battleForce ? battleForcesStore.byId.get(army.battleForce) ?? null : null
    return {
      index,
      army,
      name: c.n || 'Untitled army',
      faction: army.faction,
      unitCount: army.units.length,
      points: armyPoints(army, unitsStore.byId, upgradesStore.byId, bf),
      formatName: formatForCap(army.gameSize).name,
      cap: army.gameSize,
    }
  }),
)

const code = ref('')
const codeError = ref('')

function useSaved(index: number) {
  const compact = saved.value[index]
  if (compact) emit('import', importFromSaved(compact))
}

function useCode() {
  codeError.value = ''
  const army = importFromCode(code.value)
  if (!army) {
    codeError.value = "That doesn't look like a valid army link or code."
    return
  }
  emit('import', army)
}
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <div class="mb-6 text-center">
      <h1 class="font-display text-2xl font-bold uppercase tracking-wider text-lg-text">Play</h1>
      <p class="mx-auto mt-2 max-w-md text-sm text-lg-muted">
        Import an army to bring to the table. Pick one of your saved lists, or paste a share link.
      </p>
    </div>

    <!-- Saved lists -->
    <section class="mb-6">
      <h2 class="mb-2 font-display text-xs font-bold uppercase tracking-widest text-lg-muted">Your saved lists</h2>
      <div v-if="savedSummaries.length" class="space-y-2">
        <button
          v-for="s in savedSummaries" :key="s.index"
          class="flex w-full items-center gap-3 rounded-xl border border-lg-border bg-lg-surface px-4 py-3 text-left transition-colors hover:border-lg-accent/50"
          @click="useSaved(s.index)"
        >
          <span class="h-8 w-1 flex-none rounded" :style="{ background: factionColor(s.faction) }" />
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-semibold text-lg-text">{{ s.name }}</span>
            <span class="block truncate text-xs text-lg-muted">
              {{ s.faction ? FACTION_META[s.faction].name : 'No faction' }} · {{ s.unitCount }} units
            </span>
          </span>
          <span class="flex-none text-right">
            <span class="block font-display text-sm font-bold text-lg-accent">{{ s.points }}<span class="text-lg-muted/70">/{{ s.cap }}</span></span>
            <span class="block text-[11px] text-lg-muted/70">{{ s.formatName }}</span>
          </span>
        </button>
      </div>
      <p v-else class="rounded-xl border border-dashed border-lg-border bg-lg-surface px-4 py-6 text-center text-sm text-lg-muted">
        No saved lists yet. Build and save one in the
        <RouterLink to="/build" class="text-lg-accent hover:underline">Build</RouterLink> tab.
      </p>
    </section>

    <!-- Share code -->
    <section>
      <h2 class="mb-2 font-display text-xs font-bold uppercase tracking-widest text-lg-muted">Or paste a share link</h2>
      <textarea
        v-model="code"
        rows="2"
        placeholder="Paste a Build share link or code…"
        class="w-full resize-none rounded-lg border border-lg-border bg-lg-surface px-3 py-2 text-sm text-lg-text placeholder:text-lg-muted/60 focus:border-lg-accent/60 focus:outline-none"
        @input="codeError = ''"
      />
      <p v-if="codeError" class="mt-1 text-xs text-red-400">{{ codeError }}</p>
      <button
        class="mt-2 w-full rounded-lg bg-lg-accent px-4 py-2.5 text-sm font-semibold text-lg-dark disabled:opacity-40"
        :disabled="!code.trim()"
        @click="useCode"
      >
        Import from link
      </button>
    </section>
  </div>
</template>

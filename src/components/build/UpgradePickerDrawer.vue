<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Faction, Unit } from '../../types/index.ts'
import { useUpgradesStore } from '../../stores/upgrades.ts'
import { slotLabel } from '../../utils/factions.ts'

const props = defineProps<{ slot: string; faction: Faction; equippedIds: string[]; unit?: Unit }>()
const emit = defineEmits<{ pick: [upgradeId: string]; clear: []; close: [] }>()

const upgradesStore = useUpgradesStore()
const query = ref('')

const candidates = computed(() => {
  const q = query.value.trim().toLowerCase()
  return upgradesStore
    .forSlot(props.slot, props.faction, props.unit)
    .filter((u) => !q || u.name.toLowerCase().includes(q))
    .sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0) || a.name.localeCompare(b.name))
})
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[60] flex justify-end">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="emit('close')" />
      <aside class="relative flex h-full w-full max-w-md flex-col overflow-hidden border-l border-lg-border bg-lg-surface shadow-2xl">
        <div class="flex items-center justify-between border-b border-lg-border px-4 py-3">
          <h2 class="font-display text-sm font-bold uppercase tracking-widest text-lg-accent">
            {{ slotLabel(slot) }} Upgrade
          </h2>
          <button class="grid h-8 w-8 place-items-center rounded-lg text-lg-muted hover:bg-lg-text/8" @click="emit('close')">✕</button>
        </div>
        <div class="border-b border-lg-border p-3">
          <input
            v-model="query"
            type="search"
            placeholder="Search upgrades…"
            class="w-full rounded-lg border border-lg-border bg-lg-dark px-3 py-2 text-sm text-lg-text placeholder:text-lg-muted/60 focus:border-lg-accent/60 focus:outline-none"
          />
        </div>
        <div class="flex-1 overflow-y-auto p-2">
          <button
            class="mb-1 flex w-full items-center justify-between rounded-lg border border-dashed border-lg-border p-2 text-left text-sm text-lg-muted hover:border-lg-accent/40"
            @click="emit('clear')"
          >Empty slot</button>
          <button
            v-for="u in candidates" :key="u.id"
            class="flex w-full items-center justify-between gap-3 rounded-lg p-2 text-left hover:bg-lg-text/8 disabled:opacity-40"
            :disabled="u.isUnique && equippedIds.includes(u.id)"
            @click="emit('pick', u.id)"
          >
            <div class="min-w-0">
              <div class="flex items-center gap-1">
                <span v-if="u.isUnique" class="text-lg-accent text-xs">◈</span>
                <span class="truncate text-sm font-medium text-lg-text">{{ u.name }}</span>
              </div>
              <span v-if="u.keywords.length" class="block truncate text-[11px] text-lg-muted">{{ u.keywords.join(', ') }}</span>
            </div>
            <span class="flex-none font-display text-sm font-bold text-lg-accent">{{ u.cost ?? 0 }}</span>
          </button>
          <p v-if="candidates.length === 0" class="py-10 text-center text-sm text-lg-muted">No upgrades for this slot.</p>
        </div>
      </aside>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Faction, Rank } from '../../types/index.ts'
import { useUnitsStore } from '../../stores/units.ts'
import { rankName } from '../../utils/factions.ts'

const props = defineProps<{ faction: Faction; rank: Rank }>()
const emit = defineEmits<{ pick: [unitId: string]; close: [] }>()

const unitsStore = useUnitsStore()
const query = ref('')

const candidates = computed(() => {
  const q = query.value.trim().toLowerCase()
  return unitsStore.units
    .filter((u) => u.rank === props.rank && (u.faction === props.faction || u.faction === 'mercenary'))
    .filter((u) => !q || `${u.name} ${u.title}`.toLowerCase().includes(q))
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
            Add {{ rankName(rank) }}
          </h2>
          <button class="grid h-8 w-8 place-items-center rounded-lg text-lg-muted hover:bg-lg-text/8" @click="emit('close')">✕</button>
        </div>
        <div class="border-b border-lg-border p-3">
          <input
            v-model="query"
            type="search"
            :placeholder="`Search ${rankName(rank).toLowerCase()}s…`"
            class="w-full rounded-lg border border-lg-border bg-lg-dark px-3 py-2 text-sm text-lg-text placeholder:text-lg-muted/60 focus:border-lg-accent/60 focus:outline-none"
          />
        </div>
        <div class="flex-1 overflow-y-auto p-2">
          <button
            v-for="u in candidates" :key="u.id"
            class="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-lg-text/8"
            @click="emit('pick', u.id)"
          >
            <img v-if="u.cardImage" :src="u.cardImage" :alt="u.name" loading="lazy" class="h-12 w-16 flex-none rounded object-cover" />
            <div v-else class="grid h-12 w-16 flex-none place-items-center rounded bg-lg-dark text-[9px] text-lg-muted">no card</div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1">
                <span v-if="u.isUnique" class="text-lg-accent text-xs">◈</span>
                <span class="truncate text-sm font-semibold text-lg-text">{{ u.name }}</span>
              </div>
              <span v-if="u.title" class="block truncate text-[11px] italic text-lg-muted">{{ u.title }}</span>
            </div>
            <span class="flex-none font-display text-sm font-bold text-lg-accent">{{ u.cost ?? '—' }}</span>
          </button>
          <p v-if="candidates.length === 0" class="py-10 text-center text-sm text-lg-muted">No matching units.</p>
        </div>
      </aside>
    </div>
  </Teleport>
</template>

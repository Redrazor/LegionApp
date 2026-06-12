<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Faction, Unit, Upgrade } from '../../types/index.ts'
import { useUpgradesStore } from '../../stores/upgrades.ts'
import { slotLabel } from '../../utils/factions.ts'
import UpgradeThumb from './UpgradeThumb.vue'

// Contextual upgrade picker that lives in the LEFT catalogue pane (replaces the old
// side drawer): the valid upgrades for one slot of one unit, each shown as a small
// card-art thumbnail + name + what it does (keywords). Picking equips and closes;
// the ✕ closes without changing anything. BuildView only mounts this when there is at
// least one candidate, so there is no empty state to land on.
const props = defineProps<{ slot: string; faction: Faction; unit: Unit; equippedIds: string[]; filled: boolean }>()
const emit = defineEmits<{ pick: [upgradeId: string]; clear: []; close: [] }>()

const upgradesStore = useUpgradesStore()
const query = ref('')
// The upgrade whose full card is open for inspection (not equipped); null = closed.
const inspecting = ref<Upgrade | null>(null)

const candidates = computed(() => {
  const q = query.value.trim().toLowerCase()
  return upgradesStore
    .forSlot(props.slot, props.faction, props.unit)
    .filter((u) => !q || u.name.toLowerCase().includes(q) || u.keywords.some((k) => k.toLowerCase().includes(q)))
    .sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0) || a.name.localeCompare(b.name))
})
</script>

<template>
  <div class="flex h-full flex-col no-print">
    <!-- Header -->
    <div class="mb-3 flex flex-none items-center justify-between gap-2">
      <div class="min-w-0">
        <h2 class="font-display text-sm font-bold uppercase tracking-widest text-lg-accent">{{ slotLabel(slot) }} upgrade</h2>
        <p class="truncate text-[11px] text-lg-muted">for {{ unit.name }}</p>
      </div>
      <button class="grid h-8 w-8 flex-none place-items-center rounded-lg text-lg-muted hover:bg-lg-text/8 hover:text-lg-accent" aria-label="Close" @click="emit('close')">✕</button>
    </div>

    <input
      v-model="query"
      type="search"
      placeholder="Search upgrades…"
      class="mb-3 w-full flex-none rounded-lg border border-lg-border bg-lg-dark px-3 py-2 text-sm text-lg-text placeholder:text-lg-muted/60 focus:border-lg-accent/60 focus:outline-none"
    />

    <div class="flex-1 space-y-1 overflow-y-auto">
      <button
        v-if="filled"
        class="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-lg-border p-2 text-sm text-lg-muted transition-colors hover:border-faction-rebels/50 hover:text-faction-rebels"
        @click="emit('clear')"
      >Remove upgrade</button>

      <div
        v-for="u in candidates" :key="u.id"
        class="flex items-stretch gap-2.5 rounded-lg border border-lg-border/70 bg-lg-surface/40 p-1.5 transition-colors hover:border-lg-accent/40 hover:bg-lg-text/5"
        :class="{ 'opacity-40': u.isUnique && equippedIds.includes(u.id) }"
      >
        <button
          class="flex min-w-0 flex-1 items-center gap-2.5 text-left disabled:cursor-not-allowed"
          :disabled="u.isUnique && equippedIds.includes(u.id)"
          :title="`Equip ${u.name}`"
          @click="emit('pick', u.id)"
        >
          <UpgradeThumb :upgrade="u" />
          <span class="min-w-0 flex-1">
            <span class="flex items-center gap-1">
              <span v-if="u.isUnique" class="text-xs text-lg-accent" title="Unique">◈</span>
              <span class="truncate text-sm font-semibold text-lg-text">{{ u.name }}</span>
            </span>
            <span v-if="u.keywords.length" class="mt-0.5 block text-[11px] leading-snug text-lg-muted">{{ u.keywords.join(' · ') }}</span>
          </span>
          <span class="flex-none self-start font-display text-sm font-bold text-lg-accent">{{ u.cost ?? 0 }}</span>
        </button>
        <button
          v-if="u.cardImage"
          class="flex-none self-center rounded-md border border-lg-border px-2 py-1 text-sm text-lg-muted transition-colors hover:border-lg-accent/50 hover:text-lg-accent"
          :title="`Inspect ${u.name}`" aria-label="Inspect upgrade card"
          @click="inspecting = u"
        >🔍</button>
      </div>
    </div>

    <!-- Inspect lightbox: the full upgrade card, no selection -->
    <Teleport to="body">
      <div
        v-if="inspecting"
        class="fixed inset-0 z-[65] flex items-center justify-center p-4"
        @click="inspecting = null"
      >
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" />
        <img
          :src="inspecting.cardImage!" :alt="inspecting.name"
          class="relative z-10 max-h-[90vh] w-auto max-w-[92vw] rounded-xl border border-lg-border shadow-2xl"
        />
        <button class="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-lg-dark/80 text-lg-muted hover:text-lg-accent" aria-label="Close" @click="inspecting = null">✕</button>
      </div>
    </Teleport>
  </div>
</template>

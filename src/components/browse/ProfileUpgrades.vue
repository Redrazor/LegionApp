<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Faction, Upgrade } from '../../types/index.ts'
import { useUpgradesStore } from '../../stores/upgrades.ts'
import { slotLabel } from '../../utils/factions.ts'

const props = defineProps<{ upgradeBar: string[]; faction: Faction }>()

const upgradesStore = useUpgradesStore()
const enlarged = ref<Upgrade | null>(null)

onMounted(() => upgradesStore.load())

// One group per distinct slot in the unit's upgrade bar.
const groups = computed(() => {
  const slots = [...new Set(props.upgradeBar)]
  return slots
    .map((slot) => ({
      slot,
      upgrades: upgradesStore
        .forSlot(slot, props.faction)
        .slice()
        .sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0) || a.name.localeCompare(b.name)),
    }))
    .filter((g) => g.upgrades.length)
})
</script>

<template>
  <div v-if="groups.length" class="space-y-3">
    <div v-for="group in groups" :key="group.slot">
      <div class="mb-1.5 flex items-baseline gap-2">
        <h4 class="text-xs font-bold uppercase tracking-widest text-lg-muted">{{ slotLabel(group.slot) }}</h4>
        <span class="text-[11px] text-lg-muted/70">{{ group.upgrades.length }}</span>
      </div>
      <div class="flex gap-2 overflow-x-auto pb-1">
        <button
          v-for="u in group.upgrades" :key="u.id"
          class="group flex w-28 flex-none flex-col overflow-hidden rounded-lg border border-lg-border bg-lg-dark text-left transition-colors hover:border-lg-accent/50"
          @click="enlarged = u"
        >
          <div class="relative aspect-[1.4/1] w-full bg-lg-panel">
            <img v-if="u.cardImage" :src="u.cardImage" :alt="u.name" loading="lazy" class="h-full w-full object-cover" />
            <div v-else class="flex h-full items-center justify-center px-1 text-center text-[9px] text-lg-muted">{{ u.name }}</div>
            <span class="absolute right-1 top-1 rounded bg-lg-dark/90 px-1 font-display text-[10px] font-bold text-lg-accent">{{ u.cost ?? 0 }}</span>
          </div>
          <span class="line-clamp-2 px-1.5 py-1 text-[10px] leading-tight text-lg-text/85">
            <span v-if="u.isUnique" class="text-lg-accent">◈ </span>{{ u.name }}
          </span>
        </button>
      </div>
    </div>
  </div>

  <!-- Enlarge lightbox -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="enlarged"
        class="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        @click="enlarged = null"
      >
        <div class="max-w-md" @click.stop>
          <img
            v-if="enlarged.cardImage"
            :src="enlarged.cardImage"
            :alt="enlarged.name"
            class="w-full rounded-xl border border-lg-border shadow-2xl"
          />
          <div class="mt-2 flex items-center justify-between text-sm">
            <span class="font-semibold text-lg-text">
              <span v-if="enlarged.isUnique" class="text-lg-accent">◈ </span>{{ enlarged.name }}
            </span>
            <span class="font-display font-bold text-lg-accent">{{ enlarged.cost ?? 0 }} pts</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>

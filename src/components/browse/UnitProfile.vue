<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUnitsStore } from '../../stores/units.ts'
import { useKeywordsStore } from '../../stores/keywords.ts'
import { factionColor, factionName, rankName, slotLabel } from '../../utils/factions.ts'
import { imageUrl } from '../../utils/imageUrl.ts'
import UnitStatBlock from '../ui/UnitStatBlock.vue'
import KeywordPill from '../ui/KeywordPill.vue'
import WeaponsTable from '../ui/WeaponsTable.vue'
import ProfileUpgrades from './ProfileUpgrades.vue'

// Dual-mode: as Browse's `/browse/:slug` child route it reads the route param and
// closes by navigating back; given an explicit `slug` prop (e.g. the Build catalogue
// mounts it directly) it closes via the `close` emit instead. `simplified` (Build) keeps
// the keyword definitions but drops the errata history + available-upgrades list.
const props = defineProps<{ slug?: string; simplified?: boolean }>()
const emit = defineEmits<{ close: [] }>()

const route = useRoute()
const router = useRouter()
const unitsStore = useUnitsStore()
const keywordsStore = useKeywordsStore()

const slug = computed(() => props.slug ?? (route.params.slug as string))
const unit = computed(() => unitsStore.bySlug.get(slug.value))
const imgError = ref(false)

// Load both units and the keyword glossary so KeywordPill popovers work wherever this
// drawer is mounted — Browse loads the glossary in its view, Build does not.
onMounted(() => {
  unitsStore.load()
  keywordsStore.load()
})
watch(slug, () => { imgError.value = false })

function close() {
  if (props.slug != null) emit('close')
  else router.push({ path: '/browse', query: route.query })
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex justify-start">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="close" />

      <!-- Panel -->
      <Transition appear name="slide">
        <aside
          class="relative flex h-full w-full max-w-xl flex-col overflow-y-auto border-r border-lg-border bg-lg-surface shadow-2xl"
        >
          <div v-if="!unit" class="p-8 text-center text-lg-muted">Unit not found.</div>

          <template v-else>
            <!-- Header -->
            <div class="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-lg-border bg-lg-surface/95 px-5 py-4 backdrop-blur-sm">
              <div>
                <div class="flex items-center gap-2">
                  <span v-if="unit.isUnique" class="text-lg-accent" title="Unique">◈</span>
                  <h1 class="font-display text-xl font-bold text-lg-text">{{ unit.name }}</h1>
                </div>
                <p v-if="unit.title" class="text-sm italic text-lg-muted">{{ unit.title }}</p>
                <div class="mt-1.5 flex items-center gap-2 text-xs">
                  <span class="rounded px-1.5 py-0.5 font-semibold" :style="{ color: factionColor(unit.faction), background: 'color-mix(in srgb, ' + factionColor(unit.faction) + ' 18%, transparent)' }">
                    {{ factionName(unit.faction) }}
                  </span>
                  <span class="rounded bg-lg-dark px-1.5 py-0.5 text-lg-muted">{{ rankName(unit.rank) }}</span>
                  <span class="capitalize text-lg-muted">{{ unit.unitType }}</span>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <div class="text-right">
                  <div class="font-display text-2xl font-bold text-lg-accent">{{ unit.cost ?? '—' }}</div>
                  <div class="text-[10px] uppercase tracking-wide text-lg-muted">points</div>
                </div>
                <button class="grid h-8 w-8 place-items-center rounded-lg text-lg-muted hover:bg-lg-text/8 hover:text-lg-text" aria-label="Close" @click="close">✕</button>
              </div>
            </div>

            <div class="space-y-5 p-5">
              <!-- Card image -->
              <div v-if="unit.cardImage && !imgError" class="overflow-hidden rounded-xl border border-lg-border bg-lg-dark">
                <img :src="imageUrl(unit.cardImage)" :alt="`${unit.name} unit card`" class="w-full" @error="imgError = true" />
              </div>

              <!-- Native stat block -->
              <UnitStatBlock :unit="unit" />

              <!-- Weapons -->
              <div v-if="unit.weapons.length">
                <h3 class="mb-2 text-xs font-bold uppercase tracking-widest text-lg-muted">Weapons</h3>
                <WeaponsTable :weapons="unit.weapons" />
              </div>

              <!-- Upgrade slots -->
              <div v-if="unit.upgradeBar.length">
                <h3 class="mb-2 text-xs font-bold uppercase tracking-widest text-lg-muted">Upgrade Slots</h3>
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="(slot, i) in unit.upgradeBar" :key="i"
                    class="rounded-md border border-lg-border bg-lg-dark px-2 py-1 text-xs font-medium text-lg-text/85"
                  >{{ slotLabel(slot) }}</span>
                </div>
              </div>

              <!-- Keywords -->
              <div v-if="unit.keywords.length">
                <h3 class="mb-2 text-xs font-bold uppercase tracking-widest text-lg-muted">Keywords</h3>
                <div class="flex flex-wrap gap-1.5">
                  <KeywordPill v-for="k in unit.keywords" :key="k" :keyword="k" />
                </div>
              </div>

              <!-- Points history (hidden in the simplified Build view) -->
              <div v-if="!simplified && unit.history && unit.history.length">
                <h3 class="mb-2 text-xs font-bold uppercase tracking-widest text-lg-muted">Errata &amp; Points History</h3>
                <ul class="space-y-1 text-xs text-lg-muted">
                  <li v-for="(h, i) in unit.history" :key="i" class="flex gap-2">
                    <span class="text-lg-accent/70">{{ h.date }}</span>
                    <span>{{ h.description }}</span>
                  </li>
                </ul>
              </div>

              <p v-if="!unit.hasFullData" class="rounded-lg border border-lg-border bg-lg-dark/50 p-2 text-[11px] text-lg-muted">
                Full stat data for this unit isn't available yet — see the card image above for complete details.
              </p>

              <!-- Available upgrades (hidden in the simplified Build view) -->
              <div v-if="!simplified && unit.upgradeBar.length">
                <h3 class="mb-2 text-xs font-bold uppercase tracking-widest text-lg-muted">Available Upgrades</h3>
                <ProfileUpgrades :unit="unit" />
              </div>
            </div>
          </template>
        </aside>
      </Transition>
    </div>
  </Teleport>
</template>

<style scoped>
.slide-enter-active, .slide-leave-active { transition: transform 0.25s ease; }
.slide-enter-from, .slide-leave-to { transform: translateX(-100%); }
</style>

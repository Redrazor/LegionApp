<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUnitsStore } from '../../stores/units.ts'
import { factionColor, factionName, rankName, slotLabel } from '../../utils/factions.ts'
import UnitStatBlock from '../ui/UnitStatBlock.vue'
import KeywordPill from '../ui/KeywordPill.vue'
import WeaponsTable from '../ui/WeaponsTable.vue'

const route = useRoute()
const router = useRouter()
const unitsStore = useUnitsStore()

const slug = computed(() => route.params.slug as string)
const unit = computed(() => unitsStore.bySlug.get(slug.value))
const imgError = ref(false)

onMounted(() => unitsStore.load())
watch(slug, () => { imgError.value = false })

function close() {
  router.push({ path: '/browse', query: route.query })
}

const related = computed(() => {
  if (!unit.value) return []
  return unitsStore.units
    .filter((u) => u.faction === unit.value!.faction && u.rank === unit.value!.rank && u.id !== unit.value!.id)
    .slice(0, 8)
})
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
                  <span v-if="unit.isUnique" class="text-lg-gold" title="Unique">◈</span>
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
                  <div class="font-display text-2xl font-bold text-lg-gold">{{ unit.cost ?? '—' }}</div>
                  <div class="text-[10px] uppercase tracking-wide text-lg-muted">points</div>
                </div>
                <button class="grid h-8 w-8 place-items-center rounded-lg text-lg-muted hover:bg-white/8 hover:text-lg-text" aria-label="Close" @click="close">✕</button>
              </div>
            </div>

            <div class="space-y-5 p-5">
              <!-- Card scan -->
              <div v-if="unit.cardImage && !imgError" class="overflow-hidden rounded-xl border border-lg-border bg-lg-dark">
                <img :src="unit.cardImage" :alt="`${unit.name} unit card`" class="w-full" @error="imgError = true" />
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

              <!-- Points history -->
              <div v-if="unit.history && unit.history.length">
                <h3 class="mb-2 text-xs font-bold uppercase tracking-widest text-lg-muted">Errata &amp; Points History</h3>
                <ul class="space-y-1 text-xs text-lg-muted">
                  <li v-for="(h, i) in unit.history" :key="i" class="flex gap-2">
                    <span class="text-lg-gold/70">{{ h.date }}</span>
                    <span>{{ h.description }}</span>
                  </li>
                </ul>
              </div>

              <p v-if="!unit.hasFullData" class="rounded-lg border border-lg-border bg-lg-dark/50 p-2 text-[11px] text-lg-muted">
                Full stat data for this unit isn't available yet — see the card scan above for complete details.
              </p>

              <!-- Related -->
              <div v-if="related.length">
                <h3 class="mb-2 text-xs font-bold uppercase tracking-widest text-lg-muted">More {{ rankName(unit.rank) }}s</h3>
                <div class="flex gap-2 overflow-x-auto pb-1">
                  <RouterLink
                    v-for="r in related" :key="r.id"
                    :to="`/browse/${r.slug}`"
                    class="flex w-24 flex-none flex-col items-center gap-1 rounded-lg border border-lg-border bg-lg-dark p-1.5 text-center hover:border-lg-gold/50"
                  >
                    <img v-if="r.cardImage" :src="r.cardImage" :alt="r.name" loading="lazy" class="aspect-[1.41/1] w-full rounded object-cover" />
                    <span class="line-clamp-2 text-[10px] leading-tight text-lg-text/80">{{ r.name }}</span>
                  </RouterLink>
                </div>
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

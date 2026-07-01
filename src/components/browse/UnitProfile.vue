<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useHead } from '@vueuse/head'
import { useRoute, useRouter } from 'vue-router'
import { useUnitsStore } from '../../stores/units.ts'
import { useKeywordsStore } from '../../stores/keywords.ts'
import { factionColor, factionName, rankName, slotLabel } from '../../utils/factions.ts'
import { unitTypeRuleKey } from '../../utils/unitTypes.ts'
import { imageUrl } from '../../utils/imageUrl.ts'
import UnitStatBlock from '../ui/UnitStatBlock.vue'
import KeywordPill from '../ui/KeywordPill.vue'
import WeaponsTable from '../ui/WeaponsTable.vue'
import UnreleasedBadge from '../ui/UnreleasedBadge.vue'
import MissingCardImage from '../ui/MissingCardImage.vue'
import FlippableCard from '../ui/FlippableCard.vue'
import ProfileUpgrades from './ProfileUpgrades.vue'

// Dual-mode: as Browse's `/browse/:slug` child route it reads the route param and
// closes by navigating back; given an explicit `slug` prop (e.g. the Build catalogue
// mounts it directly) it closes via the `close` emit instead. `simplified` (Build) keeps
// the keyword definitions but drops the errata history + available-upgrades list.
const props = defineProps<{ slug?: string; simplified?: boolean; grantedKeywords?: string[] }>()
const emit = defineEmits<{ close: [] }>()

const route = useRoute()
const router = useRouter()
const unitsStore = useUnitsStore()
const keywordsStore = useKeywordsStore()

const slug = computed(() => props.slug ?? (route.params.slug as string))
const unit = computed(() => unitsStore.bySlug.get(slug.value))
const cpImgError = ref(false)
const showCounterpart = ref(false)

// Keywords conferred by equipped upgrades (Build), minus any the unit already has
// innately — shown in a distinct colour so they read as added, not printed.
const extraKeywords = computed(() => {
  const innate = new Set(unit.value?.keywords ?? [])
  return (props.grantedKeywords ?? []).filter((k) => !innate.has(k))
})

// The unit's subtype rules (Appendix B), shown as a distinct pill before the keywords —
// null for base/mandalorian/wookiee troopers, which have no extra unit-type rules.
const unitTypeRule = computed(() => unitTypeRuleKey(unit.value?.unitType))

// Load both units and the keyword glossary so KeywordPill popovers work wherever this
// drawer is mounted — Browse loads the glossary in its view, Build does not.
onMounted(() => {
  unitsStore.load()
  keywordsStore.load()
  document.body.style.overflow = 'hidden'
})
onBeforeUnmount(() => { document.body.style.overflow = '' })
watch(slug, () => { cpImgError.value = false; showCounterpart.value = false })

function close() {
  if (props.slug != null) emit('close')
  else router.push({ path: '/browse', query: route.query })
}

// Per-unit SEO/share head — ONLY when this is the `/browse/:slug` route page (no
// `slug` prop). When mounted inside the Build catalogue we leave the head alone.
// og:image is the unit's own card scan from the Firebase CDN (absolute URL in prod);
// falls back to the static share card if unresolved (e.g. local dev, no image).
useHead(computed(() => {
  if (props.slug != null || !unit.value) return {}
  const u = unit.value
  const resolved = u.cardImage ? imageUrl(u.cardImage) : ''
  const image = resolved.startsWith('http') ? resolved : 'https://www.legion-app.com/og-image.png'
  const desc = `${u.name}${u.title ? ` (${u.title})` : ''} — ${factionName(u.faction)} ${rankName(u.rank)}, ${u.cost ?? '?'} points. Card, stats, weapons, keywords and upgrade options on LegionApp.`
  const url = `https://www.legion-app.com/browse/${u.slug}`
  return {
    title: `${u.name}${u.title ? ` — ${u.title}` : ''} — LegionApp`,
    meta: [
      { name: 'description', content: desc },
      { property: 'og:type', content: 'article' },
      { property: 'og:title', content: `${u.name}${u.title ? ` — ${u.title}` : ''}` },
      { property: 'og:description', content: desc },
      { property: 'og:url', content: url },
      { property: 'og:image', content: image },
      { name: 'twitter:image', content: image },
    ],
    link: [{ rel: 'canonical', href: url }],
  }
}))
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex justify-start">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="close" />

      <!-- Panel -->
      <Transition appear name="slide">
        <aside
          class="relative flex h-full w-full max-w-xl flex-col overflow-y-auto overscroll-contain border-r border-lg-border bg-lg-surface shadow-2xl"
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
                <button class="grid h-11 w-11 place-items-center rounded-lg text-lg-muted hover:bg-lg-text/8 hover:text-lg-text" aria-label="Close" @click="close">✕</button>
              </div>
            </div>

            <div class="space-y-5 p-5">
              <UnreleasedBadge v-if="unit.unreleased" :note="unit.unreleased" />
              <!-- Card image (flips stats↔art when a front-art scan exists — Feature 15) -->
              <FlippableCard
                :slug="unit.slug" kind="unit"
                :image="unit.cardImage" :alt="`${unit.name} unit card`"
                :flip="unit.flip" :faction="unit.faction"
              />

              <!-- Counterpart — a second miniature that carries its own card (Counterpart
                   keyword, e.g. Iden's ID10 Seeker Droid). Deploys with this unit; shown, not
                   built. Collapsed by default: mentioned here with a toggle to reveal the card. -->
              <div v-if="unit.counterpart" class="rounded-xl border border-lg-border bg-lg-dark/40">
                <button
                  class="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                  :aria-expanded="showCounterpart"
                  @click="showCounterpart = !showCounterpart"
                >
                  <span class="flex min-w-0 items-center gap-2">
                    <img
                      v-if="unit.counterpart.portraitImage"
                      :src="imageUrl(unit.counterpart.portraitImage)" :alt="unit.counterpart.name"
                      class="h-8 w-8 flex-none rounded-full bg-lg-dark object-cover ring-1 ring-black/30"
                    />
                    <span class="truncate text-xs font-bold uppercase tracking-widest text-lg-muted">
                      Counterpart: <span class="text-lg-text">{{ unit.counterpart.name }}</span>
                    </span>
                  </span>
                  <span class="flex flex-none items-center gap-1 text-[11px] font-medium text-lg-accent">
                    {{ showCounterpart ? 'Hide' : 'Show card' }}
                    <span class="text-lg-muted transition-transform" :class="{ 'rotate-180': showCounterpart }">▾</span>
                  </span>
                </button>
                <!-- Keywords stay visible even when the card is collapsed, so what the
                     counterpart does is verifiable at a glance (glossary tooltips on tap). -->
                <div v-if="unit.counterpart.keywords?.length" class="flex flex-wrap gap-1.5 px-3 pb-3">
                  <KeywordPill v-for="k in unit.counterpart.keywords" :key="k" :keyword="k" />
                </div>
                <div v-if="showCounterpart" class="px-3 pb-3">
                  <div v-if="!cpImgError" class="overflow-hidden rounded-lg border border-lg-border bg-lg-dark">
                    <img :src="imageUrl(unit.counterpart.cardImage)" :alt="`${unit.counterpart.name} counterpart card`" class="w-full" @error="cpImgError = true" />
                  </div>
                  <MissingCardImage v-else :faction="unit.faction" />
                </div>
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

              <!-- Keywords (unit-subtype rules + innate + any granted by equipped upgrades) -->
              <div v-if="unitTypeRule || unit.keywords.length || extraKeywords.length">
                <h3 class="mb-2 text-xs font-bold uppercase tracking-widest text-lg-muted">Keywords</h3>
                <div class="flex flex-wrap gap-1.5">
                  <KeywordPill v-if="unitTypeRule" :keyword="unitTypeRule" variant="unitType" />
                  <KeywordPill v-for="k in unit.keywords" :key="k" :keyword="k" />
                  <KeywordPill v-for="k in extraKeywords" :key="`g-${k}`" :keyword="k" variant="granted" />
                </div>
                <p v-if="unitTypeRule" class="mt-1.5 text-[11px] text-lg-valid/80">
                  The green pill is this unit's subtype rules.
                </p>
                <p v-if="extraKeywords.length" class="mt-1.5 text-[11px] text-lg-holo/80">
                  Highlighted keywords are granted by equipped upgrades.
                </p>
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

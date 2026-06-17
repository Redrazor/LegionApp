<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount } from 'vue'
import { useHead } from '@vueuse/head'
import { useRoute, useRouter } from 'vue-router'
import { useCommandsStore } from '../../stores/commands.ts'
import { useUpgradesStore } from '../../stores/upgrades.ts'
import { useKeywordsStore } from '../../stores/keywords.ts'
import { factionColor, factionName, slotLabel } from '../../utils/factions.ts'
import { imageUrl } from '../../utils/imageUrl.ts'
import KeywordPill from '../ui/KeywordPill.vue'

// Card-scan lightbox drawer for the Browse Commands / Upgrades sections. Commands and
// upgrades have no stat block — just the full card image (plus pips/commander or
// slot/cost/keywords). `kind` is set statically per route registration.
const props = defineProps<{ kind: 'command' | 'upgrade' }>()

const route = useRoute()
const router = useRouter()
const commandsStore = useCommandsStore()
const upgradesStore = useUpgradesStore()
const keywordsStore = useKeywordsStore()

const slug = computed(() => route.params.slug as string)
const section = computed(() => (props.kind === 'command' ? '/browse/commands' : '/browse/upgrades'))
const command = computed(() => (props.kind === 'command' ? commandsStore.bySlug.get(slug.value) ?? null : null))
const upgrade = computed(() => (props.kind === 'upgrade' ? upgradesStore.bySlug.get(slug.value) ?? null : null))

const card = computed(() => command.value ?? upgrade.value)
const faction = computed(() => command.value?.faction ?? upgrade.value?.faction ?? null)

onMounted(() => {
  commandsStore.load()
  upgradesStore.load()
  keywordsStore.load()
  document.body.style.overflow = 'hidden'
})
onBeforeUnmount(() => { document.body.style.overflow = '' })

function close() {
  router.push({ path: section.value, query: route.query })
}

useHead(computed(() => {
  const c = card.value
  if (!c) return {}
  const label = props.kind === 'command' ? 'Command card' : 'Upgrade card'
  const resolved = c.cardImage ? imageUrl(c.cardImage) : ''
  const image = resolved.startsWith('http') ? resolved : 'https://www.legion-app.com/og-image.png'
  const url = `https://www.legion-app.com${section.value}/${c.slug}`
  const desc = `${c.name} — Star Wars: Legion ${label.toLowerCase()} on LegionApp.`
  return {
    title: `${c.name} — LegionApp`,
    meta: [
      { name: 'description', content: desc },
      { property: 'og:type', content: 'article' },
      { property: 'og:title', content: c.name },
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
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="close" />

      <Transition appear name="slide">
        <aside class="relative flex h-full w-full max-w-md flex-col overflow-y-auto overscroll-contain border-r border-lg-border bg-lg-surface shadow-2xl">
          <div v-if="!card" class="p-8 text-center text-lg-muted">Card not found.</div>

          <template v-else>
            <!-- Header -->
            <div class="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-lg-border bg-lg-surface/95 px-5 py-4 backdrop-blur-sm">
              <div>
                <h1 class="font-display text-lg font-bold text-lg-text">{{ card.name }}</h1>
                <div class="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                  <span v-if="faction" class="rounded px-1.5 py-0.5 font-semibold" :style="{ color: factionColor(faction), background: 'color-mix(in srgb, ' + factionColor(faction) + ' 18%, transparent)' }">
                    {{ factionName(faction) }}
                  </span>
                  <!-- Command meta -->
                  <template v-if="command">
                    <span class="rounded bg-lg-dark px-1.5 py-0.5 text-lg-muted">{{ command.pips }} pip{{ command.pips === 1 ? '' : 's' }}</span>
                    <span v-if="command.commander" class="text-lg-muted">{{ command.commander }}</span>
                  </template>
                  <!-- Upgrade meta -->
                  <template v-else-if="upgrade">
                    <span class="rounded bg-lg-dark px-1.5 py-0.5 text-lg-muted">{{ slotLabel(upgrade.slot) }}</span>
                    <span v-if="upgrade.isUnique" class="text-lg-accent" title="Unique">◈ Unique</span>
                  </template>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <div v-if="upgrade && upgrade.cost != null" class="text-right">
                  <div class="font-display text-2xl font-bold text-lg-accent">{{ upgrade.cost }}</div>
                  <div class="text-[10px] uppercase tracking-wide text-lg-muted">points</div>
                </div>
                <button class="grid h-11 w-11 place-items-center rounded-lg text-lg-muted hover:bg-lg-text/8 hover:text-lg-text" aria-label="Close" @click="close">✕</button>
              </div>
            </div>

            <div class="space-y-5 p-5">
              <!-- Card image -->
              <div v-if="card.cardImage" class="overflow-hidden rounded-xl border border-lg-border bg-lg-dark">
                <img :src="imageUrl(card.cardImage)" :alt="`${card.name} card`" class="w-full" />
              </div>
              <div v-else class="rounded-xl border border-lg-border bg-lg-dark p-8 text-center text-sm text-lg-muted">
                No card scan available.
              </div>

              <!-- Upgrade keywords (with glossary tooltips) -->
              <div v-if="upgrade && upgrade.keywords.length">
                <h3 class="mb-2 text-xs font-bold uppercase tracking-widest text-lg-muted">Keywords</h3>
                <div class="flex flex-wrap gap-1.5">
                  <KeywordPill v-for="k in upgrade.keywords" :key="k" :keyword="k" />
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
.slide-enter-active,
.slide-leave-active { transition: transform 0.25s ease; }
.slide-enter-from,
.slide-leave-to { transform: translateX(-100%); }
</style>

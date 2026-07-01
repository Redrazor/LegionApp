<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import type { Counterpart, Faction } from '../../types/index.ts'
import { factionColor } from '../../utils/factions.ts'
import { imageUrl } from '../../utils/imageUrl.ts'

// A small crop of a unit's Counterpart card (a second mini that carries its own card, e.g.
// Iden's ID10 Seeker Droid). Sits in front of the owner's name in the army list; clicking
// it opens the full counterpart card in a lightbox (Teleported to <body> to escape any
// drawer overflow, per the project convention). Self-contained — no build/points impact.
withDefaults(
  defineProps<{ counterpart: Counterpart; faction: Faction; size?: string; showName?: boolean }>(),
  { size: 'h-8 w-8', showName: false },
)

const open = ref(false)
const imgFailed = ref(false)

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}
function show() {
  open.value = true
  document.addEventListener('keydown', onKey)
}
function close() {
  open.value = false
  document.removeEventListener('keydown', onKey)
}
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <!-- Clickable chip: a round portrait badge of the counterpart (same treatment as a unit's
       badge) + its name. role=button + click.stop so it works inside the row's own "view"
       button without nesting real <button> elements. -->
  <span
    class="group inline-flex flex-none cursor-pointer items-center gap-1.5 rounded-full transition-colors"
    :class="showName ? 'border border-lg-border bg-lg-dark/60 py-0.5 pl-0.5 pr-2.5 hover:border-lg-accent/50' : ''"
    role="button"
    tabindex="0"
    :aria-label="`Counterpart: ${counterpart.name} — view card`"
    :title="`Counterpart: ${counterpart.name}`"
    @click.stop="show"
    @keydown.enter.stop.prevent="show"
    @keydown.space.stop.prevent="show"
  >
    <span
      class="relative flex-none rounded-full p-[2px]"
      :style="{ background: `linear-gradient(145deg, ${factionColor(faction)}, transparent 70%)` }"
    >
      <img
        v-if="counterpart.portraitImage && !imgFailed"
        :src="imageUrl(counterpart.portraitImage)" :alt="counterpart.name" loading="lazy"
        class="aspect-square h-full w-full rounded-full bg-lg-dark object-cover ring-1 ring-black/30"
        :class="size"
        @error="imgFailed = true"
      />
      <span
        v-else
        class="grid aspect-square place-items-center rounded-full bg-lg-dark ring-1 ring-black/30"
        :class="size"
        role="img" :aria-label="counterpart.name"
      >
        <svg class="h-1/2 w-1/2 text-lg-muted/60" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.42 0-8 2.69-8 6v2h16v-2c0-3.31-3.58-6-8-6Z" />
        </svg>
      </span>
    </span>
    <span v-if="showName" class="min-w-0 leading-tight">
      <span class="block text-[9px] font-bold uppercase tracking-wide text-lg-muted">Counterpart</span>
      <span class="block truncate text-[11px] font-medium text-lg-text group-hover:text-lg-accent">{{ counterpart.name }}</span>
    </span>
  </span>

  <Teleport to="body">
    <Transition appear name="fade">
      <div v-if="open" class="fixed inset-0 z-[60] flex items-center justify-center p-4" @click="close">
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        <div class="relative max-h-full w-full max-w-lg overflow-y-auto overscroll-contain" @click.stop>
          <div class="mb-2 flex items-center justify-between gap-3">
            <h2 class="font-display text-sm font-bold text-lg-text">Counterpart: {{ counterpart.name }}</h2>
            <button class="grid h-10 w-10 place-items-center rounded-lg text-lg-muted hover:bg-lg-text/10 hover:text-lg-text" aria-label="Close" @click="close">✕</button>
          </div>
          <div v-if="!imgFailed" class="overflow-hidden rounded-xl border border-lg-border bg-lg-dark">
            <img :src="imageUrl(counterpart.cardImage)" :alt="`${counterpart.name} counterpart card`" class="w-full" @error="imgFailed = true" />
          </div>
          <p v-else class="rounded-xl border border-lg-border bg-lg-dark p-6 text-center text-sm text-lg-muted">Card image unavailable.</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { CardFlipSide, Faction } from '../../types/index.ts'
import { imageUrl } from '../../utils/imageUrl.ts'
import { isFlipped, setFlipped } from '../../utils/cardFlip.ts'
import MissingCardImage from './MissingCardImage.vue'

// Feature 15 — a card image that can flip to its other printed side. Units flip stats↔art;
// Reconfigure upgrades flip between two configs. The Flip button only appears when a `flip` side
// exists; the shown side persists per card (localStorage, keyed by kind+slug) so it survives reload
// and carries across the Browse/Build inspect views. `flipped` is exposed via v-model so a parent can
// swap side-specific content (e.g. an upgrade's keywords) to match.
const props = defineProps<{
  slug: string
  kind: 'unit' | 'upgrade'
  image: string | null // the printed/stats side (what shows by default)
  alt: string
  flip?: CardFlipSide | null
  faction?: Faction | null // for the missing-image fallback
  portrait?: boolean // fallback aspect (see MissingCardImage)
}>()
const flipped = defineModel<boolean>('flipped', { default: false })

const imgError = ref(false)

// Restore the persisted side on mount and whenever the card changes; a flip side that has since
// disappeared (e.g. data edit) falls back to the printed side.
function restore() {
  imgError.value = false
  flipped.value = !!props.flip && isFlipped(props.kind, props.slug)
}
onMounted(restore)
watch(() => props.slug, restore)

const shownImage = computed(() => (flipped.value && props.flip ? props.flip.image : props.image))

function toggle() {
  if (!props.flip) return
  // Capture the next value up front: when a parent binds v-model:flipped, re-reading flipped.value
  // right after assignment can return the stale value, which would persist the wrong side.
  const next = !flipped.value
  flipped.value = next
  setFlipped(props.kind, props.slug, next)
}
</script>

<template>
  <div>
    <!-- Flip control sits ABOVE the card so it never covers printed info (e.g. the points cost in
         the card's top-right corner). Only shown when a flip side exists. -->
    <div v-if="flip && !imgError" class="mb-2 flex justify-end">
      <button
        type="button"
        class="flex items-center gap-1.5 rounded-full border border-lg-border bg-lg-dark px-3 py-1.5 text-xs font-semibold text-lg-text/85 transition hover:border-lg-accent/60 hover:text-lg-text"
        :aria-pressed="flipped"
        :title="flipped ? 'Show the front of this card' : `Flip to ${flip.label}`"
        @click="toggle"
      >
        <span aria-hidden="true">⇄</span>
        <span>{{ flipped ? 'Back' : flip.label }}</span>
      </button>
    </div>

    <div v-if="shownImage && !imgError" class="overflow-hidden rounded-xl border border-lg-border bg-lg-dark">
      <img :src="imageUrl(shownImage)" :alt="alt" class="w-full" @error="imgError = true" />
    </div>
    <MissingCardImage v-else :faction="faction ?? null" :portrait="portrait" />
  </div>
</template>

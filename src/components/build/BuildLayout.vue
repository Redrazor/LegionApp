<script setup lang="ts">
import { computed, ref } from 'vue'
import { useBreakpoint } from '../../composables/useBreakpoint.ts'

// Responsive shell for the Build "Roster Canvas". One component tree that morphs
// across breakpoints (not two layouts):
//  • desktop/tablet — two panes side-by-side (catalogue | army) + pinned footer.
//  • mobile         — a segmented [Catalogue] [My Army] toggle sharing one footer.
// Regions are slots so each Epic-B/C cycle fills them in: `header`, `catalogue`,
// `army`, `footer`.
const { isMobile } = useBreakpoint()

type Pane = 'catalogue' | 'army'
// `forcePane` overrides the user's toggle (e.g. upgrade-picking forces the catalogue
// pane); when null the segmented toggle drives `mobilePane`.
const props = defineProps<{ forcePane?: Pane | null }>()
const mobilePane = ref<Pane>('army')
const activePane = computed(() => props.forcePane ?? mobilePane.value)
</script>

<template>
  <div class="pb-24">
    <div v-if="$slots.header" class="no-print">
      <slot name="header" />
    </div>

    <!-- Mobile: segmented pane switcher (hidden while a pane is force-shown, e.g.
         the contextual upgrade picker — it has its own close control). -->
    <div
      v-if="isMobile && !forcePane"
      class="sticky top-[57px] z-20 -mx-4 mb-4 grid grid-cols-2 gap-1 border-b border-lg-border bg-lg-bg/95 px-4 py-2 backdrop-blur-sm no-print"
    >
      <button
        v-for="pane in (['catalogue', 'army'] as Pane[])" :key="pane"
        class="rounded-lg px-3 py-2 text-sm font-semibold uppercase tracking-wide transition-colors"
        :class="mobilePane === pane ? 'bg-lg-accent/20 text-lg-accent' : 'bg-lg-surface text-lg-muted'"
        @click="mobilePane = pane"
      >{{ pane === 'catalogue' ? 'Catalogue' : 'My Army' }}</button>
    </div>

    <!-- Panes -->
    <div :class="isMobile ? '' : 'grid gap-5 lg:grid-cols-[minmax(0,46fr)_minmax(0,54fr)] md:grid-cols-2'">
      <section v-show="!isMobile || activePane === 'catalogue'" class="min-w-0">
        <slot name="catalogue" />
      </section>
      <section v-show="!isMobile || activePane === 'army'" class="min-w-0">
        <slot name="army" />
      </section>
    </div>

    <!-- Pinned footer region (real rank-tracker footer arrives in B2) -->
    <div
      v-if="$slots.footer"
      class="fixed inset-x-0 bottom-0 z-30 border-t border-lg-border bg-lg-bg/95 px-4 py-2.5 backdrop-blur-sm [padding-bottom:calc(0.625rem+env(safe-area-inset-bottom))] no-print"
    >
      <div class="mx-auto max-w-screen-xl">
        <slot name="footer" />
      </div>
    </div>

    <!-- Overlays / drawers (unit & upgrade pickers) -->
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useBreakpoint } from '../../composables/useBreakpoint.ts'

// Responsive shell for the Build "Roster Canvas". One component tree that morphs
// across breakpoints (not two layouts):
//  • desktop/tablet — two panes side-by-side (catalogue | army) + pinned footer,
//    with a [Roster] [Command Hand] view toggle when a `command` slot is provided.
//  • mobile         — a segmented [Catalogue] [Army] (+ [Command]) toggle, also
//    swipeable left/right between panes.
// Regions are slots so each Epic cycle fills them in: `header`, `catalogue`, `army`,
// `command`, `footer`.
const { isMobile } = useBreakpoint()

type Pane = 'catalogue' | 'army' | 'command' | 'battle' | 'doctrines'
type DesktopView = 'roster' | 'command' | 'battle' | 'doctrines'
// `forcePane` overrides the user's toggle (e.g. upgrade-picking forces the catalogue
// pane); when null the segmented toggle drives `mobilePane`. `hasCommand`/`hasBattleDeck`/
// `hasDoctrines` enable the command-hand, battle-deck and doctrine tabs/views.
const props = defineProps<{ forcePane?: Pane | null; hasCommand?: boolean; hasBattleDeck?: boolean; hasDoctrines?: boolean }>()
// Catalogue is the default pane — a fresh list starts empty, so you want to add units.
const mobilePane = ref<Pane>('catalogue')
const activePane = computed(() => props.forcePane ?? mobilePane.value)

// Swipe left/right to move between the mobile panes.
let swipeX = 0
let swipeY = 0
function onSwipeStart(e: TouchEvent) {
  swipeX = e.changedTouches[0].clientX
  swipeY = e.changedTouches[0].clientY
}
function onSwipeEnd(e: TouchEvent) {
  if (props.forcePane) return
  const dx = e.changedTouches[0].clientX - swipeX
  const dy = e.changedTouches[0].clientY - swipeY
  // Require a deliberate, mostly-horizontal swipe so it never fights vertical scroll.
  if (Math.abs(dx) < 60 || Math.abs(dx) <= Math.abs(dy)) return
  const tabs = mobileTabs.value
  const i = tabs.indexOf(mobilePane.value)
  if (i === -1) return
  if (dx < 0 && i < tabs.length - 1) mobilePane.value = tabs[i + 1]
  else if (dx > 0 && i > 0) mobilePane.value = tabs[i - 1]
}
// Desktop primary view: roster (catalogue|army grid), or a full-width card view.
const desktopView = ref<DesktopView>('roster')
const mobileTabs = computed<Pane[]>(() => [
  'catalogue', 'army',
  ...(props.hasCommand ? ['command' as Pane] : []),
  ...(props.hasBattleDeck ? ['battle' as Pane] : []),
  ...(props.hasDoctrines ? ['doctrines' as Pane] : []),
])
const desktopViews = computed<DesktopView[]>(() => [
  'roster',
  ...(props.hasCommand ? ['command' as DesktopView] : []),
  ...(props.hasBattleDeck ? ['battle' as DesktopView] : []),
  ...(props.hasDoctrines ? ['doctrines' as DesktopView] : []),
])
const paneLabel = (p: Pane) =>
  p === 'catalogue' ? 'Catalogue' : p === 'army' ? 'Army' : p === 'command' ? 'Command' : p === 'battle' ? 'Deck' : 'Doctrines'
const viewLabel = (v: DesktopView) =>
  v === 'roster' ? 'Roster' : v === 'command' ? 'Command Hand' : v === 'battle' ? 'Battle Deck' : 'Doctrines'
</script>

<template>
  <div class="pb-40">
    <div v-if="$slots.header" class="no-print">
      <slot name="header" />
    </div>

    <!-- Mobile: segmented pane switcher (hidden while a pane is force-shown, e.g.
         the contextual upgrade picker — it has its own close control). -->
    <div
      v-if="isMobile && !forcePane"
      class="sticky top-[52px] z-20 -mx-4 mb-4 grid gap-1 border-b border-lg-border bg-lg-bg/95 px-4 py-2 backdrop-blur-sm no-print"
      :style="{ gridTemplateColumns: `repeat(${mobileTabs.length}, minmax(0, 1fr))` }"
    >
      <button
        v-for="pane in mobileTabs" :key="pane"
        class="truncate rounded-lg px-0.5 py-2.5 text-center text-[11px] font-semibold uppercase whitespace-nowrap transition-colors"
        :class="mobilePane === pane ? 'bg-lg-accent/20 text-lg-accent' : 'bg-lg-surface text-lg-muted'"
        @click="mobilePane = pane"
      >{{ paneLabel(pane) }}</button>
    </div>

    <!-- Desktop/tablet: [Roster] [Command Hand] [Battle Deck] view toggle. -->
    <div v-if="!isMobile && desktopViews.length > 1" class="mb-4 inline-flex gap-1 rounded-lg border border-lg-border bg-lg-surface p-1 no-print">
      <button
        v-for="v in desktopViews" :key="v"
        class="rounded-md px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors"
        :class="desktopView === v ? 'bg-lg-accent/20 text-lg-accent' : 'text-lg-muted hover:text-lg-text'"
        @click="desktopView = v"
      >{{ viewLabel(v) }}</button>
    </div>

    <!-- Pane content. On mobile a horizontal swipe moves between the segments. -->
    <div @touchstart.passive="onSwipeStart" @touchend.passive="onSwipeEnd">
      <!-- Command hand — full-width on desktop (when its view is active), or the active
           mobile segment. -->
      <div v-if="hasCommand" v-show="isMobile ? activePane === 'command' : desktopView === 'command'" class="min-w-0">
        <slot name="command" />
      </div>

      <!-- Battle deck — same morphing rule. -->
      <div v-if="hasBattleDeck" v-show="isMobile ? activePane === 'battle' : desktopView === 'battle'" class="min-w-0">
        <slot name="battle" />
      </div>

      <!-- Doctrines — same morphing rule. -->
      <div v-if="hasDoctrines" v-show="isMobile ? activePane === 'doctrines' : desktopView === 'doctrines'" class="min-w-0">
        <slot name="doctrines" />
      </div>

      <!-- Roster panes. On tablet/desktop the catalogue pane is sticky with its own
           internal scroll, so the upgrade picker stays in view while you scroll the army
           list (no scrolling back to the top to equip a unit near the bottom). -->
      <div
        v-show="isMobile ? (activePane === 'catalogue' || activePane === 'army') : desktopView === 'roster'"
        :class="isMobile ? '' : 'grid gap-5 lg:grid-cols-[minmax(0,46fr)_minmax(0,54fr)] md:grid-cols-2'"
      >
        <section
          v-show="!isMobile || activePane === 'catalogue'"
          class="min-w-0 md:sticky md:top-[68px] md:self-start md:h-[calc(100vh-150px)]"
        >
          <slot name="catalogue" />
        </section>
        <section v-show="!isMobile || activePane === 'army'" class="min-w-0">
          <slot name="army" />
        </section>
      </div>
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

<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import { useKeywordsStore } from '../../stores/keywords.ts'

const props = defineProps<{ keyword: string; variant?: 'innate' | 'granted' | 'unitType' }>()
const keywordsStore = useKeywordsStore()

// Pills read in distinct colours by variant: `granted` (conferred by an equipped upgrade)
// in the holo accent, `unitType` (the unit's subtype rules) in green, and innate keywords
// in the neutral default.
const PILL_CLASS: Record<NonNullable<typeof props.variant>, string> = {
  granted: 'bg-lg-holo/10 border-lg-holo/40 text-lg-holo hover:border-lg-holo',
  unitType: 'bg-lg-valid/10 border-lg-valid/40 text-lg-valid hover:border-lg-valid',
  innate: 'bg-lg-panel border-lg-border text-lg-text/85 hover:border-lg-accent/50',
}
const INFO_CLASS: Record<NonNullable<typeof props.variant>, string> = {
  granted: 'text-lg-holo/70',
  unitType: 'text-lg-valid/70',
  innate: 'text-lg-accent/70',
}
const pillClass = PILL_CLASS[props.variant ?? 'innate']
const infoClass = INFO_CLASS[props.variant ?? 'innate']

const open = ref(false)
const btn = ref<HTMLElement | null>(null)
const pos = ref<{ top: number | null; bottom: number | null; left: number }>({ top: 0, bottom: null, left: 0 })
const POPOVER_W = 256

const def = () => keywordsStore.define(props.keyword)

// Inside the UnitProfile / lightbox drawer the scroll happens on the scrollable
// `<aside>`, not `window`, so a window-only scroll listener would let the popover
// orphan. Track the nearest scrollable ancestor and close on its scroll too.
let scrollParent: HTMLElement | null = null

function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null
  while (node) {
    const oy = getComputedStyle(node).overflowY
    if (oy === 'auto' || oy === 'scroll') return node
    node = node.parentElement
  }
  return null
}

function place() {
  const el = btn.value
  if (!el) return
  const r = el.getBoundingClientRect()
  // Clamp horizontally to the viewport (8px gutter).
  const left = Math.min(Math.max(8, r.left), window.innerWidth - POPOVER_W - 8)
  // Flip the popover above the keyword when there isn't enough room below it (e.g.
  // keywords near the bottom of the page). Bottom-anchoring avoids needing the
  // popover's variable height.
  const spaceBelow = window.innerHeight - r.bottom
  const flipUp = spaceBelow < 200 && r.top > spaceBelow
  pos.value = flipUp
    ? { top: null, bottom: window.innerHeight - r.top + 6, left }
    : { top: r.bottom + 6, bottom: null, left }
}

function toggle() {
  if (!def()) return
  open.value = !open.value
  if (open.value) {
    place()
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    document.addEventListener('click', onDocClick, true)
    scrollParent = findScrollParent(btn.value)
    scrollParent?.addEventListener('scroll', close)
  } else {
    teardown()
  }
}

function close() {
  open.value = false
  teardown()
}

function onDocClick(e: MouseEvent) {
  if (btn.value && !btn.value.contains(e.target as Node)) close()
}

function teardown() {
  window.removeEventListener('scroll', close, true)
  window.removeEventListener('resize', close)
  document.removeEventListener('click', onDocClick, true)
  scrollParent?.removeEventListener('scroll', close)
  scrollParent = null
}

onBeforeUnmount(teardown)
</script>

<template>
  <span class="inline-block">
    <button
      ref="btn"
      type="button"
      class="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium transition-colors"
      :class="[pillClass, def() ? 'cursor-help' : 'cursor-default']"
      @click.stop="toggle"
    >
      {{ keyword }}
      <span v-if="def()" class="text-[10px]" :class="infoClass">ⓘ</span>
    </button>

    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="open && def()"
          class="fixed z-[70] max-h-[60vh] w-64 overflow-y-auto rounded-lg border border-lg-border bg-lg-dark p-3 text-xs leading-relaxed text-lg-text/90 shadow-2xl"
          :style="{ top: pos.top != null ? pos.top + 'px' : undefined, bottom: pos.bottom != null ? pos.bottom + 'px' : undefined, left: pos.left + 'px' }"
          @click.stop
        >
          <div class="mb-1 font-semibold text-lg-accent">{{ keyword }}</div>
          {{ def() }}
        </div>
      </Transition>
    </Teleport>
  </span>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.12s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>

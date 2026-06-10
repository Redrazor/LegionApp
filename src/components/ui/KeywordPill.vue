<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import { useKeywordsStore } from '../../stores/keywords.ts'

const props = defineProps<{ keyword: string }>()
const keywordsStore = useKeywordsStore()

const open = ref(false)
const btn = ref<HTMLElement | null>(null)
const pos = ref({ top: 0, left: 0 })
const POPOVER_W = 256

const def = () => keywordsStore.define(props.keyword)

function place() {
  const el = btn.value
  if (!el) return
  const r = el.getBoundingClientRect()
  // Clamp horizontally to the viewport (8px gutter).
  const left = Math.min(Math.max(8, r.left), window.innerWidth - POPOVER_W - 8)
  pos.value = { top: r.bottom + 6, left }
}

function toggle() {
  if (!def()) return
  open.value = !open.value
  if (open.value) {
    place()
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    document.addEventListener('click', onDocClick, true)
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
}

onBeforeUnmount(teardown)
</script>

<template>
  <span class="inline-block">
    <button
      ref="btn"
      type="button"
      class="inline-flex items-center gap-1 rounded bg-lg-panel border border-lg-border px-2 py-0.5 text-xs font-medium text-lg-text/85 hover:border-lg-accent/50 transition-colors"
      :class="def() ? 'cursor-help' : 'cursor-default'"
      @click.stop="toggle"
    >
      {{ keyword }}
      <span v-if="def()" class="text-lg-accent/70 text-[10px]">ⓘ</span>
    </button>

    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="open && def()"
          class="fixed z-[70] w-64 rounded-lg border border-lg-border bg-lg-dark p-3 text-xs leading-relaxed text-lg-text/90 shadow-2xl"
          :style="{ top: pos.top + 'px', left: pos.left + 'px' }"
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

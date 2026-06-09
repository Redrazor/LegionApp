<script setup lang="ts">
import { ref } from 'vue'
import { useKeywordsStore } from '../../stores/keywords.ts'

const props = defineProps<{ keyword: string }>()
const keywordsStore = useKeywordsStore()
const open = ref(false)

const def = () => keywordsStore.define(props.keyword)
</script>

<template>
  <span class="relative inline-block">
    <button
      type="button"
      class="inline-flex items-center gap-1 rounded bg-lg-panel border border-lg-border px-2 py-0.5 text-xs font-medium text-lg-text/85 hover:border-lg-accent/50 transition-colors"
      :class="def() ? 'cursor-help' : 'cursor-default'"
      @click.stop="def() && (open = !open)"
    >
      {{ keyword }}
      <span v-if="def()" class="text-lg-accent/70 text-[10px]">ⓘ</span>
    </button>
    <Transition name="fade">
      <div
        v-if="open && def()"
        class="absolute left-0 top-full z-30 mt-1 w-64 rounded-lg border border-lg-border bg-lg-dark p-3 text-xs leading-relaxed text-lg-text/90 shadow-xl"
        @click.stop
      >
        <div class="mb-1 font-semibold text-lg-accent">{{ keyword }}</div>
        {{ def() }}
      </div>
    </Transition>
  </span>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.12s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>

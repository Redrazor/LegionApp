<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { usePlaySessionStore } from '../../stores/playSession.ts'
import PlayerMark from './PlayerMark.vue'
import type { PlayerRole } from '../../types/index.ts'

const store = usePlaySessionStore()
const { gameLog, bluePlayer } = storeToRefs(store)

// Newest first. Actor entries (VP) carry that player's mark; system/phase/round are neutral.
const entries = computed(() => [...gameLog.value].reverse())
const markFor = (actor: PlayerRole) => (actor === bluePlayer.value ? 'blue' : 'red')

function time(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
</script>

<template>
  <section class="mb-4 rounded-xl border border-lg-border bg-lg-surface p-4">
    <h2 class="mb-3 font-display text-sm font-bold uppercase tracking-widest text-lg-text">Change log</h2>

    <p v-if="!entries.length" class="rounded-lg border border-dashed border-lg-border px-3 py-4 text-center text-xs text-lg-muted">
      No events yet — advance the phase or score a point to start the log.
    </p>

    <ol v-else class="max-h-72 space-y-1 overflow-y-auto pr-1">
      <li
        v-for="e in entries" :key="e.seq"
        class="flex items-center gap-2 rounded-md bg-lg-dark/40 px-2 py-1.5 text-[13px]"
      >
        <time class="w-14 flex-none font-mono text-[11px] tabular-nums text-lg-muted">{{ time(e.at) }}</time>
        <PlayerMark v-if="e.actor" :variant="markFor(e.actor)" :size="18" />
        <span v-else class="h-2.5 w-2.5 flex-none rounded-full" :class="e.kind === 'vp' ? 'bg-lg-muted' : 'bg-lg-accent/70'" aria-hidden="true" />
        <span class="min-w-0 flex-1 text-lg-text/90">
          <span v-if="e.actor" class="font-semibold" :class="markFor(e.actor) === 'blue' ? 'text-sky-300' : 'text-red-300'">
            {{ markFor(e.actor) === 'blue' ? 'Blue' : 'Red' }}
          </span>
          {{ e.text }}
        </span>
      </li>
    </ol>
  </section>
</template>

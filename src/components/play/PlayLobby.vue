<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { usePlaySessionStore } from '../../stores/playSession.ts'
import ArmyPicker from './ArmyPicker.vue'
import PlayRoster from './PlayRoster.vue'
import type { Army } from '../../types/index.ts'

defineEmits<{ (e: 'import', army: Army): void; (e: 'change'): void; (e: 'end'): void }>()

const store = usePlaySessionStore()
const { session, roomCode, opponentOnline, selfArmy } = storeToRefs(store)

const copied = ref(false)
async function copyCode() {
  if (!roomCode.value) return
  try {
    await navigator.clipboard.writeText(roomCode.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    // clipboard blocked — the code is shown in full anyway
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <!-- Room code -->
    <div class="mb-4 flex items-center justify-between gap-3 rounded-xl border border-lg-accent/30 bg-lg-accent/5 px-4 py-3">
      <div>
        <p class="text-[11px] uppercase tracking-widest text-lg-muted">Room code — share to invite</p>
        <p class="font-display text-2xl font-bold tracking-[0.4em] text-lg-accent">{{ roomCode }}</p>
      </div>
      <button class="rounded-lg border border-lg-border px-3 py-2 text-xs text-lg-muted hover:text-lg-accent" @click="copyCode">
        {{ copied ? 'Copied!' : 'Copy' }}
      </button>
    </div>

    <!-- Opponent status -->
    <div class="mb-4 flex items-center gap-3 rounded-xl border border-lg-border bg-lg-surface px-4 py-3">
      <span class="h-2.5 w-2.5 flex-none rounded-full" :class="opponentOnline ? 'bg-emerald-400' : 'bg-lg-muted/40'" />
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-semibold text-lg-text">{{ session?.opponent.name ?? 'Opponent' }}</p>
        <p class="text-xs text-lg-muted">
          {{ opponentOnline ? 'Online' : 'Waiting to connect…' }} ·
          {{ session?.opponent.army ? 'army ready' : 'no army yet' }}
        </p>
      </div>
      <span v-if="session?.opponent.army" class="flex-none text-emerald-400">✓</span>
    </div>

    <!-- Self: import, or show the loaded roster -->
    <div v-if="selfArmy">
      <PlayRoster
        :army="selfArmy"
        :player-name="session?.self.name ?? 'You'"
        end-label="End game"
        @change="$emit('change')"
        @end="$emit('end')"
      />
    </div>
    <div v-else>
      <p class="mb-3 text-center text-sm text-lg-muted">Import your army to bring to this game.</p>
      <ArmyPicker @import="$emit('import', $event)" />
      <button
        class="mt-4 w-full rounded-lg border border-lg-border px-4 py-2.5 text-sm text-lg-muted hover:text-red-400"
        @click="$emit('end')"
      >
        Leave room
      </button>
    </div>
  </div>
</template>

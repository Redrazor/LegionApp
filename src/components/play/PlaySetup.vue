<script setup lang="ts">
import { ref } from 'vue'
import ArmyPicker from './ArmyPicker.vue'
import { randomPlayerName } from '../../utils/playerName.ts'
import type { Army } from '../../types/index.ts'

defineProps<{ error?: string; busy?: boolean }>()
const emit = defineEmits<{
  (e: 'import', army: Army): void
  (e: 'host', name: string): void
  (e: 'join', payload: { code: string; name: string }): void
}>()

type Tab = 'solo' | 'host' | 'join'
const tab = ref<Tab>('solo')
const name = ref(randomPlayerName())
const code = ref('')

const tabs: { id: Tab; label: string }[] = [
  { id: 'solo', label: 'Play solo' },
  { id: 'host', label: 'Create room' },
  { id: 'join', label: 'Join room' },
]
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <div class="mb-5 text-center">
      <h1 class="font-display text-2xl font-bold uppercase tracking-wider text-lg-text">Play</h1>
      <p class="mx-auto mt-2 max-w-md text-sm text-lg-muted">
        Track a game on this device, or create/join a room to play with an opponent in real time.
      </p>
    </div>

    <!-- Mode switch -->
    <div class="mb-5 grid grid-cols-3 gap-1 rounded-xl border border-lg-border bg-lg-surface p-1">
      <button
        v-for="t in tabs" :key="t.id"
        class="rounded-lg px-2 py-2 text-xs font-semibold uppercase tracking-wide transition-colors"
        :class="tab === t.id ? 'bg-lg-accent text-lg-dark' : 'text-lg-muted hover:text-lg-text'"
        @click="tab = t.id"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- Solo: import straight into a local session -->
    <ArmyPicker v-if="tab === 'solo'" @import="emit('import', $event)" />

    <!-- Host / Join: name (+ code) then enter the room lobby -->
    <div v-else class="space-y-4">
      <div>
        <label class="mb-1 block font-display text-xs font-bold uppercase tracking-widest text-lg-muted">Your name</label>
        <input
          v-model="name"
          type="text"
          maxlength="32"
          class="w-full rounded-lg border border-lg-border bg-lg-surface px-3 py-2.5 text-sm text-lg-text focus:border-lg-accent/60 focus:outline-none"
        />
      </div>

      <div v-if="tab === 'join'">
        <label class="mb-1 block font-display text-xs font-bold uppercase tracking-widest text-lg-muted">Room code</label>
        <input
          v-model="code"
          type="text"
          maxlength="4"
          placeholder="ABCD"
          class="w-full rounded-lg border border-lg-border bg-lg-surface px-3 py-2.5 text-center font-display text-lg font-bold uppercase tracking-[0.4em] text-lg-text placeholder:text-lg-muted/40 focus:border-lg-accent/60 focus:outline-none"
          @input="code = code.toUpperCase()"
        />
      </div>

      <p v-if="error" class="text-center text-xs text-red-400">{{ error }}</p>

      <button
        v-if="tab === 'host'"
        class="w-full rounded-lg bg-lg-accent px-4 py-3 text-sm font-semibold text-lg-dark disabled:opacity-40"
        :disabled="busy || !name.trim()"
        @click="emit('host', name.trim())"
      >
        {{ busy ? 'Creating…' : 'Create room' }}
      </button>
      <button
        v-else
        class="w-full rounded-lg bg-lg-accent px-4 py-3 text-sm font-semibold text-lg-dark disabled:opacity-40"
        :disabled="busy || !name.trim() || code.trim().length !== 4"
        @click="emit('join', { code: code.trim(), name: name.trim() })"
      >
        {{ busy ? 'Joining…' : 'Join room' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { usePlaySessionStore } from '../../stores/playSession.ts'
import ArmyPicker from './ArmyPicker.vue'
import PlayRoster from './PlayRoster.vue'
import PlayMission from './PlayMission.vue'
import PlayTracker from './PlayTracker.vue'
import PlayLog from './PlayLog.vue'
import type { Army, MissionModifyAction, PlayerRole, TokenType } from '../../types/index.ts'

defineEmits<{
  (e: 'import', army: Army, savedIndex: number | null): void
  (e: 'change'): void
  (e: 'end'): void
  (e: 'draw-mission'): void
  (e: 'modify-mission', action: MissionModifyAction): void
  (e: 'reset-mission'): void
  (e: 'advance-phase'): void
  (e: 'set-round', round: number): void
  (e: 'set-vp', payload: { player: PlayerRole; value: number }): void
  (e: 'reset-game'): void
  (e: 'adjust-token', payload: { player: PlayerRole; uid: string; token: TokenType; delta: number; unitName: string }): void
  (e: 'clear-turn-tokens'): void
}>()

const store = usePlaySessionStore()
const { session, roomCode, opponentOnline, selfArmy, opponentArmy, effectiveRole, bothArmiesReady, missionReady } =
  storeToRefs(store)
const opponentRole = computed<PlayerRole>(() => (effectiveRole.value === 'host' ? 'guest' : 'host'))

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

    <!-- Mission setup — available once both players have imported an army -->
    <PlayMission
      v-if="bothArmiesReady"
      @draw="$emit('draw-mission')"
      @modify="$emit('modify-mission', $event)"
      @reset="$emit('reset-mission')"
    />

    <!-- Turn + VP tracker + change log — once the mission is set -->
    <template v-if="missionReady">
      <PlayTracker
        @advance="$emit('advance-phase')"
        @set-round="$emit('set-round', $event)"
        @set-vp="$emit('set-vp', $event)"
        @reset="$emit('reset-game')"
      />
      <PlayLog />
    </template>

    <!-- Self: import, or show the loaded roster -->
    <div v-if="selfArmy">
      <PlayRoster
        :army="selfArmy"
        :player-name="session?.self.name ?? 'You'"
        :self-role="effectiveRole"
        :opponent-army="opponentArmy"
        :opponent-name="session?.opponent.name ?? 'Opponent'"
        :opponent-role="opponentRole"
        end-label="End game"
        @change="$emit('change')"
        @end="$emit('end')"
        @adjust-token="$emit('adjust-token', $event)"
        @clear-turn-tokens="$emit('clear-turn-tokens')"
      />
    </div>
    <div v-else>
      <p class="mb-3 text-center text-sm text-lg-muted">Import your army to bring to this game.</p>
      <ArmyPicker @import="(army, idx) => $emit('import', army, idx)" />
      <button
        class="mt-4 w-full rounded-lg border border-lg-border px-4 py-2.5 text-sm text-lg-muted hover:text-red-400"
        @click="$emit('end')"
      >
        Leave room
      </button>
    </div>
  </div>
</template>

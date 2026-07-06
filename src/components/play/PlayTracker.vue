<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { usePlaySessionStore } from '../../stores/playSession.ts'
import { PHASE_LABEL, GAME_PHASES, MAX_ROUNDS, VP_CAP } from '../../utils/playGame.ts'
import PlayerMark from './PlayerMark.vue'
import type { GamePhase, PlayerRole } from '../../types/index.ts'

const emit = defineEmits<{
  (e: 'advance'): void
  (e: 'set-round', round: number): void
  (e: 'set-vp', payload: { player: PlayerRole; value: number }): void
  (e: 'reset'): void
}>()

const store = usePlaySessionStore()
const { session, round, phase, gameOver, bluePlayer, redPlayer, blueVp, redVp } = storeToRefs(store)

const phases = GAME_PHASES
const rounds = Array.from({ length: MAX_ROUNDS }, (_, i) => i + 1) // 1..6
const cells = Array.from({ length: VP_CAP + 1 }, (_, i) => i) // 0..12

// Rail descriptors keyed by Blue/Red, mapped to the underlying host/guest role for scoring.
const rails = computed(() => [
  { key: 'blue' as const, role: bluePlayer.value, vp: blueVp.value, name: nameFor(bluePlayer.value) },
  { key: 'red' as const, role: redPlayer.value, vp: redVp.value, name: nameFor(redPlayer.value) },
])

function nameFor(role: PlayerRole): string {
  const myRole = store.role ?? 'host' // solo has no role; treat self as host
  const mine = role === myRole
  return mine ? (session.value?.self.name ?? 'You') : (session.value?.opponent.name ?? 'Opponent')
}

const phaseLabel = (p: GamePhase) => PHASE_LABEL[p]
</script>

<template>
  <section class="mb-4 rounded-xl border border-lg-border bg-lg-surface p-4">
    <div class="mb-3 flex items-center justify-between gap-2">
      <h2 class="font-display text-sm font-bold uppercase tracking-widest text-lg-text">Turn tracker</h2>
      <span
        class="rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
        :class="gameOver ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' : 'border-lg-border text-lg-muted'"
      >
        {{ gameOver ? 'Game over' : `Round ${round} / ${MAX_ROUNDS}` }}
      </span>
    </div>

    <!-- Round strip — the movable round marker (tap to correct) -->
    <div class="mb-3">
      <p class="mb-1.5 font-display text-[10px] font-bold uppercase tracking-widest text-lg-muted">Round</p>
      <div class="flex gap-1.5" role="group" aria-label="Round">
        <button
          v-for="r in rounds" :key="r"
          class="round-cell" :class="{ here: r === round && !gameOver }"
          :aria-label="`Set round ${r}`" :aria-pressed="r === round"
          @click="emit('set-round', r)"
        >{{ r }}</button>
      </div>
    </div>

    <!-- Phase stepper -->
    <div class="mb-2 grid grid-cols-3 gap-1.5" role="group" aria-label="Round phase">
      <div
        v-for="p in phases" :key="p"
        class="rounded-lg border px-2 py-2 text-center font-display text-[11px] font-bold uppercase tracking-wide transition-colors"
        :class="phase === p && !gameOver
          ? 'border-lg-accent/60 bg-lg-accent/10 text-lg-accent'
          : 'border-lg-border bg-lg-dark/40 text-lg-muted'"
        :aria-current="phase === p ? 'step' : undefined"
      >
        {{ phaseLabel(p) }}
      </div>
    </div>
    <button
      class="mb-4 w-full rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      :class="gameOver ? 'bg-lg-dark/40 text-lg-muted' : 'bg-lg-accent text-lg-dark hover:opacity-90'"
      :disabled="gameOver"
      @click="emit('advance')"
    >
      {{ gameOver ? 'Game complete' : phase === 'end' ? 'End round ▸' : `End ${phaseLabel(phase)} ▸` }}
    </button>

    <!-- Victory-point rails -->
    <div class="space-y-3">
      <div v-for="rail in rails" :key="rail.key">
        <div class="mb-1.5 flex items-center gap-2">
          <PlayerMark :variant="rail.key" :size="24" :label="`${rail.key} player`" />
          <span class="font-display text-xs font-bold uppercase tracking-wide" :class="rail.key === 'blue' ? 'text-sky-300' : 'text-red-300'">
            {{ rail.key === 'blue' ? 'Blue' : 'Red' }}
          </span>
          <span class="min-w-0 flex-1 truncate text-xs text-lg-muted">{{ rail.name }}</span>
          <span class="font-display text-lg font-bold tabular-nums" :class="rail.key === 'blue' ? 'text-sky-300' : 'text-red-300'">
            {{ rail.vp }}<span class="text-xs text-lg-muted">/{{ VP_CAP }}</span>
          </span>
        </div>
        <div class="overflow-x-auto pb-1">
          <div class="flex gap-1" :aria-label="`${rail.key} victory points`" role="group">
            <button
              v-for="v in cells" :key="v"
              class="vp-cell" :class="[rail.key, { here: v === rail.vp, zero: v === 0 }]"
              :aria-label="`Set ${rail.key} to ${v}`"
              :aria-pressed="v === rail.vp"
              @click="emit('set-vp', { player: rail.role, value: v })"
            >{{ v }}</button>
          </div>
        </div>
      </div>
    </div>

    <button
      class="mt-4 w-full rounded-lg border border-lg-border px-4 py-2 text-sm text-lg-muted hover:text-lg-accent"
      @click="emit('reset')"
    >
      Reset tracker
    </button>
  </section>
</template>

<style scoped>
.round-cell {
  flex: 1 1 0;
  height: 38px;
  border-radius: 7px;
  border: 1px solid #000;
  font-weight: 700;
  font-size: 16px;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  color: #11151b;
  background: #e6eaf0;
  box-shadow: inset 0 -3px 5px rgba(0, 0, 0, 0.18), inset 0 2px 3px rgba(255, 255, 255, 0.7);
  transition: transform 0.08s ease, filter 0.12s ease;
}
.round-cell.here {
  color: #2a2100;
  background: linear-gradient(180deg, #ffdb45, #f2c200);
  box-shadow: inset 0 0 0 2px #7a5f00, 0 0 12px rgba(242, 194, 0, 0.5);
  transform: translateY(-1px);
}
.round-cell:focus-visible { outline: 2px solid #f2c200; outline-offset: 2px; }

.vp-cell {
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 6px;
  border: 1px solid #000;
  font-weight: 700;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: #eaf0f7;
  cursor: pointer;
  transition: filter 0.12s ease, transform 0.08s ease;
}
.vp-cell.blue { background: linear-gradient(180deg, #1f5fb0, #16467f); }
.vp-cell.red { background: linear-gradient(180deg, #9e2b25, #6f1c18); }
.vp-cell.zero { background: #2a2f36; color: #8794a2; }
.vp-cell.here { filter: brightness(1.35) saturate(1.1); transform: translateY(-1px); box-shadow: 0 0 0 2px #f2c200, 0 0 10px rgba(242, 194, 0, 0.5); }
.vp-cell:focus-visible { outline: 2px solid #f2c200; outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { .vp-cell, .round-cell { transition: none; } }
</style>

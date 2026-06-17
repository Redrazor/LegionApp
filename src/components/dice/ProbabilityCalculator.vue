<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { simulate, type SimResult, type SimInput } from '../../utils/diceProb.ts'

const atk = reactive<SimInput['atk']>({ red: 4, black: 0, white: 0, surge: 'blank', aims: 0, pierce: 0 })
const def = reactive<SimInput['def']>({ red: 0, white: 4, surge: 'blank', cover: 0, dodge: 0 })

const result = ref<SimResult | null>(null)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function runSim() {
  result.value = simulate({ atk: { ...atk }, def: { ...def } })
}

watch([atk, def], () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(runSim, 250)
}, { immediate: true, deep: true })

function pct(v: number): string {
  return (v * 100).toFixed(1) + '%'
}
function rowClass(prob: number): string {
  if (prob >= 0.5) return 'text-lg-valid'
  if (prob >= 0.25) return 'text-lg-accent'
  return 'text-lg-invalid'
}

const SWATCH: Record<string, string> = { red: '#b32d2d', black: '#52525b', white: '#e7e7ec' }

const atkSurge = [
  { v: 'crit', l: 'Crit' },
  { v: 'hit', l: 'Hit' },
  { v: 'blank', l: 'None' },
] as const
const defSurge = [
  { v: 'block', l: 'Block' },
  { v: 'blank', l: 'None' },
] as const
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <!-- Attack panel -->
      <div class="space-y-2 rounded-xl border border-lg-border bg-lg-panel/30 p-3">
        <h3 class="text-sm font-bold text-lg-accent">Attack</h3>
        <div v-for="c in (['red', 'black', 'white'] as const)" :key="c" class="flex items-center gap-2">
          <span class="h-3 w-3 rounded-sm border border-black/30" :style="{ background: SWATCH[c] }" />
          <span class="flex-1 text-xs font-semibold capitalize text-lg-text/75">{{ c }}</span>
          <button class="step" :disabled="atk[c] <= 0" @click="atk[c] = Math.max(0, atk[c] - 1)">−</button>
          <span class="w-5 text-center text-sm font-bold tabular-nums text-lg-text">{{ atk[c] }}</span>
          <button class="step" @click="atk[c] = Math.min(20, atk[c] + 1)">+</button>
        </div>
        <div class="flex items-center gap-2 pt-1">
          <span class="w-12 text-[10px] font-semibold uppercase tracking-wider text-lg-text/45">Surge</span>
          <div class="flex flex-1 gap-1">
            <button v-for="o in atkSurge" :key="o.v" :class="['seg', atk.surge === o.v ? 'seg-on' : '']" @click="atk.surge = o.v">{{ o.l }}</button>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-12 text-[10px] font-semibold uppercase tracking-wider text-lg-text/45">Aim</span>
          <button class="step" :disabled="atk.aims <= 0" @click="atk.aims = Math.max(0, atk.aims - 1)">−</button>
          <span class="w-5 text-center text-sm font-bold tabular-nums text-lg-text">{{ atk.aims }}</span>
          <button class="step" @click="atk.aims++">+</button>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-12 text-[10px] font-semibold uppercase tracking-wider text-lg-text/45">Pierce</span>
          <button class="step" :disabled="atk.pierce <= 0" @click="atk.pierce = Math.max(0, atk.pierce - 1)">−</button>
          <span class="w-5 text-center text-sm font-bold tabular-nums text-lg-text">{{ atk.pierce }}</span>
          <button class="step" @click="atk.pierce++">+</button>
        </div>
      </div>

      <!-- Defense panel -->
      <div class="space-y-2 rounded-xl border border-lg-border bg-lg-panel/30 p-3">
        <h3 class="text-sm font-bold text-lg-holo">Defense</h3>
        <div v-for="c in (['red', 'white'] as const)" :key="c" class="flex items-center gap-2">
          <span class="h-3 w-3 rounded-sm border border-black/30" :style="{ background: SWATCH[c] }" />
          <span class="flex-1 text-xs font-semibold capitalize text-lg-text/75">{{ c }}</span>
          <button class="step" :disabled="def[c] <= 0" @click="def[c] = Math.max(0, def[c] - 1)">−</button>
          <span class="w-5 text-center text-sm font-bold tabular-nums text-lg-text">{{ def[c] }}</span>
          <button class="step" @click="def[c] = Math.min(20, def[c] + 1)">+</button>
        </div>
        <div class="flex items-center gap-2 pt-1">
          <span class="w-12 text-[10px] font-semibold uppercase tracking-wider text-lg-text/45">Surge</span>
          <div class="flex flex-1 gap-1">
            <button v-for="o in defSurge" :key="o.v" :class="['seg', def.surge === o.v ? 'seg-on' : '']" @click="def.surge = o.v">{{ o.l }}</button>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-12 text-[10px] font-semibold uppercase tracking-wider text-lg-text/45">Cover</span>
          <button class="step" :disabled="def.cover <= 0" @click="def.cover = Math.max(0, def.cover - 1)">−</button>
          <span class="w-5 text-center text-sm font-bold tabular-nums text-lg-text">{{ def.cover }}</span>
          <button class="step" @click="def.cover++">+</button>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-12 text-[10px] font-semibold uppercase tracking-wider text-lg-text/45">Dodge</span>
          <button class="step" :disabled="def.dodge <= 0" @click="def.dodge = Math.max(0, def.dodge - 1)">−</button>
          <span class="w-5 text-center text-sm font-bold tabular-nums text-lg-text">{{ def.dodge }}</span>
          <button class="step" @click="def.dodge++">+</button>
        </div>
      </div>
    </div>

    <!-- Results -->
    <div v-if="result" class="overflow-hidden rounded-xl border border-lg-border bg-black/20">
      <div class="flex items-baseline gap-2 border-b border-lg-border px-4 py-3">
        <span class="text-[10px] uppercase tracking-widest text-lg-text/40">Avg Wounds</span>
        <span class="text-2xl font-bold text-lg-accent">{{ result.mean.toFixed(2) }}</span>
      </div>

      <table v-if="result.distribution.length > 1" class="w-full text-sm">
        <thead>
          <tr class="border-b border-lg-border">
            <th class="px-4 py-2 text-left text-[10px] uppercase tracking-widest text-lg-text/40">Wounds</th>
            <th class="px-4 py-2 text-right text-[10px] uppercase tracking-widest text-lg-text/40" title="Probability of at least this many wounds">P(≥ n)</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-lg-border/50">
          <tr v-for="(_, i) in result.cumulative" v-show="i > 0" :key="i">
            <td class="px-4 py-2 font-mono font-bold text-lg-text">{{ i }}</td>
            <td :class="['px-4 py-2 text-right font-mono text-xs', rowClass(result!.cumulative[i])]">{{ pct(result!.cumulative[i]) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="px-4 py-3 text-xs text-lg-text/40">Add attack dice to see a distribution.</p>

      <p class="border-t border-lg-border/50 px-4 py-2.5 text-[10px] text-lg-text/25">
        Aim plays greedily (rerolls blanks) · {{ result.runs.toLocaleString() }} simulated rolls
      </p>
    </div>
  </div>
</template>

<style scoped>
.step {
  display: grid;
  place-items: center;
  height: 2.75rem;
  width: 2.75rem;
  border-radius: 0.375rem;
  border: 1px solid var(--color-lg-border);
  font-size: 1rem;
  font-weight: 700;
  color: rgb(from var(--color-lg-text) r g b / 0.7);
}
.step:hover:not(:disabled) { border-color: var(--color-lg-accent); }
.step:disabled { opacity: 0.3; }
.seg {
  flex: 1;
  border-radius: 0.375rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  background: rgb(from var(--color-lg-text) r g b / 0.08);
  color: rgb(from var(--color-lg-text) r g b / 0.6);
}
.seg-on { background: var(--color-lg-accent); color: var(--color-lg-bg); }
</style>

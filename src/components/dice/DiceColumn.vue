<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import DieFace from './DieFace.vue'
import {
  rollAttack,
  rollDefense,
  resolveAttackFace,
  ATTACK_FACES,
  DEFENSE_FACES,
  ATTACK_COLORS,
  DEFENSE_COLORS,
} from '../../utils/dice.ts'
import type {
  DieState,
  DieColor,
  AttackFace,
  DefenseFace,
  AttackSurge,
  DefenseSurge,
} from '../../utils/dice.ts'

export type { DieState }

export interface AttackMods {
  surge: AttackSurge
  aims: number
  pierce: number
}
export interface DefenseMods {
  surge: DefenseSurge
  cover: number
  dodge: number
}

const props = defineProps<{
  type: 'attack' | 'defense'
}>()
const emit = defineEmits<{
  (e: 'update:summary', val: Record<string, number>): void
  (e: 'update:pool', val: DieState[]): void
  (e: 'update:mods', val: AttackMods | DefenseMods): void
  (e: 'rolled'): void
}>()

const isAttack = props.type === 'attack'
const colors = (isAttack ? ATTACK_COLORS : DEFENSE_COLORS) as DieColor[]
const faces = (isAttack ? ATTACK_FACES : DEFENSE_FACES) as (AttackFace | DefenseFace)[]
const label = isAttack ? 'Attack' : 'Defense'

const SWATCH: Record<DieColor, string> = {
  red: '#b32d2d',
  black: '#52525b',
  white: '#e7e7ec',
}

// Surge / modifier options (segmented controls)
const surgeOptions = isAttack
  ? ([
      { v: 'crit', l: 'Crit' },
      { v: 'hit', l: 'Hit' },
      { v: 'blank', l: 'None' },
    ] as const)
  : ([
      { v: 'block', l: 'Block' },
      { v: 'blank', l: 'None' },
    ] as const)

// ── State ──────────────────────────────────────────────────────────────────
let nextId = 0
const counts = reactive<Record<string, number>>(
  Object.fromEntries(colors.map((c) => [c, 0])),
)
const pool = ref<DieState[]>([])
const rolling = ref(false)
const selectedId = ref<number | null>(null)
const rerollMode = ref(false)
const rerollSel = ref(new Set<number>())
const rerollingIds = ref(new Set<number>())

const mods = reactive(
  isAttack
    ? ({ surge: 'blank', aims: 0, pierce: 0 } as AttackMods)
    : ({ surge: 'blank', cover: 0, dodge: 0 } as DefenseMods),
)

const totalConfigured = computed(() => colors.reduce((s, c) => s + (counts[c] || 0), 0))

function rollOne(color: DieColor): AttackFace | DefenseFace {
  return isAttack ? rollAttack(color as 'red' | 'black' | 'white') : rollDefense(color as 'red' | 'white')
}

// ── Roll the configured pool ────────────────────────────────────────────────
function roll() {
  if (rolling.value || totalConfigured.value === 0) return
  rolling.value = true
  selectedId.value = null
  rerollMode.value = false
  rerollSel.value = new Set()

  const next: DieState[] = []
  for (const color of colors) {
    for (let i = 0; i < (counts[color] || 0); i++) {
      next.push({ id: nextId++, type: props.type, color, face: rollOne(color), locked: false, isBonus: false })
    }
  }
  pool.value = next
  setTimeout(() => (rolling.value = false), 550)
  emit('rolled')
}

function setCount(color: DieColor, n: number) {
  counts[color] = Math.max(0, Math.min(30, n))
}

// ── Die interaction ──────────────────────────────────────────────────────────
function selectDie(die: DieState) {
  if (rolling.value) return
  if (rerollMode.value) {
    const s = new Set(rerollSel.value)
    s.has(die.id) ? s.delete(die.id) : s.add(die.id)
    rerollSel.value = s
    return
  }
  selectedId.value = selectedId.value === die.id ? null : die.id
}

function changeFace(die: DieState, face: AttackFace | DefenseFace) {
  die.face = face
  selectedId.value = null
}

function rerollDie(die: DieState) {
  selectedId.value = null
  rerollingIds.value = new Set([die.id])
  die.face = rollOne(die.color)
  setTimeout(() => (rerollingIds.value = new Set()), 550)
}

function removeDie(id: number) {
  pool.value = pool.value.filter((d) => d.id !== id)
  selectedId.value = null
}

function addDie(color: DieColor) {
  pool.value.push({ id: nextId++, type: props.type, color, face: rollOne(color), locked: false, isBonus: true })
  rerollMode.value = false
  selectedId.value = null
}

// ── Reroll mode ──────────────────────────────────────────────────────────────
function toggleRerollMode() {
  rerollMode.value = !rerollMode.value
  rerollSel.value = new Set()
  selectedId.value = null
}

function confirmReroll() {
  rerollingIds.value = new Set(rerollSel.value)
  for (const die of pool.value) {
    if (rerollSel.value.has(die.id)) die.face = rollOne(die.color)
  }
  rerollSel.value = new Set()
  rerollMode.value = false
  setTimeout(() => (rerollingIds.value = new Set()), 550)
}

// ── Aim: reroll resolved-blank dice up to the aim budget (attack only) ─────────
const aimBudget = computed(() => (isAttack ? (mods as AttackMods).aims * 2 : 0))
const aimableCount = computed(() => {
  if (!isAttack) return 0
  const s = (mods as AttackMods).surge
  return pool.value.filter((d) => resolveAttackFace(d.face as AttackFace, s) === 'blank').length
})
function aimReroll() {
  if (!isAttack) return
  let budget = aimBudget.value
  const s = (mods as AttackMods).surge
  const ids = new Set<number>()
  for (const die of pool.value) {
    if (budget <= 0) break
    if (resolveAttackFace(die.face as AttackFace, s) === 'blank') {
      die.face = rollOne(die.color)
      ids.add(die.id)
      budget--
    }
  }
  rerollingIds.value = ids
  setTimeout(() => (rerollingIds.value = new Set()), 550)
}

function clear() {
  pool.value = []
  selectedId.value = null
  rerollMode.value = false
  rerollSel.value = new Set()
  rerollingIds.value = new Set()
  rolling.value = false
}

// ── Computed ──────────────────────────────────────────────────────────────────
const selectedDie = computed(() => pool.value.find((d) => d.id === selectedId.value) ?? null)
const hasPool = computed(() => pool.value.length > 0)

const summary = computed(() => {
  const out: { face: AttackFace | DefenseFace; count: number }[] = []
  for (const f of faces) {
    const count = pool.value.filter((d) => d.face === f).length
    if (count > 0) out.push({ face: f, count })
  }
  return out
})

const faceColorClass = (face: string) => {
  if (face === 'crit') return 'text-lg-accent'
  if (face === 'block') return 'text-lg-holo'
  if (face === 'surge') return 'text-lg-holo'
  if (face === 'blank') return 'text-lg-muted'
  return 'text-lg-text'
}

// ── Emit upward ────────────────────────────────────────────────────────────────
watch(
  pool,
  () => {
    const out: Record<string, number> = {}
    for (const f of faces) out[f] = pool.value.filter((d) => d.face === f).length
    emit('update:summary', out)
    emit('update:pool', [...pool.value])
  },
  { deep: true, immediate: true, flush: 'sync' },
)

watch(
  mods,
  () => emit('update:mods', { ...mods }),
  { deep: true, immediate: true },
)
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Header -->
    <h2 class="text-lg font-bold" :class="isAttack ? 'text-lg-accent' : 'text-lg-holo'">{{ label }}</h2>

    <!-- Pool builder: per-colour steppers -->
    <div class="space-y-1.5">
      <div
        v-for="color in colors"
        :key="color"
        class="flex cursor-pointer select-none items-center gap-2 rounded-lg border border-lg-border bg-lg-panel/40 px-2.5 py-1.5 transition-colors hover:border-lg-accent/60 active:bg-lg-accent/10"
        role="button"
        :aria-label="`Add ${color} die`"
        @click="setCount(color, (counts[color] || 0) + 1)"
      >
        <span class="h-3.5 w-3.5 rounded-sm border border-black/30" :style="{ background: SWATCH[color] }" />
        <span class="flex-1 text-sm font-semibold capitalize text-lg-text/80">{{ color }}</span>
        <div class="flex items-center gap-2">
          <button
            class="grid h-6 w-6 place-items-center rounded-md border border-lg-border text-base font-bold text-lg-text/70 hover:border-lg-accent disabled:opacity-30"
            :disabled="(counts[color] || 0) <= 0"
            @click.stop="setCount(color, (counts[color] || 0) - 1)"
          >−</button>
          <span class="w-5 text-center text-base font-bold tabular-nums text-lg-text">{{ counts[color] || 0 }}</span>
          <button
            class="grid h-6 w-6 place-items-center rounded-md border border-lg-border text-base font-bold text-lg-text/70 hover:border-lg-accent"
            @click.stop="setCount(color, (counts[color] || 0) + 1)"
          >+</button>
        </div>
      </div>
    </div>

    <!-- Surge + modifiers -->
    <div class="space-y-2 rounded-lg border border-lg-border bg-lg-panel/30 p-2.5">
      <div class="flex items-center gap-2">
        <span class="w-14 text-[11px] font-semibold uppercase tracking-wider text-lg-text/45">Surge →</span>
        <div class="flex flex-1 gap-1">
          <button
            v-for="opt in surgeOptions"
            :key="opt.v"
            :class="[
              'flex-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors',
              mods.surge === opt.v ? 'bg-lg-accent text-lg-bg' : 'bg-lg-text/8 text-lg-text/60 hover:bg-lg-text/15',
            ]"
            @click="mods.surge = opt.v as any"
          >{{ opt.l }}</button>
        </div>
      </div>

      <!-- Attack mods -->
      <template v-if="isAttack">
        <div class="flex items-center gap-2">
          <span class="w-14 text-[11px] font-semibold uppercase tracking-wider text-lg-text/45">Aim</span>
          <button class="stepper-btn" :disabled="(mods as any).aims <= 0" @click="(mods as any).aims = Math.max(0, (mods as any).aims - 1)">−</button>
          <span class="w-5 text-center text-sm font-bold tabular-nums text-lg-text">{{ (mods as any).aims }}</span>
          <button class="stepper-btn" @click="(mods as any).aims++">+</button>
          <span class="text-[10px] text-lg-text/35">reroll up to {{ aimBudget }} dice</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-14 text-[11px] font-semibold uppercase tracking-wider text-lg-text/45">Pierce</span>
          <button class="stepper-btn" :disabled="(mods as any).pierce <= 0" @click="(mods as any).pierce = Math.max(0, (mods as any).pierce - 1)">−</button>
          <span class="w-5 text-center text-sm font-bold tabular-nums text-lg-text">{{ (mods as any).pierce }}</span>
          <button class="stepper-btn" @click="(mods as any).pierce++">+</button>
          <span class="text-[10px] text-lg-text/35">cancels defender blocks</span>
        </div>
      </template>

      <!-- Defense mods -->
      <template v-else>
        <div class="flex items-center gap-2">
          <span class="w-14 text-[11px] font-semibold uppercase tracking-wider text-lg-text/45">Cover</span>
          <button class="stepper-btn" :disabled="(mods as any).cover <= 0" @click="(mods as any).cover = Math.max(0, (mods as any).cover - 1)">−</button>
          <span class="w-5 text-center text-sm font-bold tabular-nums text-lg-text">{{ (mods as any).cover }}</span>
          <button class="stepper-btn" @click="(mods as any).cover++">+</button>
          <span class="text-[10px] text-lg-text/35">cancels hits pre-roll</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-14 text-[11px] font-semibold uppercase tracking-wider text-lg-text/45">Dodge</span>
          <button class="stepper-btn" :disabled="(mods as any).dodge <= 0" @click="(mods as any).dodge = Math.max(0, (mods as any).dodge - 1)">−</button>
          <span class="w-5 text-center text-sm font-bold tabular-nums text-lg-text">{{ (mods as any).dodge }}</span>
          <button class="stepper-btn" @click="(mods as any).dodge++">+</button>
          <span class="text-[10px] text-lg-text/35">cancels hits</span>
        </div>
      </template>
    </div>

    <!-- Roll button -->
    <button
      class="rounded-lg bg-lg-accent px-3 py-2 text-sm font-bold text-lg-bg transition-opacity hover:opacity-90 disabled:opacity-30"
      :disabled="rolling || totalConfigured === 0"
      @click="roll"
    >Roll {{ totalConfigured > 0 ? `${totalConfigured} ${totalConfigured === 1 ? 'die' : 'dice'}` : '' }}</button>

    <!-- Dice pool -->
    <div v-if="pool.length > 0" class="flex flex-wrap gap-2">
      <div
        v-for="die in pool"
        :key="die.id"
        :class="[
          'relative cursor-pointer select-none rounded-lg transition-all',
          selectedId === die.id
            ? 'ring-2 ring-lg-accent ring-offset-2 ring-offset-lg-bg'
            : rerollMode && rerollSel.has(die.id)
              ? 'ring-2 ring-lg-holo ring-offset-2 ring-offset-lg-bg'
              : 'opacity-90 hover:opacity-100',
        ]"
        @click="selectDie(die)"
      >
        <div :class="rolling || rerollingIds.has(die.id) ? 'die-rolling' : ''">
          <DieFace :type="type" :color="die.color" :face="die.face" :size="56" />
        </div>
        <div v-if="die.isBonus" class="absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-full bg-lg-accent text-[9px] font-bold text-lg-bg">+</div>
      </div>
    </div>

    <!-- Per-die action panel -->
    <div v-if="selectedDie && !rerollMode" class="space-y-3 rounded-xl border border-lg-accent/30 bg-lg-panel p-3">
      <div class="flex items-center justify-between gap-2">
        <p class="text-[10px] font-semibold uppercase tracking-wider text-lg-text/50">Change face</p>
        <div class="flex gap-1.5">
          <button class="rounded border border-lg-accent/30 px-2 py-0.5 text-[10px] text-lg-text/60 hover:border-lg-accent hover:text-lg-text" @click="rerollDie(selectedDie)">↺ Reroll</button>
          <button class="rounded border border-lg-invalid/40 px-2 py-0.5 text-[10px] text-lg-invalid hover:bg-lg-invalid/10" @click="removeDie(selectedDie.id)">Remove</button>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <div
          v-for="face in faces"
          :key="face"
          :class="[
            'flex cursor-pointer flex-col items-center gap-1 rounded p-1.5 transition-all',
            selectedDie.face === face ? 'bg-lg-accent/10 ring-1 ring-lg-accent/40' : 'opacity-60 hover:opacity-100',
          ]"
          @click="changeFace(selectedDie, face)"
        >
          <DieFace :type="type" :color="selectedDie.color" :face="face" :size="36" />
          <span class="text-[8px] capitalize text-lg-text/50">{{ face }}</span>
        </div>
      </div>
    </div>

    <!-- Reroll mode bar -->
    <div v-if="rerollMode" class="flex items-center gap-2 rounded-xl border border-lg-holo/30 bg-lg-holo/5 px-3 py-2">
      <p class="flex-1 text-xs text-lg-text/60">{{ rerollSel.size === 0 ? 'Tap dice to select.' : `${rerollSel.size} selected.` }}</p>
      <button :disabled="rerollSel.size === 0" class="rounded-lg bg-lg-accent px-3 py-1 text-xs font-bold text-lg-bg disabled:opacity-40" @click="confirmReroll">Reroll</button>
      <button class="text-xs text-lg-text/40 hover:text-lg-text" @click="toggleRerollMode">Cancel</button>
    </div>

    <!-- Action buttons -->
    <div v-if="hasPool" class="flex flex-wrap gap-1.5">
      <button
        v-if="isAttack"
        class="rounded-lg border border-lg-accent/30 px-2.5 py-1 text-xs font-medium text-lg-text/60 transition-colors hover:border-lg-accent hover:text-lg-text disabled:opacity-30"
        :disabled="aimBudget === 0 || aimableCount === 0"
        @click="aimReroll"
      >🎯 Aim</button>
      <button
        :class="[
          'rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
          rerollMode ? 'border-lg-holo/60 bg-lg-holo/10 text-lg-holo' : 'border-lg-accent/30 text-lg-text/60 hover:border-lg-accent hover:text-lg-text',
        ]"
        @click="toggleRerollMode"
      >↺ Reroll dice</button>
      <div class="flex items-center gap-1 rounded-lg border border-lg-accent/30 px-2 py-1">
        <span class="text-xs font-medium text-lg-text/60">+ Add</span>
        <button
          v-for="color in colors"
          :key="color"
          class="grid h-5 w-5 place-items-center rounded-md border border-black/30 transition-transform hover:scale-110 hover:ring-1 hover:ring-lg-accent"
          :style="{ background: SWATCH[color] }"
          :title="`Add ${color} die`"
          :aria-label="`Add ${color} die`"
          @click="addDie(color)"
        />
      </div>
      <button class="ml-auto rounded-lg px-2.5 py-1 text-xs text-lg-text/40 hover:text-lg-text" @click="clear">Clear</button>
    </div>

    <!-- Results summary -->
    <div v-if="pool.length > 0" class="rounded-xl border border-lg-border bg-black/20 p-3">
      <p class="mb-2 text-[10px] uppercase tracking-widest text-lg-text/40">Results</p>
      <div class="flex flex-wrap gap-1.5">
        <div v-for="item in summary" :key="item.face" class="flex items-center gap-1.5 rounded-lg border border-lg-border bg-black/20 px-2 py-1">
          <DieFace :type="type" :color="colors[0]" :face="item.face" :size="20" />
          <span :class="['text-sm font-bold', faceColorClass(item.face)]">{{ item.count }}</span>
          <span class="text-[10px] capitalize text-lg-text/50">{{ item.face }}</span>
        </div>
        <p v-if="summary.length === 0" class="text-xs text-lg-text/30">—</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stepper-btn {
  display: grid;
  place-items: center;
  height: 1.5rem;
  width: 1.5rem;
  border-radius: 0.375rem;
  border: 1px solid var(--color-lg-border);
  font-size: 1rem;
  font-weight: 700;
  color: rgb(from var(--color-lg-text) r g b / 0.7);
}
.stepper-btn:hover:not(:disabled) {
  border-color: var(--color-lg-accent);
}
.stepper-btn:disabled {
  opacity: 0.3;
}
@keyframes die-roll {
  0% { transform: scale(1) rotate(0deg); }
  25% { transform: scale(0.85) rotate(-25deg); }
  55% { transform: scale(1.1) rotate(18deg); }
  80% { transform: scale(0.95) rotate(-8deg); }
  100% { transform: scale(1) rotate(0deg); }
}
.die-rolling { animation: die-roll 0.55s ease-out; }
</style>

<script setup lang="ts">
import { computed, ref } from 'vue'
import UnitBadge from '../build/UnitBadge.vue'
import PlayUnitStats from './PlayUnitStats.vue'
import { TOKEN_META, isPanicked } from '../../utils/playTokens.ts'
import type { TokenCounts, TokenType, Unit } from '../../types/index.ts'

// One roster row for a single unit instance (keyed by ArmyUnit.uid). Shows the unit badge,
// name, an at-a-glance stat strip, a summary of its active tokens, and an expandable editor
// with a stepper per token type. Tapping the badge/name opens the unit card drawer (parent).
const props = defineProps<{
  unit: Unit | null
  label: string
  upgrades: string[]
  counts: TokenCounts
}>()

const emit = defineEmits<{
  (e: 'adjust', token: TokenType, delta: number): void
  (e: 'view'): void
}>()

const open = ref(false)

// A unit is Panicked once its suppression reaches twice its courage. Vehicles and droids
// with no courage value never panic. Shown in amber, mirroring Build's illegal flag (which
// is red — reserved here for a defeated unit in a later phase).
const panicked = computed(() => isPanicked(props.counts.suppression ?? 0, props.unit?.courage))

// Active tokens, in the canonical TOKEN_META order, for the collapsed summary chips.
const active = computed(() =>
  TOKEN_META.filter((m) => (props.counts[m.type] ?? 0) > 0).map((m) => ({ meta: m, n: props.counts[m.type] ?? 0 })),
)
const turnTokens = computed(() => TOKEN_META.filter((m) => m.cls === 'turn'))
const persistentTokens = computed(() => TOKEN_META.filter((m) => m.cls === 'persistent'))
const count = (t: TokenType) => props.counts[t] ?? 0
</script>

<template>
  <li
    class="rounded-lg border transition-colors"
    :class="panicked ? 'border-amber-400/70 bg-amber-400/5' : 'border-lg-border bg-lg-surface'"
  >
    <!-- Row header -->
    <div class="flex items-center gap-3 px-3 py-2.5">
      <button class="flex min-w-0 flex-1 items-center gap-3 text-left" @click="emit('view')">
        <UnitBadge v-if="unit" :unit="unit" size="h-11 w-11" />
        <div class="min-w-0 flex-1 space-y-1">
          <p class="flex items-center gap-1.5 text-sm font-semibold text-lg-text">
            <span class="truncate">{{ label }}</span>
            <span
              v-if="panicked"
              class="flex-none rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-lg-dark"
            >⚠ Panicked</span>
          </p>
          <p v-if="upgrades.length" class="truncate text-xs text-lg-muted">{{ upgrades.join(', ') }}</p>
          <PlayUnitStats v-if="unit" :unit="unit" />
        </div>
      </button>

      <!-- Collapsed summary of active tokens -->
      <div v-if="active.length && !open" class="flex flex-none items-center gap-1">
        <span
          v-for="a in active" :key="a.meta.type"
          class="inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-xs font-semibold"
          :class="a.meta.tone" :title="a.meta.label"
        >
          <span aria-hidden="true">{{ a.meta.glyph }}</span>{{ a.n }}
        </span>
      </div>

      <button
        class="flex-none rounded-md border border-lg-border px-2 py-1 text-xs text-lg-muted hover:text-lg-accent"
        :aria-expanded="open"
        @click="open = !open"
      >
        {{ open ? 'Done' : 'Tokens' }}
      </button>
    </div>

    <!-- Expanded token editor -->
    <div v-if="open" class="space-y-3 border-t border-lg-border px-3 py-3">
      <div v-for="grp in [{ h: 'Turn-cleared', items: turnTokens }, { h: 'Persistent', items: persistentTokens }]" :key="grp.h">
        <p class="mb-1.5 text-[10px] uppercase tracking-widest text-lg-muted/70">{{ grp.h }}</p>
        <div class="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          <div
            v-for="m in grp.items" :key="m.type"
            class="flex items-center gap-1.5 rounded-md border px-1.5 py-1"
            :class="count(m.type) > 0 ? m.tone : 'border-lg-border text-lg-muted'"
          >
            <span class="flex min-w-0 flex-1 items-center gap-1 text-xs font-medium">
              <span aria-hidden="true">{{ m.glyph }}</span><span class="truncate">{{ m.label }}</span>
            </span>
            <button
              class="flex-none rounded px-1.5 text-sm leading-none hover:text-lg-accent disabled:opacity-30"
              :disabled="count(m.type) === 0"
              :aria-label="`Remove ${m.label}`"
              @click="emit('adjust', m.type, -1)"
            >−</button>
            <span class="w-4 flex-none text-center text-xs font-bold tabular-nums">{{ count(m.type) }}</span>
            <button
              class="flex-none rounded px-1.5 text-sm leading-none hover:text-lg-accent"
              :aria-label="`Add ${m.label}`"
              @click="emit('adjust', m.type, 1)"
            >+</button>
          </div>
        </div>
      </div>
    </div>
  </li>
</template>

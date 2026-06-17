<script setup lang="ts">
import type { BattleForce } from '../../types/index.ts'
import { battleForceRankTable, formatName } from '../../utils/factions.ts'

// Battle-force picker overlay: choose one of the faction's battle forces, or clear
// back to a standard army. Battle forces are opt-in — "None" is always offered and is
// the default. Teleported to <body> so it escapes the build layout's overflow.
const props = withDefaults(defineProps<{
  options: BattleForce[]
  selected: string | null
  gameSize: number
  allowNone?: boolean // offer the "None (Standard)" option (false for faction-mandatory battle forces)
}>(), { allowNone: true })
const emit = defineEmits<{ select: [linkId: string | null]; close: [] }>()

// A one-line rank summary for the current points cap (Corps range + combined cap).
function summary(bf: BattleForce): string {
  const t = battleForceRankTable(bf, props.gameSize)
  const parts = [`Corps ${t.corps[0]}–${t.corps[1]}`]
  if (t.commOp != null) parts.push(`Cmd+Op ≤${t.commOp}`)
  return parts.join(' · ')
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      @click.self="emit('close')"
    >
      <div class="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-lg-border bg-lg-surface shadow-2xl sm:rounded-2xl">
        <header class="flex items-center justify-between border-b border-lg-border px-4 py-3">
          <div>
            <h2 class="font-display text-sm font-bold uppercase tracking-widest text-lg-text">Battle force</h2>
            <p class="text-[11px] text-lg-muted">Optional — {{ formatName(gameSize) }} rules</p>
          </div>
          <button class="text-lg-muted hover:text-lg-text" aria-label="Close" @click="emit('close')">✕</button>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto p-3">
          <ul class="space-y-2">
            <!-- None / standard -->
            <li v-if="allowNone">
              <button
                class="flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors"
                :class="selected == null
                  ? 'border-lg-accent/60 bg-lg-accent/10'
                  : 'border-lg-border bg-lg-dark hover:border-lg-accent/40'"
                @click="emit('select', null)"
              >
                <span>
                  <span class="block font-semibold text-lg-text">None (Standard)</span>
                  <span class="block text-[11px] text-lg-muted">Build with the standard faction list and rank table</span>
                </span>
                <span v-if="selected == null" class="flex-none text-lg-accent">✓</span>
              </button>
            </li>

            <li v-for="bf in options" :key="bf.linkId">
              <button
                class="flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors"
                :class="selected === bf.linkId
                  ? 'border-lg-accent/60 bg-lg-accent/10'
                  : 'border-lg-border bg-lg-dark hover:border-lg-accent/40'"
                @click="emit('select', bf.linkId)"
              >
                <span class="min-w-0">
                  <span class="block truncate font-semibold text-lg-text">{{ bf.name }}</span>
                  <span class="block text-[11px] text-lg-muted">{{ summary(bf) }}</span>
                </span>
                <span v-if="selected === bf.linkId" class="flex-none text-lg-accent">✓</span>
              </button>
            </li>
          </ul>

          <p class="mt-3 px-1 text-[11px] leading-relaxed text-lg-muted">
            Switching battle force keeps your current units — any that aren't eligible are
            flagged so you can adjust them.
          </p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Rank } from '../../types/index.ts'
import type { ValidationItem } from '../../utils/army.ts'
import { rankChipState } from '../../utils/army.ts'
import { FORMATS, RANK_ORDER } from '../../utils/factions.ts'

// The permanent Build "Roster Canvas" footer: 6 rank chips (count·min–max with
// over/under colouring), live totals + format switcher + Save/Share/Print, and a
// tap target that expands the footer upward to reveal the full validation checklist.
defineProps<{
  ranks: Record<Rank, { count: number; min: number; max: number }>
  points: number
  cap: number
  remaining: number
  pointsPct: number
  activations: number
  valid: boolean
  items: ValidationItem[]
  canExport: boolean
  saveLabel: string
  shareMsg?: string
}>()

const emit = defineEmits<{
  setGameSize: [cap: number]
  save: []
  share: []
  print: []
}>()

const checklistOpen = ref(false)

// Compact rank labels for the chips (full names are in the checklist overlay).
const RANK_ABBR: Record<Rank, string> = {
  commander: 'Cmd', operative: 'Op', corps: 'Corps',
  special: 'Spec', support: 'Sup', heavy: 'Heavy',
}

const chipClass: Record<ReturnType<typeof rankChipState>, string> = {
  ok: 'border-lg-border bg-lg-surface text-lg-muted',
  under: 'border-faction-rebels/40 bg-faction-rebels/10 text-faction-rebels',
  over: 'border-faction-rebels bg-faction-rebels/15 text-faction-rebels ring-1 ring-faction-rebels/50',
}
</script>

<template>
  <div>
    <!-- Expanding validation checklist: grows the footer upward (0fr → 1fr) -->
    <div
      class="grid transition-[grid-template-rows] duration-300 ease-out"
      :style="{ gridTemplateRows: checklistOpen ? '1fr' : '0fr' }"
    >
      <div class="overflow-hidden">
        <div class="mb-2.5 max-h-[50vh] overflow-y-auto border-b border-lg-border pb-2.5">
          <div class="mb-1.5 flex items-center justify-between">
            <h3 class="text-xs font-bold uppercase tracking-widest text-lg-muted">Army Status</h3>
            <button class="text-lg-muted hover:text-lg-accent" aria-label="Close" @click="checklistOpen = false">✕</button>
          </div>
          <ul class="space-y-1.5">
            <li v-for="(item, i) in items" :key="i" class="flex items-center justify-between gap-2 text-sm">
              <span class="flex items-center gap-1.5">
                <span :class="item.ok ? 'text-lg-valid' : 'text-faction-rebels'">{{ item.ok ? '✓' : '✕' }}</span>
                <span class="text-lg-text/80">{{ item.label }}</span>
              </span>
              <span class="text-right text-xs" :class="item.ok ? 'text-lg-muted' : 'text-faction-rebels'">{{ item.detail }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Rank chips -->
    <div class="flex flex-wrap items-center gap-1.5">
      <span
        v-for="rank in RANK_ORDER" :key="rank"
        class="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums"
        :class="chipClass[rankChipState(ranks[rank].count, ranks[rank].min, ranks[rank].max)]"
        :title="`${RANK_ABBR[rank]} — ${ranks[rank].count} of ${ranks[rank].min}–${ranks[rank].max}`"
      >
        {{ RANK_ABBR[rank] }}
        <span class="font-bold">{{ ranks[rank].count }}</span>
        <span class="opacity-60">·{{ ranks[rank].min }}–{{ ranks[rank].max }}</span>
      </span>
    </div>

    <!-- Totals + controls -->
    <div class="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <button
        class="flex items-baseline gap-2 rounded-lg px-1 text-left hover:bg-lg-text/5"
        :title="checklistOpen ? 'Hide validation checklist' : 'Show validation checklist'"
        :aria-expanded="checklistOpen"
        @click="checklistOpen = !checklistOpen"
      >
        <span class="font-display text-xl font-bold" :class="points > cap ? 'text-faction-rebels' : 'text-lg-accent'">{{ points }}</span>
        <span class="text-sm text-lg-muted">/ {{ cap }}</span>
        <span class="text-xs" :class="remaining < 0 ? 'text-faction-rebels' : 'text-lg-muted'">({{ remaining }} left)</span>
        <span class="hidden text-xs text-lg-muted sm:inline">· {{ activations }} act</span>
        <span
          class="ml-0.5 rounded-full px-2 py-0.5 text-xs font-semibold"
          :class="valid ? 'bg-lg-valid/15 text-lg-valid' : 'bg-faction-rebels/15 text-faction-rebels'"
        >{{ valid ? 'Legal' : 'Illegal' }}</span>
        <span
          class="text-lg-muted/70 transition-transform duration-300"
          :class="checklistOpen ? 'rotate-180' : ''"
          aria-hidden="true"
        >⌃</span>
      </button>

      <div class="flex items-center gap-2">
        <!-- Format switcher (relocated from the header) -->
        <div class="flex overflow-hidden rounded-lg border border-lg-border">
          <button
            v-for="f in FORMATS" :key="f.id"
            class="px-2 py-1.5 text-[11px] font-semibold transition-colors"
            :class="cap === f.cap ? 'bg-lg-accent/20 text-lg-accent' : 'bg-lg-surface text-lg-muted'"
            :title="`${f.name} · ${f.cap} pts`"
            @click="emit('setGameSize', f.cap)"
          >{{ f.name }}<span class="ml-1 hidden text-lg-muted/70 sm:inline">{{ f.cap }}</span></button>
        </div>
        <button class="rounded-lg bg-lg-accent/15 border border-lg-accent/40 px-3 py-1.5 text-sm font-semibold text-lg-accent hover:bg-lg-accent/25" @click="emit('save')">{{ saveLabel }}</button>
        <button class="rounded-lg border border-lg-border bg-lg-surface px-3 py-1.5 text-sm text-lg-muted hover:text-lg-accent disabled:opacity-40" :disabled="!canExport" @click="emit('share')">Share</button>
        <button class="rounded-lg border border-lg-border bg-lg-surface px-3 py-1.5 text-sm text-lg-muted hover:text-lg-accent disabled:opacity-40" :disabled="!canExport" @click="emit('print')">Print</button>
      </div>
    </div>

    <!-- Points progress -->
    <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-lg-dark">
      <div
        class="h-full rounded-full transition-all"
        :class="points > cap ? 'bg-faction-rebels' : 'bg-lg-accent'"
        :style="{ width: pointsPct + '%' }"
      />
    </div>
    <p v-if="shareMsg" class="mt-1 break-all text-xs text-lg-holo">{{ shareMsg }}</p>
  </div>
</template>

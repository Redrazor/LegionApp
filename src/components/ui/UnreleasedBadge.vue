<script setup lang="ts">
// Shown wherever a card's IMAGE is a pre-release preview or low-res placeholder
// (Feature 13 — driven by public/data/unreleased.json via `unreleased` on the card).
// `compact` renders a small corner chip (grid tiles); otherwise a full banner with the note.
defineProps<{ note: string; compact?: boolean }>()
</script>

<template>
  <span
    v-if="compact"
    class="pointer-events-none absolute left-1.5 top-1.5 z-10 rounded bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-black shadow"
    :title="note"
  >⚠ Preview</span>
  <div
    v-else
    class="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
  >
    <span class="mt-px shrink-0 text-sm leading-none">⚠</span>
    <span><strong class="font-semibold">Unreleased / preview card.</strong> {{ note }}</span>
  </div>
</template>

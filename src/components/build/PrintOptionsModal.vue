<script setup lang="ts">
import type { PrintOptions } from '../../utils/army.ts'

// Print-options panel: pick which sections the printout includes before printing.
// The roster sheet always prints; each toggle here appends another section (see
// PrintSheet.vue). State is owned + persisted by the parent (localStorage); this
// component just binds the checkboxes and emits print/close. Teleported to <body>
// like the other build modals.
const options = defineModel<PrintOptions>('options', { required: true })
defineProps<{ show: boolean; hasBattleDeck: boolean }>()
const emit = defineEmits<{ close: []; print: [] }>()

const references = [
  { key: 'commandHand', label: 'Command hand', hint: 'Text list of your command cards' },
  { key: 'battleDeck', label: 'Battle deck', hint: 'Text list of your objective deck', needsDeck: true },
  { key: 'keywordReference', label: 'Keyword reference', hint: 'Every keyword in use, alphabetised with rules' },
] as const

const cards = [
  { key: 'unitCards', label: 'Unit cards', hint: 'Full card images to proxy' },
  { key: 'upgradeCards', label: 'Upgrade cards', hint: 'Full card images of equipped upgrades' },
  { key: 'commandCards', label: 'Command cards', hint: 'Full command-card images' },
  { key: 'battleDeckCards', label: 'Battle-deck cards', hint: 'Full objective-card images', needsDeck: true },
] as const
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center"
        @click.self="emit('close')"
      >
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" @click="emit('close')" />

        <div class="relative z-10 flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl border border-lg-border bg-lg-surface shadow-2xl">
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-lg-border px-5 py-4">
            <h2 class="font-display text-base font-bold uppercase tracking-widest text-lg-accent">Print options</h2>
            <button
              class="rounded-full bg-lg-dark/60 p-1.5 text-lg-muted transition-colors hover:text-lg-text"
              aria-label="Close"
              @click="emit('close')"
            >✕</button>
          </div>

          <!-- Body -->
          <div class="flex flex-col gap-4 overflow-y-auto px-5 py-4">
            <p class="text-xs leading-relaxed text-lg-muted">
              Your roster always prints. Tick extra sections to add them — references for the table, or
              full card images to proxy.
            </p>

            <!-- Reference sections -->
            <div>
              <h3 class="mb-1.5 text-xs font-semibold uppercase tracking-wider text-lg-muted/70">References</h3>
              <label
                v-for="r in references"
                :key="r.key"
                class="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-lg-dark/40"
                :class="{ 'pointer-events-none opacity-40': 'needsDeck' in r && r.needsDeck && !hasBattleDeck }"
              >
                <input
                  type="checkbox"
                  v-model="options[r.key]"
                  :disabled="'needsDeck' in r && r.needsDeck && !hasBattleDeck"
                  class="mt-0.5 h-4 w-4 flex-none accent-lg-accent"
                />
                <span>
                  <span class="block text-sm font-medium text-lg-text">{{ r.label }}</span>
                  <span class="block text-xs text-lg-muted">{{ r.hint }}</span>
                </span>
              </label>
            </div>

            <!-- Card-image sections -->
            <div>
              <h3 class="mb-1.5 text-xs font-semibold uppercase tracking-wider text-lg-muted/70">Card images (proxy)</h3>
              <label
                v-for="c in cards"
                :key="c.key"
                class="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-lg-dark/40"
                :class="{ 'pointer-events-none opacity-40': 'needsDeck' in c && c.needsDeck && !hasBattleDeck }"
              >
                <input
                  type="checkbox"
                  v-model="options[c.key]"
                  :disabled="'needsDeck' in c && c.needsDeck && !hasBattleDeck"
                  class="mt-0.5 h-4 w-4 flex-none accent-lg-accent"
                />
                <span>
                  <span class="block text-sm font-medium text-lg-text">{{ c.label }}</span>
                  <span class="block text-xs text-lg-muted">{{ c.hint }}</span>
                </span>
              </label>

              <!-- Copies toggle (applies to unit/upgrade image sections) -->
              <label
                class="mt-1 flex cursor-pointer items-start gap-3 rounded-lg border border-lg-border/60 bg-lg-dark/30 px-2 py-2"
                :class="{ 'pointer-events-none opacity-40': !options.unitCards && !options.upgradeCards }"
              >
                <input
                  type="checkbox"
                  v-model="options.perCopy"
                  :disabled="!options.unitCards && !options.upgradeCards"
                  class="mt-0.5 h-4 w-4 flex-none accent-lg-accent"
                />
                <span>
                  <span class="block text-sm font-medium text-lg-text">One image per copy (×qty)</span>
                  <span class="block text-xs text-lg-muted">Print duplicate units/upgrades multiple times for cut-out sets. Off = one of each.</span>
                </span>
              </label>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-2 border-t border-lg-border px-5 py-3">
            <button
              class="rounded-lg border border-lg-border bg-lg-surface px-3 py-1.5 text-sm text-lg-muted hover:text-lg-text"
              @click="emit('close')"
            >Cancel</button>
            <button
              class="rounded-lg border border-lg-accent/40 bg-lg-accent/15 px-3 py-1.5 text-sm font-semibold text-lg-accent hover:bg-lg-accent/25"
              @click="emit('print')"
            >Print</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

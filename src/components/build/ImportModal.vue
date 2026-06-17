<script setup lang="ts">
import { ref, watch } from 'vue'

// Import a previously-exported list: a native LegionApp file (lossless) or a
// TTS/Longshanks JSON (best-effort, name-matched). The parent does the parsing and
// passes back a `result` for display; this modal only collects the text (file or
// paste) and shows the outcome. Teleported to <body>, like the other build modals.
const props = defineProps<{
  show: boolean
  // null = nothing loaded yet; set by the parent after a load attempt.
  result: { ok: boolean; warnings: string[]; error?: string } | null
}>()
const emit = defineEmits<{ close: []; load: [text: string] }>()

const text = ref('')
const fileName = ref('')

// Reset on each open so a stale paste/result never carries over.
watch(
  () => props.show,
  (s) => {
    if (s) {
      text.value = ''
      fileName.value = ''
    }
  },
)

async function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  fileName.value = file.name
  text.value = await file.text()
}

function load() {
  if (text.value.trim()) emit('load', text.value)
}
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

        <div class="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-lg-border bg-lg-surface shadow-2xl">
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-lg-border px-5 py-4">
            <h2 class="font-display text-base font-bold uppercase tracking-widest text-lg-accent">Import army</h2>
            <button
              class="rounded-full bg-lg-dark/60 p-1.5 text-lg-muted transition-colors hover:text-lg-text"
              aria-label="Close"
              @click="emit('close')"
            >✕</button>
          </div>

          <!-- Body -->
          <div class="flex flex-col gap-3 overflow-y-auto px-5 py-4">
            <p class="text-xs leading-relaxed text-lg-muted">
              Load a <span class="text-lg-text/80">LegionApp file</span> (lossless) or a
              <span class="text-lg-text/80">TTS / Longshanks</span> JSON (matched by card name). Choose a file
              or paste the contents below.
            </p>

            <label class="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-lg-border bg-lg-surface px-3 py-1.5 text-sm text-lg-muted hover:text-lg-accent">
              <span>Choose file…</span>
              <input type="file" accept=".json,application/json,text/plain" class="hidden" @change="onFile" />
            </label>
            <p v-if="fileName" class="-mt-1 text-xs text-lg-muted/70">{{ fileName }}</p>

            <textarea
              v-model="text"
              spellcheck="false"
              placeholder="…or paste the exported list here"
              class="h-40 w-full resize-none rounded-lg border border-lg-border bg-lg-dark p-3 font-mono text-base text-lg-text/90 outline-none placeholder:text-lg-muted/40 focus:border-lg-accent/50"
            />

            <!-- Outcome -->
            <div v-if="result?.error" class="rounded-lg border border-faction-rebels/40 bg-faction-rebels/10 px-3 py-2 text-xs text-faction-rebels">
              {{ result.error }}
            </div>
            <div v-else-if="result?.ok" class="rounded-lg border border-lg-valid/40 bg-lg-valid/10 px-3 py-2 text-xs text-lg-valid">
              <p class="font-semibold">List imported.</p>
              <ul v-if="result.warnings.length" class="mt-1.5 space-y-1 text-lg-text/70">
                <li v-for="(w, i) in result.warnings" :key="i" class="flex gap-1.5">
                  <span class="flex-shrink-0 text-lg-accent/50">·</span>{{ w }}
                </li>
              </ul>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-2 border-t border-lg-border px-5 py-3">
            <button
              class="rounded-lg border border-lg-border bg-lg-surface px-4 py-3 min-h-[44px] text-sm text-lg-muted hover:text-lg-text"
              @click="emit('close')"
            >{{ result?.ok ? 'Done' : 'Cancel' }}</button>
            <button
              class="rounded-lg bg-lg-accent/15 border border-lg-accent/40 px-4 py-3 min-h-[44px] text-sm font-semibold text-lg-accent hover:bg-lg-accent/25 disabled:opacity-40"
              :disabled="!text.trim()"
              @click="load"
            >Load list</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

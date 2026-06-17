<script setup lang="ts">
import { ref, computed } from 'vue'

// Export sheet: plain-text + TTS/Longshanks JSON. The JSON is one payload that both
// the swlegion/tts Tabletop Simulator mod (paste-import) and Longshanks event
// registration ingest (same name-based schema). Teleported to <body>, like the other
// build modals. Parent passes the two pre-rendered strings + a filename slug.
const props = defineProps<{
  show: boolean
  native: string
  text: string
  json: string
  filename: string
}>()
const emit = defineEmits<{ close: [] }>()

type Tab = 'native' | 'text' | 'json'
const tab = ref<Tab>('native')
const copied = ref(false)

const current = computed(() => (tab.value === 'native' ? props.native : tab.value === 'text' ? props.text : props.json))
const ext = computed(() => (tab.value === 'text' ? 'txt' : 'json'))
const mime = computed(() => (tab.value === 'text' ? 'text/plain' : 'application/json'))
// Distinguish the two JSON downloads so a folder of exports stays legible.
const downloadName = computed(() =>
  tab.value === 'native' ? `${props.filename}.legionapp.json` : tab.value === 'json' ? `${props.filename}.tts.json` : `${props.filename}.txt`,
)

async function copy() {
  try {
    await navigator.clipboard.writeText(current.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    /* clipboard unavailable — the textarea is selectable as a fallback */
  }
}

function download() {
  const blob = new Blob([current.value], { type: mime.value })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = downloadName.value
  a.click()
  URL.revokeObjectURL(url)
}

function setTab(t: Tab) {
  tab.value = t
  copied.value = false
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
            <h2 class="font-display text-base font-bold uppercase tracking-widest text-lg-accent">Export army</h2>
            <button
              class="rounded-full bg-lg-dark/60 p-1.5 text-lg-muted transition-colors hover:text-lg-text"
              aria-label="Close"
              @click="emit('close')"
            >✕</button>
          </div>

          <!-- Tabs -->
          <div class="flex gap-2 border-b border-lg-border px-5 pt-3">
            <button
              class="-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition-colors"
              :class="tab === 'native' ? 'border-lg-accent text-lg-accent' : 'border-transparent text-lg-muted hover:text-lg-text'"
              @click="setTab('native')"
            >LegionApp file</button>
            <button
              class="-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition-colors"
              :class="tab === 'text' ? 'border-lg-accent text-lg-accent' : 'border-transparent text-lg-muted hover:text-lg-text'"
              @click="setTab('text')"
            >Plain text</button>
            <button
              class="-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition-colors"
              :class="tab === 'json' ? 'border-lg-accent text-lg-accent' : 'border-transparent text-lg-muted hover:text-lg-text'"
              @click="setTab('json')"
            >TTS / Longshanks</button>
          </div>

          <!-- Body -->
          <div class="flex flex-col gap-3 overflow-y-auto px-5 py-4">
            <p v-if="tab === 'native'" class="text-xs leading-relaxed text-lg-muted">
              A complete, lossless backup of this list. Download it, then load it back any time with the
              <span class="text-lg-text/80">Import</span> button — units, upgrades, command hand and battle
              deck all restore exactly.
            </p>
            <p v-if="tab === 'json'" class="text-xs leading-relaxed text-lg-muted">
              Paste into the <span class="text-lg-text/80">swlegion</span> Tabletop Simulator mod's list
              importer, or into a Longshanks event's list field for metagame stats. Cards are matched by
              name — if the importer's catalogue spells one differently, that card may not resolve.
            </p>
            <textarea
              :value="current"
              readonly
              spellcheck="false"
              class="h-64 w-full resize-none rounded-lg border border-lg-border bg-lg-dark p-3 font-mono text-xs text-lg-text/90 outline-none focus:border-lg-accent/50"
              @focus="($event.target as HTMLTextAreaElement).select()"
            />
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-2 border-t border-lg-border px-5 py-3">
            <button
              class="rounded-lg border border-lg-border bg-lg-surface px-4 py-3 text-sm min-h-[44px] text-lg-muted hover:text-lg-accent"
              @click="download"
            >Download .{{ ext }}</button>
            <button
              class="rounded-lg bg-lg-accent/15 border border-lg-accent/40 px-4 py-3 text-sm min-h-[44px] font-semibold text-lg-accent hover:bg-lg-accent/25"
              @click="copy"
            >{{ copied ? 'Copied!' : 'Copy' }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

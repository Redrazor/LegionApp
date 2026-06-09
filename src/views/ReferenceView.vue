<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useKeywordsStore } from '../stores/keywords.ts'
import { SLOT_LABELS, RANK_META, RANK_ORDER, FACTION_ORDER, FACTION_META } from '../utils/factions.ts'

type Tab = 'rulebook' | 'keywords' | 'reference'
const tab = ref<Tab>('keywords')
const keywordsStore = useKeywordsStore()
const search = ref('')

// Official AMG rules hub + current core rulebook PDF.
const RULES_HUB = 'https://www.atomicmassgames.com/swlegiondocs/'
const RULEBOOK_PDF = 'https://cdn.svc.asmodee.net/production-amgcom/uploads/2024/07/SWQ_Rulebook_2.6.0.pdf'

onMounted(() => keywordsStore.load())

const filteredKeywords = computed(() => {
  const q = search.value.trim().toLowerCase()
  return Object.entries(keywordsStore.glossary)
    .filter(([k, v]) => !q || k.toLowerCase().includes(q) || v.toLowerCase().includes(q))
    .sort((a, b) => a[0].localeCompare(b[0]))
})

const slots = Object.entries(SLOT_LABELS)
</script>

<template>
  <div>
    <h1 class="mb-4 font-display text-2xl font-bold uppercase tracking-wider text-lg-text">Reference</h1>

    <!-- Tabs -->
    <div class="mb-5 flex gap-1 border-b border-lg-border">
      <button
        v-for="t in (['keywords','reference','rulebook'] as Tab[])" :key="t"
        class="border-b-2 px-4 py-2 text-sm font-semibold capitalize transition-colors"
        :class="tab === t ? 'border-lg-accent text-lg-accent' : 'border-transparent text-lg-muted hover:text-lg-text'"
        @click="tab = t"
      >{{ t === 'reference' ? 'Icons' : t }}</button>
    </div>

    <!-- Keywords -->
    <div v-if="tab === 'keywords'">
      <input
        v-model="search"
        type="search"
        placeholder="Search keywords…"
        class="mb-4 w-full rounded-lg border border-lg-border bg-lg-surface px-3 py-2 text-sm text-lg-text placeholder:text-lg-muted/60 focus:border-lg-accent/60 focus:outline-none"
      />
      <p v-if="!keywordsStore.loaded" class="py-10 text-center text-lg-muted">Loading…</p>
      <dl v-else class="space-y-2">
        <div v-for="[k, v] in filteredKeywords" :key="k" class="rounded-lg border border-lg-border bg-lg-surface p-3">
          <dt class="mb-0.5 font-semibold text-lg-accent">{{ k }}</dt>
          <dd class="text-sm leading-relaxed text-lg-text/85">{{ v }}</dd>
        </div>
      </dl>
    </div>

    <!-- Icons / reference -->
    <div v-else-if="tab === 'reference'" class="space-y-6">
      <section>
        <h2 class="mb-2 text-xs font-bold uppercase tracking-widest text-lg-muted">Upgrade Slots</h2>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div v-for="[id, label] in slots" :key="id" class="flex items-center gap-2 rounded-lg border border-lg-border bg-lg-surface p-2 text-sm">
            <span class="inline-flex h-7 w-9 items-center justify-center rounded border border-lg-border bg-lg-dark text-[10px] font-bold uppercase text-lg-muted">{{ id.slice(0,3) }}</span>
            <span class="text-lg-text/85">{{ label }}</span>
          </div>
        </div>
      </section>

      <section>
        <h2 class="mb-2 text-xs font-bold uppercase tracking-widest text-lg-muted">Ranks &amp; Army Limits (Standard)</h2>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div v-for="r in RANK_ORDER" :key="r" class="rounded-lg border border-lg-border bg-lg-surface p-2.5">
            <div class="text-sm font-semibold text-lg-text">{{ RANK_META[r].name }}</div>
            <div class="text-xs text-lg-muted">{{ RANK_META[r].min }}–{{ RANK_META[r].max }} per army</div>
          </div>
        </div>
      </section>

      <section>
        <h2 class="mb-2 text-xs font-bold uppercase tracking-widest text-lg-muted">Factions</h2>
        <div class="flex flex-wrap gap-2">
          <span v-for="f in FACTION_ORDER" :key="f" class="flex items-center gap-2 rounded-lg border border-lg-border bg-lg-surface px-3 py-1.5 text-sm">
            <span class="h-3 w-3 rounded-full" :style="{ background: FACTION_META[f].color }" />
            {{ FACTION_META[f].name }}
          </span>
        </div>
      </section>
    </div>

    <!-- Rulebook -->
    <div v-else>
      <div class="mb-3 flex flex-wrap gap-2">
        <a :href="RULEBOOK_PDF" target="_blank" rel="noopener" class="rounded-lg bg-lg-accent/15 border border-lg-accent/40 px-3 py-2 text-sm font-semibold text-lg-accent hover:bg-lg-accent/25">Open Core Rulebook PDF ↗</a>
        <a :href="RULES_HUB" target="_blank" rel="noopener" class="rounded-lg border border-lg-border bg-lg-surface px-3 py-2 text-sm text-lg-muted hover:text-lg-accent">All AMG rules &amp; OP docs ↗</a>
      </div>
      <div class="overflow-hidden rounded-xl border border-lg-border bg-lg-dark" style="height: 75vh">
        <iframe :src="RULEBOOK_PDF" class="h-full w-full" title="Star Wars: Legion Core Rulebook"></iframe>
      </div>
      <p class="mt-2 text-xs text-lg-muted">If the rulebook doesn't load inline, use the buttons above. Rules © Atomic Mass Games.</p>
    </div>
  </div>
</template>

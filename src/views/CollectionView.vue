<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useProductsStore } from '../stores/products.ts'
import { useCollectionStore } from '../stores/collection.ts'
import { useDataBackup } from '../composables/useDataBackup.ts'
import { FACTION_ORDER, FACTION_META } from '../utils/factions.ts'
import type { Faction } from '../types/index.ts'

const productsStore = useProductsStore()
const collection = useCollectionStore()
const { exportData, importData } = useDataBackup()
const fileInput = ref<HTMLInputElement | null>(null)
const search = ref('')

onMounted(() => productsStore.load())

const groups = computed(() => {
  const q = search.value.trim().toLowerCase()
  return FACTION_ORDER.map((faction) => ({
    faction,
    products: (productsStore.byFaction.get(faction) ?? [])
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name)),
  })).filter((g) => g.products.length)
})

const totals = computed(() => {
  const all = productsStore.products
  const ownedCount = all.filter((p) => collection.isOwned(p.code)).length
  const perFaction = FACTION_ORDER.map((faction) => {
    const list = productsStore.byFaction.get(faction) ?? []
    const owned = list.filter((p) => collection.isOwned(p.code)).length
    return { faction, owned, total: list.length }
  }).filter((f) => f.total)
  return { ownedCount, total: all.length, perFaction }
})

async function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) await importData(file)
  if (fileInput.value) fileInput.value.value = ''
}
</script>

<template>
  <div>
    <h1 class="mb-1 font-display text-2xl font-bold uppercase tracking-wider text-lg-text">Collection</h1>
    <p class="mb-5 text-sm text-lg-muted">Track which expansions you own. Owned units power the “Owned” filter in Browse.</p>

    <!-- Stats dashboard -->
    <div class="mb-6 rounded-xl border border-lg-border bg-lg-surface p-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span class="font-display text-3xl font-bold text-lg-gold">{{ totals.ownedCount }}</span>
          <span class="text-lg-muted"> / {{ totals.total }} expansions owned</span>
        </div>
        <div class="flex gap-2 no-print">
          <button class="rounded-lg border border-lg-border px-3 py-1.5 text-xs text-lg-muted hover:text-lg-gold" @click="exportData">Export</button>
          <button class="rounded-lg border border-lg-border px-3 py-1.5 text-xs text-lg-muted hover:text-lg-gold" @click="fileInput?.click()">Import</button>
          <input ref="fileInput" type="file" accept="application/json" class="hidden" @change="onFile" />
        </div>
      </div>
      <div class="mt-4 space-y-2">
        <div v-for="f in totals.perFaction" :key="f.faction">
          <div class="mb-0.5 flex items-center justify-between text-xs">
            <span :style="{ color: FACTION_META[f.faction].color }">{{ FACTION_META[f.faction].name }}</span>
            <span class="text-lg-muted">{{ f.owned }} / {{ f.total }}</span>
          </div>
          <div class="h-1.5 overflow-hidden rounded-full bg-lg-dark">
            <div class="h-full rounded-full" :style="{ width: (f.total ? (f.owned / f.total) * 100 : 0) + '%', background: FACTION_META[f.faction].color }" />
          </div>
        </div>
      </div>
    </div>

    <input
      v-model="search"
      type="search"
      placeholder="Search expansions…"
      class="mb-5 w-full rounded-lg border border-lg-border bg-lg-surface px-3 py-2 text-sm text-lg-text placeholder:text-lg-muted/60 focus:border-lg-gold/60 focus:outline-none"
    />

    <div class="space-y-6">
      <section v-for="group in groups" :key="group.faction">
        <h2 class="mb-3 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-widest" :style="{ color: FACTION_META[group.faction as Faction].color }">
          <span class="h-3 w-1 rounded" :style="{ background: FACTION_META[group.faction as Faction].color }" />
          {{ FACTION_META[group.faction as Faction].name }}
        </h2>
        <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="p in group.products" :key="p.code"
            class="flex items-center gap-3 rounded-lg border p-2.5 transition-colors"
            :class="collection.isOwned(p.code) ? 'border-lg-gold/40 bg-lg-gold/5' : 'border-lg-border bg-lg-surface'"
          >
            <div class="min-w-0 flex-1">
              <span class="block truncate text-sm text-lg-text/90">{{ p.name }}</span>
            </div>
            <div class="flex flex-none items-center gap-1.5">
              <button class="grid h-7 w-7 place-items-center rounded-md border border-lg-border text-lg-muted hover:text-lg-gold disabled:opacity-30" :disabled="!collection.isOwned(p.code)" @click="collection.decrement(p.code)">−</button>
              <span class="w-5 text-center font-display text-sm font-bold" :class="collection.isOwned(p.code) ? 'text-lg-gold' : 'text-lg-muted'">{{ collection.quantity(p.code) }}</span>
              <button class="grid h-7 w-7 place-items-center rounded-md border border-lg-border text-lg-muted hover:text-lg-gold" @click="collection.increment(p.code)">+</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

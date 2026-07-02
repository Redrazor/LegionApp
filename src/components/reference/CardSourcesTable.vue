<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue'
import { useCardSourcesStore } from '../../stores/cardSources.ts'
import {
  filterCardSources, browseLinkFor, sourceSummary, formatSourceDate,
  emptyCardSourceFilters, CARD_CATEGORY_LABELS,
} from '../../utils/cardSources.ts'
import type { CardCategory } from '../../types/index.ts'

// Card Sources reference (Feature 18): a searchable audit of where each catalogue card
// was sourced from and when. Valid (officially-sourced) cards link to their Browse
// drawer; unknown (legacy / image-pending) cards are flagged. Read-only reference.
const store = useCardSourcesStore()
onMounted(() => store.load())

const filters = reactive(emptyCardSourceFilters())
const CATEGORIES = Object.keys(CARD_CATEGORY_LABELS) as CardCategory[]

const filtered = computed(() => filterCardSources(store.sources, filters))
const summary = computed(() => sourceSummary(filtered.value))
</script>

<template>
  <div>
    <p class="mb-4 text-sm leading-relaxed text-lg-muted">
      Where each card was sourced from, and when. <span class="text-lg-text/85">Valid</span> cards are sourced
      from an official AMG document (tap to open the card); <span class="text-lg-text/85">Unknown</span> cards
      still use the legacy scan or are awaiting an image.
    </p>

    <!-- Filters -->
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <input
        v-model="filters.query"
        type="search"
        placeholder="Search name or source…"
        class="min-w-0 flex-1 rounded-lg border border-lg-border bg-lg-surface px-3 py-2 text-base text-lg-text placeholder:text-lg-muted/60 focus:border-lg-accent/60 focus:outline-none focus:ring-2 focus:ring-lg-accent/30"
      />
      <select
        v-model="filters.category"
        class="rounded-lg border border-lg-border bg-lg-surface px-3 py-2 text-sm text-lg-text focus:border-lg-accent/60 focus:outline-none"
      >
        <option value="">All types</option>
        <option v-for="c in CATEGORIES" :key="c" :value="c">{{ CARD_CATEGORY_LABELS[c] }}</option>
      </select>
      <label class="flex cursor-pointer select-none items-center gap-2 rounded-lg border border-lg-border bg-lg-surface px-3 py-2 text-sm text-lg-muted">
        <input v-model="filters.unknownOnly" type="checkbox" class="h-4 w-4 accent-lg-accent" />
        Unknown only
      </label>
    </div>

    <!-- Summary -->
    <p class="mb-3 text-xs text-lg-muted">
      {{ summary.total }} cards ·
      <span class="text-lg-accent">{{ summary.valid }} valid</span> ·
      <span :class="summary.unknown ? 'text-faction-rebels' : ''">{{ summary.unknown }} unknown</span>
    </p>

    <p v-if="!store.loaded" class="py-10 text-center text-lg-muted">Loading…</p>
    <p v-else-if="!filtered.length" class="rounded-lg border border-dashed border-lg-border py-8 text-center text-sm text-lg-muted">
      No cards match.
    </p>

    <!-- Rows -->
    <ul v-else class="space-y-1.5">
      <li
        v-for="c in filtered" :key="`${c.category}:${c.slug}`"
        class="flex items-center gap-3 rounded-lg border border-lg-border bg-lg-surface px-3 py-2.5"
      >
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-baseline gap-x-2">
            <component
              :is="browseLinkFor(c) ? 'router-link' : 'span'"
              :to="browseLinkFor(c) ?? undefined"
              class="truncate font-medium text-lg-text"
              :class="browseLinkFor(c) ? 'hover:text-lg-accent hover:underline' : ''"
            >{{ c.name }}</component>
            <span v-if="c.title" class="truncate text-xs italic text-lg-muted">{{ c.title }}</span>
            <span class="rounded bg-lg-dark px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-lg-muted">{{ CARD_CATEGORY_LABELS[c.category] }}</span>
          </div>
          <div class="mt-0.5 truncate text-xs text-lg-muted">{{ c.source }}</div>
        </div>

        <div class="flex flex-none items-center gap-3 text-right">
          <span class="hidden text-xs text-lg-muted sm:inline whitespace-nowrap">{{ formatSourceDate(c.date) }}</span>
          <span
            class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            :class="c.validity === 'valid'
              ? 'bg-lg-accent/15 text-lg-accent'
              : 'bg-faction-rebels/15 text-faction-rebels'"
          >{{ c.validity }}</span>
        </div>
      </li>
    </ul>
  </div>
</template>

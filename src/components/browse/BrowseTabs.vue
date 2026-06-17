<script setup lang="ts">
import { useRoute } from 'vue-router'

// Segmented section switcher for the three Browse sections. Each tab is a RouterLink to
// its own sub-route (/browse, /browse/commands, /browse/upgrades). Active state is
// computed explicitly because '/browse' is a prefix of the other two (so the default
// prefix-matching would light up "Units" on every section).
const route = useRoute()
const tabs = [
  { to: '/browse', label: 'Units' },
  { to: '/browse/commands', label: 'Commands' },
  { to: '/browse/upgrades', label: 'Upgrades' },
]
function isActive(to: string): boolean {
  const p = route.path
  if (to === '/browse') return !p.startsWith('/browse/commands') && !p.startsWith('/browse/upgrades')
  return p === to || p.startsWith(to + '/')
}
</script>

<template>
  <div class="mb-4 inline-flex rounded-xl border border-lg-border bg-lg-surface p-1">
    <RouterLink
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      class="rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors"
      :class="isActive(tab.to) ? 'text-lg-accent bg-lg-accent/10' : 'text-lg-muted hover:text-lg-accent'"
    >{{ tab.label }}</RouterLink>
  </div>
</template>

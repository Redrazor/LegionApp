<script setup lang="ts">
// The "What's New" changelog, opened from the footer version badge. MANDATORY: add a
// new entry at the top of `entries` before every `npm version` bump, and update the
// version string in App.vue's footer to match the top entry. (Mirrors ShatterApp.)
defineProps<{ show: boolean }>()
defineEmits<{ (e: 'close'): void }>()

const entries = [
  {
    version: '0.15.0',
    date: '2026-06-13',
    changes: [
      'Build — The Mandalorian Clans army now fields its full roster (16 units): Din Djarin, Bo-Katan Kryze, The Armorer, Ursa Wren, Paz Vizsla, Axe Woves, Mandalorian Warriors / Initiates, Clan Wren & Clan Kryze Veterans, and more — not just the four it had before',
      'Build — Those clan units count as native Mandalorians (no mercenary ally caps) when building a Mandalorian army',
    ],
  },
  {
    version: '0.14.1',
    date: '2026-06-13',
    changes: [
      'Build — Tapping a keyword in a unit\'s profile now shows its rulebook definition (previously this only worked on the Browse tab) — including weapon keywords',
      'App — Keyword definition popovers flip above the keyword when it\'s near the bottom of the screen, so they\'re always readable',
    ],
  },
  {
    version: '0.14.0',
    date: '2026-06-12',
    changes: [
      'Build — Equip upgrades inline: tap an army unit\'s upgrade slot to pick from its valid upgrades right in the left pane (the pop-out drawer is gone). Pick to equip, ✕ to close',
      'Build — Upgrade picker now shows each upgrade\'s card art and what it does (its keywords), not just a name',
      'Build — Inspect upgrades: tap Inspect in the picker to open a swipeable card gallery — flip through every option (full rules and art) and Select the one you want',
      'Build — Tap a unit in your army list to open its profile — a focused view with stats, weapons, and keyword definitions',
      'Data — Filled in missing upgrade keywords (e.g. Situational Awareness now shows Outmaneuver) so most upgrades say what they grant at a glance',
    ],
  },
  {
    version: '0.13.0',
    date: '2026-06-12',
    changes: [
      'App — New footer "What\'s New" changelog: tap the version badge to see every release and what changed',
      'App — Support the project with the new "Buy me a coffee on Ko-fi" link in the footer',
    ],
  },
  {
    version: '0.12.0',
    date: '2026-06-12',
    changes: [
      'Build — New always-visible unit catalogue grouped by rank: browse and add units without a popup. Desktop shows all six ranks with a rank-focus filter, tablet uses an accordion, and mobile a rank tab-strip',
      'Build — Clean round unit portrait icons across the catalogue and your army list',
      'Build — At-a-glance unit indicators on every row: defense die, wounds, upgrade-slot count, attack dice, and speed',
      'Build — Tap any unit to view its full profile (stats, weapons, keywords, upgrades) without leaving the builder',
    ],
  },
  {
    version: '0.11.0',
    date: '2026-06-12',
    changes: [
      'Build — Permanent rank-tracker footer: per-rank count chips (count · min–max) coloured when you are over or under, plus live points, activations, and a Legal/Illegal badge',
      'Build — Format switcher moved into the footer; tap the totals to expand the full army-status checklist in place',
    ],
  },
  {
    version: '0.10.0',
    date: '2026-06-12',
    changes: [
      'Build — New "Roster Canvas" layout: responsive Catalogue | Army panes with a pinned action footer, and a segmented Catalogue / My Army toggle on mobile',
    ],
  },
  {
    version: '0.9.0',
    date: '2026-06-12',
    changes: [
      'Build — Mercenary "Allies of Convenience": hire mercenaries into a faction by affiliation, with per-rank caps (≤2 Corps, ≤1 each other rank) and the no-minimum rule enforced',
    ],
  },
  {
    version: '0.8.0',
    date: '2026-06-12',
    changes: [
      'Build — Upgrade eligibility: the upgrade picker and the unit profile now only show upgrades a unit can legally equip',
    ],
  },
  {
    version: '0.7.0',
    date: '2026-06-12',
    changes: [
      'Build — Keyword build rules enforced via the validation checklist: Field Commander, Entourage, Detachment, and limited-upgrade copy caps',
    ],
  },
  {
    version: '0.6.0',
    date: '2026-06-10',
    changes: [
      'Build — Per-format rank limits and multiple game sizes: Recon 600 and Standard 1000 (2024 official), plus Standard-800 (legacy) and Grand Army 1600 (community)',
    ],
  },
  {
    version: '0.5.0',
    date: '2026-06-10',
    changes: [
      'Roll — Legion dice roller with red / black / white attack dice, surge conversion, and combat modifiers',
    ],
  },
  {
    version: '0.4.0',
    date: '2026-06-10',
    changes: [
      'Collection — Real product boxes from the Philibert catalogue with cover art',
    ],
  },
  {
    version: '0.3.0',
    date: '2026-06-10',
    changes: [
      'Factions — Mandalorians promoted to a first-class, selectable faction',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-06-10',
    changes: [
      'Browse — Unit catalogue grouped by faction with a slide-in profile drawer (stats, weapons, keywords, equippable upgrades)',
      'Build — Army-list builder with live rank / points / faction / uniqueness validation and shareable links',
      'Collection — Track which products you own',
      'Reference — Keyword glossary, with popovers on weapon keywords throughout the app',
      'Data — Single source of truth: current-edition (2024 "v2") cards from Legion HQ 2',
      'UI — Light and dark themes with a theme toggle',
    ],
  },
]
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center"
        @click.self="$emit('close')"
      >
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" @click="$emit('close')" />

        <div class="relative z-10 flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl border border-lg-border bg-lg-surface shadow-2xl">
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-lg-border px-5 py-4">
            <h2 class="font-display text-base font-bold uppercase tracking-widest text-lg-accent">What's New</h2>
            <button
              class="rounded-full bg-lg-dark/60 p-1.5 text-lg-muted transition-colors hover:text-lg-text"
              aria-label="Close"
              @click="$emit('close')"
            >✕</button>
          </div>

          <!-- Entries -->
          <div class="space-y-5 overflow-y-auto px-5 py-4">
            <div v-for="entry in entries" :key="entry.version">
              <div class="mb-1.5 flex items-baseline gap-2">
                <span class="font-display text-xs font-bold text-lg-accent">v{{ entry.version }}</span>
                <span class="text-[10px] text-lg-muted/60">{{ entry.date }}</span>
              </div>
              <ul class="space-y-1">
                <li
                  v-for="change in entry.changes" :key="change"
                  class="flex gap-2 text-xs text-lg-text/70"
                >
                  <span class="flex-shrink-0 text-lg-accent/40">·</span>
                  {{ change }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>

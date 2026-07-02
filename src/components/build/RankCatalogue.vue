<script setup lang="ts">
import { computed } from 'vue'
import type { BattleForce, Faction, Rank, Unit } from '../../types/index.ts'
import { catalogueForRank, isDetachment } from '../../utils/army.ts'
import { RANK_ORDER, rankName } from '../../utils/factions.ts'
import CatalogueUnitRow from './CatalogueUnitRow.vue'

// The always-visible Build catalogue, grouped by rank. One component tree that
// morphs across breakpoints:
//  • desktop — all 6 rank groups open at once, sticky headers, scrolls.
//  • tablet  — accordion: tapping a header opens that group, collapsing the rest.
//  • mobile  — a rank tab-strip; one rank's units shown at a time.
// Adding is universal (`add` emit); a unit's [+] is disabled when its rank is full.
const props = defineProps<{
  units: Unit[]
  faction: Faction | null
  battleForce: BattleForce | null
  // Per-rank current army count + per-format min/max (gating matches the footer).
  counts: Record<Rank, number>
  // Detachment units per rank — exempt from the rank maximum (rulebook).
  detachmentCounts: Record<Rank, number>
  // Entourage-exempt units per rank — also don't count toward the max (rulebook).
  entourageExempt: Record<Rank, number>
  // Unit names addable over the cap right now (an entourage unit with a spare grant).
  coverableNames: ReadonlySet<string>
  limits: Record<Rank, { min: number; max: number }>
  // Lowercased names + ranks already in the army, for Detachment availability gating.
  presentParents: ReadonlySet<string>
  isMobile: boolean
  isDesktop: boolean
}>()

defineEmits<{ add: [unitId: string]; view: [unitId: string] }>()

// Filter/browse state is exposed as models so the parent (BuildView) can own it — that
// way it survives this component unmounting while the contextual upgrade picker is open,
// and the user returns to the same search + rank filter they left. Defaults apply only
// when used without a bound v-model.
const query = defineModel<string>('query', { default: '' })
// Which rank is open (tablet accordion) / selected (mobile tab-strip). `null` = all
// collapsed (tablet only); desktop ignores it (every group is open). The mobile
// tab-strip always shows a rank, falling back to the first when none is open.
const activeRank = defineModel<Rank | null>('activeRank', { default: 'commander' })
const mobileRank = computed<Rank>(() => activeRank.value ?? RANK_ORDER[0])

// Desktop rank focus: 'all' shows every group at once (default); a rank narrows the
// catalogue to just that group. Lets desktop focus one rank like mobile's tab-strip.
const desktopFocus = defineModel<Rank | 'all'>('desktopFocus', { default: 'all' })
function desktopShows(rank: Rank): boolean {
  return desktopFocus.value === 'all' || desktopFocus.value === rank
}

const RANK_ABBR: Record<Rank, string> = {
  commander: 'Cmd', operative: 'Op', corps: 'Corps',
  special: 'Spec', support: 'Sup', heavy: 'Heavy',
}

const candidatesByRank = computed(() => {
  const out = {} as Record<Rank, Unit[]>
  for (const rank of RANK_ORDER) {
    out[rank] = catalogueForRank(props.units, props.faction, rank, query.value, props.presentParents, props.battleForce)
  }
  return out
})

// A unit's [+] is disabled when its rank is full — but detachments and entourage-coverable
// units don't count toward the max, so they're never blocked, and the max is measured
// against the non-detachment, non-entourage count.
function unitAddDisabled(rank: Rank, unit: Unit): boolean {
  if (isDetachment(unit)) return false
  if (props.coverableNames.has(unit.name.toLowerCase())) return false
  return props.counts[rank] - props.detachmentCounts[rank] - props.entourageExempt[rank] >= props.limits[rank].max
}

// Units counting toward the rank max (entourage units are exempt, shown as a "+N" extra).
function countingCount(rank: Rank): number {
  return props.counts[rank] - props.entourageExempt[rank]
}

// Tablet accordion: a header toggles its group (click the open one to collapse all);
// on desktop headers don't collapse.
function toggleRank(rank: Rank) {
  if (props.isDesktop) return
  activeRank.value = activeRank.value === rank ? null : rank
}
</script>

<template>
  <div class="flex h-full flex-col no-print">
    <!-- Search (shared across all breakpoints) -->
    <input
      v-model="query"
      type="search"
      placeholder="Search units…"
      class="mb-3 w-full flex-none rounded-lg border border-lg-border bg-lg-dark px-3 py-2 text-base text-lg-text placeholder:text-lg-muted/60 focus:border-lg-accent/60 focus:outline-none"
    />

    <!-- MOBILE: rank tab-strip + the active rank's units -->
    <template v-if="isMobile">
      <div class="-mx-1 mb-3 flex flex-none gap-1 overflow-x-auto px-1 pb-1">
        <button
          v-for="rank in RANK_ORDER" :key="rank"
          class="flex-none rounded-lg border px-2.5 py-1.5 text-xs font-semibold tabular-nums transition-colors"
          :class="mobileRank === rank
            ? 'border-lg-accent/50 bg-lg-accent/20 text-lg-accent'
            : 'border-lg-border bg-lg-surface text-lg-muted'"
          @click="activeRank = rank"
        >
          {{ RANK_ABBR[rank] }}
          <span class="opacity-70">{{ countingCount(rank) }}/{{ limits[rank].max }}<span v-if="entourageExempt[rank]" class="text-lg-holo">+{{ entourageExempt[rank] }}</span></span>
        </button>
      </div>
      <div class="flex-1 space-y-1 overflow-y-auto">
        <CatalogueUnitRow
          v-for="u in candidatesByRank[mobileRank]" :key="u.id"
          :unit="u" :disabled="unitAddDisabled(mobileRank, u)" :show-speed="isDesktop" @add="$emit('add', $event)" @view="$emit('view', $event)"
        />
        <p v-if="!candidatesByRank[mobileRank].length" class="py-8 text-center text-sm text-lg-muted">
          No matching {{ rankName(mobileRank).toLowerCase() }} units.
        </p>
      </div>
    </template>

    <!-- DESKTOP (all groups, optional rank focus) + TABLET (accordion) -->
    <template v-else>
      <!-- Desktop rank-focus chips -->
      <div v-if="isDesktop" class="-mx-1 mb-3 flex flex-none flex-wrap gap-1 px-1">
        <button
          class="rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors"
          :class="desktopFocus === 'all' ? 'border-lg-accent/50 bg-lg-accent/20 text-lg-accent' : 'border-lg-border bg-lg-surface text-lg-muted'"
          @click="desktopFocus = 'all'"
        >All</button>
        <button
          v-for="rank in RANK_ORDER" :key="rank"
          class="rounded-lg border px-2.5 py-1 text-xs font-semibold tabular-nums transition-colors"
          :class="desktopFocus === rank ? 'border-lg-accent/50 bg-lg-accent/20 text-lg-accent' : 'border-lg-border bg-lg-surface text-lg-muted'"
          @click="desktopFocus = rank"
        >
          {{ RANK_ABBR[rank] }}
          <span class="opacity-70">{{ countingCount(rank) }}/{{ limits[rank].max }}<span v-if="entourageExempt[rank]" class="text-lg-holo">+{{ entourageExempt[rank] }}</span></span>
        </button>
      </div>

      <div class="flex-1 space-y-1 overflow-y-auto">
        <section v-for="rank in RANK_ORDER" :key="rank" v-show="!isDesktop || desktopShows(rank)">
          <button
            class="sticky top-0 z-10 flex w-full items-center justify-between gap-2 bg-lg-bg/95 px-1 py-1.5 text-left backdrop-blur-sm"
            :class="isDesktop ? 'cursor-default' : 'hover:text-lg-accent'"
            @click="toggleRank(rank)"
          >
            <span class="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-widest text-lg-text/80">
              {{ rankName(rank) }}
              <span class="text-xs font-normal text-lg-muted tabular-nums">
                {{ countingCount(rank) }}<span v-if="entourageExempt[rank]" class="text-lg-holo">+{{ entourageExempt[rank] }}</span><span v-if="limits[rank].min > 0 || limits[rank].max"> · {{ limits[rank].min }}–{{ limits[rank].max }}</span>
              </span>
            </span>
            <span v-if="!isDesktop" class="text-lg-muted/70 transition-transform" :class="activeRank === rank ? 'rotate-180' : ''" aria-hidden="true">⌃</span>
          </button>
          <div v-show="isDesktop || activeRank === rank" class="space-y-1 pb-2">
            <CatalogueUnitRow
              v-for="u in candidatesByRank[rank]" :key="u.id"
              :unit="u" :disabled="unitAddDisabled(rank, u)" :show-speed="isDesktop" @add="$emit('add', $event)" @view="$emit('view', $event)"
            />
            <p v-if="!candidatesByRank[rank].length" class="px-1 py-3 text-center text-xs text-lg-muted">
              No matching {{ rankName(rank).toLowerCase() }} units.
            </p>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

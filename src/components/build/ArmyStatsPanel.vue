<script setup lang="ts">
import { computed } from 'vue'
import { Doughnut, Bar } from 'vue-chartjs'
import {
  Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend,
} from 'chart.js'
import type { ArmyStats } from '../../utils/armyStats.ts'

// Army Stats panel (Epic F1): a slide-in analytics breakdown of the built list —
// composition, offense (dice-EV engine), durability, mobility/morale, keyword
// tallies. Teleported to <body> like the other build overlays; right-side sheet on
// desktop, bottom sheet on mobile. All numbers are pre-derived by computeArmyStats.
ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const props = defineProps<{ show: boolean; stats: ArmyStats; empty: boolean }>()
const emit = defineEmits<{ close: [] }>()

// Resolve a theme token to its hex so the charts follow light/dark. Charts are
// rebuilt whenever the panel reopens, which is enough for a theme toggle to take.
function cssVar(name: string): string {
  if (typeof document === 'undefined') return '#888'
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888'
}

const RANK_COLOR: Record<string, string> = {
  commander: '--color-lg-accent',
  operative: '--color-lg-holo',
  corps: '--color-faction-republic',
  special: '--color-faction-separatists',
  support: '--color-faction-mercenary',
  heavy: '--color-faction-rebels',
}

const s = computed(() => props.stats)

const rankDonut = computed(() => ({
  labels: s.value.pointsByRank.map((r) => r.label),
  datasets: [{
    data: s.value.pointsByRank.map((r) => r.points),
    backgroundColor: s.value.pointsByRank.map((r) => cssVar(RANK_COLOR[r.rank] ?? '--color-lg-muted')),
    borderColor: cssVar('--color-lg-surface'),
    borderWidth: 2,
  }],
}))

const donutOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '62%',
  plugins: {
    // On mobile the panel is a ~375px bottom sheet, so a right-side legend cramps the
    // donut — drop it below. Non-reactive read at render is fine (panel remounts on open).
    legend: { position: (window.innerWidth < 640 ? 'bottom' : 'right') as 'bottom' | 'right', labels: { color: cssVar('--color-lg-muted'), boxWidth: 12, font: { size: 11 } } },
    tooltip: { callbacks: { label: (c: { label: string; parsed: number }) => `${c.label}: ${c.parsed} pts` } },
  },
}))

const damageBar = computed(() => ({
  labels: s.value.rangeBands.map((b) => b.label),
  datasets: [
    { label: 'Hits', data: s.value.rangeBands.map((b) => b.hits), backgroundColor: cssVar('--color-lg-accent'), stack: 'dmg' },
    { label: 'Crits', data: s.value.rangeBands.map((b) => b.crits), backgroundColor: cssVar('--color-lg-holo'), stack: 'dmg' },
  ],
}))

const barOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: cssVar('--color-lg-muted'), boxWidth: 12, font: { size: 11 } } },
  },
  scales: {
    x: { stacked: true, ticks: { color: cssVar('--color-lg-muted'), font: { size: 10 } }, grid: { display: false } },
    y: { stacked: true, beginAtZero: true, ticks: { color: cssVar('--color-lg-muted'), font: { size: 10 } }, grid: { color: cssVar('--color-lg-border') } },
  },
}))

const totalDice = computed(() => s.value.attackPool.red + s.value.attackPool.black + s.value.attackPool.white)
const upgradePct = computed(() => (s.value.totalPoints ? Math.round((s.value.upgradePoints / s.value.totalPoints) * 100) : 0))
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <!-- Closes only via the ✕ (no click-outside). On desktop the wrapper is
           pointer-events-none so the rest of the builder stays visible + usable
           behind the docked panel; mobile keeps a tap-blocking backdrop. -->
      <div
        v-if="show"
        class="pointer-events-none fixed inset-0 z-[70] flex items-end justify-center sm:items-stretch sm:justify-end"
      >
        <div class="pointer-events-auto absolute inset-0 bg-black/60 sm:hidden" />

        <div class="pointer-events-auto relative z-10 flex max-h-[88vh] w-full flex-col rounded-t-2xl border border-lg-border bg-lg-surface shadow-2xl sm:max-h-none sm:max-w-md sm:rounded-none sm:rounded-l-2xl sm:border-l">
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-lg-border px-5 py-4">
            <h2 class="font-display text-base font-bold uppercase tracking-widest text-lg-accent">Army Stats</h2>
            <button class="grid h-10 w-10 place-items-center rounded-full bg-lg-dark/60 text-lg-muted transition-colors hover:text-lg-text" aria-label="Close" @click="emit('close')">✕</button>
          </div>

          <!-- Empty state -->
          <div v-if="empty" class="flex flex-1 items-center justify-center px-6 py-16 text-center text-sm text-lg-muted">
            Add units to your list to see its statistics.
          </div>

          <!-- Body -->
          <div v-else class="flex flex-col gap-6 overflow-y-auto px-5 py-5">
            <!-- ── Composition ── -->
            <section>
              <h3 class="mb-2 text-[11px] font-bold uppercase tracking-widest text-lg-muted">Composition</h3>
              <div class="grid grid-cols-4 gap-2 text-center">
                <div class="rounded-lg bg-lg-dark/60 py-2">
                  <p class="font-display text-lg font-bold text-lg-text">{{ s.totalPoints }}</p>
                  <p class="text-[10px] uppercase tracking-wider text-lg-muted">Points</p>
                </div>
                <div class="rounded-lg bg-lg-dark/60 py-2">
                  <p class="font-display text-lg font-bold text-lg-text">{{ s.activations }}</p>
                  <p class="text-[10px] uppercase tracking-wider text-lg-muted">Activations</p>
                </div>
                <div class="rounded-lg bg-lg-dark/60 py-2">
                  <p class="font-display text-lg font-bold text-lg-text">{{ s.models }}</p>
                  <p class="text-[10px] uppercase tracking-wider text-lg-muted">Models</p>
                </div>
                <div class="rounded-lg bg-lg-dark/60 py-2">
                  <p class="font-display text-lg font-bold text-lg-text">{{ s.avgUnitCost }}</p>
                  <p class="text-[10px] uppercase tracking-wider text-lg-muted">Avg cost</p>
                </div>
              </div>
              <p class="mt-2 text-xs text-lg-muted">
                Units <span class="text-lg-text/80">{{ s.unitPoints }}</span> · Upgrades
                <span class="text-lg-text/80">{{ s.upgradePoints }}</span> ({{ upgradePct }}%)
              </p>
              <div v-if="s.pointsByRank.length" class="mt-2 h-44">
                <Doughnut :data="rankDonut" :options="donutOptions" />
              </div>
            </section>

            <!-- ── Offense ── -->
            <section>
              <h3 class="mb-2 text-[11px] font-bold uppercase tracking-widest text-lg-muted">Offense</h3>
              <div class="mb-2 flex items-center gap-3 text-sm">
                <span class="text-lg-muted">Attack pool</span>
                <span class="flex items-center gap-1.5 font-semibold tabular-nums">
                  <span class="inline-flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-full" style="background:#e2483d" />{{ s.attackPool.red }}</span>
                  <span class="inline-flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-full" style="background:#3a3a40;outline:1px solid var(--color-lg-border)" />{{ s.attackPool.black }}</span>
                  <span class="inline-flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-full" style="background:#e8e8ec;outline:1px solid var(--color-lg-border)" />{{ s.attackPool.white }}</span>
                  <span class="text-lg-muted">= {{ totalDice }}</span>
                </span>
              </div>
              <p class="mb-2 text-xs text-lg-muted">
                Melee dice <span class="text-lg-text/80">{{ s.meleePool.red + s.meleePool.black + s.meleePool.white }}</span> ·
                Ranged dice <span class="text-lg-text/80">{{ s.rangedPool.red + s.rangedPool.black + s.rangedPool.white }}</span>
              </p>
              <p class="mb-1 text-xs text-lg-muted">Expected hits + crits by range (no defender):</p>
              <div class="h-40">
                <Bar :data="damageBar" :options="barOptions" />
              </div>
              <div v-if="s.weaponKeywords.length" class="mt-3 flex flex-wrap gap-1.5">
                <span v-for="k in s.weaponKeywords" :key="k.keyword" class="rounded-full border border-lg-border bg-lg-dark/50 px-2 py-0.5 text-[11px] text-lg-text/80">
                  {{ k.keyword }} <span class="text-lg-accent">×{{ k.count }}</span>
                </span>
              </div>
            </section>

            <!-- ── Defence / durability ── -->
            <section>
              <h3 class="mb-2 text-[11px] font-bold uppercase tracking-widest text-lg-muted">Defence &amp; durability</h3>
              <div class="grid grid-cols-3 gap-2 text-center">
                <div class="rounded-lg bg-lg-dark/60 py-2">
                  <p class="font-display text-lg font-bold text-lg-text">{{ s.totalWounds }}</p>
                  <p class="text-[10px] uppercase tracking-wider text-lg-muted">Wounds</p>
                </div>
                <div class="rounded-lg bg-lg-dark/60 py-2">
                  <p class="font-display text-lg font-bold text-lg-text">{{ s.effectiveHP }}</p>
                  <p class="text-[10px] uppercase tracking-wider text-lg-muted">Eff. HP</p>
                </div>
                <div class="rounded-lg bg-lg-dark/60 py-2">
                  <p class="font-display text-lg font-bold text-lg-text">{{ Math.round(s.avgDefenseSave * 100) }}%</p>
                  <p class="text-[10px] uppercase tracking-wider text-lg-muted">Avg save</p>
                </div>
              </div>
              <p class="mt-2 text-xs text-lg-muted">
                Defence dice — <span class="text-faction-rebels">{{ s.redDefenseUnits }} red</span> ·
                <span class="text-lg-text/80">{{ s.whiteDefenseUnits }} white</span> ·
                {{ s.surgeDefenseUnits }} with defence surge
              </p>
            </section>

            <!-- ── Mobility & morale ── -->
            <section>
              <h3 class="mb-2 text-[11px] font-bold uppercase tracking-widest text-lg-muted">Mobility &amp; morale</h3>
              <p class="text-xs text-lg-muted">
                Avg speed <span class="text-lg-text/80">{{ s.avgSpeed }}</span>
                <span v-if="s.speeds.length"> ({{ s.speeds.map((sp) => `${sp.count}×spd ${sp.speed}`).join(', ') }})</span>
              </p>
              <p class="mt-1 text-xs text-lg-muted">
                Avg courage <span class="text-lg-text/80">{{ s.avgCourage }}</span> ·
                {{ s.fearlessUnits }} Fearless · {{ s.couragelessUnits }} courage-less
              </p>
              <p v-if="s.jumpUnits || s.climbUnits" class="mt-1 text-xs text-lg-muted">
                <span v-if="s.jumpUnits">{{ s.jumpUnits }} Jump</span>
                <span v-if="s.jumpUnits && s.climbUnits"> · </span>
                <span v-if="s.climbUnits">{{ s.climbUnits }} Climb</span>
              </p>
            </section>

            <!-- ── Keyword tallies ── -->
            <section v-if="s.unitKeywords.length">
              <h3 class="mb-2 text-[11px] font-bold uppercase tracking-widest text-lg-muted">Keywords</h3>
              <div class="flex flex-wrap gap-1.5">
                <span v-for="k in s.unitKeywords.slice(0, 24)" :key="k.keyword" class="rounded-full border border-lg-border bg-lg-dark/50 px-2 py-0.5 text-[11px] text-lg-text/80">
                  {{ k.keyword }} <span class="text-lg-muted">×{{ k.count }}</span>
                </span>
              </div>
            </section>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

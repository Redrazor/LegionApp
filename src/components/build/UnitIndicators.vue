<script setup lang="ts">
import { computed } from 'vue'
import type { Unit, Weapon } from '../../types/index.ts'
import { bestWeapons } from '../../utils/bestWeapons.ts'

// The glanceable list-building signals shown under a unit's name: durability (defense die +
// wounds + miniatures) and capability (upgrade-slot count + best weapons), plus desktop-only
// speed. Shared by the Build catalogue row and army-list card. `models` overrides the printed
// mini count (the army card passes the live count incl. mini-adding upgrades). `hideModels`
// suppresses the mini count when the caller shows it elsewhere (the army card leads its row
// with it). `extraWeapons` are weapons granted by equipped upgrades, folded into the best-of
// computation so an equipped heavy weapon can become the displayed ranged profile.
const props = defineProps<{
  unit: Unit
  showSpeed?: boolean
  models?: number
  hideModels?: boolean
  extraWeapons?: Weapon[]
}>()

const modelCount = computed(() => props.models ?? props.unit.miniCount ?? 0)
const slots = computed(() => props.unit.upgradeBar.length)

// Best ranged + best melee by expected wounds (probability of inflicting wounds), under the
// unit's surge chart — NOT raw dice count. Includes any upgrade-granted weapons.
const best = computed(() =>
  bestWeapons([...props.unit.weapons, ...(props.extraWeapons ?? [])], props.unit.surgeAttack ?? 'blank'),
)
function pips(w: { dice: { red: number; black: number; white: number } }): string[] {
  return [
    ...Array.from({ length: w.dice.red }, () => 'red'),
    ...Array.from({ length: w.dice.black }, () => 'black'),
    ...Array.from({ length: w.dice.white }, () => 'white'),
  ]
}
function diceTitle(w: Weapon): string {
  return `${w.name}: ${w.dice.red}r ${w.dice.black}b ${w.dice.white}w`
}

const PIP_CLASS: Record<string, string> = {
  red: 'bg-red-500',
  black: 'bg-neutral-800 ring-1 ring-inset ring-white/30',
  white: 'bg-neutral-100',
}
</script>

<template>
  <span class="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-lg-muted">
    <span class="flex items-center gap-1.5">
      <span
        v-if="unit.defense"
        class="inline-block h-3 w-3 flex-none rounded-[3px]"
        :class="[unit.defense === 'red' ? 'bg-red-500' : 'bg-neutral-200', unit.surgeDefense ? 'ring-1 ring-lg-accent ring-offset-1 ring-offset-lg-bg' : '']"
        :title="`${unit.defense === 'red' ? 'Red' : 'White'} defense${unit.surgeDefense ? ' · defensive surge' : ''}`"
      />
      <span v-if="unit.wounds != null" title="Wounds">♥ {{ unit.wounds }}</span>
      <span v-if="!hideModels && modelCount" class="flex items-center gap-0.5" :title="`${modelCount} miniature${modelCount === 1 ? '' : 's'}`">
        <svg viewBox="0 0 16 16" class="h-3 w-3 flex-none" fill="currentColor" aria-hidden="true">
          <circle cx="8" cy="3.5" r="2.5" />
          <path d="M3 15v-2a5 5 0 0 1 10 0v2z" />
        </svg>
        <span class="tabular-nums">{{ modelCount }}</span>
      </span>
      <span v-if="slots" class="tabular-nums" :title="`${slots} upgrade slot${slots === 1 ? '' : 's'}`">⬡ {{ slots }}</span>
    </span>

    <!-- Best ranged (R:) over best melee (M:), each by expected wounds. -->
    <span v-if="best.ranged || best.melee" class="flex flex-col gap-0.5">
      <span v-if="best.ranged" class="flex items-center gap-1" :title="`Ranged — ${diceTitle(best.ranged)}`">
        <span class="font-bold text-lg-text/60">R:</span>
        <span class="flex items-center gap-0.5">
          <span v-for="(c, i) in pips(best.ranged)" :key="`r${i}`" class="inline-block h-2 w-2 rounded-full" :class="PIP_CLASS[c]" />
        </span>
      </span>
      <span v-if="best.melee" class="flex items-center gap-1" :title="`Melee — ${diceTitle(best.melee)}`">
        <span class="font-bold text-lg-text/60">M:</span>
        <span class="flex items-center gap-0.5">
          <span v-for="(c, i) in pips(best.melee)" :key="`m${i}`" class="inline-block h-2 w-2 rounded-full" :class="PIP_CLASS[c]" />
        </span>
      </span>
    </span>

    <span v-if="showSpeed && unit.speed != null" class="font-semibold tracking-tight" :title="`Speed ${unit.speed}`">{{ '›'.repeat(unit.speed) || '–' }}</span>
  </span>
</template>

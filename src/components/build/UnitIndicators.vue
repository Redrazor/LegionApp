<script setup lang="ts">
import { computed } from 'vue'
import type { Unit } from '../../types/index.ts'
import { primaryWeaponDice } from '../../utils/army.ts'

// The glanceable list-building signals shown under a unit's name, in two clusters:
// durability (defense die + wounds) and capability (upgrade-slot count + best-weapon
// dice), plus desktop-only speed. Shared by the catalogue row and army-list card.
const props = defineProps<{ unit: Unit; showSpeed?: boolean }>()

const dice = computed(() => primaryWeaponDice(props.unit))
const dicePips = computed(() => [
  ...Array.from({ length: dice.value.red }, () => 'red'),
  ...Array.from({ length: dice.value.black }, () => 'black'),
  ...Array.from({ length: dice.value.white }, () => 'white'),
])
const slots = computed(() => props.unit.upgradeBar.length)

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
    </span>

    <span class="flex items-center gap-1.5">
      <span v-if="slots" class="tabular-nums" :title="`${slots} upgrade slot${slots === 1 ? '' : 's'}`">⬡ {{ slots }}</span>
      <span v-if="dicePips.length" class="flex items-center gap-0.5" :title="`Attack: ${dice.red}r ${dice.black}b ${dice.white}w`">
        <span v-for="(c, i) in dicePips" :key="i" class="inline-block h-2 w-2 rounded-full" :class="PIP_CLASS[c]" />
      </span>
    </span>

    <span v-if="showSpeed && unit.speed != null" class="font-semibold tracking-tight" :title="`Speed ${unit.speed}`">{{ '›'.repeat(unit.speed) || '–' }}</span>
  </span>
</template>

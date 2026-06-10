<script setup lang="ts">
import { ref } from 'vue'
import { useHead } from '@vueuse/head'
import DiceRoller from '../components/dice/DiceRoller.vue'
import ProbabilityCalculator from '../components/dice/ProbabilityCalculator.vue'

const activeTab = ref<'roller' | 'probability'>('roller')

useHead({
  title: 'Dice Roller — LegionApp',
  meta: [
    { name: 'description', content: 'Roll Star Wars: Legion attack and defense dice with surge, aim, cover, dodge and pierce, plus a wound-probability calculator.' },
  ],
})
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold text-lg-accent">Dice Roller</h1>

    <div class="flex gap-1 rounded-xl bg-black/20 p-1">
      <button
        v-for="tab in [{ id: 'roller', label: 'Roller' }, { id: 'probability', label: 'Probability' }]"
        :key="tab.id"
        :class="[
          'flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
          activeTab === tab.id ? 'bg-lg-accent text-lg-bg' : 'text-lg-text/60 hover:text-lg-text',
        ]"
        @click="activeTab = tab.id as 'roller' | 'probability'"
      >{{ tab.label }}</button>
    </div>

    <DiceRoller v-if="activeTab === 'roller'" />
    <ProbabilityCalculator v-else />
  </div>
</template>

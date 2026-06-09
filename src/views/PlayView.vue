<script setup lang="ts">
const roadmap = [
  'Live unit tracker — wounds, suppression, tokens & damage per unit',
  'Command-pip play — step through your command hierarchy each turn',
  'Order pool & priority — draw and resolve activations',
  'Battle deck — objective, deployment & condition card flow',
  'Multiplayer — share a room code and sync the table in real time',
]
</script>

<template>
  <div class="mx-auto max-w-2xl py-12 text-center">
    <div class="mb-4 inline-flex items-center gap-2 rounded-full border border-lg-gold/30 bg-lg-gold/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-lg-gold">
      Coming soon
    </div>
    <h1 class="font-display text-3xl font-bold uppercase tracking-wider text-lg-text">Play Mode</h1>
    <p class="mx-auto mt-3 max-w-md text-sm text-lg-muted">
      A tabletop companion for running your games — track the battle from deployment to the final round, right from your phone.
    </p>

    <ul class="mx-auto mt-8 max-w-md space-y-2 text-left">
      <li
        v-for="(item, i) in roadmap" :key="i"
        class="flex items-start gap-3 rounded-lg border border-lg-border bg-lg-surface px-4 py-3 text-sm text-lg-text/80"
      >
        <span class="mt-0.5 text-lg-gold">◆</span>
        <span>{{ item }}</span>
      </li>
    </ul>

    <p class="mt-8 text-xs text-lg-muted/70">
      Build and save your armies in the <RouterLink to="/build" class="text-lg-gold hover:underline">Build</RouterLink> tab now —
      they'll be ready to play the moment this lands.
    </p>
  </div>
</template>

<script setup lang="ts">
import { useHead } from '@vueuse/head'

useHead({
  title: 'Play (Coming Soon) — LegionApp',
  meta: [
    { name: 'description', content: 'A live at-the-table Star Wars: Legion game tracker — wounds, suppression, tokens, command pips and real-time multiplayer. Coming soon to LegionApp.' },
    { property: 'og:title', content: 'Play (Coming Soon) — LegionApp' },
    { property: 'og:description', content: 'A live at-the-table Star Wars: Legion game tracker with real-time multiplayer. Coming soon.' },
    { property: 'og:url', content: 'https://www.legion-app.com/play' },
  ],
  link: [{ rel: 'canonical', href: 'https://www.legion-app.com/play' }],
})

const roadmap = [
  'Live unit tracker — wounds, suppression, tokens & damage per unit',
  'Command-pip play — step through your command hierarchy each turn',
  'Order pool & priority — draw and resolve activations',
  'Battle deck — objective, deployment & condition card flow',
  'Multiplayer — share a room code and sync the table in real time',
]
</script>

<template>
  <div class="mx-auto max-w-2xl py-8 text-center sm:py-12">
    <div class="mb-4 inline-flex items-center gap-2 rounded-full border border-lg-accent/30 bg-lg-accent/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-lg-accent">
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
        <span class="mt-0.5 text-lg-accent">◆</span>
        <span>{{ item }}</span>
      </li>
    </ul>

    <p class="mt-8 text-xs text-lg-muted/70">
      Build and save your armies in the <RouterLink to="/build" class="text-lg-accent hover:underline">Build</RouterLink> tab now —
      they'll be ready to play the moment this lands.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useTheme } from './composables/useTheme.ts'
import { Analytics } from '@vercel/analytics/vue'
import ChangelogModal from './components/ChangelogModal.vue'

const menuOpen = ref(false)
const showChangelog = ref(false)
const APP_VERSION = '1.7.1' // keep in sync with package.json + ChangelogModal's top entry
const router = useRouter()
const { theme, toggle, init } = useTheme()

const routes = [
  { to: '/browse', label: 'Browse' },
  { to: '/build', label: 'Build' },
  { to: '/play', label: 'Play' },
  { to: '/collection', label: 'Collection' },
  { to: '/reference', label: 'Reference' },
  { to: '/roll', label: 'Roll' },
]

function closeMenu() { menuOpen.value = false }
router.afterEach(closeMenu)
onMounted(init)
</script>

<template>
  <div class="min-h-screen bg-lg-bg text-lg-text flex flex-col">
    <!-- Nav -->
    <nav class="border-b border-lg-border bg-lg-surface/85 backdrop-blur-md sticky top-0 z-40">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <RouterLink to="/browse" class="flex items-center gap-2 group">
          <span class="grid h-7 w-7 place-items-center rounded-md bg-lg-brand/15 text-lg-brand group-hover:bg-lg-brand/25 transition-colors">
            <svg viewBox="0 0 24 24" class="h-[19px] w-[19px]" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="7.1" />
              <line x1="5" y1="10.9" x2="19" y2="10.9" />
              <circle cx="9" cy="7.9" r="1.7" fill="currentColor" stroke="none" />
            </svg>
          </span>
          <span class="font-display text-lg font-bold tracking-widest text-lg-text uppercase">Legion<span class="text-lg-brand">App</span></span>
        </RouterLink>

        <!-- Desktop links + theme toggle -->
        <div class="hidden sm:flex items-center gap-1">
          <RouterLink
            v-for="route in routes" :key="route.to"
            :to="route.to"
            class="rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors text-lg-text/65 hover:text-lg-accent"
            active-class="text-lg-accent bg-lg-accent/10"
          >{{ route.label }}</RouterLink>
          <button
            class="ml-1 grid h-8 w-8 place-items-center rounded-lg text-lg-muted hover:text-lg-accent hover:bg-lg-text/8 transition-colors"
            :aria-label="theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
            :title="theme === 'dark' ? 'Light theme' : 'Dark theme'"
            @click="toggle"
          >
            <svg v-if="theme === 'dark'" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1.5m0 15V21m9-9h-1.5m-15 0H3m15.36 6.36-1.06-1.06M6.7 6.7 5.64 5.64m12.72 0L17.3 6.7M6.7 17.3l-1.06 1.06M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" /></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 15.5A9 9 0 1 1 8.5 2.25a7 7 0 0 0 13.25 13.25Z" /></svg>
          </button>
        </div>

        <!-- Hamburger (mobile) -->
        <button
          class="sm:hidden flex flex-col justify-center items-center gap-1.5 w-9 h-9 rounded-lg hover:bg-lg-text/8 transition-colors"
          aria-label="Toggle menu"
          @click="menuOpen = !menuOpen"
        >
          <span :class="['block h-0.5 w-5 bg-lg-text/70 transition-all duration-200', menuOpen ? 'translate-y-2 rotate-45' : '']" />
          <span :class="['block h-0.5 w-5 bg-lg-text/70 transition-all duration-200', menuOpen ? 'opacity-0' : '']" />
          <span :class="['block h-0.5 w-5 bg-lg-text/70 transition-all duration-200', menuOpen ? '-translate-y-2 -rotate-45' : '']" />
        </button>
      </div>

      <!-- Mobile dropdown -->
      <Transition name="menu-slide">
        <div v-if="menuOpen" class="sm:hidden border-t border-lg-border bg-lg-surface/95 px-2 py-2">
          <RouterLink
            v-for="route in routes" :key="route.to"
            :to="route.to"
            class="flex items-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors text-lg-text/70 hover:text-lg-accent hover:bg-lg-text/8"
            active-class="text-lg-accent bg-lg-accent/10"
            @click="closeMenu"
          >{{ route.label }}</RouterLink>
          <button
            class="flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-lg-text/70 hover:text-lg-accent hover:bg-lg-text/8"
            @click="toggle"
          >{{ theme === 'dark' ? '☀ Light theme' : '☾ Dark theme' }}</button>
        </div>
      </Transition>
    </nav>

    <!-- Main content -->
    <main class="mx-auto w-full max-w-7xl px-4 py-6 flex-1">
      <RouterView />
    </main>

    <!-- Footer -->
    <footer class="border-t border-lg-border bg-lg-surface/80 py-4 text-center text-sm text-lg-text/55 space-y-1 no-print">
      <div>
        <span>LegionApp — fan-made companion for Star Wars: Legion</span>
        <span class="mx-2">·</span>
        <a href="https://ko-fi.com/redrazor" target="_blank" rel="noopener" class="text-lg-accent hover:underline">Buy me a coffee on Ko-fi ☕</a>
        <span class="mx-2">·</span>
        <a href="https://github.com/Redrazor" target="_blank" rel="noopener" class="hover:underline text-lg-accent">GitHub</a>
        <span class="mx-2">·</span>
        <a href="https://shatterapp.com" target="_blank" rel="noopener" class="hover:underline text-lg-accent">Play Shatterpoint? Try ShatterApp ↗</a>
      </div>
      <div class="text-xs text-lg-text/35 px-4">
        Unofficial fan tool, not affiliated with Atomic Mass Games or Lucasfilm Ltd. Star Wars: Legion and all related
        marks, card text, and artwork are © Atomic Mass Games, Lucasfilm Ltd. &amp; Disney. Card data via Legion HQ.
        <span class="mx-2">·</span>
        <button class="text-lg-text/30 transition-colors hover:text-lg-accent" @click="showChangelog = true">v{{ APP_VERSION }}</button>
      </div>
    </footer>
  </div>

  <ChangelogModal :show="showChangelog" @close="showChangelog = false" />
  <Analytics />
</template>

<style>
.menu-slide-enter-active,
.menu-slide-leave-active { transition: all 0.2s ease; }
.menu-slide-enter-from,
.menu-slide-leave-to { opacity: 0; transform: translateY(-6px); }
</style>

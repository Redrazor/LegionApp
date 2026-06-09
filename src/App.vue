<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'

const menuOpen = ref(false)
const router = useRouter()

const routes = [
  { to: '/browse', label: 'Browse' },
  { to: '/build', label: 'Build' },
  { to: '/play', label: 'Play' },
  { to: '/collection', label: 'Collection' },
  { to: '/reference', label: 'Reference' },
]

function closeMenu() { menuOpen.value = false }
router.afterEach(closeMenu)
</script>

<template>
  <div class="min-h-screen bg-lg-bg text-lg-text flex flex-col">
    <!-- Nav -->
    <nav class="border-b border-lg-border bg-lg-surface/85 backdrop-blur-md sticky top-0 z-40">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <RouterLink to="/browse" class="flex items-center gap-2 group">
          <span class="grid h-7 w-7 place-items-center rounded-md bg-lg-gold/15 text-lg-gold font-display font-black text-sm group-hover:bg-lg-gold/25 transition-colors">L</span>
          <span class="font-display text-lg font-bold tracking-widest text-lg-gold uppercase">LegionApp</span>
        </RouterLink>

        <!-- Desktop links -->
        <div class="hidden sm:flex items-center gap-1">
          <RouterLink
            v-for="route in routes" :key="route.to"
            :to="route.to"
            class="rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors text-lg-text/65 hover:text-lg-gold"
            active-class="text-lg-gold bg-lg-gold/10"
          >{{ route.label }}</RouterLink>
        </div>

        <!-- Hamburger (mobile) -->
        <button
          class="sm:hidden flex flex-col justify-center items-center gap-1.5 w-9 h-9 rounded-lg hover:bg-white/8 transition-colors"
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
            class="flex items-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors text-lg-text/70 hover:text-lg-gold hover:bg-white/5"
            active-class="text-lg-gold bg-lg-gold/10"
            @click="closeMenu"
          >{{ route.label }}</RouterLink>
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
        <a href="https://github.com/Redrazor" target="_blank" rel="noopener" class="hover:underline text-lg-gold">GitHub</a>
      </div>
      <div class="text-xs text-lg-text/35 px-4">
        Unofficial fan tool, not affiliated with Atomic Mass Games or Lucasfilm Ltd. Star Wars: Legion and all related
        marks, card text, and artwork are © Atomic Mass Games, Lucasfilm Ltd. &amp; Disney. Data via tabletopadmiral.com &amp; Legion HQ.
      </div>
    </footer>
  </div>
</template>

<style>
.menu-slide-enter-active,
.menu-slide-leave-active { transition: all 0.2s ease; }
.menu-slide-enter-from,
.menu-slide-leave-to { opacity: 0; transform: translateY(-6px); }
</style>

import { onMounted, onUnmounted, ref } from 'vue'

export type Breakpoint = 'mobile' | 'tablet' | 'desktop'

/** Tailwind-aligned breakpoint edges: tablet ≥ md (768), desktop ≥ lg (1024). */
export const TABLET_MIN = 768
export const DESKTOP_MIN = 1024

/** Pure: map a viewport width to the Roster Canvas breakpoint. */
export function resolveBreakpoint(width: number): Breakpoint {
  if (width >= DESKTOP_MIN) return 'desktop'
  if (width >= TABLET_MIN) return 'tablet'
  return 'mobile'
}

/**
 * Reactive viewport breakpoint for the Build "Roster Canvas" layout, which
 * morphs (not swaps) across breakpoints. Returns the current `breakpoint`
 * plus `isMobile`/`isTablet`/`isDesktop` convenience refs. SSR-safe (defaults
 * to desktop when `window` is absent); listener is removed on unmount.
 */
export function useBreakpoint() {
  const initial = typeof window !== 'undefined' ? window.innerWidth : DESKTOP_MIN
  const breakpoint = ref<Breakpoint>(resolveBreakpoint(initial))
  const isMobile = ref(breakpoint.value === 'mobile')
  const isTablet = ref(breakpoint.value === 'tablet')
  const isDesktop = ref(breakpoint.value === 'desktop')

  function update() {
    const bp = resolveBreakpoint(window.innerWidth)
    breakpoint.value = bp
    isMobile.value = bp === 'mobile'
    isTablet.value = bp === 'tablet'
    isDesktop.value = bp === 'desktop'
  }

  onMounted(() => {
    update()
    window.addEventListener('resize', update, { passive: true })
  })
  onUnmounted(() => window.removeEventListener('resize', update))

  return { breakpoint, isMobile, isTablet, isDesktop }
}

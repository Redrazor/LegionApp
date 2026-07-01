import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Unit, Counterpart } from '../types/index.ts'
import { loadCatalogue } from '../utils/api.ts'
import { applyUnreleased } from '../utils/unreleased.ts'
import { applyDropped } from '../utils/dropped.ts'
import { loadUnitCardFlips } from '../utils/cardFlip.ts'

/** Owner-maintained `{ parentSlug: Counterpart }` overlay (public/data/counterparts.json); a static
 *  asset kept SEPARATE from units.json so a re-scrape can't wipe it (mirrors upgrade-weapons.json).
 *  Empty on any failure — counterparts are purely additive. */
async function loadCounterparts(): Promise<Record<string, Counterpart>> {
  try {
    const res = await fetch('/data/counterparts.json')
    if (res.ok) return (await res.json()) as Record<string, Counterpart>
  } catch {
    // optional overlay — degrade to no counterparts
  }
  return {}
}

export const useUnitsStore = defineStore('units', () => {
  const units = ref<Unit[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const loaded = ref(false)

  async function load() {
    if (loaded.value || loading.value) return
    loading.value = true
    error.value = null
    try {
      const [raw, counterpartsBySlug, flipsBySlug] = await Promise.all([
        loadCatalogue<Unit>('/api/units', 'units.json'),
        loadCounterparts(),
        loadUnitCardFlips(),
      ])
      units.value = await applyDropped(
        await applyUnreleased(
          raw.map((u) => ({
            ...u,
            counterpart: counterpartsBySlug[u.slug] ?? null,
            flip: flipsBySlug[u.slug] ?? null,
          })),
          'units',
        ),
        'units',
      )
      loaded.value = true
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  const byId = computed(() => new Map(units.value.map((u) => [u.id, u])))
  const bySlug = computed(() => new Map(units.value.map((u) => [u.slug, u])))

  const allKeywords = computed(() => {
    const set = new Set<string>()
    for (const u of units.value) for (const k of u.keywords) set.add(k)
    return [...set].sort()
  })

  return { units, loading, error, loaded, load, byId, bySlug, allKeywords }
})

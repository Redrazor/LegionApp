import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Unit } from '../types/index.ts'
import { loadCatalogue } from '../utils/api.ts'

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
      units.value = await loadCatalogue<Unit>('/api/units', 'units.json')
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

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Unit, Upgrade } from '../types/index.ts'
import { loadCatalogue } from '../utils/api.ts'
import { unitMeetsRequirements } from '../utils/army.ts'

export const useUpgradesStore = defineStore('upgrades', () => {
  const upgrades = ref<Upgrade[]>([])
  const loaded = ref(false)
  const loading = ref(false)

  async function load() {
    if (loaded.value || loading.value) return
    loading.value = true
    try {
      upgrades.value = await loadCatalogue<Upgrade>('/api/upgrades', 'upgrades.json')
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  const byId = computed<Map<string, Upgrade>>(
    () => new Map(upgrades.value.map((u): [string, Upgrade] => [u.id, u])),
  )

  /**
   * Upgrades legal for a given slot + faction. When a `unit` is supplied, also
   * filters by the upgrade's equip `requirements` (see unitMeetsRequirements).
   */
  function forSlot(slot: string, faction: string | null, unit?: Unit): Upgrade[] {
    return upgrades.value.filter(
      (u) =>
        u.slot === slot &&
        (!u.faction || u.faction === faction || u.faction === 'mercenary') &&
        (!unit || unitMeetsRequirements(unit, u.requirements)),
    )
  }

  return { upgrades, loaded, loading, load, byId, forSlot }
})

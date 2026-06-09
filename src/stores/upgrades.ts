import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Upgrade } from '../types/index.ts'
import { loadCatalogue } from '../utils/api.ts'

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

  const byId = computed(() => new Map(upgrades.value.map((u) => [u.id, u])))

  /** Upgrades legal for a given slot + faction. */
  function forSlot(slot: string, faction: string | null): Upgrade[] {
    return upgrades.value.filter(
      (u) => u.slot === slot && (!u.faction || u.faction === faction || u.faction === 'mercenary'),
    )
  }

  return { upgrades, loaded, loading, load, byId, forSlot }
})

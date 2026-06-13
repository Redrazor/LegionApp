import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { BattleForce, Faction } from '../types/index.ts'
import { loadCatalogue } from '../utils/api.ts'

export const useBattleForcesStore = defineStore('battleForces', () => {
  const battleForces = ref<BattleForce[]>([])
  const loaded = ref(false)
  const loading = ref(false)

  async function load() {
    if (loaded.value || loading.value) return
    loading.value = true
    try {
      battleForces.value = await loadCatalogue<BattleForce>('/api/battle-forces', 'battleForces.json')
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  const byId = computed(() => new Map(battleForces.value.map((b) => [b.linkId, b])))

  /** Battle forces available to a faction, name-sorted (empty for factions with none). */
  function forFaction(faction: Faction | null): BattleForce[] {
    if (!faction) return []
    return battleForces.value
      .filter((b) => b.faction === faction)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  return { battleForces, loaded, loading, load, byId, forFaction }
})

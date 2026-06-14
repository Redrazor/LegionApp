import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { BattleCard } from '../types/index.ts'
import { loadCatalogue } from '../utils/api.ts'

export const useBattleCardsStore = defineStore('battleCards', () => {
  const battleCards = ref<BattleCard[]>([])
  const loaded = ref(false)
  const loading = ref(false)

  async function load() {
    if (loaded.value || loading.value) return
    loading.value = true
    try {
      battleCards.value = await loadCatalogue<BattleCard>('/api/battle-cards', 'battleCards.json')
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  const byId = computed(() => new Map(battleCards.value.map((c) => [c.id, c])))

  return { battleCards, loaded, loading, load, byId }
})

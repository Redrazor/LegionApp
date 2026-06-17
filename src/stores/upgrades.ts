import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { BattleForce, Unit, Upgrade } from '../types/index.ts'
import { loadCatalogue } from '../utils/api.ts'
import { unitMeetsRequirements, upgradeFitsSlot } from '../utils/army.ts'

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
  const bySlug = computed<Map<string, Upgrade>>(
    () => new Map(upgrades.value.map((u): [string, Upgrade] => [u.slug, u])),
  )

  /**
   * Upgrades legal for a given slot + faction. When a `unit` is supplied, also
   * filters by the upgrade's equip `requirements` (see unitMeetsRequirements). With a
   * battle force (`bf`), its `allowedUpgrades` become available regardless of faction
   * and its `disallowedUpgrades` are removed.
   */
  function forSlot(slot: string, faction: string | null, unit?: Unit, bf?: BattleForce | null): Upgrade[] {
    const allowed = bf ? new Set(bf.allowedUpgrades) : null
    const disallowed = bf ? new Set(bf.disallowedUpgrades) : null
    return upgrades.value.filter((u) => {
      if (!upgradeFitsSlot(u, slot)) return false
      if (disallowed?.has(u.id)) return false
      const factionOk = !u.faction || u.faction === faction || u.faction === 'mercenary' || !!allowed?.has(u.id)
      if (!factionOk) return false
      return !unit || unitMeetsRequirements(unit, u.requirements)
    })
  }

  return { upgrades, loaded, loading, load, byId, bySlug, forSlot }
})

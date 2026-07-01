import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { BattleForce, Unit, Upgrade, Weapon } from '../types/index.ts'
import { loadCatalogue } from '../utils/api.ts'
import { unitMeetsRequirements, upgradeFitsSlot, isMandalorianTrooper } from '../utils/army.ts'
import { applyUnreleased } from '../utils/unreleased.ts'
import { applyDropped } from '../utils/dropped.ts'
import { loadUpgradeCardFlips } from '../utils/cardFlip.ts'

export const useUpgradesStore = defineStore('upgrades', () => {
  const upgrades = ref<Upgrade[]>([])
  const loaded = ref(false)
  const loading = ref(false)

  async function load() {
    if (loaded.value || loading.value) return
    loading.value = true
    try {
      const [raw, weaponsBySlug, flipsBySlug] = await Promise.all([
        loadCatalogue<Upgrade>('/api/upgrades', 'upgrades.json'),
        loadUpgradeWeapons(),
        loadUpgradeCardFlips(),
      ])
      // Overlay the owner-maintained weapon profiles + flip sides (both keyed by slug) onto each
      // upgrade — they live in their own files (scrape-proof) rather than in upgrades.json.
      upgrades.value = await applyDropped(
        await applyUnreleased(
          raw.map((u) => ({ ...u, weapons: weaponsBySlug[u.slug] ?? [], flip: flipsBySlug[u.slug] ?? null })),
          'upgrades',
        ),
        'upgrades',
      )
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  /** Owner-maintained `{ slug: Weapon[] }` overlay; static asset, so it works whether the
   *  upgrades themselves came from the API or the static fallback. Empty on any failure. */
  async function loadUpgradeWeapons(): Promise<Record<string, Weapon[]>> {
    try {
      const res = await fetch('/data/upgrade-weapons.json')
      if (res.ok) return (await res.json()) as Record<string, Weapon[]>
    } catch {
      // optional overlay — degrade to no upgrade weapons
    }
    return {}
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
      if (u.removed) return false // errata-removed from play — never selectable in Build
      if (!upgradeFitsSlot(u, slot)) return false
      if (disallowed?.has(u.id)) return false
      const factionOk = !u.faction || u.faction === faction || u.faction === 'mercenary' || !!allowed?.has(u.id)
      if (!factionOk) return false
      // Tools of the Trade: its three upgrades ignore their printed restrictions for any
      // Mandalorian Trooper unit (the marker is set on a per-army copy of the force).
      if (bf?.doctrineUnrestrictedUpgradeSlugs?.includes(u.slug) && isMandalorianTrooper(unit)) return true
      return !unit || unitMeetsRequirements(unit, u.requirements)
    })
  }

  return { upgrades, loaded, loading, load, byId, bySlug, forSlot }
})

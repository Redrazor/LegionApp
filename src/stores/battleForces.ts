import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { BattleForce, BattleForceDoctrines, Faction } from '../types/index.ts'
import { loadCatalogue } from '../utils/api.ts'

export const useBattleForcesStore = defineStore('battleForces', () => {
  const battleForces = ref<BattleForce[]>([])
  const loaded = ref(false)
  const loading = ref(false)

  async function load() {
    if (loaded.value || loading.value) return
    loading.value = true
    try {
      const [raw, doctrinesByLinkId] = await Promise.all([
        loadCatalogue<BattleForce>('/api/battle-forces', 'battleForces.json'),
        loadDoctrines(),
      ])
      // Overlay the owner-maintained "Choose N" doctrines (keyed by linkId) — they live in
      // their own file (scrape-proof), mirroring the upgrade-weapons overlay.
      battleForces.value = raw.map((b) =>
        doctrinesByLinkId[b.linkId] ? { ...b, doctrines: doctrinesByLinkId[b.linkId] } : b,
      )
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  /** Owner-maintained `{ linkId: BattleForceDoctrines }` overlay; static asset (works whether
   *  the battle forces came from the API or the static fallback). Empty on any failure. */
  async function loadDoctrines(): Promise<Record<string, BattleForceDoctrines>> {
    try {
      const res = await fetch('/data/battle-force-doctrines.json')
      if (res.ok) return (await res.json()) as Record<string, BattleForceDoctrines>
    } catch {
      // optional overlay — degrade to no doctrines
    }
    return {}
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

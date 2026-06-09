import { computed, reactive, type Ref } from 'vue'
import type { Faction, Rank, Unit } from '../types/index.ts'
import { FACTION_ORDER, RANK_ORDER } from '../utils/factions.ts'

export interface SearchFilters {
  query: string
  faction: Faction | ''
  rank: Rank | ''
  keyword: string
  unitType: string
  ownedOnly: boolean
  favoritesOnly: boolean
}

export function emptyFilters(): SearchFilters {
  return { query: '', faction: '', rank: '', keyword: '', unitType: '', ownedOnly: false, favoritesOnly: false }
}

export interface FactionGroup {
  faction: Faction
  units: Unit[]
}

export function useSearch(
  units: Ref<Unit[]>,
  opts: {
    isOwned?: (u: Unit) => boolean
    isFavorite?: (u: Unit) => boolean
  } = {},
) {
  const filters = reactive<SearchFilters>(emptyFilters())

  const filtered = computed<Unit[]>(() => {
    const q = filters.query.trim().toLowerCase()
    return units.value.filter((u) => {
      if (filters.faction && u.faction !== filters.faction) return false
      if (filters.rank && u.rank !== filters.rank) return false
      if (filters.unitType && u.unitType !== filters.unitType) return false
      if (filters.keyword && !u.keywords.some((k) => k.toLowerCase().includes(filters.keyword.toLowerCase()))) return false
      if (filters.ownedOnly && opts.isOwned && !opts.isOwned(u)) return false
      if (filters.favoritesOnly && opts.isFavorite && !opts.isFavorite(u)) return false
      if (q) {
        const hay = `${u.name} ${u.title} ${u.keywords.join(' ')}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  })

  const grouped = computed<FactionGroup[]>(() => {
    const map = new Map<Faction, Unit[]>()
    for (const u of filtered.value) {
      const arr = map.get(u.faction) ?? []
      arr.push(u)
      map.set(u.faction, arr)
    }
    const rankIdx = (r: Rank) => RANK_ORDER.indexOf(r)
    return FACTION_ORDER.filter((f) => map.has(f)).map((faction) => ({
      faction,
      units: (map.get(faction) ?? []).slice().sort(
        (a, b) => rankIdx(a.rank) - rankIdx(b.rank) || a.name.localeCompare(b.name),
      ),
    }))
  })

  function reset() {
    Object.assign(filters, emptyFilters())
  }

  const activeFilterCount = computed(() => {
    let n = 0
    if (filters.faction) n++
    if (filters.rank) n++
    if (filters.keyword) n++
    if (filters.unitType) n++
    if (filters.ownedOnly) n++
    if (filters.favoritesOnly) n++
    return n
  })

  return { filters, filtered, grouped, reset, activeFilterCount }
}

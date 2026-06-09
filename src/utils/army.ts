import type { Army, ArmyUnit, CompactArmy, Faction, Rank, Unit, Upgrade } from '../types/index.ts'
import { RANK_META, RANK_ORDER, rankName } from './factions.ts'

export interface ValidationItem {
  ok: boolean
  label: string
  detail: string
}

export interface ArmyValidation {
  valid: boolean
  points: number
  activations: number
  rankCounts: Record<Rank, number>
  items: ValidationItem[]
}

/** Total point cost of a single army unit including its equipped upgrades. */
export function unitCost(
  au: ArmyUnit,
  unitsById: Map<string, Unit>,
  upgradesById: Map<string, Upgrade>,
): number {
  const unit = unitsById.get(au.unitId)
  let total = unit?.cost ?? 0
  for (const up of au.upgrades) {
    total += upgradesById.get(up.upgradeId)?.cost ?? 0
  }
  return total
}

/** Collect the names of all unique cards in the army (units + upgrades). */
export function uniqueNames(
  army: Army,
  unitsById: Map<string, Unit>,
  upgradesById: Map<string, Upgrade>,
): string[] {
  const names: string[] = []
  for (const au of army.units) {
    const unit = unitsById.get(au.unitId)
    if (unit?.isUnique) names.push(unit.name)
    for (const up of au.upgrades) {
      const upg = upgradesById.get(up.upgradeId)
      if (upg?.isUnique) names.push(upg.name)
    }
  }
  return names
}

export function findDuplicateUniques(names: string[]): string[] {
  const seen = new Set<string>()
  const dupes = new Set<string>()
  for (const n of names) {
    if (seen.has(n)) dupes.add(n)
    seen.add(n)
  }
  return [...dupes]
}

export function validateArmy(
  army: Army,
  unitsById: Map<string, Unit>,
  upgradesById: Map<string, Upgrade>,
): ArmyValidation {
  const rankCounts: Record<Rank, number> = {
    commander: 0, operative: 0, corps: 0, special: 0, support: 0, heavy: 0,
  }
  let points = 0
  const factions = new Set<Faction>()
  for (const au of army.units) {
    const unit = unitsById.get(au.unitId)
    if (!unit) continue
    rankCounts[unit.rank]++
    points += unitCost(au, unitsById, upgradesById)
    factions.add(unit.faction)
  }

  const items: ValidationItem[] = []

  // Points
  items.push({
    ok: points <= army.gameSize,
    label: 'Points',
    detail: `${points} / ${army.gameSize}`,
  })

  // Rank limits
  for (const rank of RANK_ORDER) {
    const { min, max } = RANK_META[rank]
    const count = rankCounts[rank]
    const ok = count >= min && count <= max
    if (count === 0 && min === 0) continue // hide empty optional ranks
    items.push({
      ok,
      label: rankName(rank),
      detail:
        count < min
          ? `${count} (need ${min})`
          : count > max
          ? `${count} (max ${max})`
          : `${count} / ${max}`,
    })
  }
  // Always surface commander + corps minimums even when empty.
  if (rankCounts.commander === 0) {
    items.unshift({ ok: false, label: 'Commander', detail: '0 (need 1)' })
  }
  if (rankCounts.corps < 3) {
    const exists = items.find((i) => i.label === 'Corps')
    if (!exists) items.push({ ok: false, label: 'Corps', detail: `${rankCounts.corps} (need 3)` })
  }

  // Single faction (mercenaries may mix in via Allies of Convenience — allowed)
  const nonMerc = [...factions].filter((f) => f !== 'mercenary')
  const factionOk = nonMerc.length <= 1
  if (factions.size > 0) {
    items.push({
      ok: factionOk,
      label: 'Faction',
      detail: factionOk ? 'Single faction' : `Mixed: ${nonMerc.join(', ')}`,
    })
  }

  // Unique conflicts
  const dupes = findDuplicateUniques(uniqueNames(army, unitsById, upgradesById))
  if (dupes.length) {
    items.push({ ok: false, label: 'Uniques', detail: `Duplicate: ${dupes.join(', ')}` })
  }

  const valid = items.every((i) => i.ok) && army.units.length > 0
  return { valid, points, activations: army.units.length, rankCounts, items }
}

// ── Compact serialisation for save / share ───────────────────────────────────

export function toCompact(army: Army): CompactArmy {
  return {
    n: army.name,
    f: army.faction,
    g: army.gameSize,
    u: army.units.map((au) => [au.unitId, au.upgrades.map((x) => [x.slot, x.upgradeId] as [string, string])]),
  }
}

export function fromCompact(c: CompactArmy): Army {
  let counter = 0
  return {
    name: c.n ?? '',
    faction: c.f ?? null,
    gameSize: c.g ?? 800,
    units: (c.u ?? []).map(([unitId, ups]) => ({
      uid: `u${counter++}`,
      unitId,
      upgrades: (ups ?? []).map(([slot, upgradeId]) => ({ slot, upgradeId })),
    })),
  }
}

export function toBase64url(s: string): string {
  // Encode UTF-8 safely before base64 (handles names with accents).
  const b64 = btoa(unescape(encodeURIComponent(s)))
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function fromBase64url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  return decodeURIComponent(escape(atob(b64)))
}

export function encodeArmy(army: Army): string {
  return toBase64url(JSON.stringify(toCompact(army)))
}

export function decodeArmy(s: string): Army | null {
  try {
    return fromCompact(JSON.parse(fromBase64url(s)) as CompactArmy)
  } catch {
    return null
  }
}

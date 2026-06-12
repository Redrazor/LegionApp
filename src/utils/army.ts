import type {
  Army, ArmyUnit, CompactArmy, Faction, Rank, Unit, Upgrade,
  UpgradeRequirementCriterion, UpgradeRequirementList,
} from '../types/index.ts'
import { rankLimits, RANK_ORDER, rankName, FORCE_SIDE } from './factions.ts'

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

/** Per-army copy cap for a card: explicit `limit`, else 1 if unique, else 0 (unlimited). */
export function cardLimit(card: { isUnique: boolean; limit?: number }): number {
  return card.limit ?? (card.isUnique ? 1 : 0)
}

export interface LimitViolation {
  name: string
  count: number
  limit: number
}

/**
 * Cards taken more times than their per-army limit, counted by name across units
 * AND upgrades (the unique/limited rule spans both). Covers duplicate uniques
 * (limit 1) and over-limit "limited" upgrades like the Jedi Training family (×2).
 */
export function limitViolations(
  army: Army,
  unitsById: Map<string, Unit>,
  upgradesById: Map<string, Upgrade>,
): LimitViolation[] {
  const counts = new Map<string, { count: number; limit: number }>()
  const tally = (name: string, limit: number) => {
    const e = counts.get(name) ?? { count: 0, limit }
    e.count++
    counts.set(name, e)
  }
  for (const au of army.units) {
    const unit = unitsById.get(au.unitId)
    if (unit) {
      const l = cardLimit(unit)
      if (l > 0) tally(unit.name, l)
    }
    for (const up of au.upgrades) {
      const upg = upgradesById.get(up.upgradeId)
      if (upg) {
        const l = cardLimit(upg)
        if (l > 0) tally(upg.name, l)
      }
    }
  }
  const out: LimitViolation[] = []
  for (const [name, { count, limit }] of counts) {
    if (count > limit) out.push({ name, count, limit })
  }
  return out
}

const KW = {
  fieldCommander: /^field commander$/i,
  entourage: /^entourage (.+)$/i,
  detachment: /^detachment (.+)$/i,
}

/** True if any unit in the army carries the Field Commander keyword (allows 0 commanders). */
export function hasFieldCommander(army: Army, unitsById: Map<string, Unit>): boolean {
  return army.units.some((au) =>
    unitsById.get(au.unitId)?.keywords.some((k) => KW.fieldCommander.test(k)),
  )
}

/**
 * Rank-max bonuses granted by Entourage keywords: each "Entourage <name>" widens
 * the named unit's rank max by 1 so the entourage unit can be fielded over the cap.
 */
export function entourageBonuses(
  army: Army,
  unitsById: Map<string, Unit>,
): Partial<Record<Rank, number>> {
  // A name can map to several cards of different ranks (e.g. "Darth Vader" exists
  // as both a commander and an operative). Index name → the set of ranks it spans
  // so the bonus lands on the right rank regardless of card-insertion order.
  const ranksByName = new Map<string, Set<Rank>>()
  for (const u of unitsById.values()) {
    const key = u.name.toLowerCase()
    const set = ranksByName.get(key) ?? new Set<Rank>()
    set.add(u.rank)
    ranksByName.set(key, set)
  }
  const bonus: Partial<Record<Rank, number>> = {}
  for (const au of army.units) {
    const unit = unitsById.get(au.unitId)
    for (const kw of unit?.keywords ?? []) {
      const m = KW.entourage.exec(kw)
      if (!m) continue
      const ranks = ranksByName.get(m[1].trim().toLowerCase())
      if (!ranks) continue
      for (const rank of ranks) bonus[rank] = (bonus[rank] ?? 0) + 1
    }
  }
  return bonus
}

/**
 * Detachment units whose required parent is absent. "Detachment <name>" needs a
 * non-detachment unit of that name; "Detachment <rank>" needs a unit of that rank.
 * Returns "<unit> → needs <target>" strings for any unmet requirement.
 */
export function unmetDetachments(army: Army, unitsById: Map<string, Unit>): string[] {
  const ranks = new Set<string>(RANK_ORDER)
  const unmet: string[] = []
  for (const au of army.units) {
    const unit = unitsById.get(au.unitId)
    if (!unit) continue
    for (const kw of unit.keywords) {
      const m = KW.detachment.exec(kw)
      if (!m) continue
      const target = m[1].trim()
      const tlc = target.toLowerCase()
      const satisfied = ranks.has(tlc)
        ? army.units.some(
            (o) => o.uid !== au.uid && unitsById.get(o.unitId)?.rank === tlc,
          )
        : army.units.some((o) => {
            const ou = unitsById.get(o.unitId)
            return (
              o.uid !== au.uid &&
              ou?.name.toLowerCase() === tlc &&
              !ou.keywords.some((k) => KW.detachment.test(k))
            )
          })
      if (!satisfied) unmet.push(`${unit.name} → needs ${target}`)
    }
  }
  return unmet
}

// ── Upgrade equip-eligibility (requirements matcher) ─────────────────────────

function unitHasKeyword(unit: Unit, kw: string): boolean {
  const lk = kw.toLowerCase()
  // Unit keywords may carry a value suffix ("Sharpshooter 2") — match the base.
  return unit.keywords.some((k) => {
    const lc = k.toLowerCase()
    return lc === lk || lc.startsWith(lk + ' ')
  })
}

function matchCriterion(c: UpgradeRequirementCriterion, unit: Unit): boolean {
  const eq = (a: string | null | undefined, b: string) =>
    a != null && a.toLowerCase() === b.toLowerCase()
  if (c.cardName != null && !eq(unit.name, c.cardName)) return false
  if (c.title != null && !eq(unit.title, c.title)) return false
  if (c.cardSubtype != null && !eq(unit.unitType, c.cardSubtype)) return false
  if (c.rank != null && !eq(unit.rank, c.rank)) return false
  if (c.faction != null && !eq(unit.faction, c.faction)) return false
  if (c.affiliation != null && !eq(unit.affiliation, c.affiliation)) return false
  if (c.keywords && !c.keywords.every((kw) => unitHasKeyword(unit, kw))) return false
  if (c.upgradeBar && !c.upgradeBar.every((s) => unit.upgradeBar.includes(s))) return false
  if (c.forceAffinity != null) {
    const side = FORCE_SIDE[unit.name.toLowerCase()]
    // Known Force user → must match the required side; unknown → fail open.
    if (side && side !== c.forceAffinity) return false
  }
  return true
}

function evalReqGroup(group: UpgradeRequirementList, unit: Unit): boolean {
  if (group.length === 0) return true
  let op: 'AND' | 'OR' | 'NOT' = 'AND'
  let terms = group
  const head = group[0]
  if (head === 'AND' || head === 'OR' || head === 'NOT') {
    op = head
    terms = group.slice(1)
  }
  const results = terms.map((t) =>
    Array.isArray(t) ? evalReqGroup(t, unit) : typeof t === 'string' ? true : matchCriterion(t, unit),
  )
  if (results.length === 0) return true
  if (op === 'OR') return results.some(Boolean)
  const all = results.every(Boolean)
  return op === 'NOT' ? !all : all
}

/**
 * Whether a unit can legally equip an upgrade, per the upgrade's `requirements`
 * (see UpgradeRequirement). Absent/empty requirements ⇒ always true. Criteria the
 * unit can't determine (e.g. forceAffinity for an unlisted Force user) fail open.
 */
export function unitMeetsRequirements(unit: Unit, requirements?: UpgradeRequirementList): boolean {
  if (!requirements || requirements.length === 0) return true
  return evalReqGroup(requirements, unit)
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
  let unpriced = 0
  const factions = new Set<Faction>()
  for (const au of army.units) {
    const unit = unitsById.get(au.unitId)
    if (!unit) continue
    rankCounts[unit.rank]++
    if (unit.cost == null) unpriced++
    points += unitCost(au, unitsById, upgradesById)
    factions.add(unit.faction)
  }

  const items: ValidationItem[] = []

  // Points
  items.push({
    ok: points <= army.gameSize,
    label: 'Points',
    detail: unpriced > 0 ? `${points}+ / ${army.gameSize}` : `${points} / ${army.gameSize}`,
  })

  // Unpriced units (newest releases with no points cost in the data yet)
  if (unpriced > 0) {
    items.push({
      ok: false,
      label: 'Unpriced',
      detail: `${unpriced} unit${unpriced > 1 ? 's' : ''} missing cost`,
    })
  }

  // Rank limits — per-format (see rankLimits / FORMATS). Required ranks (min > 0)
  // surface even when empty so their unmet minimum is always visible.
  // Entourage widens a rank's max; Field Commander relaxes the commander minimum.
  const limits = rankLimits(army.gameSize)
  const entourage = entourageBonuses(army, unitsById)
  const fieldCommander = hasFieldCommander(army, unitsById)
  for (const rank of RANK_ORDER) {
    const max = limits[rank].max + (entourage[rank] ?? 0)
    let min = limits[rank].min
    const count = rankCounts[rank]
    let note = ''
    if (rank === 'commander' && min > 0 && count === 0 && fieldCommander) {
      min = 0
      note = ' (Field Commander)'
    }
    if (count === 0 && min === 0 && !note) continue // hide empty optional ranks
    items.push({
      ok: count >= min && count <= max,
      label: rankName(rank),
      detail:
        (count < min
          ? `${count} (need ${min})`
          : count > max
          ? `${count} (max ${max})`
          : `${count} / ${max}`) + note,
    })
  }

  // Detachment — a detachment unit needs its parent unit/rank in the list.
  const detachIssues = unmetDetachments(army, unitsById)
  if (detachIssues.length) {
    items.push({ ok: false, label: 'Detachment', detail: detachIssues.join('; ') })
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

  // Unique / limited-card conflicts — duplicate uniques (max 1) and over-limit
  // "limited" upgrades (e.g. HQ Uplink, Jedi Training family — max 2).
  const violations = limitViolations(army, unitsById, upgradesById)
  if (violations.length) {
    items.push({
      ok: false,
      label: 'Uniques',
      detail: violations.map((v) => `${v.name} ×${v.count} (max ${v.limit})`).join(', '),
    })
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

import type {
  Army, ArmyUnit, ArmyUpgrade, BattleCard, BattleCardSubtype, BattleForce, CommandCard, CompactArmy, Faction, Rank, Unit, Upgrade,
  UpgradeRequirementCriterion, UpgradeRequirementList,
} from '../types/index.ts'
import { rankLimits, battleForceRankTable, formatForCap, formatName, factionName, slotLabel, RANK_ORDER, rankName, FORCE_SIDE, MANDO_CLANS } from './factions.ts'
import { resolveKeywordEntry, type Glossary } from './keywords.ts'

// ── Battle-force helpers ─────────────────────────────────────────────────────

/**
 * The typed shape of a battle force's `rules` blob (a passthrough of the LHQ2
 * source). Only the list-building-relevant flags are typed; in-game-only rules
 * (remnantEquipRules, sortOfDetachment, etc.) are surfaced as `rulesText` rather
 * than enforced here.
 */
export interface BattleForceUnitLimit {
  ids: string[]
  count: [number, number]
}
export interface BattleForceRules {
  unitLimits?: BattleForceUnitLimit[]
  noFieldComm?: boolean
  ignoreDetach?: string
  minimum3Wookiees?: boolean
  countMercs?: boolean
  addAdditionalUpgradeSlots?: [string, string[]][]
}

export function battleForceRules(bf: BattleForce | null | undefined): BattleForceRules {
  return (bf?.rules ?? {}) as BattleForceRules
}

/** Every unit id eligible in a battle force (across all six rank lists). */
export function battleForcePool(bf: BattleForce): Set<string> {
  return new Set(RANK_ORDER.flatMap((rank) => bf.rankUnits[rank] ?? []))
}

/**
 * The rank a unit occupies inside an army. A battle force can place a unit in a
 * different rank than its printed one (e.g. an "as Corps" unit), so its `rankUnits`
 * lists are authoritative; outside a battle force (or for an ineligible unit) the
 * unit's own rank applies.
 */
export function effectiveRank(unit: Unit, bf?: BattleForce | null): Rank {
  if (bf) {
    for (const rank of RANK_ORDER) {
      if (bf.rankUnits[rank]?.includes(unit.id)) return rank
    }
  }
  return unit.rank
}

/**
 * A unit's upgrade bar, extended with any extra slots a battle force grants it
 * (addAdditionalUpgradeSlots — e.g. Ohnaka Gang gives Hondo a Command slot).
 */
/**
 * A unit's upgrade-slot bar as it should appear *right now*: the printed bar, plus
 * any battle-force-granted slots, plus slots granted by the upgrades currently
 * equipped on the unit (e.g. a Comms Technician grants a `comms` slot). Granted
 * slots append after the printed bar, so the printed slots keep their positions
 * (and thus their `<type>#<index>` keys). Pass `equipped` + `upgradesById` to fold
 * in upgrade-granted slots; omit them for the static printed bar.
 */
export function effectiveUpgradeBar(
  unit: Unit,
  bf?: BattleForce | null,
  equipped?: ArmyUpgrade[],
  upgradesById?: Map<string, Upgrade>,
): string[] {
  const add = battleForceRules(bf).addAdditionalUpgradeSlots?.find(([id]) => id === unit.id)?.[1]
  const base = add ? [...unit.upgradeBar, ...add] : unit.upgradeBar
  if (!upgradesById) return base
  // Slots granted by equipped upgrades (e.g. a Comms Technician adds `comms`, a
  // Stormtrooper Captain adds `training`). Sorted by slot key for stable ordering; one
  // pass resolves chained grants since granted-slot upgrades are in `equipped` too.
  const granted = equipped?.length
    ? [...equipped].sort((a, b) => a.slot.localeCompare(b.slot)).flatMap((e) => upgradesById.get(e.upgradeId)?.grantedSlots ?? [])
    : []
  // Self-slotting upgrades (Imperial March, Dug In): a dedicated slot ONLY when the unit
  // has the printed slot from NO source — not printed/BF (`base`) nor granted by an
  // equipped upgrade. If a Captain grants a Training slot, Imperial March fills that
  // instead. Placed before `granted` so its key stays at index `base.length`.
  const self = selfSlotsFor(unit, [...base, ...granted], upgradesById)
  return [...base, ...self, ...granted]
}

/**
 * A few upgrades (Imperial March, Dug In) carry card text letting any eligible unit
 * equip them even without the printed upgrade slot. Keyed by slug; their requirements
 * still gate eligibility (see {@link unitMeetsRequirements}). The dedicated slot a
 * slot-less unit gets is keyed by the slug itself, so it never collides with a real
 * slot type and points/equip/prune all flow through the normal slot-key machinery.
 */
export const SELF_SLOTTING_UPGRADE_SLUGS = new Set(['imperial-march', 'dug-in'])

/** Dedicated self-slot slugs for the self-slotting upgrades a unit is eligible for AND
 *  whose printed slot it has from no source (`presentSlots` = base + granted) — i.e. only
 *  units that can't otherwise equip them. Returns the extra slot types (slugs) to append. */
function selfSlotsFor(unit: Unit, presentSlots: string[], upgradesById: Map<string, Upgrade>): string[] {
  const extra: string[] = []
  for (const up of upgradesById.values()) {
    if (!SELF_SLOTTING_UPGRADE_SLUGS.has(up.slug)) continue
    if (presentSlots.includes(up.slot)) continue // has the slot already → fills it, no dedicated slot
    if (unitMeetsRequirements(unit, up.requirements)) extra.push(up.slug)
  }
  return extra.sort()
}

/**
 * Whether an upgrade may be offered for a given slot. Self-slotting upgrades match both
 * their printed slot type AND their own dedicated slug-slot; everything else matches its
 * printed slot only. Pure; the upgrades store's `forSlot` delegates here.
 */
export function upgradeFitsSlot(up: Upgrade, slot: string): boolean {
  if (SELF_SLOTTING_UPGRADE_SLUGS.has(up.slug)) return up.slug === slot || up.slot === slot
  return up.slot === slot
}

/** The set of valid `"<slotType>#<index>"` keys for a (flat) upgrade bar. The index
 *  is the slot's position in the bar — matching how the Build card keys equipped
 *  upgrades (its `v-for` index), so a key is valid iff that slot still exists. */
export function slotKeySet(bar: string[]): Set<string> {
  return new Set(bar.map((type, i) => `${type}#${i}`))
}

/**
 * Drop equipped upgrades whose slot no longer exists — e.g. after removing the
 * upgrade that granted that slot. Iterates to a fixpoint so removing a granter that
 * sat in another granted slot cascades correctly. Pure; the store calls it after
 * every equip/unequip.
 */
export function pruneOrphanedUpgrades(
  unit: Unit,
  bf: BattleForce | null | undefined,
  equipped: ArmyUpgrade[],
  upgradesById: Map<string, Upgrade>,
): ArmyUpgrade[] {
  let current = equipped
  for (let pass = 0; pass < 8; pass++) {
    const valid = slotKeySet(effectiveUpgradeBar(unit, bf, current, upgradesById))
    const next = current.filter((u) => valid.has(u.slot))
    if (next.length === current.length) return next
    current = next
  }
  return current
}

/** Upgrade slot types whose upgrades add a miniature to the unit. LHQ2 has no
 *  explicit "adds a mini" flag, so a heavy weapon / personnel upgrade defaults to
 *  +1 (verified: e.g. DLT-19 Stormtrooper, Comms Technician each "Add 1 …"). */
export const MINI_ADDING_SLOTS = ['heavy weapon', 'personnel']

/**
 * Miniatures added by the "Squad" personnel upgrades, which add a whole squad
 * rather than one model — the count is printed only on the card (no data field),
 * so it's curated here by slug from the card text. Anything not listed falls back
 * to the slot default (+1); a NEW squad upgrade must be added here or it under-counts.
 */
export const UPGRADE_MINIS_ADDED: Record<string, number> = {
  'shoretrooper-squad': 5,
  'snowtrooper-squad': 5,
  'stormtrooper-squad': 5,
  'ewok-skirmisher-squad': 4,
  'ewok-slinger-squad': 4,
  'fleet-trooper-squad': 5,
  'rebel-trooper-squad': 5,
  'b1-battle-droid-squad': 7,
  'b2-super-battle-droid-squad': 4,
  'geonosian-warrior-squad': 5,
  'clone-trooper-infantry-squad': 5,
  'rebel-veteran-squad': 5,
  'clone-trooper-marksmen-squad': 5,
  'weequay-pirate-squad': 3,
  'pyke-syndicate-foot-soldier-squad': 5,
  'mandalorian-initiate-squad': 4,
}

/** How many miniatures an equipped upgrade adds to its unit (curated squad count,
 *  else +1 for a heavy weapon / personnel upgrade, else 0). */
export function upgradeMinisAdded(up: Upgrade): number {
  if (up.slug in UPGRADE_MINIS_ADDED) return UPGRADE_MINIS_ADDED[up.slug]
  return MINI_ADDING_SLOTS.includes(up.slot) ? 1 : 0
}

/** Number of miniatures in a single army unit: its printed mini count plus the
 *  minis added by each equipped upgrade. Defaults to 1 if the unit has no printed count. */
export function unitModelCount(
  au: ArmyUnit,
  unitsById: Map<string, Unit>,
  upgradesById: Map<string, Upgrade>,
): number {
  const unit = unitsById.get(au.unitId)
  if (!unit) return 0
  let count = unit.miniCount ?? 1
  for (const u of au.upgrades) {
    const up = upgradesById.get(u.upgradeId)
    if (up) count += upgradeMinisAdded(up)
  }
  return count
}

/** Total miniatures across the whole army (sum of every unit instance). */
export function armyModelCount(
  army: Army,
  unitsById: Map<string, Unit>,
  upgradesById: Map<string, Upgrade>,
): number {
  return army.units.reduce((sum, au) => sum + unitModelCount(au, unitsById, upgradesById), 0)
}

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

export interface WeaponDice { red: number; black: number; white: number }

/**
 * The unit's headline attack dice for the catalogue row: the dice pool of its
 * strongest weapon (most total dice), ignoring tiny sidearms. Pure so the row and
 * its spec share the derivation. Returns all-zero when the unit has no weapons.
 */
export function primaryWeaponDice(unit: Unit): WeaponDice {
  let best: WeaponDice = { red: 0, black: 0, white: 0 }
  let bestTotal = -1
  for (const w of unit.weapons) {
    const total = w.dice.red + w.dice.black + w.dice.white
    if (total > bestTotal) {
      bestTotal = total
      best = w.dice
    }
  }
  return best
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

/**
 * A render-time `×N` grouping of identical army units. Copies collapse into one
 * group only when they share both `unitId` and an identical upgrade loadout — a
 * differently-equipped copy stays in its own group. The underlying `ArmyUnit`
 * entries remain distinct (rules-correct for order tokens); `qty` is purely for
 * display + stepper controls. `uids` preserves the army's order.
 */
export interface ArmyUnitGroup {
  key: string
  unitId: string
  representative: ArmyUnit // first member — render its slots/upgrades
  uids: string[] // every member uid, in army order
  qty: number
}

/** Canonical signature of a unit's upgrade loadout (order-independent). */
function loadoutSignature(au: ArmyUnit): string {
  return au.upgrades
    .map((u) => `${u.slot}=${u.upgradeId}`)
    .sort()
    .join('|')
}

/**
 * Collapse identical army units into ordered `×N` groups (same unit + same
 * loadout). First-appearance order is preserved. Pure.
 */
export function groupArmyUnits(units: ArmyUnit[]): ArmyUnitGroup[] {
  const byKey = new Map<string, ArmyUnitGroup>()
  const order: ArmyUnitGroup[] = []
  for (const au of units) {
    const key = `${au.unitId} ${loadoutSignature(au)}`
    let group = byKey.get(key)
    if (!group) {
      group = { key, unitId: au.unitId, representative: au, uids: [], qty: 0 }
      byKey.set(key, group)
      order.push(group)
    }
    group.uids.push(au.uid)
    group.qty++
  }
  return order
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
 * For one army unit, the detachment parent it still needs (a unit name or a rank),
 * or null if it has no detachment keyword or its parent is fielded. "Detachment
 * <name>" needs another non-detachment unit of that name; "Detachment <rank>" needs
 * another unit of that rank (self excluded). Pure — shared by `unmetDetachments` and
 * the per-unit legality indicator so they always agree.
 */
function detachmentUnmetFor(au: ArmyUnit, unit: Unit, army: Army, unitsById: Map<string, Unit>): string | null {
  const target = detachmentTarget(unit)
  if (!target) return null
  const tlc = target.toLowerCase()
  const isRank = (RANK_ORDER as readonly string[]).includes(tlc)
  const satisfied = isRank
    ? army.units.some((o) => o.uid !== au.uid && unitsById.get(o.unitId)?.rank === tlc)
    : army.units.some((o) => {
        const ou = unitsById.get(o.unitId)
        return (
          o.uid !== au.uid &&
          ou?.name.toLowerCase() === tlc &&
          !ou.keywords.some((k) => KW.detachment.test(k))
        )
      })
  return satisfied ? null : target
}

/**
 * Detachment units whose required parent is absent. Returns "<unit> → needs <target>"
 * strings for any unmet requirement.
 */
export function unmetDetachments(army: Army, unitsById: Map<string, Unit>): string[] {
  const unmet: string[] = []
  for (const au of army.units) {
    const unit = unitsById.get(au.unitId)
    if (!unit) continue
    const target = detachmentUnmetFor(au, unit, army, unitsById)
    if (target) unmet.push(`${unit.name} → needs ${target}`)
  }
  return unmet
}

/**
 * Units with the **Heavy Weapon Team** keyword that haven't equipped a Heavy Weapon
 * upgrade. The keyword's rule is mandatory ("You must equip a Heavy Weapon upgrade
 * card"), so an empty `heavy weapon` slot makes the army illegal. A slot is satisfied
 * when the unit has any upgrade equipped in a `heavy weapon`-type slot (slot keys are
 * `"<type>#<index>"`). Returns the names of offending units. Pure.
 */
/** True if the unit has the Heavy Weapon Team keyword but no heavy weapon equipped. */
function needsHeavyWeapon(unit: Unit, au: ArmyUnit): boolean {
  if (!unit.keywords.some((k) => /^heavy weapon team$/i.test(k))) return false
  return !au.upgrades.some((u) => u.slot.split('#')[0].toLowerCase() === 'heavy weapon')
}

export function heavyWeaponTeamUnmet(army: Army, unitsById: Map<string, Unit>): string[] {
  const unmet: string[] = []
  for (const au of army.units) {
    const unit = unitsById.get(au.unitId)
    if (unit && needsHeavyWeapon(unit, au)) unmet.push(unit.name)
  }
  return unmet
}

/**
 * Per-unit legality problems for the army-list card indicator: the actionable,
 * single-unit reasons a unit is currently illegal (empty array = legal). Army-wide
 * rules (rank min/max, points cap, duplicate-unique caps) are intentionally excluded —
 * they belong to the footer checklist, not to one card. Pure; recomputes live as the
 * loadout or army composition changes.
 */
export function unitLegalityIssues(
  au: ArmyUnit,
  army: Army,
  unitsById: Map<string, Unit>,
  bf?: BattleForce | null,
): string[] {
  const unit = unitsById.get(au.unitId)
  if (!unit) return []
  const issues: string[] = []
  if (unit.cost == null) issues.push('No points cost')
  // In a battle force, eligibility is the BF's own whitelist — a unit not on it
  // (e.g. one left over from before the BF was picked) is illegal here.
  if (bf && !battleForcePool(bf).has(unit.id)) issues.push(`Not in ${bf.name}`)
  if (needsHeavyWeapon(unit, au)) issues.push('Needs a heavy weapon')
  const ignoresDetach = !!bf && battleForceRules(bf).ignoreDetach === unit.id
  const needsParent = ignoresDetach ? null : detachmentUnmetFor(au, unit, army, unitsById)
  if (needsParent) {
    issues.push(`Needs ${needsParent}`)
  } else if (
    // Allies-of-convenience caps only apply outside a battle force.
    !bf &&
    !detachmentTarget(unit) &&
    unit.faction === 'mercenary' &&
    army.faction &&
    army.faction !== 'mercenary' &&
    !unitAllowedInFaction(unit, army.faction)
  ) {
    // A non-detachment mercenary that can't be hired into this faction (detachments
    // are governed by the parent check above, so they aren't double-flagged).
    issues.push(`Can't ally here`)
  }
  return issues
}

// ── Mercenary "Allies of Convenience" rules ──────────────────────────────────

/** Per-army cap on mercenary units of each rank: ≤2 corps, ≤1 of each other rank. */
export const MERC_RANK_CAP: Record<Rank, number> = {
  commander: 1, operative: 1, corps: 2, special: 1, support: 1, heavy: 1,
}

/**
 * A unit that belongs to the **Mandalorian Clans** army by affiliation (most carry
 * `faction: 'mercenary'`, e.g. Din Djarin, Bo-Katan, Mandalorian Warriors). Such units
 * are *native* to a Mandalorian army — they're selectable there and not subject to the
 * mercenary ally caps. See [[MANDO_CLANS]].
 */
export function isMandalorianClanUnit(unit: Unit): boolean {
  return unit.affiliation != null && MANDO_CLANS.has(unit.affiliation)
}

/**
 * Whether a unit may be fielded in an army of `faction`. Non-mercenaries belong to
 * exactly their own faction; a mercenary may be hired only into a faction listed in
 * its `affiliations` (and natively into a mercenary-faction army). A Mandalorian-clan
 * unit is native to a `mandalorians` army regardless of its `faction`. Used to gate
 * both the unit picker (suggest only legal choices) and `validateArmy`'s Allies check.
 */
export function unitAllowedInFaction(unit: Unit, faction: Faction | null): boolean {
  if (faction === 'mandalorians' && isMandalorianClanUnit(unit)) return true
  if (unit.faction !== 'mercenary') return unit.faction === faction
  if (faction === 'mercenary') return true
  return faction != null && unit.affiliations.includes(faction)
}

/** The parent a "Detachment X" unit depends on (a unit name or a rank), else null. */
export function detachmentTarget(unit: Unit): string | null {
  for (const kw of unit.keywords) {
    const m = KW.detachment.exec(kw)
    if (m) return m[1].trim()
  }
  return null
}

/** Whether a unit has the Detachment keyword. Per the rulebook, a Detachment unit
 *  "doesn't count against the maximum number of units of its rank" during army building
 *  (it still counts toward the minimum and the displayed total). */
export function isDetachment(unit: Unit): boolean {
  return unit.keywords.some((k) => KW.detachment.test(k))
}

/**
 * Catalogue candidates for one rank: the units a faction may legally field at that
 * rank (`unitAllowedInFaction` — mercs gated by affiliation), optionally filtered by a
 * free-text query over name + title, sorted cheapest-first then by name.
 *
 * `presentParents` (lowercased unit names + ranks already in the army) gates the
 * **Detachment** units: a "Detachment X" unit only becomes available once X is in the
 * list — so Fire Support / Strike Team / etc. appear only with their parent, and a
 * parent-less detachment (e.g. Mandalorian Warriors — Fire Support, which carries no
 * faction affiliation) appears purely because its parent is present. Omit it (Browse,
 * specs) to skip detachment gating. Pure — the catalogue and its specs share it.
 *
 * With a battle force (`bf`), eligibility is the battle force's own `rankUnits`
 * whitelist for that rank (which also places units in their battle-force rank), so
 * faction/detachment gating is bypassed. Without one, `specialIssue` units — which may
 * only ever be fielded in their named battle force — are excluded.
 */
export function catalogueForRank(
  units: Unit[],
  faction: Faction | null,
  rank: Rank,
  query = '',
  presentParents?: ReadonlySet<string>,
  bf?: BattleForce | null,
): Unit[] {
  const q = query.trim().toLowerCase()
  const eligible = bf ? new Set(bf.rankUnits[rank] ?? []) : null
  return units
    .filter((u) => {
      if (eligible) return eligible.has(u.id)
      if (u.rank !== rank) return false
      if (u.specialIssue) return false // standard armies can't field special-issue units
      const parent = presentParents ? detachmentTarget(u) : null
      if (parent) {
        const plc = parent.toLowerCase()
        if (!presentParents!.has(plc)) return false
        // A name-targeting detachment is gated solely by its parent's presence: a
        // fielded unit of that exact name already establishes the army's faction,
        // and parent-less detachments (affiliation-less Mandalorian Warriors
        // detachments) rely on that exemption. A rank-targeting detachment
        // ("Detachment special", i.e. Imperial Probe Droid) matches ANY fielded
        // unit of that rank — including another faction's — so it must still pass
        // the normal faction check, else it leaks across factions.
        return (RANK_ORDER as readonly string[]).includes(plc) ? unitAllowedInFaction(u, faction) : true
      }
      return unitAllowedInFaction(u, faction)
    })
    .filter((u) => !q || `${u.name} ${u.title}`.toLowerCase().includes(q))
    .sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0) || a.name.localeCompare(b.name))
}

/**
 * The set of "parents" present in an army for Detachment gating: every fielded unit
 * contributes its rank and — unless it is itself a detachment — its lowercased name.
 * Matches `unmetDetachments` (detachments don't satisfy other detachments).
 */
export function presentDetachmentParents(army: Army, unitsById: Map<string, Unit>): Set<string> {
  const set = new Set<string>()
  for (const au of army.units) {
    const u = unitsById.get(au.unitId)
    if (!u) continue
    set.add(u.rank)
    if (!detachmentTarget(u)) set.add(u.name.toLowerCase())
  }
  return set
}

export interface MercenaryIssues {
  capExceeded: { rank: Rank; count: number; cap: number }[]
  illegalAllies: string[] // merc units whose affiliations don't include the army faction
  rankCounts: Record<Rank, number> // mercenary-only counts (for the no-min rule)
}

/**
 * Mercenary "Allies of Convenience" checks. A mercenary unit (`faction:
 * 'mercenary'`) may only be hired into an army whose faction is among its
 * `affiliations` (none ⇒ not hireable into a standard faction). Mercenaries are
 * capped per rank (MERC_RANK_CAP) and don't satisfy rank minimums — the caller
 * subtracts `rankCounts` to enforce no-min. A mercenary-faction army fields them
 * natively (affiliation check skipped).
 */
export function mercenaryIssues(army: Army, unitsById: Map<string, Unit>): MercenaryIssues {
  const rankCounts: Record<Rank, number> = {
    commander: 0, operative: 0, corps: 0, special: 0, support: 0, heavy: 0,
  }
  const illegal: string[] = []
  const armyFaction = army.faction
  const presentParents = presentDetachmentParents(army, unitsById)
  for (const au of army.units) {
    const unit = unitsById.get(au.unitId)
    if (!unit || unit.faction !== 'mercenary') continue
    // In a Mandalorian Clans army, clan units are the army's own — native, not capped
    // allies, and they satisfy rank minimums.
    if (armyFaction === 'mandalorians' && isMandalorianClanUnit(unit)) continue
    // A detachment unit whose parent is fielded is part of that parent, not a hired
    // ally — so it isn't capped and doesn't need its own affiliation match. Mirrors
    // catalogueForRank's parent-gating, so a unit the catalogue offered (e.g. the
    // Heavy Weapon Team Mandalorian Warriors detachment, affiliation-less) stays legal.
    const parent = detachmentTarget(unit)
    if (parent && presentParents.has(parent.toLowerCase())) continue
    rankCounts[unit.rank]++
    if (armyFaction && !unitAllowedInFaction(unit, armyFaction)) {
      illegal.push(unit.name)
    }
  }
  const capExceeded: MercenaryIssues['capExceeded'] = []
  for (const rank of RANK_ORDER) {
    if (rankCounts[rank] > MERC_RANK_CAP[rank]) {
      capExceeded.push({ rank, count: rankCounts[rank], cap: MERC_RANK_CAP[rank] })
    }
  }
  return { capExceeded, illegalAllies: [...new Set(illegal)], rankCounts }
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

// ── Command hand ─────────────────────────────────────────────────────────────

/** Lowercased names of every unit fielded in the army (for command-card gating). */
export function fieldedUnitNames(army: Army, unitsById: Map<string, Unit>): Set<string> {
  const set = new Set<string>()
  for (const au of army.units) {
    const u = unitsById.get(au.unitId)
    if (u) set.add(u.name.toLowerCase())
  }
  return set
}

/** The commander name(s) a command card belongs to (LHQ2 joins multi-name cards). */
export function commandCommanders(card: CommandCard): string[] {
  return (card.commander ?? '')
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean)
}

/**
 * Whether a command card may be included in this army. Commander cards need one of
 * their named commanders fielded; faction-generic cards need the army's faction; the
 * universal pip cards (no faction, no commander — Assault, Push, …) are always legal.
 * The auto 4-pip Standing Orders is excluded (it is always in the hand, never chosen).
 */
export function commandCardEligible(card: CommandCard, army: Army, fieldedNames: Set<string>): boolean {
  if (card.pips >= 4) return false // Standing Orders — auto, not selectable
  const commanders = commandCommanders(card)
  if (commanders.length) return commanders.some((n) => fieldedNames.has(n.toLowerCase()))
  return !card.faction || card.faction === army.faction
}

/** The command cards selectable for this army (eligible, pip 1–3), cheapest pip first. */
export function eligibleCommandCards(
  commands: CommandCard[],
  army: Army,
  unitsById: Map<string, Unit>,
): CommandCard[] {
  const fielded = fieldedUnitNames(army, unitsById)
  return commands
    .filter((c) => commandCardEligible(c, army, fielded))
    .sort((a, b) => a.pips - b.pips || a.name.localeCompare(b.name))
}

export interface CommandHandValidation {
  byPip: Record<number, number> // chosen count per pip (1, 2, 3)
  ineligible: string[] // names of chosen cards not eligible in this army
  hasDuplicates: boolean
  complete: boolean // 2 of each of pips 1/2/3
  valid: boolean
}

/**
 * Validate the chosen command hand (excludes the auto Standing Orders). A legal hand
 * is exactly 2 cards of each of pips 1/2/3, no duplicates, every card eligible.
 */
export function validateCommandHand(
  army: Army,
  commandsById: Map<string, CommandCard>,
  fieldedNames: Set<string>,
): CommandHandValidation {
  const hand = army.commandHand ?? []
  const byPip: Record<number, number> = { 1: 0, 2: 0, 3: 0 }
  const ineligible: string[] = []
  for (const id of hand) {
    const card = commandsById.get(id)
    if (!card) continue
    if (card.pips >= 1 && card.pips <= 3) byPip[card.pips]++
    if (!commandCardEligible(card, army, fieldedNames)) ineligible.push(card.name)
  }
  const hasDuplicates = new Set(hand).size !== hand.length
  const complete = byPip[1] === 2 && byPip[2] === 2 && byPip[3] === 2
  return { byPip, ineligible, hasDuplicates, complete, valid: complete && !hasDuplicates && ineligible.length === 0 }
}

// ── Battle deck ──────────────────────────────────────────────────────────────

export const BATTLE_SUBTYPES: BattleCardSubtype[] = ['primary', 'secondary', 'advantage']

/** Whether a points cap uses a Standard battle deck (Recon does not). */
export function usesBattleDeck(cap: number): boolean {
  return formatForCap(cap).id !== 'recon'
}

/**
 * Whether a battle card may go in this army's deck: it must be a Standard-pool card
 * (not Recon) and either faction-agnostic or matching the army's faction.
 */
export function battleCardEligible(card: BattleCard, army: Army): boolean {
  if (card.isRecon) return false
  return !card.faction || card.faction === army.faction
}

/** Battle cards selectable for this army (Standard pool, faction-eligible), name-sorted. */
export function eligibleBattleCards(cards: BattleCard[], army: Army): BattleCard[] {
  return cards.filter((c) => battleCardEligible(c, army)).sort((a, b) => a.name.localeCompare(b.name))
}

export interface BattleDeckValidation {
  bySubtype: Record<BattleCardSubtype, number>
  ineligible: string[]
  hasDuplicates: boolean
  complete: boolean // 3 of each subtype
  valid: boolean
}

/** Validate the battle deck: exactly 3 each of primary/secondary/advantage, no dupes, all eligible. */
export function validateBattleDeck(army: Army, battleCardsById: Map<string, BattleCard>): BattleDeckValidation {
  const deck = army.battleDeck ?? []
  const bySubtype: Record<BattleCardSubtype, number> = { primary: 0, secondary: 0, advantage: 0 }
  const ineligible: string[] = []
  for (const id of deck) {
    const card = battleCardsById.get(id)
    if (!card) continue
    bySubtype[card.subtype]++
    if (!battleCardEligible(card, army)) ineligible.push(card.name)
  }
  const hasDuplicates = new Set(deck).size !== deck.length
  const complete = BATTLE_SUBTYPES.every((s) => bySubtype[s] === 3)
  return { bySubtype, ineligible, hasDuplicates, complete, valid: complete && !hasDuplicates && ineligible.length === 0 }
}

// ── Printable / exportable army sheet ────────────────────────────────────────

export interface ArmySheetUpgrade { name: string; cost: number; slot: string } // slot = display label, e.g. "Heavy Weapon"
export interface ArmySheetUnit { name: string; title: string; qty: number; cost: number; portrait: string | null; upgrades: ArmySheetUpgrade[] }
export interface ArmySheetRank { rank: Rank; label: string; units: ArmySheetUnit[] }
/** A printable full-card image entry, deduped by id with a total-copies count. */
export interface ArmySheetCard { name: string; cardImage: string | null; qty: number }
/** A resolved keyword + its glossary definition, for the print reference. */
export interface ArmySheetKeyword { name: string; text: string }
export interface ArmySheet {
  name: string
  factionName: string
  battleForceName: string | null
  formatName: string
  points: number
  cap: number
  activations: number
  ranks: ArmySheetRank[]
  commandHand: { pip: number; name: string; cardImage: string | null }[] // chosen cards (pip-sorted) + Standing Orders
  battleDeck: { subtype: BattleCardSubtype; name: string; cardImage: string | null }[] // ordered primary → secondary → advantage
  showBattleDeck: boolean
  unitCards: ArmySheetCard[] // distinct unit cards (proxy/print-and-play), roster order
  upgradeCards: ArmySheetCard[] // distinct equipped upgrade cards
  keywords: ArmySheetKeyword[] // every keyword in use (units/weapons/upgrades), alphabetical
}

/** Which sections the print sheet renders. The roster is always printed. */
export interface PrintOptions {
  commandHand: boolean // text list of the command hand
  battleDeck: boolean // text list of the battle deck
  keywordReference: boolean // alphabetical glossary of every keyword in use
  unitCards: boolean // full unit card images
  upgradeCards: boolean // full equipped-upgrade card images
  commandCards: boolean // full command card images
  battleDeckCards: boolean // full battle-deck card images
  perCopy: boolean // unit/upgrade image sections: emit ×qty copies (proxy cutouts) vs one per distinct card
}

export const DEFAULT_PRINT_OPTIONS: PrintOptions = {
  commandHand: true,
  battleDeck: true,
  keywordReference: false,
  unitCards: false,
  upgradeCards: false,
  commandCards: false,
  battleDeckCards: false,
  perCopy: false,
}

/**
 * Build a flat, display-ready snapshot of an army for printing/export. Pure: resolves
 * ids to names + costs, groups units by their (battle-force-aware) rank into ×N rows,
 * and orders the command hand by pip and the battle deck by type.
 */
export function buildArmySheet(
  army: Army,
  unitsById: Map<string, Unit>,
  upgradesById: Map<string, Upgrade>,
  commandsById: Map<string, CommandCard>,
  battleCardsById: Map<string, BattleCard>,
  bf?: BattleForce | null,
  glossary?: Glossary,
): ArmySheet {
  const byRank = {} as Record<Rank, ArmyUnit[]>
  for (const r of RANK_ORDER) byRank[r] = []
  for (const au of army.units) {
    const u = unitsById.get(au.unitId)
    if (u) byRank[effectiveRank(u, bf)].push(au)
  }
  const ranks: ArmySheetRank[] = []
  for (const r of RANK_ORDER) {
    if (!byRank[r].length) continue
    const units = groupArmyUnits(byRank[r]).map((g) => {
      const u = unitsById.get(g.unitId)
      const upgrades = g.representative.upgrades.map((x) => {
        const up = upgradesById.get(x.upgradeId)
        return { name: up?.name ?? x.upgradeId, cost: up?.cost ?? 0, slot: slotLabel(up?.slot ?? x.slot.split('#')[0]) }
      })
      const lineCost = (u?.cost ?? 0) + upgrades.reduce((a, x) => a + x.cost, 0)
      return { name: u?.name ?? g.unitId, title: u?.title ?? '', qty: g.qty, cost: lineCost * g.qty, portrait: u?.portraitImage ?? null, upgrades }
    })
    ranks.push({ rank: r, label: rankName(r), units })
  }

  let points = 0
  for (const au of army.units) points += unitCost(au, unitsById, upgradesById)

  const standingOrders = [...commandsById.values()].find((c) => c.pips >= 4)
  const commandHand = (army.commandHand ?? [])
    .map((id) => commandsById.get(id))
    .filter((c): c is CommandCard => !!c)
    .sort((a, b) => a.pips - b.pips || a.name.localeCompare(b.name))
    .map((c) => ({ pip: c.pips, name: c.name, cardImage: c.cardImage }))
  if (standingOrders) commandHand.push({ pip: standingOrders.pips, name: standingOrders.name, cardImage: standingOrders.cardImage })

  const order: Record<BattleCardSubtype, number> = { primary: 0, secondary: 1, advantage: 2 }
  const battleDeck = (army.battleDeck ?? [])
    .map((id) => battleCardsById.get(id))
    .filter((c): c is BattleCard => !!c)
    .sort((a, b) => order[a.subtype] - order[b.subtype] || a.name.localeCompare(b.name))
    .map((c) => ({ subtype: c.subtype, name: c.name, cardImage: c.cardImage }))

  // Distinct full-card images for the proxy/print-and-play sections, deduped by id
  // (same card isn't repeated per loadout) but carrying the army-wide copy count.
  const unitCards = distinctCards(army.units.map((au) => au.unitId), unitsById)
  const upgradeCards = distinctCards(
    army.units.flatMap((au) => au.upgrades.map((x) => x.upgradeId)),
    upgradesById,
  )

  return {
    name: army.name || 'Untitled army',
    factionName: factionName(army.faction),
    battleForceName: bf?.name ?? null,
    formatName: formatName(army.gameSize),
    points,
    cap: army.gameSize,
    activations: army.units.length,
    ranks,
    commandHand,
    battleDeck,
    showBattleDeck: usesBattleDeck(army.gameSize),
    unitCards,
    upgradeCards,
    keywords: glossary ? armyKeywordReference(army.units, unitsById, upgradesById, glossary) : [],
  }
}

/**
 * Every glossary keyword in use across the army — unit keywords, weapon keywords and
 * equipped-upgrade keywords — resolved to its base entry, deduped (valued/qualified
 * variants collapse to one) and sorted alphabetically. For the print keyword reference.
 */
export function armyKeywordReference(
  units: ArmyUnit[],
  unitsById: Map<string, Unit>,
  upgradesById: Map<string, Upgrade>,
  glossary: Glossary,
): ArmySheetKeyword[] {
  const byName = new Map<string, string>()
  const add = (kw: string) => {
    const entry = resolveKeywordEntry(glossary, kw)
    if (entry) byName.set(entry.name, entry.text)
  }
  for (const au of units) {
    const u = unitsById.get(au.unitId)
    if (u) {
      for (const kw of u.keywords) add(kw)
      for (const w of u.weapons ?? []) for (const kw of w.keywords ?? []) add(kw)
    }
    for (const x of au.upgrades) {
      const up = upgradesById.get(x.upgradeId)
      if (up) for (const kw of up.keywords) add(kw)
    }
  }
  return [...byName.entries()]
    .map(([name, text]) => ({ name, text }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Collapse a list of card ids into distinct entries (first-seen order) carrying a
 * total-copies count and the card's scan. Shared by the unit/upgrade proxy sections.
 */
function distinctCards(
  ids: string[],
  byId: Map<string, { name: string; cardImage: string | null }>,
): ArmySheetCard[] {
  const out: ArmySheetCard[] = []
  const seen = new Map<string, ArmySheetCard>()
  for (const id of ids) {
    const existing = seen.get(id)
    if (existing) {
      existing.qty++
      continue
    }
    const card = byId.get(id)
    const entry: ArmySheetCard = { name: card?.name ?? id, cardImage: card?.cardImage ?? null, qty: 1 }
    seen.set(id, entry)
    out.push(entry)
  }
  return out
}

// ── Export formats (EPIC E3/E4) ──────────────────────────────────────────────

/**
 * Plain-text army list — the conventional readable block players paste into
 * Discord/forums. Pure: derived entirely from the `ArmySheet` snapshot so it
 * stays in lockstep with the print sheet (same names, costs, grouping, order).
 */
export function armyToText(sheet: ArmySheet): string {
  const lines: string[] = []
  const bf = sheet.battleForceName ? ` — ${sheet.battleForceName}` : ''
  lines.push(`${sheet.name} [${sheet.factionName}${bf}]`)
  lines.push(`${sheet.formatName} — ${sheet.points}/${sheet.cap} pts, ${sheet.activations} activations`)

  for (const rank of sheet.ranks) {
    lines.push('', rank.label.toUpperCase())
    for (const u of rank.units) {
      const qty = u.qty > 1 ? ` ×${u.qty}` : ''
      const title = u.title ? `, ${u.title}` : ''
      lines.push(`• ${u.name}${title}${qty} (${u.cost})`)
      for (const up of u.upgrades) lines.push(`    - [${up.slot}] ${up.name} (${up.cost})`)
    }
  }

  if (sheet.commandHand.length) {
    lines.push('', 'COMMAND HAND')
    for (const c of sheet.commandHand) lines.push(`• ${c.pip} ${c.name}`)
  }

  if (sheet.showBattleDeck && sheet.battleDeck.length) {
    lines.push('', 'BATTLE DECK')
    for (const c of sheet.battleDeck) lines.push(`• [${c.subtype}] ${c.name}`)
  }

  return lines.join('\n')
}

/** Our factions → the name-based interchange `armyFaction` enum (mercenary → ""). */
const TTS_FACTION: Record<Faction, string> = {
  rebels: 'rebel',
  empire: 'imperial',
  republic: 'republic',
  separatists: 'separatist',
  mercenary: '', // fringe/mercenary → "" (TTS coerces to "shadowcollective")
  mandalorians: '', // Mandalorian Clans is a Shadow Collective battle force
}

export interface ListExportUnit {
  name: string
  upgrades: string[]
  loadout: string[]
}
export interface ListExportJSON {
  author: string
  listname: string
  points: number
  armyFaction: string
  commandCards: string[]
  contingencies: string[]
  units: ListExportUnit[]
  battlefieldDeck: {
    scenario: string
    objective: string[]
    deployment: string[]
    conditions: string[]
  }
}

/**
 * The name-based "Export TTS JSON" interchange object. One payload serves BOTH the
 * `swlegion/tts` Tabletop Simulator mod (paste-import) AND Longshanks event
 * registration (which ingests this exact schema for metagame stats). Every card is
 * referenced by its exact display NAME — the importers key on names, not ids — so we
 * emit the catalogue names directly (no id crosswalk).
 *
 * Note: the schema predates the 2024 v2 battle deck, so its objective/deployment/
 * condition trichotomy doesn't map cleanly to the current primary/secondary/advantage
 * subtypes. We slot them best-effort (primary→objective, secondary→deployment,
 * advantage→conditions) so the names still flow into Longshanks stats.
 */
export function armyToListJSON(
  army: Army,
  unitsById: Map<string, Unit>,
  upgradesById: Map<string, Upgrade>,
  commandsById: Map<string, CommandCard>,
  battleCardsById: Map<string, BattleCard>,
): ListExportJSON {
  let points = 0
  for (const au of army.units) points += unitCost(au, unitsById, upgradesById)

  const units: ListExportUnit[] = army.units.map((au) => ({
    name: unitsById.get(au.unitId)?.name ?? au.unitId,
    upgrades: au.upgrades
      .map((x) => upgradesById.get(x.upgradeId)?.name)
      .filter((n): n is string => !!n),
    loadout: [],
  }))

  const commandCards = (army.commandHand ?? [])
    .map((id) => commandsById.get(id)?.name)
    .filter((n): n is string => !!n)
  commandCards.push('Standing Orders')

  const deck = { primary: [] as string[], secondary: [] as string[], advantage: [] as string[] }
  for (const id of army.battleDeck ?? []) {
    const card = battleCardsById.get(id)
    if (card) deck[card.subtype].push(card.name)
  }

  return {
    author: 'LegionApp',
    listname: army.name || 'Untitled',
    points,
    armyFaction: army.faction ? TTS_FACTION[army.faction] : '',
    commandCards,
    contingencies: [],
    units,
    battlefieldDeck: {
      scenario: 'standard',
      objective: deck.primary,
      deployment: deck.secondary,
      conditions: deck.advantage,
    },
  }
}

// ── Import (round-trip a previously-exported list) ───────────────────────────

/** Reverse of TTS_FACTION ("" maps back to mercenary; see importTTS). */
const TTS_FACTION_REVERSE: Record<string, Faction> = {
  rebel: 'rebels',
  imperial: 'empire',
  republic: 'republic',
  separatist: 'separatists',
}

export interface ListCatalog {
  units: Unit[]
  upgrades: Upgrade[]
  commands: CommandCard[]
  battleCards: BattleCard[]
}
export interface ImportResult {
  army: Army
  warnings: string[]
  source: 'native' | 'tts'
}

/** Lowercased-name → first card index, plus the set of names that resolve to >1 card. */
function nameIndex<T extends { name: string }>(items: T[]): { map: Map<string, T>; ambiguous: Set<string> } {
  const map = new Map<string, T>()
  const ambiguous = new Set<string>()
  for (const it of items) {
    const k = it.name.trim().toLowerCase()
    if (map.has(k)) ambiguous.add(k)
    else map.set(k, it)
  }
  return { map, ambiguous }
}

/**
 * Parse a previously-exported list back into an `Army`, auto-detecting the format:
 *  - **native** LegionApp file (id-based CompactArmy) — lossless via `fromCompact`;
 *    unknown ids (e.g. a newer data version) are reported but kept.
 *  - **TTS / Longshanks JSON** (name-based) — best-effort: cards matched by display
 *    name against `catalog`; unmatched/ambiguous names are reported in `warnings`
 *    rather than silently dropped. That schema stores no format/points cap, so it
 *    defaults to Standard 1000.
 * Returns `null` if the text isn't valid JSON or a recognised list shape.
 */
export function importArmy(text: string, catalog: ListCatalog): ImportResult | null {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return null
  }
  if (!data || typeof data !== 'object') return null
  const obj = data as Record<string, unknown>

  // Native CompactArmy: carries the `u` units tuples (possibly empty).
  if (Array.isArray(obj.u) || (typeof obj.g === 'number' && 'n' in obj)) {
    const army = fromCompact(obj as unknown as CompactArmy)
    const warnings: string[] = []
    const knownUnit = new Set(catalog.units.map((u) => u.id))
    const knownUp = new Set(catalog.upgrades.map((u) => u.id))
    for (const au of army.units) {
      if (!knownUnit.has(au.unitId)) warnings.push(`Unknown unit id "${au.unitId}" — kept but may not resolve.`)
      for (const x of au.upgrades) if (!knownUp.has(x.upgradeId)) warnings.push(`Unknown upgrade id "${x.upgradeId}".`)
    }
    return { army, warnings, source: 'native' }
  }

  // TTS / Longshanks JSON: name-based.
  if ('armyFaction' in obj && Array.isArray(obj.units)) return importTTS(obj, catalog)

  return null
}

function importTTS(obj: Record<string, unknown>, catalog: ListCatalog): ImportResult {
  const warnings: string[] = []
  const units = nameIndex(catalog.units)
  const upgrades = nameIndex(catalog.upgrades)
  const commands = nameIndex(catalog.commands)
  const battle = nameIndex(catalog.battleCards)

  const factionRaw = String(obj.armyFaction ?? '')
  let faction: Faction | null
  if (!factionRaw) {
    faction = 'mercenary'
    warnings.push('Faction was empty (Mercenary / Mandalorian Clans are indistinguishable in this format) — set to Mercenary.')
  } else if (TTS_FACTION_REVERSE[factionRaw]) {
    faction = TTS_FACTION_REVERSE[factionRaw]
  } else {
    faction = null
    warnings.push(`Unrecognised faction "${factionRaw}".`)
  }

  let counter = 0
  const armyUnits: ArmyUnit[] = []
  for (const raw of obj.units as Record<string, unknown>[]) {
    const name = String(raw?.name ?? '').trim()
    if (!name) continue
    const key = name.toLowerCase()
    const unit = units.map.get(key)
    if (!unit) {
      warnings.push(`Unit not found: "${name}".`)
      continue
    }
    if (units.ambiguous.has(key)) {
      warnings.push(`Ambiguous unit "${name}" — used "${unit.name}${unit.title ? `, ${unit.title}` : ''}".`)
    }

    const slotCount: Record<string, number> = {}
    const ups: { slot: string; upgradeId: string }[] = []
    const upNames = [...((raw.upgrades as unknown[]) ?? []), ...((raw.loadout as unknown[]) ?? [])]
    for (const upRaw of upNames) {
      const uk = String(upRaw ?? '').trim().toLowerCase()
      if (!uk) continue
      const up = upgrades.map.get(uk)
      if (!up) {
        warnings.push(`Upgrade not found: "${upRaw}" (on ${name}).`)
        continue
      }
      const idx = slotCount[up.slot] ?? 0
      ups.push({ slot: `${up.slot}#${idx}`, upgradeId: up.id })
      slotCount[up.slot] = idx + 1
    }
    armyUnits.push({ uid: `u${counter++}`, unitId: unit.id, upgrades: ups })
  }

  const commandHand: string[] = []
  for (const cRaw of (obj.commandCards as unknown[]) ?? []) {
    const n = String(cRaw ?? '').trim()
    if (!n || n.toLowerCase() === 'standing orders') continue // auto card, not a pick
    const c = commands.map.get(n.toLowerCase())
    if (c) commandHand.push(c.id)
    else warnings.push(`Command card not found: "${n}".`)
  }

  const bd = (obj.battlefieldDeck ?? {}) as Record<string, unknown>
  const battleDeck: string[] = []
  for (const arr of [bd.objective, bd.deployment, bd.condition, bd.conditions]) {
    for (const bRaw of (arr as unknown[]) ?? []) {
      const n = String(bRaw ?? '').trim()
      if (!n) continue
      const b = battle.map.get(n.toLowerCase())
      if (b) battleDeck.push(b.id)
      else warnings.push(`Battle card not found: "${n}".`)
    }
  }

  warnings.push("Format/points cap isn't stored in this file — set to Standard (1000).")

  return {
    army: {
      name: String(obj.listname ?? ''),
      faction,
      battleForce: null,
      gameSize: 1000,
      units: armyUnits,
      commandHand,
      battleDeck,
    },
    warnings,
    source: 'tts',
  }
}

export function validateArmy(
  army: Army,
  unitsById: Map<string, Unit>,
  upgradesById: Map<string, Upgrade>,
  bf?: BattleForce | null,
  commandsById?: Map<string, CommandCard>,
  battleCardsById?: Map<string, BattleCard>,
): ArmyValidation {
  const rankCounts: Record<Rank, number> = {
    commander: 0, operative: 0, corps: 0, special: 0, support: 0, heavy: 0,
  }
  // Detachment units count toward the displayed total and the minimum, but NOT the
  // maximum (rulebook) — tracked separately so the max check can subtract them.
  const detachmentCounts: Record<Rank, number> = {
    commander: 0, operative: 0, corps: 0, special: 0, support: 0, heavy: 0,
  }
  let points = 0
  let unpriced = 0
  const factions = new Set<Faction>()
  for (const au of army.units) {
    const unit = unitsById.get(au.unitId)
    if (!unit) continue
    // A battle force can place a unit in a rank other than its printed one.
    const r = effectiveRank(unit, bf)
    rankCounts[r]++
    if (isDetachment(unit)) detachmentCounts[r]++
    if (unit.cost == null) unpriced++
    points += unitCost(au, unitsById, upgradesById)
    factions.add(unit.faction)
  }

  const items: ValidationItem[] = []
  const rules = battleForceRules(bf)

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

  // Battle-force eligibility — every unit must be on the battle force's roster.
  if (bf) {
    const pool = battleForcePool(bf)
    const ineligible = [...new Set(
      army.units.map((au) => unitsById.get(au.unitId)).filter((u): u is Unit => !!u && !pool.has(u.id)).map((u) => u.name),
    )]
    if (ineligible.length) {
      items.push({ ok: false, label: 'Battle force', detail: `Not in ${bf.name}: ${ineligible.join(', ')}` })
    }
  }

  // Rank limits — the battle force's own rank table when one is set, else per-format
  // (rankLimits / FORMATS). Required ranks (min > 0) surface even when empty so their
  // unmet minimum is always visible. Entourage widens a rank's max; Field Commander
  // relaxes the commander minimum (unless the battle force forbids it via noFieldComm).
  // Outside a battle force, mercenaries count toward maximums but NOT minimums (no-min
  // rule), so minimums are measured against non-mercenary counts.
  const merc = bf ? null : mercenaryIssues(army, unitsById)
  const limits = rankLimits(army.gameSize, bf)
  const entourage = entourageBonuses(army, unitsById)
  const fieldCommander = !rules.noFieldComm && hasFieldCommander(army, unitsById)
  for (const rank of RANK_ORDER) {
    const max = limits[rank].max + (entourage[rank] ?? 0)
    let min = limits[rank].min
    const count = rankCounts[rank]
    const mercCount = merc?.rankCounts[rank] ?? 0
    const nonMerc = count - mercCount
    let note = ''
    if (rank === 'commander' && min > 0 && nonMerc === 0 && fieldCommander) {
      min = 0
      note = ' (Field Commander)'
    }
    if (count === 0 && min === 0 && !note) continue // hide empty optional ranks
    // Detachments don't count toward the maximum, so the max is measured against the
    // non-detachment count; the min and the displayed total still count everything.
    const detachCount = detachmentCounts[rank]
    const maxCount = count - detachCount
    const minOk = nonMerc >= min
    const maxOk = maxCount <= max
    const detail = !minOk
      ? mercCount > 0
        ? `${count} (need ${min} non-merc)`
        : `${count} (need ${min})`
      : !maxOk
      ? `${maxCount} (max ${max})`
      : detachCount > 0
      ? `${maxCount} / ${max} (+${detachCount} detachment)`
      : `${count} / ${max}`
    items.push({ ok: minOk && maxOk, label: rankName(rank), detail: detail + note })
  }

  // Combined Commander + Operative cap (some battle forces share one pool).
  if (bf) {
    const commOp = battleForceRankTable(bf, army.gameSize).commOp
    if (commOp != null) {
      const used = (rankCounts.commander - detachmentCounts.commander) + (rankCounts.operative - detachmentCounts.operative)
      items.push({
        ok: used <= commOp,
        label: 'Cmd + Op',
        detail: `${used} / ${commOp}`,
      })
    }
  }

  // Per-unit-id limits (e.g. ≤2 HQ units, ≥1 of a required unit).
  for (const lim of rules.unitLimits ?? []) {
    const [min, max] = lim.count
    const n = army.units.filter((au) => lim.ids.includes(au.unitId)).length
    const names = lim.ids.map((id) => unitsById.get(id)?.name).filter(Boolean)
    const label = names.length ? names.join(' / ') : 'Unit limit'
    if (n < min) items.push({ ok: false, label, detail: `${n} (need ${min})` })
    else if (n > max) items.push({ ok: false, label, detail: `${n} (max ${max})` })
  }

  // Minimum-Wookiee rule (Wookiee Defenders): at least 3 Wookiee Trooper units.
  if (rules.minimum3Wookiees) {
    const wookiees = army.units.filter((au) => /wookiee/i.test(unitsById.get(au.unitId)?.unitType ?? '')).length
    items.push({ ok: wookiees >= 3, label: 'Wookiees', detail: `${wookiees} / 3 min` })
  }

  // Detachment — a detachment unit needs its parent unit/rank in the list. A battle
  // force may exempt a specific unit (ignoreDetach).
  const detachIssues = unmetDetachments(army, unitsById).filter((s) => {
    if (!rules.ignoreDetach) return true
    const exempt = unitsById.get(rules.ignoreDetach)
    return !exempt || !s.startsWith(`${exempt.name} →`)
  })
  if (detachIssues.length) {
    items.push({ ok: false, label: 'Detachment', detail: detachIssues.join('; ') })
  }

  // Heavy Weapon Team — the keyword mandates equipping a Heavy Weapon upgrade.
  const hwtIssues = heavyWeaponTeamUnmet(army, unitsById)
  if (hwtIssues.length) {
    items.push({
      ok: false,
      label: 'Heavy Weapon',
      detail: `${hwtIssues.join(', ')} need${hwtIssues.length === 1 ? 's' : ''} a heavy weapon`,
    })
  }

  // Single faction (mercenaries may mix in via Allies of Convenience — allowed).
  // A battle force defines its own cross-faction roster, so this check is skipped.
  if (!bf) {
    const nonMerc = [...factions].filter((f) => f !== 'mercenary')
    const factionOk = nonMerc.length <= 1
    if (factions.size > 0) {
      items.push({
        ok: factionOk,
        label: 'Faction',
        detail: factionOk ? 'Single faction' : `Mixed: ${nonMerc.join(', ')}`,
      })
    }
  }

  // Mercenary "Allies of Convenience" — affiliation match + per-rank caps (no BF only).
  if (merc && merc.illegalAllies.length) {
    items.push({
      ok: false,
      label: 'Allies',
      detail: `Can't ally: ${merc.illegalAllies.join(', ')}`,
    })
  }
  if (merc && merc.capExceeded.length) {
    items.push({
      ok: false,
      label: 'Mercenaries',
      detail: merc.capExceeded.map((c) => `${rankName(c.rank)} ${c.count} (max ${c.cap})`).join(', '),
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

  // Command hand — 2/2/2 + auto Standing Orders, no dupes, all eligible. Only once the
  // army has units (a commander to pick cards for); the auto card is the +1 in "/7".
  if (commandsById && army.units.length > 0) {
    const ch = validateCommandHand(army, commandsById, fieldedUnitNames(army, unitsById))
    const chosen = (army.commandHand ?? []).length
    const detail = ch.ineligible.length
      ? `Ineligible: ${ch.ineligible.join(', ')}`
      : ch.hasDuplicates
      ? 'Duplicate cards'
      : `${chosen + 1} / 7` // +1 for Standing Orders
    items.push({ ok: ch.valid, label: 'Command hand', detail })
  }

  // Battle deck — 3 primary / 3 secondary / 3 advantage, no dupes, all eligible.
  // Standard formats only (Recon has no battle deck); only once the army has units.
  if (battleCardsById && usesBattleDeck(army.gameSize) && army.units.length > 0) {
    const bd = validateBattleDeck(army, battleCardsById)
    const detail = bd.ineligible.length
      ? `Ineligible: ${bd.ineligible.join(', ')}`
      : bd.hasDuplicates
      ? 'Duplicate cards'
      : `${(army.battleDeck ?? []).length} / 9`
    items.push({ ok: bd.valid, label: 'Battle deck', detail })
  }

  const valid = items.every((i) => i.ok) && army.units.length > 0
  return { valid, points, activations: army.units.length, rankCounts, items }
}

// ── Compact serialisation for save / share ───────────────────────────────────

/** Compact-format schema version. v2 added battle force / command hand / battle deck. */
export const COMPACT_VERSION = 2

export function toCompact(army: Army): CompactArmy {
  return {
    v: COMPACT_VERSION,
    n: army.name,
    f: army.faction,
    // Only serialise a battle force when one is set, to keep legacy share codes stable.
    ...(army.battleForce ? { b: army.battleForce } : {}),
    g: army.gameSize,
    u: army.units.map((au) => [au.unitId, au.upgrades.map((x) => [x.slot, x.upgradeId] as [string, string])]),
    ...(army.commandHand?.length ? { c: army.commandHand } : {}),
    ...(army.battleDeck?.length ? { d: army.battleDeck } : {}),
  }
}

export function fromCompact(c: CompactArmy): Army {
  let counter = 0
  return {
    name: c.n ?? '',
    faction: c.f ?? null,
    battleForce: c.b ?? null,
    gameSize: c.g ?? 800,
    units: (c.u ?? []).map(([unitId, ups]) => ({
      uid: `u${counter++}`,
      unitId,
      upgrades: (ups ?? []).map(([slot, upgradeId]) => ({ slot, upgradeId })),
    })),
    commandHand: c.c ?? [],
    battleDeck: c.d ?? [],
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

/** Rank-tracker chip status for the Build footer: below min / over max / in range. */
export type RankChipState = 'under' | 'over' | 'ok'
export function rankChipState(count: number, min: number, max: number, detachments = 0): RankChipState {
  if (count - detachments > max) return 'over' // detachments don't count toward the max
  if (count < min) return 'under'
  return 'ok'
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

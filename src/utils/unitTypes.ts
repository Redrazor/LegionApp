// Maps a unit's `unitType` (a printed card attribute, e.g. "clone trooper", "ground
// vehicle") to its rulebook unit-type rules — the verbatim Appendix B entries that live
// in `Keyword_glossary.md` / `keywords.json` under the matching Title-Case key.
//
// Only SUBTYPES WITH THEIR OWN SPECIAL RULES are mapped. Base `trooper`, `mandalorian
// trooper` (no rulebook subtype — Mandalorians are plain Troopers) and `wookiee trooper`
// (Appendix B: "no additional special rules") deliberately resolve to null so the UI
// shows no unit-subtype pill for them. The base-Vehicle Resiliency rules are intentionally
// omitted — the Resilience stat already conveys them.

/** Glossary key for a unitType's rules, or null when the type has no distinct rules. */
const UNIT_TYPE_RULE_KEY: Record<string, string> = {
  'clone trooper': 'Clone Trooper',
  'creature trooper': 'Creature Trooper',
  'droid trooper': 'Droid Trooper',
  'emplacement trooper': 'Emplacement Trooper',
  'heavy droid trooper': 'Heavy Droid Trooper',
  'ground vehicle': 'Ground Vehicle',
  'repulsor vehicle': 'Repulsor Vehicle',
}

/**
 * Resolve a unit's `unitType` to the glossary key holding its unit-type rules, or null
 * when the type has no distinct rules (base trooper, mandalorian/wookiee trooper, vehicles
 * covered by the Resilience stat). Case/whitespace-insensitive on the printed value.
 */
export function unitTypeRuleKey(unitType: string | null | undefined): string | null {
  if (!unitType) return null
  return UNIT_TYPE_RULE_KEY[unitType.trim().toLowerCase()] ?? null
}

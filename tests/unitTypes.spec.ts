import { describe, it, expect } from 'vitest'
import { unitTypeRuleKey } from '../src/utils/unitTypes.ts'

describe('unitTypeRuleKey', () => {
  it('maps subtypes that have their own Appendix B rules to a glossary key', () => {
    expect(unitTypeRuleKey('clone trooper')).toBe('Clone Trooper')
    expect(unitTypeRuleKey('creature trooper')).toBe('Creature Trooper')
    expect(unitTypeRuleKey('droid trooper')).toBe('Droid Trooper')
    expect(unitTypeRuleKey('emplacement trooper')).toBe('Emplacement Trooper')
    expect(unitTypeRuleKey('heavy droid trooper')).toBe('Heavy Droid Trooper')
    expect(unitTypeRuleKey('ground vehicle')).toBe('Ground Vehicle')
    expect(unitTypeRuleKey('repulsor vehicle')).toBe('Repulsor Vehicle')
  })

  it('returns null for types with no distinct unit-type rules', () => {
    // Base trooper, Mandalorian (not a rulebook subtype), and Wookiee (Appendix B:
    // "no additional special rules") intentionally show no subtype pill.
    expect(unitTypeRuleKey('trooper')).toBeNull()
    expect(unitTypeRuleKey('mandalorian trooper')).toBeNull()
    expect(unitTypeRuleKey('wookiee trooper')).toBeNull()
  })

  it('is tolerant of casing, surrounding whitespace, and empty input', () => {
    expect(unitTypeRuleKey('Ground Vehicle')).toBe('Ground Vehicle')
    expect(unitTypeRuleKey('  droid trooper  ')).toBe('Droid Trooper')
    expect(unitTypeRuleKey('')).toBeNull()
    expect(unitTypeRuleKey(null)).toBeNull()
    expect(unitTypeRuleKey(undefined)).toBeNull()
  })

  it('every mapped key resolves against the shipped glossary', async () => {
    const glossary = (await import('../public/data/keywords.json')).default as Record<string, string>
    for (const t of ['clone trooper', 'creature trooper', 'droid trooper', 'emplacement trooper', 'heavy droid trooper', 'ground vehicle', 'repulsor vehicle']) {
      const key = unitTypeRuleKey(t)!
      expect(glossary[key], `glossary missing "${key}" for unitType "${t}"`).toBeTruthy()
    }
  })
})

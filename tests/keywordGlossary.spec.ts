import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { deriveKey, cleanText, parseGlossary, buildGlossary } from '../scraper/keywordGlossary'
import { resolveKeyword } from '../src/utils/keywords'

const ROOT = join(__dirname, '..')
const md = readFileSync(join(ROOT, 'Keyword_glossary.md'), 'utf8')
const loadJson = (f: string) => JSON.parse(readFileSync(join(ROOT, 'public/data', f), 'utf8'))

// Same set the generator allowlists — LHQ2 card-data artifacts, never glossary keywords.
const KNOWN_UNRESOLVED = new Set(['Dodge', 'Ranged', 'Pull The Strings Empire Trooper'])

describe('deriveKey', () => {
  it('passes through a bare keyword', () => {
    expect(deriveKey('Block')).toBe('Block')
    expect(deriveKey("I'm Part of the Squad Too")).toBe("I'm Part of the Squad Too")
  })
  it('strips a trailing " X" value placeholder', () => {
    expect(deriveKey('Armor X')).toBe('Armor')
    expect(deriveKey('Wound X')).toBe('Wound')
  })
  it('drops a ":" qualifier', () => {
    expect(deriveKey('Aid: Affiliation/Unit Type')).toBe('Aid')
    expect(deriveKey('Hover: Ground/Air X')).toBe('Hover')
    expect(deriveKey('Immune: [Range 1] Weapons')).toBe('Immune')
  })
  it('drops both a ":" qualifier and a " X" before it', () => {
    expect(deriveKey('Weak Point X: Front/Rear/Sides')).toBe('Weak Point')
    expect(deriveKey('Detonate X: (Charge Type)')).toBe('Detonate')
  })
})

describe('cleanText', () => {
  it('removes icon brackets and bold markers', () => {
    expect(cleanText('cancel up to X [Hit] results')).toBe('cancel up to X Hit results')
    expect(cleanText('it gains [Surge]:[Block] now')).toBe('it gains Surge:Block now')
    expect(cleanText('**Here I Am:** text')).toBe('Here I Am: text')
  })
  it('flattens bullets and collapses whitespace to one line', () => {
    expect(cleanText('Intro:\n- one\n- two')).toBe('Intro: • one • two')
    expect(cleanText('a\n\n   b')).toBe('a b')
  })
})

describe('parseGlossary', () => {
  const entries = parseGlossary(md)
  it('parses every ### entry', () => {
    expect(entries.length).toBeGreaterThan(190)
  })
  it('excludes the intro and the errata-changelog bullet list (no ### headers)', () => {
    expect(entries.some((e) => e.text.includes('Transcribed from the official rulebook'))).toBe(false)
    expect(entries.some((e) => /Mandalorians Are Stronger Together keyword \*\*added\*\*/.test(e.text))).toBe(false)
  })
})

describe('buildGlossary (against the real Keyword_glossary.md)', () => {
  const g = buildGlossary(md, Object.keys(loadJson('keywords.json')))

  it('reconciles casing onto card-facing keys', () => {
    // rulebook header is "Death From Above"; cards/key use "Death from Above"
    expect(g['Death from Above']).toBeTruthy()
    expect(g['Death From Above']).toBeUndefined()
  })

  it('adds the two genuinely-missing keywords', () => {
    expect(g['Anti-Personnel']).toMatch(/Trooper unit, upgrade/)
    expect(g["I'm Part of the Squad Too"]).toMatch(/Contesting an Objective/)
  })

  it('carries the corrected rulebook text for previously-wrong keywords', () => {
    expect(g['Aid']).toMatch(/Range 2/)
    expect(g['Fire Support']).toMatch(/Standby token/)
    // Mandalorian update (DOC56) errata reworded Impervious: now reduces the
    // attacker's Pierce X by 1 at Modify Defense Dice (was "cancel one fewer Block").
    expect(g['Impervious']).toMatch(/reduce that Attack Pool's Pierce X keyword value by 1/)
    expect(g['Infiltrate']).toMatch(/allied Territory/)
    expect(g['Long Shot']).toMatch(/Only 1 Aim token/)
    expect(g['Hunted']).toMatch(/Bounty token/)
    expect(g['Soresu Mastery']).toMatch(/reroll all of its defense dice/)
    expect(g['Tempted']).toMatch(/defeated by an enemy attack/)
    // none of these should still say "range 1" where the rule is Range 2
    expect(g['Take Cover']).not.toMatch(/range 1\b/i)
  })

  it('drops stale keywords that are no longer in the rulebook', () => {
    for (const stale of ['Authoritative', 'Covert Ops', 'Grounded', 'Skirmish']) {
      expect(g[stale]).toBeUndefined()
    }
  })

  it('preserves card-referenced reference entries', () => {
    for (const k of ['Strafe', 'Ion Token', 'Poison Token', 'Shield Token', 'Surge Token']) {
      expect(g[k]).toBeTruthy()
    }
  })

  it('carries the verbatim Appendix B unit-subtype rules (and only those with distinct rules)', () => {
    for (const k of ['Clone Trooper', 'Creature Trooper', 'Droid Trooper', 'Emplacement Trooper', 'Heavy Droid Trooper', 'Ground Vehicle', 'Repulsor Vehicle']) {
      expect(g[k], `missing unit-type entry "${k}"`).toBeTruthy()
    }
    // Base/Mandalorian/Wookiee troopers have no additional rules → no entry, no pill.
    for (const k of ['Trooper', 'Mandalorian Trooper', 'Wookiee Trooper', 'Vehicle']) {
      expect(g[k], `unexpected unit-type entry "${k}"`).toBeUndefined()
    }
  })
})

describe('every card keyword resolves against the generated glossary', () => {
  const g = loadJson('keywords.json')
  const strings = new Set<string>()
  const add = (a: unknown) => Array.isArray(a) && a.forEach((k) => strings.add(String(k)))
  for (const u of loadJson('units.json')) {
    add(u.keywords)
    ;(u.weapons ?? []).forEach((w: any) => add(w?.keywords))
  }
  for (const u of loadJson('upgrades.json')) {
    add(u.keywords)
    ;(u.weapons ?? []).forEach((w: any) => add(w?.keywords))
  }
  for (const c of loadJson('commands.json')) add(c.keywords)

  it('leaves no unresolved card keyword (outside the known LHQ2 artifacts)', () => {
    const unresolved = [...strings].filter((k) => resolveKeyword(g, k) === null && !KNOWN_UNRESOLVED.has(k))
    expect(unresolved).toEqual([])
  })
})

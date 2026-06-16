import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { resolveKeyword, resolveKeywordEntry } from '../src/utils/keywords'

const G = {
  Scout: 'Scout def',
  Reliable: 'Reliable def',
  'Uncanny Luck': 'Uncanny Luck def',
  'Weak Point': 'Weak Point def',
  Immune: 'Immune def',
  'Special Issue': 'Special Issue def',
  'Master of the Force': 'MotF def',
  Mercenary: 'Mercenary def',
  Fixed: 'Fixed def',
}

describe('resolveKeyword', () => {
  it('matches an exact keyword', () => {
    expect(resolveKeyword(G, 'Scout')).toBe('Scout def')
  })

  it('strips a trailing numeric value ("Reliable 2" → Reliable)', () => {
    expect(resolveKeyword(G, 'Reliable 2')).toBe('Reliable def')
  })

  it('strips a trailing "X" placeholder ("Uncanny Luck X" → Uncanny Luck)', () => {
    expect(resolveKeyword(G, 'Uncanny Luck X')).toBe('Uncanny Luck def')
  })

  it('drops a ":" qualifier then a value ("Weak Point 1: Rear" → Weak Point)', () => {
    expect(resolveKeyword(G, 'Weak Point 1: Rear')).toBe('Weak Point def')
    expect(resolveKeyword(G, 'Weak Point 2: Rear, Sides')).toBe('Weak Point def')
  })

  it('resolves a ":" keyword by its prefix ("Immune: Pierce" → Immune)', () => {
    expect(resolveKeyword(G, 'Immune: Pierce')).toBe('Immune def')
  })

  it('resolves a valued multi-word keyword via whole-word prefix', () => {
    expect(resolveKeyword(G, 'Special Issue Blizzard Force')).toBe('Special Issue def')
    expect(resolveKeyword(G, 'Master of the Force 1')).toBe('MotF def')
    expect(resolveKeyword(G, 'Mercenary Rebels, Republic')).toBe('Mercenary def')
  })

  it('prefers the longest matching prefix key', () => {
    const g = { Special: 'short', 'Special Issue': 'long' }
    expect(resolveKeyword(g, 'Special Issue Blizzard Force')).toBe('long')
  })

  it('falls back to the first word ("Fixed Front" → Fixed)', () => {
    expect(resolveKeyword(G, 'Fixed Front')).toBe('Fixed def')
  })

  it('returns null for a genuinely absent keyword', () => {
    expect(resolveKeyword(G, 'Overwhelm')).toBeNull()
  })

  it('returns null for empty/blank input', () => {
    expect(resolveKeyword(G, '')).toBeNull()
  })

  it('does not partial-match a non-boundary prefix (Scout ≠ Scouting)', () => {
    expect(resolveKeyword(G, 'Scouting')).toBeNull()
  })
})

describe('resolveKeywordEntry', () => {
  it('returns the matched base name + text so valued variants dedupe to one entry', () => {
    expect(resolveKeywordEntry(G, 'Reliable 2')).toEqual({ name: 'Reliable', text: 'Reliable def' })
    expect(resolveKeywordEntry(G, 'Weak Point 1: Rear')).toEqual({ name: 'Weak Point', text: 'Weak Point def' })
    expect(resolveKeywordEntry(G, 'Special Issue Blizzard Force')).toEqual({ name: 'Special Issue', text: 'Special Issue def' })
  })

  it('returns null for an absent keyword', () => {
    expect(resolveKeywordEntry(G, 'Overwhelm')).toBeNull()
    expect(resolveKeywordEntry(G, '')).toBeNull()
  })
})

// Coverage guard against the real catalogue: every keyword used by a unit (incl. its
// weapons), upgrade or command must resolve to a glossary tooltip — except a short, known
// allowlist of terms that aren't glossary keywords (a token term, an attack-type qualifier,
// and a card-specific ability whose text lives on the card). A new scrape that introduces
// an unresolved keyword fails here so it gets triaged. See docs/keyword-tooltip-gaps.md.
describe('glossary coverage (real catalogue)', () => {
  const load = (f: string) =>
    JSON.parse(readFileSync(join(__dirname, '../public/data', f), 'utf8'))
  const glossary = load('keywords.json') as Record<string, string>
  const units = load('units.json') as any[]
  const upgrades = load('upgrades.json') as any[]
  const commands = load('commands.json') as any[]

  // Not glossary keywords — correctly render no tooltip (resolveKeyword → null).
  const ALLOWED_UNRESOLVED = new Set([
    'Dodge', // a token term, not a keyword
    'Ranged', // attack-type qualifier (Sidearm), not a standalone keyword
    'Pull The Strings Empire Trooper', // card-specific ability; text lives on the card
  ])

  const used = new Set<string>()
  for (const u of units) {
    for (const k of u.keywords ?? []) used.add(k)
    for (const w of u.weapons ?? []) for (const k of w.keywords ?? []) used.add(k)
  }
  for (const u of upgrades) for (const k of u.keywords ?? []) used.add(k)
  for (const c of commands) for (const k of c.keywords ?? []) used.add(k)

  it('resolves every used keyword except the known non-glossary allowlist', () => {
    const unresolved = [...used].filter((k) => resolveKeyword(glossary, k) === null)
    const unexpected = unresolved.filter((k) => !ALLOWED_UNRESOLVED.has(k))
    expect(unexpected).toEqual([])
  })

  it('resolves the valued/qualified forms cards actually use', () => {
    expect(resolveKeyword(glossary, 'Anti-Materiel 4')).not.toBeNull()
    expect(resolveKeyword(glossary, 'Associate Anakin Skywalker')).not.toBeNull()
    expect(resolveKeyword(glossary, 'This is the Way Aim 2')).not.toBeNull()
  })
})

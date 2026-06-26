import { describe, it, expect } from 'vitest'
import {
  AMG_SOURCES, PRESERVE_SLUGS, isPreserved, pdfBasename, selectFronts, matchCard,
  type CatalogueCard,
} from '../scraper/amgNormalise.ts'

describe('AMG_SOURCES', () => {
  it('covers all four card categories', () => {
    const cats = new Set(AMG_SOURCES.map((s) => s.category))
    expect([...cats].sort()).toEqual(['battle', 'commands', 'units', 'upgrades'])
  })

  it('every source is an https AMG CDN PDF url', () => {
    for (const s of AMG_SOURCES) {
      expect(s.url).toMatch(/^https:\/\/cdn\.svc\.asmodee\.net\/.+\.pdf$/)
    }
  })

  it('covers every player faction for units, upgrades and commands', () => {
    const factions = ['empire', 'republic', 'rebels', 'separatists', 'mercenary'] as const
    for (const cat of ['units', 'upgrades', 'commands'] as const) {
      const have = new Set(AMG_SOURCES.filter((s) => s.category === cat).map((s) => s.faction))
      for (const f of factions) expect(have, `${cat} missing ${f}`).toContain(f)
    }
  })

  it('has no duplicate PDF urls', () => {
    const urls = AMG_SOURCES.map((s) => s.url)
    expect(new Set(urls).size).toBe(urls.length)
  })
})

describe('pdfBasename', () => {
  it('returns the trailing filename', () => {
    expect(pdfBasename('https://cdn/a/b/DOC51_RebelAlliance_Units.pdf')).toBe('DOC51_RebelAlliance_Units.pdf')
  })
  it('passes a bare name through', () => {
    expect(pdfBasename('DOC41_BattleCards.pdf')).toBe('DOC41_BattleCards.pdf')
  })
})

describe('selectFronts', () => {
  it('drops the shared card back (high-frequency md5) and dedups fronts', () => {
    // a, b, c are unique fronts; "back" repeats once per card (shared template)
    const imgs = [
      { md5: 'a', id: 1 }, { md5: 'back', id: 2 },
      { md5: 'b', id: 3 }, { md5: 'back', id: 4 },
      { md5: 'c', id: 5 }, { md5: 'back', id: 6 },
    ]
    const fronts = selectFronts(imgs)
    expect(fronts.map((f) => f.md5)).toEqual(['a', 'b', 'c'])
  })

  it('collapses an exact duplicate front to its first occurrence', () => {
    const imgs = [{ md5: 'a', id: 1 }, { md5: 'a', id: 2 }]
    expect(selectFronts(imgs)).toEqual([{ md5: 'a', id: 1 }])
  })

  it('respects a custom maxRepeat', () => {
    const imgs = [{ md5: 'x' }, { md5: 'x' }, { md5: 'x' }]
    expect(selectFronts(imgs, 3)).toEqual([{ md5: 'x' }]) // 3 ≤ maxRepeat → kept, then deduped
    expect(selectFronts(imgs, 2)).toEqual([]) // 3 > maxRepeat → dropped
  })
})

describe('matchCard', () => {
  const candidates: CatalogueCard[] = [
    { slug: 'darth-vader-dark-lord-of-the-sith', name: 'Darth Vader', title: 'Dark Lord of the Sith' },
    { slug: 'darth-vader-fist-of-the-empire', name: 'Darth Vader', title: 'Fist of the Empire' },
    { slug: 'stormtroopers', name: 'Stormtroopers', title: null },
  ]

  it('matches a unique name + title to its slug', () => {
    expect(matchCard('Darth Vader', 'Dark Lord of the Sith', candidates)).toEqual({ slug: 'darth-vader-dark-lord-of-the-sith' })
  })

  it('matches a title-less card by name alone', () => {
    expect(matchCard('Stormtroopers', null, candidates)).toEqual({ slug: 'stormtroopers' })
  })

  it('returns ambiguous when the name has multiple variants and no title resolves it', () => {
    const r = matchCard('Darth Vader', null, candidates)
    expect(r).toEqual({ ambiguous: ['darth-vader-dark-lord-of-the-sith', 'darth-vader-fist-of-the-empire'] })
  })

  it('returns null for an unknown card (→ gap report)', () => {
    expect(matchCard('Some Future Unit', null, candidates)).toBeNull()
  })

  it('is punctuation/case-insensitive like the catalogue slugify', () => {
    expect(matchCard('STORMTROOPERS', null, candidates)).toEqual({ slug: 'stormtroopers' })
  })

  // P7a generic-upgrade names carry quotes/hyphens/articles that the card-image read
  // preserves verbatim; the catalogue slugify must collapse them to the stored slug.
  it('resolves punctuation-heavy generic upgrade names to their slugs', () => {
    const gen: CatalogueCard[] = [
      { slug: 'bunker-buster-shells', name: '"Bunker Buster" Shells', title: null },
      { slug: 'emp-droid-poppers', name: 'EMP "Droid Poppers"', title: null },
      { slug: 'armor-piercing-shells', name: 'Armor-Piercing Shells', title: null },
      { slug: 'on-the-hunt', name: 'On The Hunt', title: null },
    ]
    expect(matchCard('"Bunker Buster" Shells', null, gen)).toEqual({ slug: 'bunker-buster-shells' })
    expect(matchCard('EMP "Droid Poppers"', null, gen)).toEqual({ slug: 'emp-droid-poppers' })
    expect(matchCard('Armor-Piercing Shells', null, gen)).toEqual({ slug: 'armor-piercing-shells' })
    expect(matchCard('On the Hunt', null, gen)).toEqual({ slug: 'on-the-hunt' }) // article-case differs from catalogue
  })
})

describe('PRESERVE_SLUGS / isPreserved', () => {
  it('has 15 self-sourced cards across categories (3 units, 11 upgrades, 1 command)', () => {
    expect(PRESERVE_SLUGS.units.size).toBe(3)
    expect(PRESERVE_SLUGS.upgrades.size).toBe(11)
    expect(PRESERVE_SLUGS.commands.size).toBe(1)
    expect(PRESERVE_SLUGS.battle.size).toBe(0)
  })

  it('preserves a slug only in the category it was self-sourced in', () => {
    // The upgrade Whipcord Launcher was self-sourced; the same-named command was NOT.
    expect(isPreserved('upgrades', 'whipcord-launcher')).toBe(true)
    expect(isPreserved('commands', 'whipcord-launcher')).toBe(false)
    expect(isPreserved('units', 'din-djarin-the-mandalorian')).toBe(true)
    expect(isPreserved('upgrades', 'din-djarin-the-mandalorian')).toBe(false)
  })

  it('does not preserve an empty or unknown slug', () => {
    expect(isPreserved('upgrades', '')).toBe(false)
    expect(isPreserved('units', 'some-future-unit')).toBe(false)
  })
})

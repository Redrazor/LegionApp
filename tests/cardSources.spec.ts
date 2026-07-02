import { describe, it, expect } from 'vitest'
import { buildCardSources, type CatalogueCard, type CardSourceDeps, type DocMeta } from '../scraper/cardSources.ts'
import {
  filterCardSources, browseLinkFor, sourceSummary, formatSourceDate, emptyCardSourceFilters,
} from '../src/utils/cardSources.ts'
import type { CardSource } from '../src/types/index.ts'

describe('buildCardSources (pure provenance builder)', () => {
  const cards: CatalogueCard[] = [
    { category: 'units', slug: 'vader', name: 'Darth Vader', title: 'Dark Lord' },
    { category: 'units', slug: 'din', name: 'Din Djarin', title: 'The Mandalorian' },
    { category: 'units', slug: 'legacy-unit', name: 'Legacy Unit' },
    { category: 'units', slug: 'pending-unit', name: 'Pending Unit' },
    { category: 'upgrades', slug: 'dropped-up', name: 'Dropped Upgrade' },
    { category: 'battle', slug: 'bunker', name: 'Bunker Assault' },
  ]
  const deps: CardSourceDeps = {
    sourceBySlug: new Map([
      ['units:vader', 'DOC51_GalacticEmpire_Units.pdf'],
      ['battle:bunker', 'DOC41_BattleCards_11.26.2025.pdf'],
    ]),
    preserved: (cat, slug) => cat === 'units' && slug === 'din',
    noImageSlugs: new Set(['units:pending-unit']),
    droppedSlugs: new Set(['upgrades:dropped-up']),
  }
  const docDates: Record<string, DocMeta> = {
    'DOC51_GalacticEmpire_Units.pdf': { label: 'April 2026 Update — Galactic Empire Units', date: '2026-04' },
    'DOC41_BattleCards_11.26.2025.pdf': { label: 'Battle Cards Update', date: '2025-11' },
  }
  const out = buildCardSources(cards, deps, docDates)
  const bySlug = (slug: string) => out.find((c) => c.slug === slug)!

  it('excludes dropped cards from the table', () => {
    expect(out.find((c) => c.slug === 'dropped-up')).toBeUndefined()
    expect(out).toHaveLength(5)
  })

  it('marks AMG-sourced cards valid with the doc label + date', () => {
    expect(bySlug('vader')).toMatchObject({
      validity: 'valid', source: 'April 2026 Update — Galactic Empire Units', date: '2026-04', title: 'Dark Lord',
    })
  })

  it('marks self-sourced (preserved) cards valid as the June 2026 self-sourced batch', () => {
    const din = bySlug('din')
    expect(din.validity).toBe('valid')
    expect(din.date).toBe('2026-06')
    expect(din.source).toMatch(/self-sourced/i)
  })

  it('marks legacy (no source) cards unknown', () => {
    expect(bySlug('legacy-unit')).toMatchObject({ validity: 'unknown', date: null })
    expect(bySlug('legacy-unit').source).toMatch(/Legion HQ 2/)
  })

  it('marks image-pending (noImage) cards unknown with a pending note', () => {
    expect(bySlug('pending-unit')).toMatchObject({ validity: 'unknown', date: null })
    expect(bySlug('pending-unit').source).toMatch(/pending/i)
  })

  it('falls back to the raw doc key when no doc-date metadata exists', () => {
    const noMeta = buildCardSources(
      [{ category: 'units', slug: 'x', name: 'X' }],
      { ...deps, sourceBySlug: new Map([['units:x', 'SomeDoc.pdf']]) },
      {},
    )
    expect(noMeta[0]).toMatchObject({ validity: 'valid', source: 'SomeDoc.pdf', date: null })
  })

  it('sorts browsable types first (units, upgrades, commands) then battle, name-sorted within', () => {
    // battle cards have no drawer link, so they sort last; units first, name-sorted
    expect(out.map((c) => c.slug)).toEqual(['vader', 'din', 'legacy-unit', 'pending-unit', 'bunker'])
  })
})

describe('cardSources util', () => {
  const list: CardSource[] = [
    { category: 'units', slug: 'vader', name: 'Darth Vader', source: 'April 2026 Update', date: '2026-04', validity: 'valid' },
    { category: 'upgrades', slug: 'saber', name: 'Force Reflexes', source: 'Legacy scan (Legion HQ 2)', date: null, validity: 'unknown' },
    { category: 'commands', slug: 'ambush', name: 'Ambush', source: 'Battle Cards Update', date: '2025-11', validity: 'valid' },
    { category: 'battle', slug: 'bunker', name: 'Bunker Assault', source: 'Battle Cards Update', date: '2025-11', validity: 'valid' },
  ]

  it('filters by free-text over name and source', () => {
    expect(filterCardSources(list, { ...emptyCardSourceFilters(), query: 'vader' }).map((c) => c.slug)).toEqual(['vader'])
    expect(filterCardSources(list, { ...emptyCardSourceFilters(), query: 'legacy' }).map((c) => c.slug)).toEqual(['saber'])
  })

  it('filters by category and unknown-only', () => {
    expect(filterCardSources(list, { ...emptyCardSourceFilters(), category: 'commands' }).map((c) => c.slug)).toEqual(['ambush'])
    expect(filterCardSources(list, { ...emptyCardSourceFilters(), unknownOnly: true }).map((c) => c.slug)).toEqual(['saber'])
  })

  it('maps browsable cards to their Browse drawer, battle cards to null', () => {
    expect(browseLinkFor(list[0])).toBe('/browse/vader')
    expect(browseLinkFor(list[1])).toBe('/browse/upgrades/saber')
    expect(browseLinkFor(list[2])).toBe('/browse/commands/ambush')
    expect(browseLinkFor(list[3])).toBeNull() // battle: no Browse section
  })

  it('summarises valid/unknown counts', () => {
    expect(sourceSummary(list)).toEqual({ total: 4, valid: 3, unknown: 1 })
  })

  it('formats YYYY-MM dates and handles null/garbage', () => {
    expect(formatSourceDate('2026-06')).toBe('Jun 2026')
    expect(formatSourceDate('2025-11')).toBe('Nov 2025')
    expect(formatSourceDate(null)).toBe('—')
    expect(formatSourceDate('whenever')).toBe('whenever')
  })
})

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  parseProductCards, cleanName, factionFromCategory, matchUnitSlugs, buildProductCatalog,
  type PhilibertEntry,
} from '../scraper/products.ts'
import { CONTENTS } from '../scraper/product-curation.ts'
import type { Unit } from '../scraper/normalise.ts'

const units = JSON.parse(
  readFileSync(join(__dirname, '../public/data/units.json'), 'utf8'),
) as Unit[]
const bySlug = new Set(units.map((u) => u.slug))

function unit(slug: string, name: string, faction = 'empire'): Unit {
  return { slug, name, faction, title: '', rank: 'corps' } as Unit
}

const CARD_HTML = `
<div class="product-card__thumbs">
  <img class="product-card__thumb img-fluid" width="500" src="https://cdn1.philibertnet.com/123-large/box.jpg" alt/>
</div>
<p class="product-card__content-title">
  <a class="h6 mb-0 product-card__title stretched-link d-block" href="/en/empire/175235-star-wars-legion-imperial-specialists-841333136574.html">Star Wars: L&eacute;gion - Imperial Specialists</a>
</p>`

describe('parseProductCards', () => {
  it('extracts ean, faction category, url and title from a card', () => {
    const [p] = parseProductCards(CARD_HTML)
    expect(p.ean).toBe('841333136574')
    expect(p.category).toBe('empire')
    expect(p.image).toBe('https://cdn1.philibertnet.com/123-large/box.jpg')
    expect(p.url).toBe('https://www.philibertnet.com/en/empire/175235-star-wars-legion-imperial-specialists-841333136574.html')
    expect(p.title).toContain('Imperial Specialists')
  })
})

describe('cleanName', () => {
  it('strips the Star Wars: Légion prefix', () => {
    expect(cleanName('Star Wars: Légion - Droidekas')).toBe('Droidekas')
    expect(cleanName('Star Wars Legion: AT-ST')).toBe('AT-ST')
  })
  it('drops French marketing suffixes', () => {
    expect(cleanName('Star Wars: Légion - Anakin Skywalker Extension Commandant')).toBe('Anakin Skywalker')
    expect(cleanName('Star Wars: Légion - Padmé Amidala Extension Agent')).toBe('Padmé Amidala')
  })
})

describe('factionFromCategory', () => {
  it('maps known categories and rejects unknowns', () => {
    expect(factionFromCategory('alliance-rebelle')).toBe('rebels')
    expect(factionFromCategory('mandaloriens')).toBe('mandalorians')
    expect(factionFromCategory('le-collectif-de-l-ombre')).toBe('mercenary')
    expect(factionFromCategory('scenery')).toBeNull()
  })
})

describe('matchUnitSlugs', () => {
  // Variant cards share the base unit name (the variant lives in `title`),
  // so a box title matches both the base unit and its variants.
  const us = [
    unit('stormtroopers', 'Stormtroopers'),
    unit('stormtroopers-heavy-response-unit', 'Stormtroopers'),
    unit('droidekas', 'Droidekas'),
    unit('grand-admiral-thrawn-imperial-high-command', 'Grand Admiral Thrawn'),
  ]
  it('matches a box title to the base unit and its variant cards', () => {
    expect(matchUnitSlugs('Star Wars: Légion - Stormtroopers', us)).toEqual(
      ['stormtroopers', 'stormtroopers-heavy-response-unit'],
    )
  })
  it('handles plurals and surname aliases', () => {
    expect(matchUnitSlugs('Droidekas', us)).toEqual(['droidekas'])
    // surname-only box title resolves via the alias table
    expect(matchUnitSlugs('Le Collectif - Thrawn', us)).toContain('grand-admiral-thrawn-imperial-high-command')
  })
  it('returns nothing for a themed box that names no unit', () => {
    expect(matchUnitSlugs('Galactic Empire Starter Set', us)).toEqual([])
  })
})

describe('buildProductCatalog', () => {
  const entries: PhilibertEntry[] = [
    { ean: '841333000001', category: 'empire', title: 'Star Wars: Légion - Droidekas', url: 'u1', image: 'i1' },
    // French duplicate of the same box → deduped away, English preferred
    { ean: '355838000099', category: 'empire', title: 'Star Wars : Légion - Droïdes Droidekas', url: 'u2', image: 'i2' },
    // non-game category → excluded
    { ean: '841333000777', category: 'scenery', title: 'Star Wars: Légion - Terrain', url: 'u3', image: 'i3' },
  ]
  const us = [unit('droidekas', 'Droidekas'), unit('snowtroopers', 'Snowtroopers')]

  it('builds real boxes only — dedupes FR/EN and excludes non-game', () => {
    const cat = buildProductCatalog(entries, us)
    // one real Droidekas box (FR dup dropped, scenery excluded), every product real
    expect(cat).toHaveLength(1)
    expect(cat.every((p) => p.ean)).toBe(true)
    expect(cat[0].ean).toBe('841333000001')
    expect(cat[0].image).toBe('/images/products/841333000001.jpg')
    // snowtroopers has no real box → not present (no synthetic fallback)
    const covered = cat.flatMap((p) => p.unitSlugs)
    expect(covered).toEqual(['droidekas'])
  })

  it('returns nothing when there are no entries', () => {
    expect(buildProductCatalog([], units)).toEqual([])
  })
})

describe('product curation integrity', () => {
  it('every curated CONTENTS slug exists in the unit catalogue', () => {
    const bad: string[] = []
    for (const [ean, slugs] of Object.entries(CONTENTS)) {
      for (const s of slugs) if (!bySlug.has(s)) bad.push(`${ean}: ${s}`)
    }
    expect(bad).toEqual([])
  })
})

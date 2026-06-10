// Build the Collection product catalogue from the Philibert (philibertnet.com)
// Star Wars: Legion category listing — the box-art / store-reference source.
//
// Pipeline: parse the category pages → derive faction (from category) and unit
// membership (from the box title) → apply the hand overrides in
// `product-curation.ts` → de-duplicate French/English pairs → fill any unit with
// no real box via a synthetic single-unit product (so nothing is ever lost).
//
// Pure and testable; the live fetch + image download live in `scrape.ts`.

import type { Product, ProductType, Unit } from './normalise.ts'
import { EXCLUDE, RENAME, FACTION_OVERRIDE, CONTENTS } from './product-curation.ts'

export interface PhilibertEntry {
  ean: string
  title: string
  category: string
  url: string
  image: string
}

const CATEGORY_FACTION: Record<string, string> = {
  empire: 'empire',
  'alliance-rebelle': 'rebels',
  'rebel-alliance': 'rebels',
  'republique-galactique': 'republic',
  'galactic-republic': 'republic',
  'alliance-separatiste': 'separatists',
  'le-collectif-de-l-ombre': 'mercenary',
  mandaloriens: 'mandalorians',
}

const FRENCH_HINT = /\b(Marcheur|Soldats|Droïde|Droide|Droïdes|Combattants|Char|Vétérans|Veterans|Pilotes|Spécialistes|Specialistes|Équipe|Equipe|Comte|Boîte|Boite|Fantassins|Amélioration|Séparatiste|Ornithoptère|Araignée|Magna-Gardes|Défenseurs|de l'Ombre)\b/i

/** Decode HTML entities that appear in Philibert titles. */
function decode(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"').replace(/&eacute;/g, 'é').replace(/&egrave;/g, 'è')
    .replace(/​/g, '').trim()
}

/** Parse one Philibert category page's HTML into product entries. */
export function parseProductCards(html: string): PhilibertEntry[] {
  const out: PhilibertEntry[] = []
  const re = /<img class="product-card__thumb[^"]*"[^>]*\ssrc="([^"]+)"[^>]*>[\s\S]*?<a class="h6 mb-0 product-card__title[^"]*" href="(\/en\/([^/]+)\/\d+-[^"]+?-(\d{8,})\.html)">([^<]+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const [, image, href, category, ean, rawTitle] = m
    out.push({ ean, category, image, url: 'https://www.philibertnet.com' + href, title: decode(rawTitle) })
  }
  return out
}

/** Strip the "Star Wars: Légion -" prefix and other noise from a box title. */
export function cleanName(title: string): string {
  let t = decode(title)
  t = t.replace(/^\s*[tS]?tar\s*Wars\s*:?\s*L[ée]gion\s*[:\-–]?\s*/i, '')
  // Drop French marketing suffixes ("… Extension Commandant/Agent/Améliorations").
  t = t.replace(/\s*[-–]?\s*Extensions?\s+(Commandant|Agent|Am[ée]liorations?)\s*$/i, '')
  return t.replace(/^[\s\-–:]+|[\s\-–:]+$/g, '').trim()
}

export function factionFromCategory(category: string): string | null {
  return CATEGORY_FACTION[category] ?? null
}

function normalize(s: string): string {
  return s
    .toLowerCase().replace(/é/g, 'e').replace(/–/g, '-').replace(/[''`]/g, "'")
    .replace(/[^a-z0-9]+/g, ' ').trim()
}

// Characters whose box titles use a short/surname form our unit name doesn't contain.
const SURNAME_ALIAS: Record<string, string> = {
  thrawn: 'grand-admiral-thrawn-imperial-high-command',
  tarkin: 'grand-moff-tarkin-imperial-high-command',
  krennic: 'director-orson-krennic-architect-of-terror',
  dooku: 'count-dooku-darth-tyranus',
  grievous: 'general-grievous-wheel-bike-warlord',
  veers: 'general-veers-master-tactician',
  tagge: 'general-tagge-imperial-high-command',
}

/**
 * Derive the unit slugs a box contains from its title. A box's miniatures usually
 * build the base unit *and* its variant cards, so all matching unit ids are kept.
 */
export function matchUnitSlugs(title: string, units: Unit[]): string[] {
  const nt = normalize(cleanName(title))
  const found = new Set<string>()
  for (const u of units) {
    const key = normalize(u.name)
    if (key && (nt.includes(key) || nt.includes(key.replace(/s$/, '')))) found.add(u.slug)
  }
  for (const [surname, slug] of Object.entries(SURNAME_ALIAS)) {
    if (nt.includes(surname)) found.add(slug)
  }
  return [...found].sort()
}

function classifyType(name: string): ProductType {
  const n = name.toLowerCase()
  if (n.includes('starter set')) return 'starter'
  if (n.includes('army box')) return 'army-box'
  if (n.includes('specialists')) return 'specialists'
  return 'expansion'
}

/**
 * Assemble the product catalogue from the curated Philibert boxes — real boxes
 * only (French/English duplicates collapsed, non-game categories excluded).
 */
export function buildProductCatalog(entries: PhilibertEntry[], units: Unit[]): Product[] {
  const bySlug = new Map(units.map((u) => [u.slug, u]))
  // Identity → product, to drop French/English duplicates (prefer non-French).
  const byIdentity = new Map<string, { product: Product; french: boolean }>()

  for (const e of entries) {
    if (EXCLUDE.has(e.ean)) continue
    const name = RENAME[e.ean] ?? cleanName(e.title)
    // Faction comes from the Philibert category; non-game categories (terrain,
    // storage, rules, foam…) aren't mapped, so they resolve to null and drop out
    // unless a curated FACTION_OVERRIDE explicitly rescues the product.
    const faction = FACTION_OVERRIDE[e.ean] ?? factionFromCategory(e.category)
    if (!faction) continue
    const unitSlugs = (CONTENTS[e.ean] ?? matchUnitSlugs(e.title, units)).filter((s) => bySlug.has(s))
    const product: Product = {
      code: e.ean,
      name,
      faction,
      type: classifyType(name),
      unitSlugs,
      ean: e.ean,
      storeUrl: e.url,
      image: `/images/products/${e.ean}.jpg`,
    }
    const identity = unitSlugs.length ? `U:${faction}:${unitSlugs.join(',')}` : `N:${normalize(name)}`
    const french = FRENCH_HINT.test(e.title)
    const existing = byIdentity.get(identity)
    if (!existing || (existing.french && !french)) byIdentity.set(identity, { product, french })
  }

  return [...byIdentity.values()]
    .map(({ product }) => product)
    .sort((a, b) => a.name.localeCompare(b.name))
}

// Regenerate `public/data/card-sources.json` — the app-facing card provenance table
// (Feature 18). Joins the catalogue with `scraper/amg-card-map.json` (image source per
// card) + the owner-maintained `scraper/amg-doc-dates.json` (doc → label + month/year),
// via the pure `buildCardSources`. Run: `npm run card-sources`.
//
// Same provenance categorisation as `npm run amg:origins` (card_list_origin.md), but
// structured + dated for the app. Regenerate after an apply batch or a catalogue change.
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { isPreserved, type CardCategory } from './amgNormalise.ts'
import { buildCardSources, type CatalogueCard, type DocMeta } from './cardSources.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA = join(ROOT, 'public', 'data')
const readJson = (p: string) => JSON.parse(readFileSync(p, 'utf8'))
const readData = (f: string) => readJson(join(DATA, f))

const FILES: Record<CardCategory, string> = {
  units: 'units.json', upgrades: 'upgrades.json', commands: 'commands.json', battle: 'battleCards.json',
}

// Flatten every catalogue card into { category, slug, name, title }.
const cards: CatalogueCard[] = []
for (const cat of Object.keys(FILES) as CardCategory[]) {
  for (const c of readData(FILES[cat]) as { slug: string; name: string; title?: string | null }[]) {
    cards.push({ category: cat, slug: c.slug, name: c.name, title: c.title })
  }
}

// Image source per card (raw sourcePdf key, matching amg-doc-dates.json).
const mapPath = join(ROOT, 'scraper', 'amg-card-map.json')
const map: { category: CardCategory; slug: string; sourcePdf: string }[] = existsSync(mapPath) ? readJson(mapPath) : []
const sourceBySlug = new Map(map.map((e) => [`${e.category}:${e.slug}`, e.sourcePdf]))

// Image-pending placeholders (unreleased.json `noImage`) and dropped v1 cards (dropped.json).
const slugSet = (obj: Record<string, unknown> | undefined, pick: (v: unknown, slug: string) => boolean) => {
  const out = new Set<string>()
  for (const cat of ['units', 'commands', 'upgrades', 'battle'] as CardCategory[]) {
    const bucket = (obj?.[cat] ?? {}) as Record<string, unknown> | unknown[]
    if (Array.isArray(bucket)) for (const slug of bucket as string[]) { if (pick(slug, slug)) out.add(`${cat}:${slug}`) }
    else for (const [slug, v] of Object.entries(bucket)) { if (pick(v, slug)) out.add(`${cat}:${slug}`) }
  }
  return out
}
const unreleased = (() => { try { return readData('unreleased.json') } catch { return {} } })()
const dropped = (() => { try { return readData('dropped.json') } catch { return {} } })()
const noImageSlugs = slugSet(unreleased, (v) => !!v && typeof v === 'object' && (v as { noImage?: boolean }).noImage === true)
const droppedSlugs = slugSet(dropped, () => true)

// Owner-maintained doc → { label, date }. Strip the leading _comment key.
const docDatesRaw = readJson(join(ROOT, 'scraper', 'amg-doc-dates.json')) as Record<string, DocMeta | string>
const docDates: Record<string, DocMeta> = {}
for (const [k, v] of Object.entries(docDatesRaw)) if (k !== '_comment' && typeof v === 'object') docDates[k] = v

const result = buildCardSources(cards, { sourceBySlug, preserved: isPreserved, noImageSlugs, droppedSlugs }, docDates)

writeFileSync(join(DATA, 'card-sources.json'), JSON.stringify(result, null, 2) + '\n')

const valid = result.filter((r) => r.validity === 'valid').length
const undated = result.filter((r) => r.validity === 'valid' && !r.date).length
console.log(`Wrote card-sources.json — ${result.length} cards, ${valid} valid, ${result.length - valid} unknown${undated ? `, ${undated} valid-but-undated` : ''}.`)

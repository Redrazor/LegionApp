// build-card-map-generic — match the faction-null GENERIC upgrade fronts
// (DOC51_Generic_Upgrades + DOC51_UpgradeCards) to catalogue upgrade slugs and
// merge them into scraper/amg-card-map.json. Sibling to scripts/build-card-map.ts,
// which is faction-scoped (one PDF, units/commands/upgrades); generics differ:
// faction is null, there are TWO source PDFs, and only the upgrades category exists.
//
// Reads scraper/_match/reads-generic.json ({ upgrades: [{ name, file }] }) where
// `file` is a short code: GU-pNN-rc → DOC51_Generic_Upgrades-pNN-rc.webp, or
// UC-pNN-rc → DOC51_UpgradeCards-pNN-rc.webp. Matches each name (vision-read off the
// card, verified) against the full upgrade catalogue via matchCard, writes the map
// entries, and prints a gap report + coverage vs the current LHQ2 baseline.
//
// Run with: npx tsx scripts/build-card-map-generic.ts

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { matchCard, type CardCategory } from '../scraper/amgNormalise.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const MATCH = join(ROOT, 'scraper', '_match')
const DATA = join(ROOT, 'public', 'data')
const MAP_PATH = join(ROOT, 'scraper', 'amg-card-map.json')

interface MapEntry { category: CardCategory; slug: string; sourcePdf: string; extractedFile: string }
interface Cand { slug: string; name: string; title?: string | null }

const GU_PDF = 'DOC51_Generic_Upgrades.pdf'
const UC_PDF = 'DOC51_UpgradeCards.pdf'
const GENERIC_PDFS = new Set([GU_PDF, UC_PDF])

// Short code → { full staged file (relative to amg-cards/), source PDF }.
function resolveFile(code: string): { extractedFile: string; sourcePdf: string } {
  if (code.startsWith('GU-')) {
    const cell = code.slice(3)
    return { extractedFile: `upgrades/generic/DOC51_Generic_Upgrades-${cell}.webp`, sourcePdf: GU_PDF }
  }
  if (code.startsWith('UC-')) {
    const cell = code.slice(3)
    return { extractedFile: `upgrades/generic/DOC51_UpgradeCards-${cell}.webp`, sourcePdf: UC_PDF }
  }
  throw new Error(`Unrecognised file code: ${code}`)
}

const reads = JSON.parse(readFileSync(join(MATCH, 'reads-generic.json'), 'utf8'))
const candUpgrades: Cand[] = JSON.parse(readFileSync(join(DATA, 'upgrades.json'), 'utf8'))

// Prior map, with this batch's two generic PDFs stripped (re-runnable). Any slug still
// present here was sourced from a faction/extra PDF in an earlier phase and is already
// validated — the generic packs reprint many such cards (e.g. dc-15x-arc-trooper-gunner
// is in both the Republic pack and DOC51_UpgradeCards), so we must NOT re-point them or
// the map would carry two entries for one slug. Faction source wins.
let existing: MapEntry[] = existsSync(MAP_PATH) ? JSON.parse(readFileSync(MAP_PATH, 'utf8')) : []
existing = existing.filter((e) => !GENERIC_PDFS.has(e.sourcePdf))
const alreadySourced = new Set(existing.filter((e) => e.category === 'upgrades').map((e) => e.slug))

const map: MapEntry[] = []
const gaps: string[] = []
const skipped: string[] = []
const matchedSlugs = new Set<string>()

for (const r of reads.upgrades as { name: string; file: string; slug?: string }[]) {
  const m = r.slug ? ({ slug: r.slug } as const) : matchCard(r.name, null, candUpgrades)
  if (m && 'slug' in m) {
    if (matchedSlugs.has(m.slug)) continue // a slug already mapped this batch (duplicate print) — keep first
    if (alreadySourced.has(m.slug)) { skipped.push(`${m.slug} (already AMG-sourced from a faction/extra PDF)`); continue }
    matchedSlugs.add(m.slug)
    const { extractedFile, sourcePdf } = resolveFile(r.file)
    map.push({ category: 'upgrades', slug: m.slug, sourcePdf, extractedFile })
  } else {
    gaps.push(`"${r.name}" (${r.file}) → ${m ? `AMBIGUOUS ${JSON.stringify((m as any).ambiguous)}` : 'no match'}`)
  }
}
const merged = [...existing, ...map].sort((a, b) => a.category.localeCompare(b.category) || a.slug.localeCompare(b.slug))
writeFileSync(MAP_PATH, JSON.stringify(merged, null, 2) + '\n')

console.log(`Generic upgrades matched: ${map.length} / ${reads.upgrades.length} read`)
if (skipped.length) {
  console.log(`\nSkipped ${skipped.length} (faction source already authoritative):`)
  for (const s of skipped) console.log('  · ' + s)
}
if (gaps.length) {
  console.log(`\nGaps (${gaps.length}):`)
  for (const g of gaps) console.log('  · ' + g)
}
console.log(`\namg-card-map.json now has ${merged.length} entries (${merged.filter((e) => e.category === 'upgrades').length} upgrades).`)

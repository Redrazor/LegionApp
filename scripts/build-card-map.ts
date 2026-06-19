// build-card-map — turn the vision-read card names (scraper/_match/reads-<faction>.json)
// into scraper/amg-card-map.json (consumed by amgApply) plus a gap report. Units carry
// an explicit play/front side: the art front is keyed as `<slug>-front`. Commands and
// upgrades are matched by name via matchCard against the catalogue candidate set.
//
// This is the per-faction matching step of Feature 13. Re-runnable; merges into any
// existing map by replacing entries from this faction's source PDFs (so other factions'
// entries and the amg:extras transmission cards are preserved + count toward coverage).
//
// Run with: npx tsx scripts/build-card-map.ts --faction <empire|republic|rebels|...>

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { matchCard, AMG_SOURCES, pdfBasename, type CardCategory, type SourceFaction } from '../scraper/amgNormalise.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const MATCH = join(ROOT, 'scraper', '_match')
const DATA = join(ROOT, 'public', 'data')
const MAP_PATH = join(ROOT, 'scraper', 'amg-card-map.json')

interface MapEntry { category: CardCategory; slug: string; sourcePdf: string; extractedFile: string }
interface Cand { slug: string; name: string; title?: string | null }

const fi = process.argv.indexOf('--faction')
const faction = (fi >= 0 ? process.argv[fi + 1] : '') as SourceFaction
if (!faction) { console.error('Usage: build-card-map --faction <empire|republic|rebels|separatists|mercenary>'); process.exit(1) }

// Derive this faction's three source PDFs from the single AMG_SOURCES catalogue.
function pdfFor(category: CardCategory): string {
  const src = AMG_SOURCES.find((s) => s.category === category && s.faction === faction)
  if (!src) { console.error(`No ${category} PDF for faction ${faction} in AMG_SOURCES.`); process.exit(1) }
  return pdfBasename(src.url)
}
const UNITS_PDF = pdfFor('units'), CMD_PDF = pdfFor('commands'), UPG_PDF = pdfFor('upgrades')
const SOURCE_PDFS = new Set([UNITS_PDF, CMD_PDF, UPG_PDF])

const reads = JSON.parse(readFileSync(join(MATCH, `reads-${faction}.json`), 'utf8'))
// Candidate sets straight from the catalogue: units/commands scoped to the faction,
// upgrades matched against the whole catalogue (upgrades carry no faction tag).
const load = (f: string): any[] => JSON.parse(readFileSync(join(DATA, f), 'utf8'))
const candUnits: Cand[] = load('units.json').filter((u) => u.faction === faction)
const candCommands: Cand[] = load('commands.json').filter((c) => c.faction === faction)
const candUpgrades: Cand[] = load('upgrades.json')

const map: MapEntry[] = []
const gaps: string[] = []
const matchedUnitSlugs = new Set<string>()
const matchedCmdSlugs = new Set<string>()
let matchedUpg = 0

// --- Units: explicit slug + side from the vision read ---
for (const r of reads.units) {
  if (!r.slug) { gaps.push(`units  · unmatched staged front ${r.file}${r.note ? ` — ${r.note}` : ''}`); continue }
  matchedUnitSlugs.add(r.slug)
  const slug = r.side === 'front' ? `${r.slug}-front` : r.slug
  map.push({ category: 'units', slug, sourcePdf: UNITS_PDF, extractedFile: `units/${faction}/${r.file}` })
}

// --- Commands: explicit `slug` wins (disambiguates same-name cards), else match by name. ---
for (const r of reads.commands) {
  const m = r.slug ? ({ slug: r.slug } as const) : matchCard(r.name, null, candCommands)
  if (m && 'slug' in m) { matchedCmdSlugs.add(m.slug); map.push({ category: 'commands', slug: m.slug, sourcePdf: CMD_PDF, extractedFile: `commands/${faction}/${r.file}` }) }
  else gaps.push(`commands · "${r.name}" (${r.file}) → ${m ? `AMBIGUOUS ${JSON.stringify((m as any).ambiguous)}` : 'no match'}`)
}

// --- Upgrades: explicit `slug` wins (same-name cards like the two "Echo"s), else match
// by name (+title) against the full upgrade catalogue. ---
for (const r of reads.upgrades) {
  const m = r.slug ? ({ slug: r.slug } as const) : matchCard(r.name, r.title ?? null, candUpgrades)
  if (m && 'slug' in m) { matchedUpg++; map.push({ category: 'upgrades', slug: m.slug, sourcePdf: UPG_PDF, extractedFile: `upgrades/${faction}/${r.file}` }) }
  else gaps.push(`upgrades · "${r.name}"${r.title ? ` / ${r.title}` : ''} (${r.file}) → ${m ? `AMBIGUOUS ${JSON.stringify((m as any).ambiguous)}` : 'no match'}`)
}

// Merge into any existing map (replace only this faction's source PDFs).
let existing: MapEntry[] = existsSync(MAP_PATH) ? JSON.parse(readFileSync(MAP_PATH, 'utf8')) : []
existing = existing.filter((e) => !SOURCE_PDFS.has(e.sourcePdf))
const merged = [...existing, ...map].sort((a, b) => a.category.localeCompare(b.category) || a.slug.localeCompare(b.slug))
writeFileSync(MAP_PATH, JSON.stringify(merged, null, 2) + '\n')

// --- Catalogue coverage gaps (against the FULL merged map, so amg:extras cards don't
// read as gaps; strip the unit `-front` art suffix). ---
const coveredUnits = new Set(merged.filter((e) => e.category === 'units').map((e) => e.slug.replace(/-front$/, '')))
const coveredCmds = new Set(merged.filter((e) => e.category === 'commands').map((e) => e.slug))
for (const u of candUnits) if (!coveredUnits.has(u.slug)) gaps.push(`units  · catalogue unit NOT sourced: ${u.slug} (${u.name}${u.title ? ` — ${u.title}` : ''})`)
for (const c of candCommands) if (!coveredCmds.has(c.slug)) gaps.push(`commands · catalogue command NOT sourced: ${c.slug} (${c.name})`)

console.log(`[${faction}] PDFs: ${UNITS_PDF} / ${CMD_PDF} / ${UPG_PDF}`)
console.log(`Mapped ${map.length} cards → ${MAP_PATH} (total ${merged.length} incl. other factions).`)
console.log(`  units: ${map.filter((m) => m.category === 'units').length} faces (${matchedUnitSlugs.size}/${candUnits.length} catalogue units)`)
console.log(`  commands: ${matchedCmdSlugs.size}/${candCommands.length} catalogue commands`)
console.log(`  upgrades: ${matchedUpg} matched`)
console.log(`\nGAP REPORT (${gaps.length}):`)
for (const g of gaps.sort()) console.log('  - ' + g)
writeFileSync(join(MATCH, 'gap-report.txt'), gaps.sort().join('\n') + '\n')

// build-card-map — turn the vision-read card names (scraper/_match/reads.json) into
// scraper/amg-card-map.json (consumed by amgApply) plus a gap report. Units carry an
// explicit play/front side: the art front is keyed as `<slug>-front`. Commands and
// upgrades are matched by name via matchCard against the catalogue candidate set.
//
// This is the per-faction matching step of Feature 13. Re-runnable; merges into any
// existing map by replacing entries from the same source PDFs.
//
// Run with: npx tsx scripts/build-card-map.ts

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { matchCard, type CardCategory } from '../scraper/amgNormalise.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const MATCH = join(ROOT, 'scraper', '_match')
const MAP_PATH = join(ROOT, 'scraper', 'amg-card-map.json')

interface MapEntry { category: CardCategory; slug: string; sourcePdf: string; extractedFile: string }

const reads = JSON.parse(readFileSync(join(MATCH, 'reads.json'), 'utf8'))
const candUnits = JSON.parse(readFileSync(join(MATCH, 'cand-units.json'), 'utf8'))
const candCommands = JSON.parse(readFileSync(join(MATCH, 'cand-commands.json'), 'utf8'))
const candUpgrades = JSON.parse(readFileSync(join(MATCH, 'cand-upgrades.json'), 'utf8'))

const UNITS_PDF = 'DOC51_GalacticEmpire_Units.pdf'
const CMD_PDF = 'DOC13_GalacticEmpire_Commands.pdf'
const UPG_PDF = 'DOC51_GalacticEmpire_Upgrades.pdf'
const SOURCE_PDFS = new Set([UNITS_PDF, CMD_PDF, UPG_PDF])

const map: MapEntry[] = []
const gaps: string[] = []
const matchedUnitSlugs = new Set<string>()
const matchedCmdSlugs = new Set<string>()
const matchedUpgSlugs = new Set<string>()

// --- Units: explicit slug + side from the vision read ---
for (const r of reads.units) {
  if (!r.slug) { gaps.push(`units  · unmatched staged front ${r.file}${r.note ? ` — ${r.note}` : ''}`); continue }
  matchedUnitSlugs.add(r.slug)
  const slug = r.side === 'front' ? `${r.slug}-front` : r.slug
  map.push({ category: 'units', slug, sourcePdf: UNITS_PDF, extractedFile: `units/empire/${r.file}` })
}

// --- Commands: match by name ---
for (const r of reads.commands) {
  const m = matchCard(r.name, null, candCommands)
  if (m && 'slug' in m) { matchedCmdSlugs.add(m.slug); map.push({ category: 'commands', slug: m.slug, sourcePdf: CMD_PDF, extractedFile: `commands/empire/${r.file}` }) }
  else gaps.push(`commands · "${r.name}" (${r.file}) → ${m ? `AMBIGUOUS ${JSON.stringify((m as any).ambiguous)}` : 'no match'}`)
}

// --- Upgrades: match by name (+title) against the full upgrade catalogue ---
for (const r of reads.upgrades) {
  const m = matchCard(r.name, r.title ?? null, candUpgrades)
  if (m && 'slug' in m) { matchedUpgSlugs.add(m.slug); map.push({ category: 'upgrades', slug: m.slug, sourcePdf: UPG_PDF, extractedFile: `upgrades/empire/${r.file}` }) }
  else gaps.push(`upgrades · "${r.name}"${r.title ? ` / ${r.title}` : ''} (${r.file}) → ${m ? `AMBIGUOUS ${JSON.stringify((m as any).ambiguous)}` : 'no match'}`)
}

// Merge into any existing map (replace this faction's source PDFs). Entries from
// other sources — notably the individual transmission cards staged by amg:extras
// (e.g. SWQ42 Imperial High Command) — are preserved, and count toward coverage.
let existing: MapEntry[] = existsSync(MAP_PATH) ? JSON.parse(readFileSync(MAP_PATH, 'utf8')) : []
existing = existing.filter((e) => !SOURCE_PDFS.has(e.sourcePdf))
const merged = [...existing, ...map].sort((a, b) => a.category.localeCompare(b.category) || a.slug.localeCompare(b.slug))
writeFileSync(MAP_PATH, JSON.stringify(merged, null, 2) + '\n')

// --- Catalogue coverage gaps (against the FULL merged map, so cards sourced via
// amg:extras don't read as gaps; strip the unit `-front` art suffix). ---
const coveredUnits = new Set(merged.filter((e) => e.category === 'units').map((e) => e.slug.replace(/-front$/, '')))
const coveredCmds = new Set(merged.filter((e) => e.category === 'commands').map((e) => e.slug))
for (const u of candUnits) if (!coveredUnits.has(u.slug)) gaps.push(`units  · catalogue unit NOT sourced: ${u.slug} (${u.name}${u.title ? ` — ${u.title}` : ''})`)
for (const c of candCommands) if (!coveredCmds.has(c.slug)) gaps.push(`commands · catalogue command NOT sourced: ${c.slug} (${c.name})`)

console.log(`Mapped ${map.length} cards → ${MAP_PATH} (total ${merged.length} incl. other factions).`)
console.log(`  units: ${map.filter((m) => m.category === 'units').length} faces (${matchedUnitSlugs.size}/${candUnits.length} catalogue units)`)
console.log(`  commands: ${matchedCmdSlugs.size}/${candCommands.length} catalogue commands`)
console.log(`  upgrades: ${matchedUpgSlugs.size} matched`)
console.log(`\nGAP REPORT (${gaps.length}):`)
for (const g of gaps.sort()) console.log('  - ' + g)
writeFileSync(join(MATCH, 'gap-report.txt'), gaps.sort().join('\n') + '\n')

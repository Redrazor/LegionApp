// build-p7c-commands — stage the P7c command cards that amgExtract / the per-faction
// command PDFs never produced, and emit their amg-card-map.json entries (Feature 13 P7c).
//
// Two sources, neither a clean 3×3 PnP command sheet:
//
//  - DOC41_BattleCards (page 4) carries the 4 GENERIC PIP command cards (Ambush 1 / Push 2 /
//    Assault 3 / Standing Orders 4) alongside the battle objectives. They are already staged
//    as 726×1040 cells by `npm run amg:extract -- --category battle` (battle/generic/…-p04-*);
//    we copy the first print of each into commands/p7c/.
//  - DOC56_Mandalorian_BattleForceCards (pages 1–3, right column) carries the 9 Mandalorian
//    Clans force command cards. The page mixes wide unit cards (left) with a single column of
//    three command cards (right), so amgExtract's uniform grid can't lift them — we render the
//    page @300dpi and crop the right-column cards at hand-tuned boxes (verified card-by-card).
//
// Output: scraper/amg-cards/commands/p7c/<slug>.webp. The matching is explicit here (slug =
// filename), so this script also writes the 13 entries straight into amg-card-map.json. Run:
//   npm run amg:extract -- --category battle   # once, to stage the DOC41 pip cells
//   npx tsx scripts/build-p7c-commands.ts
// Then: npm run images:validate → amg:apply → seed → amg:origins.
//
// (The remaining ~18 character commands — Bo-Katan, Din Djarin, R2-D2, Sabine, Hondo, … — and
//  the 2 units live on individual product transmissions, not these PDFs; they are P7c.1.)

import { execFile } from 'child_process'
import { promisify } from 'util'
import { mkdir, rm, readFile, writeFile, readdir, copyFile, access } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const exec = promisify(execFile)
const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const PDF_DIR = join(ROOT, 'scraper', 'amg-pdfs')
const CARDS_DIR = join(ROOT, 'scraper', 'amg-cards')
const OUT_DIR = join(CARDS_DIR, 'commands', 'p7c')
const TMP = join(CARDS_DIR, '_p7c_pages')
const MAP_PATH = join(ROOT, 'scraper', 'amg-card-map.json')

const DOC56 = 'DOC56_Mandalorian_BattleForceCards.pdf'
const DOC41 = 'DOC41_BattleCards_11.26.2025.pdf'
const DPI = 300

async function exists(p: string): Promise<boolean> {
  try { await access(p); return true } catch { return false }
}

async function renderPage(pdf: string, page: number): Promise<string> {
  await mkdir(TMP, { recursive: true })
  const base = join(TMP, `${pdf.replace(/\.pdf$/, '')}-p${page}`)
  await exec('pdftoppm', ['-png', '-r', String(DPI), '-f', String(page), '-l', String(page), join(PDF_DIR, pdf), base])
  const f = (await readdir(TMP)).find((n) => n.startsWith(`${pdf.replace(/\.pdf$/, '')}-p${page}`) && n.endsWith('.png'))
  if (!f) throw new Error(`render failed: ${pdf} p${page}`)
  return join(TMP, f)
}

// DOC56 right-column command-card boxes @300dpi (page 2550×3300). The column is at x=1655
// (w=715); the three cards evenly divide the printable area below a ~91px top page margin,
// each 1039px tall (ratio ~1.45, matching the DOC41/SWQ card framing — a generous earlier box
// left visible white margin below the green "Mandalorian Clans" footer). Verified card-by-card
// across all three pages.
const X = 1655, W = 715
const BOXES = [
  { top: 91, height: 1039 },
  { top: 1130, height: 1039 },
  { top: 2169, height: 1039 },
]
// Right-column command slugs, top→bottom, per DOC56 page.
const DOC56_PAGES: Record<number, string[]> = {
  1: ['we-are-mandalorians', 'aerial-assault', 'weapons-are-our-religion'],
  2: ['no-one-threatens-our-family', 'make-the-impossible-possible', 'we-protect-our-own'],
  3: ['close-formation', 'death-before-defeat', 'vengeful-strike'],
}
// DOC41 page-4 pip cells (first print of each) → slug.
const DOC41_PIPS: [string, string][] = [
  ['p04-00', 'ambush'], ['p04-02', 'push'], ['p04-11', 'assault'], ['p04-20', 'standing-orders'],
]

async function main() {
  await rm(OUT_DIR, { recursive: true, force: true })
  await mkdir(OUT_DIR, { recursive: true })
  const entries: { category: 'commands'; slug: string; sourcePdf: string; extractedFile: string }[] = []

  // --- DOC56 Mandalorian Clans force commands (9) ---
  for (const page of [1, 2, 3]) {
    const png = await renderPage(DOC56, page)
    const slugs = DOC56_PAGES[page]
    for (let i = 0; i < slugs.length; i++) {
      const b = BOXES[i]
      await sharp(png).extract({ left: X, top: b.top, width: W, height: b.height })
        .resize({ width: 726 }).webp({ quality: 92 }).toFile(join(OUT_DIR, `${slugs[i]}.webp`))
      entries.push({ category: 'commands', slug: slugs[i], sourcePdf: DOC56, extractedFile: `commands/p7c/${slugs[i]}.webp` })
    }
  }
  console.log(`  ✓ DOC56 Mandalorian Clans commands: 9 cropped`)

  // --- DOC41 generic pip commands (4) — copy the first print of each staged battle cell ---
  const GEN = join(CARDS_DIR, 'battle', 'generic')
  if (await exists(join(GEN, `${DOC41.replace(/\.pdf$/, '')}-p04-00.webp`))) {
    for (const [code, slug] of DOC41_PIPS) {
      const src = join(GEN, `${DOC41.replace(/\.pdf$/, '')}-${code}.webp`)
      await sharp(src).resize({ width: 726 }).webp({ quality: 92 }).toFile(join(OUT_DIR, `${slug}.webp`))
      entries.push({ category: 'commands', slug, sourcePdf: DOC41, extractedFile: `commands/p7c/${slug}.webp` })
    }
    console.log(`  ✓ DOC41 pip commands: 4 copied`)
  } else {
    console.warn('  ! DOC41 battle cells absent — run `npm run amg:extract -- --category battle` first to stage the pips')
  }

  // --- Merge into amg-card-map.json (replace only the commands/p7c/ entries; idempotent) ---
  let map: any[] = (await exists(MAP_PATH)) ? JSON.parse(await readFile(MAP_PATH, 'utf8')) : []
  map = map.filter((e) => !String(e.extractedFile || '').startsWith('commands/p7c/')).concat(entries)
  map.sort((a, b) => a.category.localeCompare(b.category) || a.slug.localeCompare(b.slug))
  await writeFile(MAP_PATH, JSON.stringify(map, null, 2) + '\n')
  console.log(`  ✓ wrote ${entries.length} P7c command entries → amg-card-map.json`)

  await rm(TMP, { recursive: true, force: true })
  console.log(`Done. Staged ${entries.length} commands → scraper/amg-cards/commands/p7c/.`)
}

main()

// build-p7d-pnp-commands — stage the command cards that live in AMG command PnP PDFs we
// already hold but amgExtract rendered without matching to a slug (Feature 13 P7d.1).
//
//  - DOC13_RebelAlliance_Commands.pdf p2 — R2-D2's Blast Off! / Impromptu Immolation /
//    Smoke Screen (R2-D2 & C-3PO, SWQ142) AND Sabine Wren's Explosions! / Symbol of
//    Rebellion / Legacy of Mandalore, all on one 3×3 page.
//  - DOC51_Mercenary_Commands_05-01_Update.pdf p4 — Din Djarin's "I Like Those Odds".
//
// Standard 3×3 PnP grid, same geometry as amgExtract / build-p7d-pnp-upgrades: at 300 DPI
// (page 2550×3300) cells are 726×1040 at column origins x=[186,912,1638], row origins
// y=[90,1130,2170]. Cell positions verified by reading each crop.
//
// Output: scraper/amg-cards/commands/p7d/<slug>.webp + amg-card-map.json entries. Run:
//   npx tsx scripts/build-p7d-pnp-commands.ts
// Then: npm run images:validate --approvals → (owner review) → amg:apply → seed → amg:origins.

import { execFile } from 'child_process'
import { promisify } from 'util'
import { mkdir, rm, readFile, writeFile, readdir, access } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const exec = promisify(execFile)
const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const PDF_DIR = join(ROOT, 'scraper', 'amg-pdfs')
const CARDS_DIR = join(ROOT, 'scraper', 'amg-cards')
const OUT_DIR = join(CARDS_DIR, 'commands', 'p7d')
const TMP = join(CARDS_DIR, '_p7d_cmd_pages')
const MAP_PATH = join(ROOT, 'scraper', 'amg-card-map.json')

const DPI = 300
// Column origins are amgExtract-standard; row origins + height tuned to THIS color command
// sheet so each crop ends in the inter-card gap (pip-dots verified uniform pitch ~1040, the
// card itself is ~1010 tall — using the full 1040 pitch as height bled the next card's top in).
const COLS = [186, 912, 1638]
const ROWS = [88, 1127, 2166]
const W = 726, H = 1025

// Per PDF: slug → [page, col, row]. Verified by reading each crop.
const SOURCES: { pdf: string; cards: Record<string, [number, number, number]> }[] = [
  {
    pdf: 'DOC13_RebelAlliance_Commands.pdf',
    cards: {
      'blast-off': [2, 2, 0],
      'impromptu-immolation': [2, 0, 1],
      'smoke-screen': [2, 1, 1],
      'explosions': [2, 2, 1],
      'symbol-of-rebellion': [2, 0, 2],
      'legacy-of-mandalore': [2, 1, 2],
    },
  },
  {
    pdf: 'DOC51_Mercenary_Commands_05-01_Update.pdf',
    cards: {
      'i-like-those-odds': [4, 0, 1],
    },
  },
]

async function exists(p: string): Promise<boolean> {
  try { await access(p); return true } catch { return false }
}

async function renderPage(pdf: string, page: number): Promise<string> {
  await mkdir(TMP, { recursive: true })
  const stem = pdf.replace(/\.pdf$/, '')
  const base = join(TMP, `${stem}-p${page}`)
  await exec('pdftoppm', ['-png', '-r', String(DPI), '-f', String(page), '-l', String(page), join(PDF_DIR, pdf), base])
  const f = (await readdir(TMP)).find((n) => n.startsWith(`${stem}-p${page}`) && n.endsWith('.png'))
  if (!f) throw new Error(`render failed: ${pdf} p${page}`)
  return join(TMP, f)
}

async function main() {
  await rm(OUT_DIR, { recursive: true, force: true })
  await mkdir(OUT_DIR, { recursive: true })
  const entries: { category: 'commands'; slug: string; sourcePdf: string; extractedFile: string }[] = []

  for (const { pdf, cards } of SOURCES) {
    const pages = new Map<number, string>()
    for (const [slug, [page, col, row]] of Object.entries(cards)) {
      if (!pages.has(page)) pages.set(page, await renderPage(pdf, page))
      await sharp(pages.get(page)!)
        .extract({ left: COLS[col], top: ROWS[row], width: W, height: H })
        .resize({ width: 726 }).webp({ quality: 92 }).toFile(join(OUT_DIR, `${slug}.webp`))
      entries.push({ category: 'commands', slug, sourcePdf: pdf, extractedFile: `commands/p7d/${slug}.webp` })
    }
    console.log(`  ✓ ${Object.keys(cards).length} cropped from ${pdf}`)
  }

  let map: any[] = (await exists(MAP_PATH)) ? JSON.parse(await readFile(MAP_PATH, 'utf8')) : []
  map = map.filter((e) => !String(e.extractedFile || '').startsWith('commands/p7d/')).concat(entries)
  map.sort((a, b) => a.category.localeCompare(b.category) || a.slug.localeCompare(b.slug))
  await writeFile(MAP_PATH, JSON.stringify(map, null, 2) + '\n')
  console.log(`  ✓ wrote ${entries.length} entries → amg-card-map.json`)

  await rm(TMP, { recursive: true, force: true })
  console.log(`Done. Staged ${entries.length} commands → scraper/amg-cards/commands/p7d/.`)
}

main()

// build-p7d-pnp-upgrades — stage the upgrade cards that live ONLY inside AMG print-and-play
// PnP sheets we already hold, which neither amgExtract nor the transmissions produced
// (Feature 13 P7d.1). Two sources, both grayscale 3×3 card sheets:
//
//  - DOC56_Mandalorian_BattleForceCards.pdf — the Mandalorian Clans affiliation + character
//    upgrades (Clan Kryze/Wren/Saxon, Champion of the Watch, Din Djarin, Rook Kast, Gar Saxon,
//    Sabine Wren, both character Darksabers). Pages 5–9 are clean 3×3 grids; page 4 carries
//    Din Djarin / Rook Kast in the right column of a mixed force-card page (same cell coords).
//    These are the v2 cards (the 2026 Clan Saxon / Children-of-the-Watch refresh), NOT the
//    first-edition Shadow Collective versions — verified against the printed cards.
//  - DOC13_Mercenary_Ewoks.pdf — the 10 Ewok upgrades (pages 3–6). amgExtract only mapped this
//    PDF's unit + command cards; the upgrade cells were rendered (as units) but never matched.
//
// Every card sits on the SAME uniform grid as amgExtract's 3×3 layout — at 300 DPI (page
// 2550×3300) the cells are 726×1040 with column origins x=[186,912,1638] and row origins
// y=[90,1130,2170] — so we render each page and crop the one cell we need. Geometry + identity
// verified card-by-card by reading the crops.
//
// Output: scraper/amg-cards/upgrades/p7d/<slug>.webp + amg-card-map.json entries (matching is
// explicit: slug = filename). Run:
//   npx tsx scripts/build-p7d-pnp-upgrades.ts
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
const OUT_DIR = join(CARDS_DIR, 'upgrades', 'p7d')
const TMP = join(CARDS_DIR, '_p7d_pages')
const MAP_PATH = join(ROOT, 'scraper', 'amg-card-map.json')

const DPI = 300
// Uniform 3×3 grid @300dpi (matches amgExtract's geometry). col → left, row → top.
const COLS = [186, 912, 1638]
const ROWS = [90, 1130, 2170]
const W = 726, H = 1040

// Per PDF: slug → [page, col, row]. Verified by reading each crop.
const SOURCES: { pdf: string; cards: Record<string, [number, number, number]> }[] = [
  {
    pdf: 'DOC56_Mandalorian_BattleForceCards.pdf',
    cards: {
      'clan-kryze': [5, 0, 0],
      'clan-wren': [5, 0, 1],
      'clan-saxon': [6, 0, 0],
      'champion-of-the-watch': [6, 0, 1],
      'din-djarin': [4, 2, 1], // right column, middle row of the mixed force-card page
      'rook-kast-2': [4, 2, 2], // right column, bottom row
      'gar-saxon': [8, 2, 2],
      'sabine-wren': [9, 0, 1],
      'the-darksaber-3': [9, 1, 0], // Din Djarin's darksaber
      'the-darksaber-4': [9, 2, 0], // Head of Clan Saxon's darksaber
    },
  },
  {
    pdf: 'DOC13_Mercenary_Ewoks.pdf',
    cards: {
      'secret-ingredients': [3, 0, 0],
      'onward-to-victory': [3, 1, 0],
      'herbal-medicine': [3, 2, 0],
      'call-to-arms': [3, 0, 1],
      'forest-dwellers': [3, 2, 1],
      'insatiable-curiosity': [4, 1, 0],
      'ewok-trapper': [4, 0, 2],
      'axe-ewok': [5, 2, 0],
      'ewok-skirmisher-squad': [5, 1, 2],
      'ewok-slinger-squad': [6, 1, 0],
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
  const entries: { category: 'upgrades'; slug: string; sourcePdf: string; extractedFile: string }[] = []

  for (const { pdf, cards } of SOURCES) {
    const pages = new Map<number, string>()
    for (const [slug, [page, col, row]] of Object.entries(cards)) {
      if (!pages.has(page)) pages.set(page, await renderPage(pdf, page))
      await sharp(pages.get(page)!)
        .extract({ left: COLS[col], top: ROWS[row], width: W, height: H })
        .resize({ width: 726 }).webp({ quality: 92 }).toFile(join(OUT_DIR, `${slug}.webp`))
      entries.push({ category: 'upgrades', slug, sourcePdf: pdf, extractedFile: `upgrades/p7d/${slug}.webp` })
    }
    console.log(`  ✓ ${Object.keys(cards).length} cropped from ${pdf}`)
  }

  let map: any[] = (await exists(MAP_PATH)) ? JSON.parse(await readFile(MAP_PATH, 'utf8')) : []
  map = map.filter((e) => !String(e.extractedFile || '').startsWith('upgrades/p7d/')).concat(entries)
  map.sort((a, b) => a.category.localeCompare(b.category) || a.slug.localeCompare(b.slug))
  await writeFile(MAP_PATH, JSON.stringify(map, null, 2) + '\n')
  console.log(`  ✓ wrote ${entries.length} entries → amg-card-map.json`)

  await rm(TMP, { recursive: true, force: true })
  console.log(`Done. Staged ${entries.length} upgrades → scraper/amg-cards/upgrades/p7d/.`)
}

main()

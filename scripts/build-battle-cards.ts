// build-battle-cards — extract & composite the battle deck (Feature 13 P7b) from AMG
// sources that are NOT clean 3×3 PnP sheets, so amgExtract can't handle them:
//
//  - DOC13_ReconRulebook (pp.5–6): the 9 Recon cards, laid out on a cut-mark grid.
//    Each cell is 726×1039 @300dpi (grid x=186/912/1638, y=809/1848/2887, detected from
//    the print cut-marks). Advantages (p6 row0) + Secondaries (p6 row1) are single cards;
//    Primaries (p5) are TWO stacked cells — map (row0) over text (row1) — recomposited via
//    compositePrimary into the LHQ2 text-top/map-bottom layout.
//  - DOC56_ErrataReference-2 (p11): the errata'd Cauldron Mission card ("replace the old
//    card with this one") — a single card at a fixed crop.
//
// Output: scraper/amg-cards/battle/<source>/<slug>.webp. The matching step then adds these
// to amg-card-map.json; images:validate shows OLD-vs-NEW; amg:apply places them. Run:
//   npx tsx scripts/build-battle-cards.ts
//
// (Standard-deck cards come from DOC41 via amgExtract + the same compositePrimary; they're
//  handled in the DOC41 matching step, not here.)

import { execFile } from 'child_process'
import { promisify } from 'util'
import { mkdir, rm, readFile, writeFile, readdir, copyFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { compositePrimary } from '../scraper/amgBattle.ts'

const exec = promisify(execFile)
const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const PDF_DIR = join(ROOT, 'scraper', 'amg-pdfs')
const OUT_DIR = join(ROOT, 'scraper', 'amg-cards', 'battle')
const TMP = join(ROOT, 'scraper', 'amg-cards', '_battle_pages')

const DPI = 300
// Recon-rulebook cut-mark grid @300dpi (detected by scanning the margin strips for the
// black cut-marks): 3 columns × cell-size 726×1039.
const GX = [186, 912, 1638] // column left edges
const GY = [809, 1848, 2887] // row top edges (809→1848 row0, 1848→2887 row1)
const CW = 726, CH = 1039

async function renderPage(pdf: string, page: number): Promise<string> {
  await mkdir(TMP, { recursive: true })
  const base = join(TMP, `${pdf.replace(/\.pdf$/, '')}-p${page}`)
  await exec('pdftoppm', ['-png', '-r', String(DPI), '-f', String(page), '-l', String(page), join(PDF_DIR, pdf), base])
  const f = (await readdir(TMP)).find((n) => n.startsWith(`${pdf.replace(/\.pdf$/, '')}-p${page}`) && n.endsWith('.png'))
  if (!f) throw new Error(`render failed: ${pdf} p${page}`)
  return join(TMP, f)
}

/** Crop a grid cell (col,row) out of a rendered page. */
async function cell(page: string, col: number, row: number): Promise<Buffer> {
  // inset 2px to drop the cut-mark tick remnants at the cell border
  return sharp(page).extract({ left: GX[col] + 2, top: GY[row] + 2, width: CW - 4, height: CH - 4 }).png().toBuffer()
}

async function main() {
  await mkdir(join(OUT_DIR, 'recon'), { recursive: true })
  await mkdir(join(OUT_DIR, 'errata'), { recursive: true })

  // --- Recon rulebook (DOC13_ReconRulebook), pages 5 (primaries) + 6 (adv/sec) ---
  const reconPdf = 'DOC13_ReconRulebook_04302025.pdf'
  const p5 = await renderPage(reconPdf, 5)
  const p6 = await renderPage(reconPdf, 6)

  // Primaries (p5): col → slug; map = row0, text = row1 → compositePrimary(text, map)
  const primaries: [number, string][] = [[0, 'intercept-signals-2'], [1, 'bunker-assault-2'], [2, 'close-the-pocket-2']]
  for (const [col, slug] of primaries) {
    const map = await cell(p5, col, 0)
    const text = await cell(p5, col, 1)
    const out = await compositePrimary(text, map)
    await writeFile(join(OUT_DIR, 'recon', `${slug}.webp`), out)
    console.log('  ✓ recon primary', slug)
  }
  // Advantages (p6 row0) + Secondaries (p6 row1): single cards, normalised to 726 wide
  const simple: [number, number, string][] = [
    [0, 0, 'advanced-intel-2'], [1, 0, 'cunning-deployment-2'], [2, 0, 'fortified-position-2'],
    [0, 1, 'surface-scan-2'], [1, 1, 'bring-them-to-heel-2'], [2, 1, 'recon-mission-2'],
  ]
  for (const [col, row, slug] of simple) {
    const buf = await cell(p6, col, row)
    await sharp(buf).resize({ width: 726 }).webp({ quality: 92 }).toFile(join(OUT_DIR, 'recon', `${slug}.webp`))
    console.log('  ✓ recon', row === 0 ? 'advantage' : 'secondary', slug)
  }

  // --- Errata (DOC56_ErrataReference-2) p11: the errata'd Cauldron Mission card ---
  const errataPdf = 'DOC56_ErrataReference-2.pdf'
  const e11 = await renderPage(errataPdf, 11)
  // Cauldron is the bottom-left card on p11 @300dpi: same column-0 left edge as the card
  // template (x≈186), but in p11's bottom card row (title at y≈2174). The errata reprints
  // only the objective TEXT card — its Map Card is owner-supplied (it has no AMG PnP), kept
  // durably at scraper/amg-assets/cauldron-map.png. Compose text-top + map-bottom like the
  // other primaries (the map is already landscape, so no rotate — just crop its title bar).
  const cText = await sharp(e11).extract({ left: GX[0] + 2, top: 2174, width: CW - 4, height: CH - 4 })
    .resize({ width: 726 }).extract({ left: 0, top: 0, width: 726, height: 985 }).png().toBuffer()
  const cMap = await sharp(join(ROOT, 'scraper', 'amg-assets', 'cauldron-map.png'))
    .extract({ left: 2, top: 64, width: 481, height: 273 }).resize({ width: 726 }).png().toBuffer()
  const cMapH = (await sharp(cMap).metadata()).height ?? 412
  const cauldron = await sharp({ create: { width: 726, height: 985 + cMapH, channels: 3, background: '#ffffff' } })
    .composite([{ input: cText, top: 0, left: 0 }, { input: cMap, top: 985, left: 0 }])
    .webp({ quality: 92 }).toBuffer()
  await writeFile(join(OUT_DIR, 'errata', 'cauldron.webp'), cauldron)
  console.log('  ✓ cauldron (errata text + owner-supplied map, composited)')

  // --- DOC41 standard deck (24 cards) from the amgExtract'd cells (battle/generic) ---
  // Run `npm run amg:extract -- --category battle` first to stage the 45 DOC41 cells.
  // Advantages/secondaries are single cards (copied); primaries are split text+map cells
  // recomposited via compositePrimary. For the 3 primaries that also carry a Recon-variant
  // map (intercept/bunker/close), the FIRST map cell is the STANDARD one (verified vs the
  // LHQ2 standard scans); the 2nd is the recon map (we source recon from the rulebook).
  const GEN = join(OUT_DIR, 'generic')
  const genCell = (code: string) => join(GEN, `DOC41_BattleCards_11.26.2025-${code}.webp`)
  await mkdir(join(OUT_DIR, 'standard'), { recursive: true })

  const stdSingle: [string, string][] = [
    ['p01-00', 'advanced-intel'], ['p01-01', 'cunning-deployment'], ['p01-02', 'fortified-position'],
    ['p01-10', 'garrison'], ['p01-11', 'ordnance'], ['p01-12', 'strafing-run'],
    ['p05-00', 'black-ops'], ['p05-01', 'coordinated-strike'], ['p05-02', 'command-override'], ['p05-10', 'no-time-to-lose'],
    ['p03-10', 'marked-targets'], ['p03-11', 'bring-them-to-heel'], ['p03-12', 'sweep-and-clear'],
    ['p03-20', 'surface-scan'], ['p03-21', 'destroy-enemy-base'], ['p03-22', 'recon-mission'], ['p05-20', 'supply-run'],
  ]
  const stdPrimary: [string, string, string][] = [ // [textCell, mapCell, slug]
    ['p01-21', 'p01-20', 'shifting-priorities'], ['p02-00', 'p01-22', 'recover-the-research'],
    ['p02-10', 'p02-01', 'intercept-signals'], ['p02-12', 'p02-11', 'breakthrough'],
    ['p02-22', 'p02-20', 'bunker-assault'], ['p03-02', 'p03-00', 'close-the-pocket'],
    ['p05-12', 'p05-11', 'outflank'],
  ]
  if (await exists(genCell('p01-00'))) {
    for (const [code, slug] of stdSingle) {
      await sharp(genCell(code)).resize({ width: 726 }).webp({ quality: 92 }).toFile(join(OUT_DIR, 'standard', `${slug}.webp`))
    }
    for (const [t, m, slug] of stdPrimary) {
      const out = await compositePrimary(await readFile(genCell(t)), await readFile(genCell(m)))
      await writeFile(join(OUT_DIR, 'standard', `${slug}.webp`), out)
    }
    console.log(`  ✓ DOC41 standard: ${stdSingle.length} single + ${stdPrimary.length} composited primaries`)
  } else {
    console.warn('  ! DOC41 cells absent — run `npm run amg:extract -- --category battle` to stage the standard deck')
  }

  // --- Battle Deck Card Pack II (9 cards): owner-supplied photos of the physical cards
  // (no AMG PnP exists). The cards were straightened/cropped with scripts/rectify-card.ts +
  // split-cards.ts (per-card seam crops hand-tuned, see that commit) and the two primaries
  // composited; the FINAL cards are kept as durable tracked assets under amg-assets/pack2/
  // (the photos are not in the repo), and copied into the staging dir here.
  const PACK2_ASSETS = join(ROOT, 'scraper', 'amg-assets', 'pack2')
  await mkdir(join(OUT_DIR, 'pack2'), { recursive: true })
  if (await exists(PACK2_ASSETS)) {
    let n = 0
    for (const f of (await readdir(PACK2_ASSETS)).filter((x) => x.endsWith('.webp'))) {
      await copyFile(join(PACK2_ASSETS, f), join(OUT_DIR, 'pack2', f)); n++
    }
    console.log(`  ✓ Pack II: ${n} owner-sourced cards copied from amg-assets/pack2/`)
  }

  // --- Emit battle entries into amg-card-map.json (consumed by images:validate + amg:apply) ---
  // Derive from the staged dirs so the map always matches what's on disk. Each dir maps to
  // the source it came from; errata/cauldron.webp is the slug `cauldron`.
  const MAP_PATH = join(ROOT, 'scraper', 'amg-card-map.json')
  const SRC: Record<string, string> = {
    standard: 'DOC41_BattleCards_11.26.2025.pdf',
    recon: 'DOC13_ReconRulebook_04302025.pdf',
    errata: 'DOC56_ErrataReference-2.pdf',
    pack2: 'OwnerPhotos_BattleDeckCardPackII',
  }
  const battleEntries: { category: 'battle'; slug: string; sourcePdf: string; extractedFile: string }[] = []
  for (const dir of Object.keys(SRC)) {
    const d = join(OUT_DIR, dir)
    if (!(await exists(d))) continue
    for (const f of (await readdir(d)).filter((n) => n.endsWith('.webp'))) {
      battleEntries.push({ category: 'battle', slug: f.replace(/\.webp$/, ''), sourcePdf: SRC[dir], extractedFile: `battle/${dir}/${f}` })
    }
  }
  let map: any[] = (await exists(MAP_PATH)) ? JSON.parse(await readFile(MAP_PATH, 'utf8')) : []
  map = map.filter((e) => e.category !== 'battle').concat(battleEntries)
  map.sort((a, b) => a.category.localeCompare(b.category) || a.slug.localeCompare(b.slug))
  await writeFile(MAP_PATH, JSON.stringify(map, null, 2) + '\n')
  console.log(`  ✓ wrote ${battleEntries.length} battle entries → amg-card-map.json`)

  await rm(TMP, { recursive: true, force: true })
  console.log('Done. Staged recon (9) + cauldron (1) + DOC41 standard (24) + Pack II (9) → scraper/amg-cards/battle/.')
}

async function exists(p: string): Promise<boolean> {
  try { const { access } = await import('fs/promises'); await access(p); return true } catch { return false }
}

main()

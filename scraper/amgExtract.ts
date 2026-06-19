// amgExtract — pull individual card fronts out of the downloaded AMG PnP PDFs.
//
// The AMG print-and-play faction PDFs (DOC51/DOC13/SWQ/DOC41) lay out cards on a
// 3×3 letter-size sheet, and — crucially — the card TEXT (names, weapons, keywords,
// costs) is a vector overlay, NOT part of the embedded raster. So `pdfimages` would
// only recover the text-less background art. Instead we RENDER each page (pdftoppm)
// and crop the 3×3 grid, which captures the complete card exactly as printed. Unit
// cards are landscape rotated 90° onto the portrait sheet, so we rotate them back.
//
// (The June-2026 DOC56 Mandalorian errata cards were different — they embedded one
// pre-flattened full-card raster each, so Feature 11 extracted them with pdfimages.
// Those slugs are self-sourced and live in PRESERVE_SLUGS; they are not re-sourced.)
//
// A Legion unit card is double-sided: a stats/play side (name, weapons, defense,
// upgrade bar — what builders show, → units/<slug>.webp) and an art "front" side
// (full art + points value, → units/<slug>-front.webp). Both faces are their own
// cell on the sheet; the matching step tags each. Upgrade/command/battle cards are
// single-faced for our purposes.
//
// Output: scraper/amg-cards/<cat>/<faction>/<base>-pNN-rC.webp + index.json. The
// read-name → slug matching is a separate (vision-assisted) step that consumes the
// index and produces scraper/amg-card-map.json; amgApply then places them.
//
// Run with: npm run amg:extract
//   optional: -- --faction empire   (process only that faction's PDFs)
//             -- --category units    (process only that category)
//   (requires `pdftoppm` and `pdfimages` from poppler-utils on PATH)

import { execFile } from 'child_process'
import { promisify } from 'util'
import { createHash } from 'crypto'
import { readFile, writeFile, mkdir, readdir, rm, access } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { AMG_SOURCES, pdfBasename, type AmgSource } from './amgNormalise.ts'

const exec = promisify(execFile)
const __dirname = dirname(fileURLToPath(import.meta.url))
const PDF_DIR = join(__dirname, 'amg-pdfs')
const OUT_DIR = join(__dirname, 'amg-cards')
const RENDER_DIR = join(OUT_DIR, '_pages')

// Render geometry. AMG PnP sheets are US-letter; we render at 600 DPI (5100×6600 px)
// for crisp vector text, with a 3×3 grid of 1452×2080 card cells, then SUPERSAMPLE each
// card down to the 726×1040 output size — sharper than rendering directly at the output
// resolution. The art bleeds edge-to-edge so there are no inter-card gutters; the grid
// origin and pitch are fixed (exactly 2× the 300-DPI values verified against the cards).
const DPI = 600
const PAGE_W = 5100
const PAGE_H = 6600
const COLS = 3
const ROWS = 3
const CELL_W = 1452 // render-resolution cell (px @600dpi)
const CELL_H = 2080
const X0 = 370 // left margin (px @600dpi)
const Y0 = 180 // top margin
const OUT_W = 726 // supersampled output cell (portrait); landscape units become 1040×726 after rotate
const OUT_H = 1040

interface StagedCard {
  category: AmgSource['category']
  faction: string
  pdf: string
  file: string // relative to OUT_DIR
  md5: string
  ahash: string // 256-bit perceptual hash (hex) used for dedup
  width: number
  height: number
  page: number
  row: number
  col: number
}

async function exists(p: string): Promise<boolean> {
  try { await access(p); return true } catch { return false }
}

function parseArg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

/** True if this PDF's cards are landscape (rotated 90° on the portrait sheet). We
 * read the orientation off the first embedded background raster — cheaper and more
 * reliable than guessing from category (units are landscape; upgrades/commands are
 * portrait). */
async function isLandscape(pdfPath: string): Promise<boolean> {
  const dir = join(RENDER_DIR, '_probe')
  await rm(dir, { recursive: true, force: true })
  await mkdir(dir, { recursive: true })
  await exec('pdfimages', ['-all', '-f', '1', '-l', '1', pdfPath, join(dir, 'p')])
  const files = (await readdir(dir)).filter((f) => /\.(jpe?g|ppm|png|tif)$/i.test(f))
  for (const f of files) {
    const m = await sharp(join(dir, f)).metadata()
    const w = m.width ?? 0, h = m.height ?? 0
    if (w >= 700 && h >= 700) return w > h // a full card-sized raster
  }
  return false
}

/** 16×16 average-hash → 256-bit hex string. Same card (even printed multiple times
 * with sub-pixel render noise) collapses to one hash; genuinely different cards
 * differ. Conservative dedup: an over-merge of a near-identical variant simply leaves
 * its catalogue slug unmatched in the gap report, where it is caught by hand. */
async function ahash(buf: Buffer): Promise<string> {
  const N = 16
  const px = await sharp(buf).greyscale().resize(N, N, { fit: 'fill' }).raw().toBuffer()
  let sum = 0
  for (let i = 0; i < px.length; i++) sum += px[i]
  const mean = sum / px.length
  let bits = ''
  for (let i = 0; i < px.length; i++) bits += px[i] >= mean ? '1' : '0'
  let hex = ''
  for (let i = 0; i < bits.length; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16)
  return hex
}

/** Crop the 3×3 card grid out of a rendered page, rotating landscape cards back. */
async function cropPage(pagePng: string, rotate: boolean): Promise<Buffer[]> {
  const out: Buffer[] = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const left = X0 + c * CELL_W
      const top = Y0 + r * CELL_H
      // Extract the render-resolution cell, supersample DOWN to the output size (crisp),
      // then rotate landscape unit cards back to landscape.
      let img = sharp(pagePng).extract({ left, top, width: CELL_W, height: CELL_H })
        .resize(OUT_W, OUT_H, { fit: 'fill', kernel: 'lanczos3' })
      if (rotate) img = img.rotate(90)
      out.push(await img.webp({ quality: 92 }).toBuffer())
    }
  }
  return out
}

async function main() {
  if (!(await exists(PDF_DIR))) {
    console.error(`No PDFs found at ${PDF_DIR}. Run \`npm run amg:fetch\` first.`)
    process.exit(1)
  }
  const onlyFaction = parseArg('faction')
  const onlyCategory = parseArg('category')
  const sources = AMG_SOURCES.filter(
    (s) => (!onlyFaction || (s.faction ?? 'generic') === onlyFaction) && (!onlyCategory || s.category === onlyCategory),
  )
  if (!sources.length) { console.error('No sources match the given --faction/--category filter.'); process.exit(1) }

  // Partial runs (a single faction) must not wipe other factions' staged cards, so we
  // only clear the dirs we are about to (re)write, and merge into any existing index.
  await mkdir(OUT_DIR, { recursive: true })
  const indexPath = join(OUT_DIR, 'index.json')
  let index: StagedCard[] = (await exists(indexPath)) ? JSON.parse(await readFile(indexPath, 'utf8')) : []
  const rewriting = new Set(sources.map((s) => `${s.category}/${s.faction ?? 'generic'}`))
  index = index.filter((e) => !rewriting.has(`${e.category}/${e.faction}`))

  for (const src of sources) {
    const pdfName = pdfBasename(src.url)
    const pdfPath = join(PDF_DIR, pdfName)
    const base = pdfName.replace(/\.pdf$/i, '')
    if (!(await exists(pdfPath))) { console.warn(`  ! missing ${pdfName} (skipping)`); continue }

    const faction = src.faction ?? 'generic'
    const destDir = join(OUT_DIR, src.category, faction)
    await rm(destDir, { recursive: true, force: true })
    await mkdir(destDir, { recursive: true })

    const rotate = await isLandscape(pdfPath)

    // Render every page of this PDF to PNG at 300 DPI.
    const pageDir = join(RENDER_DIR, base)
    await rm(pageDir, { recursive: true, force: true })
    await mkdir(pageDir, { recursive: true })
    await exec('pdftoppm', ['-png', '-r', String(DPI), pdfPath, join(pageDir, 'pg')])
    const pages = (await readdir(pageDir)).filter((f) => f.endsWith('.png')).sort()

    const seen = new Set<string>()
    let kept = 0, total = 0
    for (let p = 0; p < pages.length; p++) {
      const pagePng = join(pageDir, pages[p])
      const meta = await sharp(pagePng).metadata()
      if (meta.width !== PAGE_W || meta.height !== PAGE_H) {
        console.warn(`  ! ${pdfName} page ${p + 1} is ${meta.width}×${meta.height}, expected ${PAGE_W}×${PAGE_H} — grid may be off`)
      }
      const cells = await cropPage(pagePng, rotate)
      for (let i = 0; i < cells.length; i++) {
        total++
        const buf = cells[i]
        // Dedup on EXACT bytes only (deterministic): every distinct card cell is staged
        // under its fixed page-cell filename, so the matching step's filename references
        // stay valid across re-extractions (a perceptual hash collapses near-dup prints
        // differently at different DPIs, which would orphan those references). Print
        // duplicates of the same card simply map to the same slug downstream.
        const md5 = createHash('md5').update(buf).digest('hex')
        if (seen.has(md5)) continue
        seen.add(md5)
        const ah = await ahash(buf)
        const row = Math.floor(i / COLS), col = i % COLS
        const rel = join(src.category, faction, `${base}-p${String(p + 1).padStart(2, '0')}-${row}${col}.webp`)
        await writeFile(join(OUT_DIR, rel), buf)
        const m = await sharp(buf).metadata()
        index.push({
          category: src.category, faction, pdf: pdfName, file: rel,
          md5, ahash: ah,
          width: m.width ?? 0, height: m.height ?? 0, page: p + 1, row, col,
        })
        kept++
      }
    }
    console.log(`  ✓ ${pdfName}: ${pages.length} pages → ${total} cells → ${kept} unique (${src.category}/${faction}, rotate=${rotate})`)
  }

  // Stable order, then persist.
  index.sort((a, b) => a.file.localeCompare(b.file))
  await writeFile(indexPath, JSON.stringify(index, null, 2) + '\n')
  await rm(RENDER_DIR, { recursive: true, force: true })
  console.log(`Done: ${index.length} card fronts staged. Index → ${indexPath}`)
  console.log('Next: match fronts to slugs → scraper/amg-card-map.json, then `npm run amg:apply`.')
}

main()

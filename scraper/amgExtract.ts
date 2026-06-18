// amgExtract — pull individual card fronts out of the downloaded AMG PnP PDFs.
//
// Each PDF embeds every card as its own full-res raster (units ~1039×726 CMYK
// JPEG @ 300dpi; upgrades/commands portrait). We extract them all (pdfimages),
// drop the byte-identical shared card backs/templates (selectFronts), convert
// CMYK → sRGB WebP (sharp), and stage them under scraper/amg-cards/ with an index.
// The read-name → slug matching is a separate (vision-assisted) step that consumes
// the index and produces scraper/amg-card-map.json; amgApply then places them.
//
// Run with: npm run amg:extract   (requires `pdfimages` from poppler-utils on PATH)

import { execFile } from 'child_process'
import { promisify } from 'util'
import { createHash } from 'crypto'
import { readFile, writeFile, mkdir, readdir, rm, access } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { AMG_SOURCES, pdfBasename, selectFronts, type AmgSource } from './amgNormalise.ts'

const exec = promisify(execFile)
const __dirname = dirname(fileURLToPath(import.meta.url))
const PDF_DIR = join(__dirname, 'amg-pdfs')
const OUT_DIR = join(__dirname, 'amg-cards')
const RAW_DIR = join(OUT_DIR, '_raw')

interface ExtractedImage { md5: string; raw: string; width: number; height: number }

interface IndexEntry {
  category: AmgSource['category']
  faction: string
  pdf: string
  file: string // relative to OUT_DIR
  md5: string
  width: number
  height: number
}

async function exists(p: string): Promise<boolean> {
  try { await access(p); return true } catch { return false }
}

async function rawImages(pdf: string, base: string): Promise<ExtractedImage[]> {
  const dir = join(RAW_DIR, base)
  await rm(dir, { recursive: true, force: true })
  await mkdir(dir, { recursive: true })
  // -all keeps each image in its native encoding (jpeg stays jpeg).
  await exec('pdfimages', ['-all', pdf, join(dir, 'img')])
  const files = (await readdir(dir)).filter((f) => /\.(jpe?g|ppm|png|tif)$/i.test(f)).sort()
  const out: ExtractedImage[] = []
  for (const f of files) {
    const buf = await readFile(join(dir, f))
    const md5 = createHash('md5').update(buf).digest('hex')
    const meta = await sharp(buf).metadata()
    out.push({ md5, raw: join(dir, f), width: meta.width ?? 0, height: meta.height ?? 0 })
  }
  return out
}

async function main() {
  if (!(await exists(PDF_DIR))) {
    console.error(`No PDFs found at ${PDF_DIR}. Run \`npm run amg:fetch\` first.`)
    process.exit(1)
  }
  await rm(OUT_DIR, { recursive: true, force: true })
  await mkdir(OUT_DIR, { recursive: true })

  const index: IndexEntry[] = []
  for (const src of AMG_SOURCES) {
    const pdfName = pdfBasename(src.url)
    const pdfPath = join(PDF_DIR, pdfName)
    const base = pdfName.replace(/\.pdf$/i, '')
    if (!(await exists(pdfPath))) { console.warn(`  ! missing ${pdfName} (skipping)`); continue }

    const all = await rawImages(pdfPath, base)
    const fronts = selectFronts(all)
    const faction = src.faction ?? 'generic'
    const destDir = join(OUT_DIR, src.category, faction)
    await mkdir(destDir, { recursive: true })

    let n = 0
    for (const img of fronts) {
      const rel = join(src.category, faction, `${base}-${String(n).padStart(3, '0')}.webp`)
      await sharp(img.raw).toColourspace('srgb').webp({ quality: 92 }).toFile(join(OUT_DIR, rel))
      index.push({ category: src.category, faction, pdf: pdfName, file: rel, md5: img.md5, width: img.width, height: img.height })
      n++
    }
    console.log(`  ✓ ${pdfName}: ${all.length} extracted → ${fronts.length} fronts (${src.category}/${faction})`)
  }

  await writeFile(join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 2) + '\n')
  console.log(`Done: ${index.length} card fronts staged. Index → ${join(OUT_DIR, 'index.json')}`)
  console.log('Next: match fronts to slugs → scraper/amg-card-map.json, then `npm run amg:apply`.')
}

main()

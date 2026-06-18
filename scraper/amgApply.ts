// amgApply — place matched AMG card fronts into the app's image tree.
//
// Reads scraper/amg-card-map.json (produced by the matching step, one entry per
// resolved card: { category, slug, sourcePdf, extractedFile }) and copies each
// staged front from scraper/amg-cards/ to public/images/<category>/<slug>.webp.
// Slugs in PRESERVE_SLUGS (self-sourced DOC56 Mandalorian errata) are never
// overwritten. After this, run: portraits → seed → images:compress → deploy, and
// regenerate card_list_origin.md (npm run amg:origins).
//
// Run with: npm run amg:apply   (optionally `-- --faction empire` to scope output logging)

import { readFile, copyFile, mkdir, access } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { isPreserved, type CardCategory } from './amgNormalise.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const CARDS_DIR = join(__dirname, 'amg-cards')
const MAP_PATH = join(__dirname, 'amg-card-map.json')
const IMG_DIR = join(ROOT, 'public', 'images')

interface MapEntry { category: CardCategory; slug: string; sourcePdf: string; extractedFile: string }

async function exists(p: string): Promise<boolean> {
  try { await access(p); return true } catch { return false }
}

async function main() {
  if (!(await exists(MAP_PATH))) {
    console.error(`No map at ${MAP_PATH}. Produce it from scraper/amg-cards/index.json (matching step) first.`)
    process.exit(1)
  }
  const map: MapEntry[] = JSON.parse(await readFile(MAP_PATH, 'utf8'))

  let applied = 0, preserved = 0, missing = 0
  for (const e of map) {
    if (isPreserved(e.category, e.slug)) { preserved++; continue }
    const src = join(CARDS_DIR, e.extractedFile)
    if (!(await exists(src))) { console.warn(`  ! missing staged file ${e.extractedFile} for ${e.slug}`); missing++; continue }
    const dest = join(IMG_DIR, e.category, `${e.slug}.webp`)
    await mkdir(dirname(dest), { recursive: true })
    await copyFile(src, dest)
    applied++
  }

  console.log(`Applied ${applied} card images; preserved ${preserved} self-sourced; ${missing} missing.`)
  if (applied) console.log('Next: npm run portraits && npm run seed && npm run amg:origins && npm run images:compress')
}

main()

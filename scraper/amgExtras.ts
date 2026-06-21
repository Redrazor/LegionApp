// amgExtras — stage individual first-party AMG card images that are NOT in the
// fold-sheet PnP PDFs (the DOC51/DOC13 faction packs handled by amgExtract).
//
// AMG publishes the NEWEST units as per-card PNG/webp images on their transmission
// pages (e.g. the Imperial High Command squad pack, product SWQ42) before folding
// them into the next DOC51 faction PDF. scraper/amg-extra-cards.json is the
// owner-maintained list of those cards → catalogue slugs. This script downloads
// each, converts to webp, stages it under scraper/amg-cards/<category>/extra/, and
// merges it into scraper/amg-card-map.json so it flows through the same validation
// gate (images:validate) and apply step (amg:apply) as the PDF-sourced cards.
//
// Unit cards: AMG's _Front is the stats/play side (→ <slug>.webp); _Back is the art
// side (→ <slug>-front.webp). The `side` field ("play"|"front") in the JSON names our
// internal role (front = art), so play→<slug>, front→<slug>-front.
//
// Run with: npm run amg:extras   (optional: -- --faction empire)

import { readFile, writeFile, mkdir, access } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import type { CardCategory } from './amgNormalise.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DATA = join(__dirname, 'amg-extra-cards.json')
const OUT_DIR = join(__dirname, 'amg-cards')
const MAP_PATH = join(__dirname, 'amg-card-map.json')
const BROWSER_UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36' }

interface Crop { left: number; top: number; width: number; height: number }
// `file` is appended to the source `cdn`. `url` overrides it with a full URL for the
// occasional card AMG publishes at a different path (e.g. only the image-converter webp
// exists, not the raw png) — see SWQ82 CommandCards-5.
interface ExtraCard { category: CardCategory; slug: string; side?: 'play' | 'front'; file?: string; url?: string; crop?: Crop }
interface ExtraSource { source: string; faction: string; cdn: string; cards: ExtraCard[] }
interface MapEntry { category: CardCategory; slug: string; sourcePdf: string; extractedFile: string }

function parseArg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

async function exists(p: string): Promise<boolean> {
  try { await access(p); return true } catch { return false }
}

async function download(url: string, attempt = 1): Promise<Buffer> {
  try {
    const res = await fetch(url, { headers: BROWSER_UA })
    if (!res.ok) throw new Error(`${res.status}`)
    return Buffer.from(await res.arrayBuffer())
  } catch (e) {
    if (attempt < 3) { await new Promise((r) => setTimeout(r, attempt * 800)); return download(url, attempt + 1) }
    throw e
  }
}

async function main() {
  const onlyFaction = parseArg('faction')
  const { sources }: { sources: ExtraSource[] } = JSON.parse(await readFile(DATA, 'utf8'))
  const picked = sources.filter((s) => !onlyFaction || s.faction === onlyFaction)
  if (!picked.length) { console.error('No extra-card sources match the filter.'); process.exit(1) }

  const newEntries: MapEntry[] = []
  const sourceNames = new Set<string>()
  for (const src of picked) {
    sourceNames.add(src.source)
    let ok = 0
    for (const c of src.cards) {
      const destSlug = c.side === 'front' ? `${c.slug}-front` : c.slug
      const rel = join(c.category, 'extra', `${src.source}__${destSlug}.webp`)
      const dest = join(OUT_DIR, rel)
      await mkdir(dirname(dest), { recursive: true })
      const buf = await download(c.url ?? `${src.cdn}/${c.file}`)
      // Some packs publish a unit's front+back side-by-side in one "fan" image; `crop`
      // extracts the single card region before encoding.
      const img = c.crop ? sharp(buf).extract(c.crop) : sharp(buf)
      await img.webp({ quality: 92 }).toFile(dest)
      newEntries.push({ category: c.category, slug: destSlug, sourcePdf: src.source, extractedFile: rel })
      ok++
    }
    console.log(`  ✓ ${src.source}: ${ok}/${src.cards.length} cards staged (${src.faction})`)
  }

  // Merge into the map, replacing any prior entries from the same sources.
  let map: MapEntry[] = (await exists(MAP_PATH)) ? JSON.parse(await readFile(MAP_PATH, 'utf8')) : []
  map = map.filter((e) => !sourceNames.has(e.sourcePdf))
  map = [...map, ...newEntries].sort((a, b) => a.category.localeCompare(b.category) || a.slug.localeCompare(b.slug))
  await writeFile(MAP_PATH, JSON.stringify(map, null, 2) + '\n')
  console.log(`Merged ${newEntries.length} extra cards → ${MAP_PATH} (total ${map.length}).`)
}

main()

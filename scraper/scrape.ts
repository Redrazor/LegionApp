// LegionApp data pipeline.
//   Sources:
//     - tabletopadmiral.com  → current unit list + Cloudinary card-scan images
//     - Legion HQ (Electrynth/legion-hq-web, MIT) → structured stats, upgrades,
//       command cards, keyword glossary
//   Outputs: public/data/*.json  and  public/images/{units,portraits}/*.webp
//
// Run with:  npm run scrape   (add --skip-images to only rebuild JSON)

import { writeFile, readFile, copyFile, readdir, mkdir, access } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { tmpdir } from 'os'
import {
  buildUnits, buildUpgrades, buildCommands, buildProducts, ttaImageUrl,
  type TtaUnit, type LhqCard, type Unit,
} from './normalise.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DATA_DIR = join(ROOT, 'public', 'data')
const IMG_DIR = join(ROOT, 'public', 'images')
// Hand-placed high-res cards: drop <slug>.webp here and the pipeline prefers it
// and never overwrites it (the way to upgrade any low-res card to a better scan).
const OVERRIDE_DIR = join(IMG_DIR, 'overrides')

// Legion HQ 2 keeps an open CDN; for the newest units its scan is sometimes
// larger than tabletopadmiral's, so we use it when it beats what we have.
const LHQ2_CDN = 'https://d2maxvwz12z6fm.cloudfront.net/unitCards'
const MIN_GOOD_WIDTH = 700

const TTA_UNITS_URL = 'https://tabletopadmiral.com/api/allunits-for-collection'
const LHQ_CARDS_URL = 'https://raw.githubusercontent.com/Electrynth/legion-hq-web/master/src/constants/cards.json'
const LHQ_KEYWORDS_URL = 'https://raw.githubusercontent.com/Electrynth/legion-hq-web/master/src/constants/keywords.js'

const skipImages = process.argv.includes('--skip-images')

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 LegionApp-scraper' } })
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`)
  return res.json() as Promise<T>
}

async function fetchKeywords(url: string): Promise<Record<string, string>> {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 LegionApp-scraper' } })
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`)
  const text = await res.text()
  // keywords.js is an ESM module: `const keywords = {...}; export default keywords`.
  const tmp = join(tmpdir(), `legion-keywords-${Date.now()}.mjs`)
  await writeFile(tmp, text)
  const mod = await import(`file://${tmp}`)
  return (mod.default ?? {}) as Record<string, string>
}

async function exists(p: string): Promise<boolean> {
  try { await access(p); return true } catch { return false }
}

async function writeJson(name: string, data: unknown) {
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(join(DATA_DIR, name), JSON.stringify(data, null, 2) + '\n')
  const count = Array.isArray(data) ? data.length : Object.keys(data as object).length
  console.log(`  ✓ ${name} (${count} entries)`)
}

async function downloadImage(url: string, dest: string, attempt = 1): Promise<boolean> {
  try {
    if (await exists(dest)) return true
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 LegionApp-scraper' } })
    if (!res.ok) throw new Error(`${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    await mkdir(dirname(dest), { recursive: true })
    await writeFile(dest, buf)
    return true
  } catch (e) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, attempt * 800))
      return downloadImage(url, dest, attempt + 1)
    }
    console.warn(`    ! failed ${url} (${(e as Error).message})`)
    return false
  }
}

/** Upscale Cloudinary delivery URLs for crisper card scans. */
function hires(url: string): string {
  return url.includes('res.cloudinary.com') && url.includes('/image/upload/')
    ? url.replace('/image/upload/', '/image/upload/w_1200,q_auto,f_webp/')
    : url
}

/** Pixel width of a WEBP buffer (VP8/VP8L/VP8X), or 0 if unreadable. */
function webpWidth(buf: Buffer): number {
  if (buf.length < 30 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return 0
  const fmt = buf.toString('ascii', 12, 16)
  if (fmt === 'VP8 ') return (buf.readUInt16LE(26) & 0x3fff)
  if (fmt === 'VP8L') return ((buf.readUInt32LE(21) & 0x3fff) + 1)
  if (fmt === 'VP8X') return ((buf.readUIntLE(24, 3) & 0xffffff) + 1)
  return 0
}

async function fetchBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 LegionApp-scraper' } })
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  } catch {
    return null
  }
}

/** Slugs that have a hand-placed override image. */
async function overrideSlugs(): Promise<Set<string>> {
  try {
    const files = await readdir(OVERRIDE_DIR)
    return new Set(files.filter((f) => f.endsWith('.webp')).map((f) => f.replace(/\.webp$/, '')))
  } catch {
    return new Set()
  }
}

async function downloadUnitImages(ttaUnits: TtaUnit[], units: Unit[], overrides: Set<string>) {
  const bySlug = new Map(units.map((u) => [u.id, u]))

  // 1) Copy any hand-placed override straight in (always wins, never refetched).
  await mkdir(join(IMG_DIR, 'units'), { recursive: true })
  for (const slug of overrides) {
    await copyFile(join(OVERRIDE_DIR, `${slug}.webp`), join(IMG_DIR, 'units', `${slug}.webp`))
  }

  const jobs: { url: string; dest: string; slug: string }[] = []
  for (const t of ttaUnits) {
    const u = bySlug.get(String(t.id))
    if (!u || overrides.has(u.slug)) continue
    const front = ttaImageUrl(t)
    if (front && u.cardImage) jobs.push({ url: hires(front), dest: join(IMG_DIR, 'units', `${u.slug}.webp`), slug: u.slug })
    if (t.portrait_image_url && u.portraitImage)
      jobs.push({ url: t.portrait_image_url, dest: join(IMG_DIR, 'portraits', `${u.slug}.webp`), slug: u.slug })
  }
  console.log(`Downloading ${jobs.length} images (concurrency 8)…`)
  let ok = 0, done = 0
  const queue = [...jobs]
  async function worker() {
    while (queue.length) {
      const job = queue.shift()!
      if (await downloadImage(job.url, job.dest)) ok++
      if (++done % 25 === 0) console.log(`    …${done}/${jobs.length}`)
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker))
  console.log(`  ✓ images: ${ok}/${jobs.length} present`)

  // 2) For low-res unit scans, try Legion HQ 2 and keep it if wider.
  const upgradeable = units.filter((u) => u.cardImage && !overrides.has(u.slug))
  let upgraded = 0
  for (const u of upgradeable) {
    const dest = join(IMG_DIR, 'units', `${u.slug}.webp`)
    let curW = 0
    try { curW = webpWidth(await readFile(dest)) } catch { /* missing */ }
    if (curW >= MIN_GOOD_WIDTH) continue
    const names = [u.title ? `${u.name} ${u.title}` : u.name, u.name]
    for (const name of names) {
      const buf = await fetchBuffer(`${LHQ2_CDN}/${encodeURIComponent(name)}.webp`)
      if (buf && webpWidth(buf) > curW) {
        await writeFile(dest, buf)
        upgraded++
        break
      }
    }
  }
  if (upgraded) console.log(`  ✓ upgraded ${upgraded} low-res scans via Legion HQ 2`)
}

async function main() {
  console.log('Fetching sources…')
  const [ttaUnitsRaw, lhqCards, keywords] = await Promise.all([
    fetchJson<(TtaUnit & { hidden?: boolean; not_public?: boolean; removed_by_creator?: boolean })[]>(TTA_UNITS_URL),
    fetchJson<Record<string, LhqCard>>(LHQ_CARDS_URL),
    fetchKeywords(LHQ_KEYWORDS_URL),
  ])
  // Drop superseded / hidden cards that tabletopadmiral keeps for legacy lists.
  const ttaUnits = ttaUnitsRaw.filter((u) => !u.hidden && !u.not_public && !u.removed_by_creator)
  const lhqList = Object.values(lhqCards)
  const lhqUnits = lhqList.filter((c) => c.cardType === 'unit')
  const lhqUpgrades = lhqList.filter((c) => c.cardType === 'upgrade')
  const lhqCommands = lhqList.filter((c) => c.cardType === 'command')
  console.log(`  tabletopadmiral units: ${ttaUnits.length}`)
  console.log(`  legion-hq: ${lhqUnits.length} units, ${lhqUpgrades.length} upgrades, ${lhqCommands.length} commands`)

  console.log('Merging…')
  const units = buildUnits(ttaUnits, lhqUnits)
  const upgrades = buildUpgrades(lhqUpgrades)
  const commands = buildCommands(lhqCommands)
  const products = buildProducts(units)

  // A hand-placed override gives a unit a card image even when no source has one.
  const overrides = await overrideSlugs()
  for (const u of units) {
    if (overrides.has(u.slug)) u.cardImage = `/images/units/${u.slug}.webp`
  }

  const withScan = units.filter((u) => u.cardImage).length
  const withStats = units.filter((u) => u.hasFullData).length
  console.log(`  units: ${units.length} (${withScan} w/ card scan, ${withStats} w/ full stats)`)

  console.log('Writing JSON…')
  await writeJson('units.json', units)
  await writeJson('upgrades.json', upgrades)
  await writeJson('commands.json', commands)
  await writeJson('products.json', products)
  await writeJson('keywords.json', keywords)

  if (skipImages) {
    console.log('Skipping image download (--skip-images).')
  } else {
    await downloadUnitImages(ttaUnits, units, overrides)
  }
  console.log('Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

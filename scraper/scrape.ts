// LegionApp data pipeline.
//
// Single source of truth: Legion HQ 2 (legionhq2.com) — the current-edition
// army builder. Its JS bundle embeds the full card database (units, upgrades,
// commands) and its open CDN serves the matching current-edition card images.
// The keyword glossary text is pulled from Legion HQ (MIT) for the Reference tab.
//
//   Outputs: public/data/*.json  and  public/images/{units,upgrades,commands}/*.webp
//
// Run with:  npm run scrape   (add --skip-images to only rebuild JSON)

import { writeFile, readdir, copyFile, mkdir, access } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { tmpdir } from 'os'
import {
  buildUnits, buildUpgrades, buildCommands, buildProducts,
  type Lhq2Card, type Unit,
} from './normalise.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DATA_DIR = join(ROOT, 'public', 'data')
const IMG_DIR = join(ROOT, 'public', 'images')
const OVERRIDE_DIR = join(IMG_DIR, 'overrides')

const LHQ2_ORIGIN = 'https://legionhq2.com'
const LHQ2_CDN = 'https://d2maxvwz12z6fm.cloudfront.net'
const LHQ_KEYWORDS_URL = 'https://raw.githubusercontent.com/Electrynth/legion-hq-web/master/src/constants/keywords.js'

const UA = { 'User-Agent': 'Mozilla/5.0 LegionApp-scraper' }
const skipImages = process.argv.includes('--skip-images')

async function exists(p: string): Promise<boolean> {
  try { await access(p); return true } catch { return false }
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: UA })
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`)
  return res.text()
}

/** Fetch the Legion HQ 2 SPA bundle and extract every embedded card object. */
async function fetchLhq2Cards(): Promise<Lhq2Card[]> {
  const html = await fetchText(`${LHQ2_ORIGIN}/`)
  const m = html.match(/\/static\/js\/main\.[a-z0-9]+\.js/i)
  if (!m) throw new Error('Could not locate Legion HQ 2 JS bundle')
  const js = await fetchText(`${LHQ2_ORIGIN}${m[0]}`)
  return extractCards(js)
}

/** Brace-match the object enclosing each `"cardType":` and parse it. */
export function extractCards(js: string): Lhq2Card[] {
  const cards: Lhq2Card[] = []
  const seenStart = new Set<number>()
  let idx = 0
  while ((idx = js.indexOf('"cardType":', idx)) !== -1) {
    // Walk back to the start of the enclosing object.
    let depth = 0, start = -1
    for (let i = idx; i >= 0; i--) {
      const c = js[i]
      if (c === '}') depth++
      else if (c === '{') { if (depth === 0) { start = i; break } depth-- }
    }
    if (start === -1 || seenStart.has(start)) { idx += 11; continue }
    seenStart.add(start)
    // Brace-match forward.
    let d = 0, end = -1
    for (let j = start; j < js.length; j++) {
      const c = js[j]
      if (c === '{') d++
      else if (c === '}') { d--; if (d === 0) { end = j + 1; break } }
    }
    if (end === -1) { idx += 11; continue }
    const seg = js.slice(start, end)
    idx = end
    const obj = parseSegment(seg)
    if (obj && obj.cardType) cards.push(obj)
  }
  return cards
}

function parseSegment(seg: string): Lhq2Card | null {
  // The bundle emits JSON-shaped objects with the occasional JS apostrophe
  // escape (\'), which is invalid JSON — strip it, then fall back to Function.
  try {
    return JSON.parse(seg.replace(/\\'/g, "'")) as Lhq2Card
  } catch {
    try {
      return new Function(`return (${seg})`)() as Lhq2Card
    } catch {
      return null
    }
  }
}

async function fetchKeywords(): Promise<Record<string, string>> {
  const text = await fetchText(LHQ_KEYWORDS_URL)
  const tmp = join(tmpdir(), `legion-keywords-${Date.now()}.mjs`)
  await writeFile(tmp, text)
  const mod = await import(`file://${tmp}`)
  return (mod.default ?? {}) as Record<string, string>
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
    const res = await fetch(url, { headers: UA })
    if (!res.ok) throw new Error(`${res.status}`)
    await mkdir(dirname(dest), { recursive: true })
    await writeFile(dest, Buffer.from(await res.arrayBuffer()))
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

async function overrideSlugs(): Promise<Set<string>> {
  try {
    const files = await readdir(OVERRIDE_DIR)
    return new Set(files.filter((f) => f.endsWith('.webp')).map((f) => f.replace(/\.webp$/, '')))
  } catch {
    return new Set()
  }
}

interface ImgJob { url: string; dest: string }

async function runJobs(label: string, jobs: ImgJob[]) {
  console.log(`Downloading ${jobs.length} ${label} images (concurrency 8)…`)
  let ok = 0, done = 0
  const queue = [...jobs]
  async function worker() {
    while (queue.length) {
      const job = queue.shift()!
      if (await downloadImage(job.url, job.dest)) ok++
      if (++done % 50 === 0) console.log(`    …${done}/${jobs.length}`)
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker))
  console.log(`  ✓ ${label}: ${ok}/${jobs.length} present`)
}

async function main() {
  console.log('Fetching Legion HQ 2 card database…')
  const [cards, keywords] = await Promise.all([fetchLhq2Cards(), fetchKeywords()])
  const counts = cards.reduce<Record<string, number>>((a, c) => ((a[c.cardType] = (a[c.cardType] ?? 0) + 1), a), {})
  console.log(`  cards: ${cards.length}`, counts)

  console.log('Building…')
  const units = buildUnits(cards)
  const upgrades = buildUpgrades(cards)
  const commands = buildCommands(cards)
  const products = buildProducts(units)

  const overrides = await overrideSlugs()
  for (const u of units) if (overrides.has(u.slug)) u.cardImage = `/images/units/${u.slug}.webp`
  console.log(`  units: ${units.length} (all current-edition, with stats + weapons)`)

  console.log('Writing JSON…')
  await writeJson('units.json', units)
  await writeJson('upgrades.json', upgrades)
  await writeJson('commands.json', commands)
  await writeJson('products.json', products)
  await writeJson('keywords.json', keywords)

  if (skipImages) {
    console.log('Skipping image download (--skip-images).')
    console.log('Done.')
    return
  }

  // Map each built record back to its source imageName for the CDN URL.
  const imgByUnitId = new Map(cards.filter((c) => c.cardType === 'unit').map((c) => [c.id, c.imageName]))
  const imgByUpId = new Map(cards.filter((c) => c.cardType === 'upgrade').map((c) => [c.id, c.imageName]))
  const imgByCmdId = new Map(cards.filter((c) => c.cardType === 'command').map((c) => [c.id, c.imageName]))

  await mkdir(join(IMG_DIR, 'units'), { recursive: true })
  for (const slug of overrides) await copyFile(join(OVERRIDE_DIR, `${slug}.webp`), join(IMG_DIR, 'units', `${slug}.webp`))

  const enc = (s: string) => encodeURIComponent(s)
  const unitJobs = units.flatMap((u) => {
    const img = imgByUnitId.get(u.id)
    return img && !overrides.has(u.slug)
      ? [{ url: `${LHQ2_CDN}/unitCards/${enc(img)}`, dest: join(IMG_DIR, 'units', `${u.slug}.webp`) }]
      : []
  })
  const upJobs = upgrades.flatMap((u) => {
    const img = imgByUpId.get(u.id)
    return img ? [{ url: `${LHQ2_CDN}/upgradeCards/${enc(img)}`, dest: join(IMG_DIR, 'upgrades', `${u.slug}.webp`) }] : []
  })
  const cmdJobs = commands.flatMap((c) => {
    const img = imgByCmdId.get(c.id)
    return img ? [{ url: `${LHQ2_CDN}/commandCards/${enc(img)}`, dest: join(IMG_DIR, 'commands', `${c.slug}.webp`) }] : []
  })

  await runJobs('unit', unitJobs)
  await runJobs('upgrade', upJobs)
  await runJobs('command', cmdJobs)
  console.log('Done.')
}

// Only run the pipeline when executed directly (not when imported, e.g. by tests).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}

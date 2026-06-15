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
  buildUnits, buildUpgrades, buildCommands, buildBattleForces, buildBattleCards,
  type Lhq2Card, type Lhq2BattleForce, type Unit,
} from './normalise.ts'
import { parseProductCards, buildProductCatalog, type PhilibertEntry } from './products.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DATA_DIR = join(ROOT, 'public', 'data')
const IMG_DIR = join(ROOT, 'public', 'images')
const OVERRIDE_DIR = join(IMG_DIR, 'overrides')

const LHQ2_ORIGIN = 'https://legionhq2.com'
const LHQ2_CDN = 'https://d2maxvwz12z6fm.cloudfront.net'
const LHQ_KEYWORDS_URL = 'https://raw.githubusercontent.com/Electrynth/legion-hq-web/master/src/constants/keywords.js'
// Philibert Star Wars: Legion category — box art + store reference (EAN) source.
const PHILIBERT_LISTING = 'https://www.philibertnet.com/en/11969-star-wars-legion'
const PHILIBERT_PAGES = 4

const UA = { 'User-Agent': 'Mozilla/5.0 LegionApp-scraper' }
// Philibert is behind a CDN that rejects terse UAs; use a browser string for it.
const BROWSER_UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36' }
const skipImages = process.argv.includes('--skip-images')

async function exists(p: string): Promise<boolean> {
  try { await access(p); return true } catch { return false }
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: UA })
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`)
  return res.text()
}

/** Fetch the Legion HQ 2 SPA main JS bundle (it embeds the full card database). */
async function fetchLhq2MainJs(): Promise<string> {
  const html = await fetchText(`${LHQ2_ORIGIN}/`)
  const m = html.match(/\/static\/js\/main\.[a-z0-9]+\.js/i)
  if (!m) throw new Error('Could not locate Legion HQ 2 JS bundle')
  return fetchText(`${LHQ2_ORIGIN}${m[0]}`)
}

/**
 * Parse the webpack chunk map embedded in main.js — the object literal mapping
 * chunk numbers to content hashes that feeds `"static/js/"+e+"."+{…}[e]+".chunk.js"`.
 */
export function parseChunkMap(js: string): Record<string, string> {
  const m = js.match(/\{(?:\s*\d+:"[a-z0-9]+",?\s*)+\}(?=\[\w+\]\+"\.chunk\.js")/)
  const map: Record<string, string> = {}
  if (m) for (const e of m[0].matchAll(/(\d+):"([a-z0-9]+)"/g)) map[e[1]] = e[2]
  return map
}

/**
 * Battle-force definitions live in a lazy-loaded chunk (chunk 526 today). The
 * hash rotates on every deploy and the chunk number can move, so resolve the map
 * fresh, try 526 first, then scan the remaining chunks by content as a fallback.
 */
async function fetchLhq2BattleForces(mainJs: string): Promise<Lhq2BattleForce[]> {
  const map = parseChunkMap(mainJs)
  const tryChunk = async (num: string): Promise<Lhq2BattleForce[] | null> => {
    const hash = map[num]
    if (!hash) return null
    const js = await fetchText(`${LHQ2_ORIGIN}/static/js/${num}.${hash}.chunk.js`).catch(() => '')
    const bfs = extractBattleForces(js)
    return bfs.length ? bfs : null
  }
  const primary = await tryChunk('526')
  if (primary) return primary
  console.warn('  ! battle forces not in chunk 526; scanning other chunks…')
  for (const num of Object.keys(map)) {
    if (num === '526') continue
    const bfs = await tryChunk(num)
    if (bfs) { console.log(`  ✓ battle forces found in chunk ${num}`); return bfs }
  }
  throw new Error('Could not locate the Legion HQ 2 battle-force chunk')
}

/** Brace-match each battle-force object (`…linkId:"xx"…`) and eval it. */
export function extractBattleForces(js: string): Lhq2BattleForce[] {
  const out: Lhq2BattleForce[] = []
  const seen = new Set<number>()
  let idx = 0
  while ((idx = js.indexOf('linkId:', idx)) !== -1) {
    // Walk back to the start of the enclosing object.
    let depth = 0, start = -1
    for (let i = idx; i >= 0; i--) {
      const c = js[i]
      if (c === '}') depth++
      else if (c === '{') { if (depth === 0) { start = i; break } depth-- }
    }
    if (start === -1 || seen.has(start)) { idx += 7; continue }
    seen.add(start)
    // Brace-match forward.
    let d = 0, end = -1
    for (let j = start; j < js.length; j++) {
      const c = js[j]
      if (c === '{') d++
      else if (c === '}') { d--; if (d === 0) { end = j + 1; break } }
    }
    if (end === -1) { idx += 7; continue }
    const seg = js.slice(start, end)
    idx = end
    // BF objects use unquoted keys and !0/!1 booleans → eval, not JSON.parse.
    try {
      const obj = new Function(`return (${seg})`)() as Lhq2BattleForce
      if (obj && obj.linkId && obj.name) out.push(obj)
    } catch {
      // Not a battle-force object literal (e.g. an unrelated `linkId:` use).
    }
  }
  return out
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
  // Most segments are valid JSON. A few embed JS-style escapes the minifier emitted that
  // aren't valid JSON and break BOTH JSON.parse and `new Function`, silently dropping the
  // card: a lone apostrophe escape (\'), and double-escaped quotes in names (\\" where a
  // single \" was meant) — e.g. Ax-108 "Ground Buzzer", "Bunker Buster" Shells, and General
  // Grievous "Sinister Cyborg"'s unnamed melee. Try strict JSON first (the common case,
  // untouched), then repair and retry. Collapsing \\" → \" is safe here: Legion card data
  // has no genuine trailing-backslash string values.
  try {
    return JSON.parse(seg) as Lhq2Card
  } catch {
    const repaired = seg.replace(/\\\\"/g, '\\"').replace(/\\'/g, "'")
    try {
      return JSON.parse(repaired) as Lhq2Card
    } catch {
      try {
        return new Function(`return (${repaired})`)() as Lhq2Card
      } catch {
        return null
      }
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

/** Fetch the Philibert SW:Legion category listing and parse every product card. */
async function fetchPhilibertProducts(): Promise<PhilibertEntry[]> {
  const entries: PhilibertEntry[] = []
  for (let page = 1; page <= PHILIBERT_PAGES; page++) {
    const res = await fetch(`${PHILIBERT_LISTING}?p=${page}`, { headers: BROWSER_UA })
    if (!res.ok) throw new Error(`GET Philibert p${page} → ${res.status}`)
    entries.push(...parseProductCards(await res.text()))
  }
  return entries
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
    const res = await fetch(url, { headers: BROWSER_UA })
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
  const [mainJs, keywords] = await Promise.all([fetchLhq2MainJs(), fetchKeywords()])
  const cards = extractCards(mainJs)
  const counts = cards.reduce<Record<string, number>>((a, c) => ((a[c.cardType] = (a[c.cardType] ?? 0) + 1), a), {})
  console.log(`  cards: ${cards.length}`, counts)

  console.log('Fetching Legion HQ 2 battle forces…')
  const rawBFs = await fetchLhq2BattleForces(mainJs)
  console.log(`  battle forces: ${rawBFs.length}`)

  console.log('Building…')
  const units = buildUnits(cards)
  const upgrades = buildUpgrades(cards)
  const commands = buildCommands(cards)
  const battleCards = buildBattleCards(cards)
  const battleForces = buildBattleForces(rawBFs)

  const overrides = await overrideSlugs()
  for (const u of units) if (overrides.has(u.slug)) u.cardImage = `/images/units/${u.slug}.webp`
  console.log(`  units: ${units.length} (all current-edition, with stats + weapons)`)

  console.log('Fetching Philibert product catalogue…')
  let philibert: PhilibertEntry[] = []
  try {
    philibert = await fetchPhilibertProducts()
  } catch (e) {
    console.warn(`  ! Philibert fetch failed (${(e as Error).message}); products will be synthetic-only`)
  }
  const products = buildProductCatalog(philibert, units)
  const realBoxes = products.filter((p) => p.ean).length
  console.log(`  products: ${products.length} (${realBoxes} real boxes + ${products.length - realBoxes} synthetic)`)

  console.log('Writing JSON…')
  await writeJson('units.json', units)
  await writeJson('upgrades.json', upgrades)
  await writeJson('commands.json', commands)
  await writeJson('battleCards.json', battleCards)
  await writeJson('battleForces.json', battleForces)
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
  const imgByBattleId = new Map(cards.filter((c) => c.cardType === 'battle').map((c) => [c.id, c.imageName]))

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
  const battleJobs = battleCards.flatMap((c) => {
    const img = imgByBattleId.get(c.id)
    return img ? [{ url: `${LHQ2_CDN}/battleCards/${enc(img)}`, dest: join(IMG_DIR, 'battle', `${c.slug}.webp`) }] : []
  })
  // Box art for real Philibert boxes (synthetic products reuse the unit card scan).
  const imgBoxByEan = new Map(philibert.map((e) => [e.ean, e.image]))
  const boxJobs = products.flatMap((p) =>
    p.ean && imgBoxByEan.has(p.ean)
      ? [{ url: imgBoxByEan.get(p.ean)!, dest: join(IMG_DIR, 'products', `${p.ean}.jpg`) }]
      : [],
  )

  await runJobs('unit', unitJobs)
  await runJobs('upgrade', upJobs)
  await runJobs('command', cmdJobs)
  await runJobs('battle', battleJobs)
  await runJobs('product', boxJobs)
  console.log('Done.')
}

// Only run the pipeline when executed directly (not when imported, e.g. by tests).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}

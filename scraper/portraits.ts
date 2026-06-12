// Self-hosted unit portrait icons.
//
// Our single card-data source (Legion HQ 2) ships only full card scans — no clean
// bust portrait. Tabletop Admiral publishes purpose-made circular bust portraits at
// `units-new/portraits/<id>.webp`, keyed by its own numeric unit id. This one-off
// step maps our units (by normalised name + title, faction as tiebreak) onto TTA ids,
// downloads the portraits, and rehosts them under public/images/portraits/<slug>.webp
// (self-hosted exactly like the card scans; art is © AMG, covered by the app disclaimer).
//
// It then stamps `portraitImage` onto public/data/units.json for every unit that got a
// portrait. Units with no TTA portrait (many generic troopers/vehicles) keep
// portraitImage = null and fall back to a card-art crop in the UI.
//
// Run:  npm run portraits        (re-run after a re-scrape; safe + idempotent)

import { mkdir, writeFile, readFile, access } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const UNITS_JSON = join(ROOT, 'public', 'data', 'units.json')
const PORTRAIT_DIR = join(ROOT, 'public', 'images', 'portraits')
const CACHE = join(ROOT, 'scraper', '.tta-units.json')

const TTA_API = 'https://tabletopadmiral.com/api/units/1'
const PORTRAIT_CDN = 'https://d26oqf9i6fvic.cloudfront.net/units-new/portraits'

// our faction → TTA faction_fkey (mandalorians ride under fringe/mercenary = 6)
const FACTION_FKEY: Record<string, number[]> = {
  rebels: [1], empire: [2], republic: [4], separatists: [5],
  mercenary: [6, 3], mandalorians: [6, 3],
}

interface TtaUnit { id: string; name: string; title: string; faction: number; rank: number; unique: boolean }
interface OurUnit { slug: string; name: string; title: string; faction: string; rank: string; portraitImage: string | null }

const norm = (s: string) =>
  (s || '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ').trim()

async function loadTtaUnits(): Promise<TtaUnit[]> {
  try {
    const res = await fetch(TTA_API, { headers: { accept: 'application/json' } })
    if (res.ok) {
      const j: any = await res.json()
      const list = Array.isArray(j) ? j : (j.units ?? j.data ?? [])
      const slim: TtaUnit[] = list.map((u: any) => ({
        id: String(u.id), name: u.name ?? '', title: u.title ?? '', faction: u.faction_fkey, rank: u.rank_fkey, unique: !!u.is_unique,
      }))
      if (slim.length) {
        await writeFile(CACHE, JSON.stringify(slim))
        return slim
      }
    }
  } catch (e) {
    console.warn('Live TTA fetch failed, using cache:', (e as Error).message)
  }
  const cached = JSON.parse(await readFile(CACHE, 'utf8'))
  return cached.slim ?? cached.result?.slim ?? cached
}

function buildMatcher(tta: TtaUnit[]) {
  const byNameTitle = new Map<string, TtaUnit[]>()
  const byName = new Map<string, TtaUnit[]>()
  for (const u of tta) {
    const push = (m: Map<string, TtaUnit[]>, k: string) => m.set(k, [...(m.get(k) ?? []), u])
    push(byNameTitle, `${norm(u.name)}|${norm(u.title)}`)
    push(byName, norm(u.name))
  }
  return (our: OurUnit): TtaUnit | null => {
    const fkeys = FACTION_FKEY[our.faction] ?? []
    const pick = (cands: TtaUnit[]) => {
      if (cands.length === 1) return cands[0]
      const fac = cands.filter((c) => fkeys.includes(c.faction))
      if (fac.length === 1) return fac[0]
      return fac[0] ?? null // ambiguous → first faction match (or null)
    }
    return (
      pick(byNameTitle.get(`${norm(our.name)}|${norm(our.title)}`) ?? []) ||
      pick(byName.get(norm(our.name)) ?? []) ||
      null
    )
  }
}

async function exists(p: string) {
  try { await access(p); return true } catch { return false }
}

async function downloadPortrait(ttaId: string, dest: string): Promise<boolean> {
  const res = await fetch(`${PORTRAIT_CDN}/${ttaId}.webp`)
  if (!res.ok) return false
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 100) return false // empty/placeholder
  await writeFile(dest, buf)
  return true
}

async function main() {
  await mkdir(PORTRAIT_DIR, { recursive: true })
  const tta = await loadTtaUnits()
  const match = buildMatcher(tta)
  const ours: OurUnit[] = JSON.parse(await readFile(UNITS_JSON, 'utf8'))

  const unmatched: string[] = []
  const matched: { our: OurUnit; tta: TtaUnit }[] = []
  for (const u of ours) {
    const m = match(u)
    if (m) matched.push({ our: u, tta: m })
    else unmatched.push(`${u.name}${u.title ? ' — ' + u.title : ''} (${u.faction})`)
  }

  console.log(`Matched ${matched.length}/${ours.length} units to TTA ids; ${unmatched.length} unmatched.`)

  let downloaded = 0, noPortrait = 0, reused = 0
  const withPortrait = new Set<string>()
  const limit = 8
  for (let i = 0; i < matched.length; i += limit) {
    await Promise.all(matched.slice(i, i + limit).map(async ({ our, tta }) => {
      const dest = join(PORTRAIT_DIR, `${our.slug}.webp`)
      if (await exists(dest)) { withPortrait.add(our.slug); reused++; return }
      if (await downloadPortrait(tta.id, dest)) { withPortrait.add(our.slug); downloaded++ }
      else noPortrait++
    }))
  }

  // Stamp portraitImage onto units.json
  for (const u of ours) u.portraitImage = withPortrait.has(u.slug) ? `/images/portraits/${u.slug}.webp` : null
  await writeFile(UNITS_JSON, JSON.stringify(ours, null, 2) + '\n')

  console.log(`Portraits: ${downloaded} downloaded, ${reused} reused, ${noPortrait} matched-but-no-portrait.`)
  console.log(`units.json: ${withPortrait.size}/${ours.length} now carry portraitImage.`)
  if (unmatched.length) console.log('\nUnmatched (no TTA id — keep card-art fallback):\n  ' + unmatched.join('\n  '))
}

main().catch((e) => { console.error(e); process.exit(1) })

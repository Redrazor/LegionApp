// Regenerates the `units` map of public/data/card-flips.json — the owner-maintained overlay of a
// card's OTHER printed side (Feature 15: Flip double-sided cards). It is scrape-proof (kept SEPARATE
// from units.json/upgrades.json, mirroring counterparts.json / upgrade-weapons.json).
//
// Units flip stats↔art: the art side was captured during Feature 13 P2 as `units/<slug>-front.webp`.
// This script scans those files and emits one `units` entry per slug that has BOTH a stats scan
// (`<slug>.webp`) and an art scan (`<slug>-front.webp`) — so a Flip button is only ever offered when
// the art image actually exists on disk (no broken toggles).
//
// The `upgrades` map (Reconfigure upgrades whose two configs are separate scans, e.g. E-11D Focused
// Fire ↔ Grenade Launcher) is HAND-AUTHORED and NOT touched here — this script reads the existing JSON
// and rewrites only the `units` key, preserving `upgrades`. Regenerate: `npm run card-flips`.
import { readdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const UNIT_IMG = join(ROOT, 'public', 'images', 'units')
const UNITS_JSON = join(ROOT, 'public', 'data', 'units.json')
const OUT = join(ROOT, 'public', 'data', 'card-flips.json')

interface FlipSide {
  image: string
  label: string
  keywords?: string[]
}
interface CardFlips {
  units: Record<string, FlipSide>
  upgrades: Record<string, FlipSide>
}

function buildUnits(): Record<string, FlipSide> {
  // Only catalogue units get a flip entry. images/units/ also holds counterpart card scans (Feature
  // 14, e.g. c-3po-rebels[-front].webp) which have their own `-front` art but are NOT catalogue slugs
  // — gate on units.json so those don't leak in as (broken) unit flips.
  const catalogue = new Set(
    (JSON.parse(readFileSync(UNITS_JSON, 'utf8')) as { slug: string }[]).map((u) => u.slug),
  )
  const out: Record<string, FlipSide> = {}
  for (const file of readdirSync(UNIT_IMG).sort()) {
    if (!file.endsWith('-front.webp')) continue
    const slug = file.slice(0, -'-front.webp'.length)
    if (!catalogue.has(slug)) continue
    // Require the stats side too, so we only flip cards that have both printed faces present.
    if (!existsSync(join(UNIT_IMG, `${slug}.webp`))) continue
    out[slug] = { image: `/images/units/${file}`, label: 'Artwork' }
  }
  return out
}

function main() {
  const existing: CardFlips = existsSync(OUT)
    ? (JSON.parse(readFileSync(OUT, 'utf8')) as CardFlips)
    : { units: {}, upgrades: {} }
  const next: CardFlips = { units: buildUnits(), upgrades: existing.upgrades ?? {} }
  writeFileSync(OUT, JSON.stringify(next, null, 2) + '\n')
  console.log(
    `card-flips.json → ${Object.keys(next.units).length} unit fronts, ` +
      `${Object.keys(next.upgrades).length} reconfigure upgrades`,
  )
}

main()

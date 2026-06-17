// ONE-TIME materialiser for `public/data/upgrade-weapons.json`.
//
// LHQ2 ships weapon profiles on weapon-granting upgrade cards (heavy weapons, armaments,
// grenades, vehicle hardpoints, …) but the legacy `buildUpgrades` step drops them. This
// script pulls those weapons ONCE, keyed by the same canonical upgrade slug, and writes an
// **owner-maintained** `upgrade-weapons.json` ({ slug: Weapon[] }). From here on that file
// is owned and edited by hand (verified against the card scans) — it is NOT part of the
// regular scrape pipeline, and a re-scrape does not touch it. See CLAUDE.md (new card-data
// fields come from the card images, not the scraper). Re-run only to re-materialise from
// scratch: `npm run upgrade-weapons`.

import { writeFile } from 'fs/promises'
import { join } from 'path'
import { extractCards } from './scrape.ts'
import { buildUpgrades, mapWeapon } from './normalise.ts'

const LHQ2_ORIGIN = 'https://legionhq2.com'
const UA = { 'User-Agent': 'Mozilla/5.0 LegionApp-scraper' }

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: UA })
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`)
  return res.text()
}

async function main() {
  const html = await fetchText(`${LHQ2_ORIGIN}/`)
  const m = html.match(/\/static\/js\/main\.[a-z0-9]+\.js/i)
  if (!m) throw new Error('Could not locate Legion HQ 2 JS bundle')
  const mainJs = await fetchText(`${LHQ2_ORIGIN}${m[0]}`)

  const cards = extractCards(mainJs)
  // Canonical slugs (same generation the catalogue uses), keyed by card id.
  const slugById = new Map(buildUpgrades(cards).map((u) => [u.id, u.slug]))

  const out: Record<string, ReturnType<typeof mapWeapon>[]> = {}
  let count = 0
  for (const c of cards) {
    if (c.cardType !== 'upgrade' || !c.weapons?.length) continue
    const slug = slugById.get(c.id)
    if (!slug) continue
    out[slug] = c.weapons.map(mapWeapon)
    count++
  }

  // Stable, slug-sorted output for clean diffs.
  const sorted = Object.fromEntries(Object.keys(out).sort().map((k) => [k, out[k]]))
  const path = join(process.cwd(), 'public/data/upgrade-weapons.json')
  await writeFile(path, JSON.stringify(sorted, null, 2) + '\n')
  console.log(`✓ Wrote ${path} — weapons for ${count} upgrades.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

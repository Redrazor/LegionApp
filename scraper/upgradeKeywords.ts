// Fill missing upgrade keywords from Tabletop Admiral.
//
// Legion HQ 2 (our card-data source) leaves ~123/413 upgrades with empty `keywords`
// (e.g. Situational Awareness, which grants Outmaneuver). TTA tags those via
// `keyword_ids` → its /api/keywords names. This step fills ONLY the upgrades LHQ2
// left blank (LHQ2 stays authoritative for the rest), matched by normalised name.
//
// Owner-approved extension of the TTA exception from images to upgrade keyword DATA
// (see CLAUDE.md). Effect *text* exists nowhere as data — only on the card image
// (the Build inspect gallery) — so this fills keywords only.
//
// TTA stores valued keywords as a literal "Name: X" placeholder (the real value lives
// only on the card), so we strip a trailing ": X" → the base keyword name.
//
// Run:  npm run upgrade-keywords      (after `scrape`, before `seed`; idempotent)

import { readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const UPGRADES_JSON = join(ROOT, 'public', 'data', 'upgrades.json')

const norm = (s: string) =>
  (s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim()

// TTA marks a numeric value with a literal "X" placeholder ("Impact X", "Tactical: X")
// — the real number lives only on the card, so drop the placeholder to the base name.
const cleanKw = (name: string) => name.replace(/:?\s+X$/i, '').trim()

async function ttaJson(path: string): Promise<any[]> {
  const r = await fetch(`https://tabletopadmiral.com${path}`, { headers: { accept: 'application/json' } })
  if (!r.ok) throw new Error(`${path} → ${r.status}`)
  const j = await r.json()
  return Array.isArray(j) ? j : (j.upgrades ?? j.keywords ?? j.data ?? [])
}

async function main() {
  const [ttaUpgrades, ttaKeywords] = await Promise.all([ttaJson('/api/upgrades'), ttaJson('/api/keywords')])
  const kwById = new Map<string, string>(ttaKeywords.map((k: any) => [String(k.id), cleanKw(k.name ?? '')]))

  // normalised TTA upgrade name → union of its keyword names
  const byName = new Map<string, Set<string>>()
  for (const u of ttaUpgrades) {
    const ids: any[] = u.keyword_ids ?? u.keywords ?? []
    if (!Array.isArray(ids) || !ids.length) continue
    const names = ids.map((id) => kwById.get(String(id))).filter((n): n is string => !!n)
    if (!names.length) continue
    const key = norm(u.name ?? '')
    const set = byName.get(key) ?? new Set<string>()
    for (const n of names) set.add(n)
    byName.set(key, set)
  }

  const ours: { name: string; keywords: string[] }[] = JSON.parse(await readFile(UPGRADES_JSON, 'utf8'))
  let filled = 0, stillEmpty = 0
  const examples: string[] = []
  for (const u of ours) {
    if (u.keywords && u.keywords.length) continue // LHQ2 authoritative — leave it
    const match = byName.get(norm(u.name))
    if (match && match.size) {
      u.keywords = [...match]
      filled++
      if (examples.length < 6) examples.push(`${u.name} → ${u.keywords.join(', ')}`)
    } else {
      stillEmpty++
    }
  }

  await writeFile(UPGRADES_JSON, JSON.stringify(ours, null, 2) + '\n')
  console.log(`Filled keywords on ${filled} upgrades from TTA; ${stillEmpty} still empty (no TTA keywords / no match).`)
  console.log('Examples:\n  ' + examples.join('\n  '))
}

main().catch((e) => { console.error(e); process.exit(1) })

// Regenerate `public/data/keywords.json` from `Keyword_glossary.md` (the source of
// truth for all keyword rules text). Run: `npm run keywords`.
//
// Validates that every keyword string referenced by the card data still resolves against
// the regenerated glossary (via the same resolver the app uses), failing loudly if a key
// was renamed/dropped in a way that would orphan a card's keyword tooltip.
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { buildGlossary } from './keywordGlossary.ts'
import { resolveKeyword } from '../src/utils/keywords.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA = join(ROOT, 'public', 'data')
const readJson = (f: string) => JSON.parse(readFileSync(join(DATA, f), 'utf8'))

// LHQ2 card-data artifacts that have never matched a glossary keyword and aren't real
// keywords (mis-tagged token/weapon-type strings, or a spelling variant of a real keyword):
//  - "Dodge" (Defense Protocols) / "Ranged" (The Darksaber) — token/weapon-type noise.
//  - "Pull The Strings Empire Trooper" (Tarkin) — LHQ2 misspelling of "Pulling the Strings".
// Tracked so the resolver check below stays strict for everything that genuinely matters.
const KNOWN_UNRESOLVED = new Set(['Dodge', 'Ranged', 'Pull The Strings Empire Trooper'])

function cardKeywordStrings(): string[] {
  const set = new Set<string>()
  const add = (a: unknown) => Array.isArray(a) && a.forEach((k) => set.add(String(k)))
  for (const u of readJson('units.json')) {
    add(u.keywords)
    ;(u.weapons ?? []).forEach((w: any) => add(w?.keywords))
  }
  for (const u of readJson('upgrades.json')) {
    add(u.keywords)
    ;(u.weapons ?? []).forEach((w: any) => add(w?.keywords))
  }
  for (const c of readJson('commands.json')) add(c.keywords)
  return [...set].sort()
}

function main() {
  const md = readFileSync(join(ROOT, 'Keyword_glossary.md'), 'utf8')
  // Reuse the current keys' casing so card exact-match lookups keep resolving.
  let casingRef: string[] = []
  try {
    casingRef = Object.keys(readJson('keywords.json'))
  } catch {
    /* first run / missing file is fine */
  }

  const glossary = buildGlossary(md, casingRef)
  const keys = Object.keys(glossary)
  console.log(`Parsed ${keys.length} keyword entries from Keyword_glossary.md`)

  // Validate: every card-referenced keyword must resolve (minus known LHQ2 artifacts).
  const unresolved = cardKeywordStrings().filter((k) => resolveKeyword(glossary, k) === null)
  const regressions = unresolved.filter((k) => !KNOWN_UNRESOLVED.has(k))
  if (regressions.length) {
    console.error(`\n✗ ${regressions.length} card keyword(s) do not resolve against the glossary:`)
    for (const k of regressions) console.error(`    - ${k}`)
    console.error('\nAdd/rename the matching entry in Keyword_glossary.md, then re-run.')
    process.exit(1)
  }
  const stillKnown = unresolved.filter((k) => KNOWN_UNRESOLVED.has(k))
  if (stillKnown.length) console.warn(`  (${stillKnown.length} known LHQ2 artifact keyword(s) unresolved, as expected: ${stillKnown.join(', ')})`)

  const sorted = Object.fromEntries(keys.sort((a, b) => a.localeCompare(b)).map((k) => [k, glossary[k]]))
  writeFileSync(join(DATA, 'keywords.json'), JSON.stringify(sorted, null, 2) + '\n')
  console.log(`✓ Wrote public/data/keywords.json (${keys.length} entries); all card keywords resolve.`)
}

main()

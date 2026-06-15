/**
 * Lists every keyword used by units (incl. weapons), upgrades and commands that does
 * NOT resolve to a glossary description — i.e. keywords that show no tooltip in the app.
 * Mirrors src/stores/keywords.ts `define()`. Run: npx tsx scripts/audit-keywords.ts
 *
 * Re-run after a scrape to catch newly-added keywords that need a glossary entry.
 * See docs/keyword-tooltip-gaps.md for the triaged backlog.
 */
import { readFileSync } from 'fs'
import { join } from 'path'

const dir = join(process.cwd(), 'public', 'data')
const load = (f: string) => JSON.parse(readFileSync(join(dir, f), 'utf-8'))

const glossary = load('keywords.json') as Record<string, string>
const units = load('units.json') as any[]
const upgrades = load('upgrades.json') as any[]
const commands = load('commands.json') as any[]

// Same resolution as the app's keyword store.
function define(keyword: string): string | null {
  const g = glossary
  if (g[keyword]) return g[keyword]
  const noNum = keyword.replace(/\s+\d+$/, '').trim()
  if (g[noNum]) return g[noNum]
  const beforeColon = keyword.split(':')[0].trim()
  if (g[beforeColon]) return g[beforeColon]
  return g[keyword.split(/\s+/)[0]] ?? null
}

const usage = new Map<string, Set<string>>()
const add = (kw: string, src: string) => {
  if (!kw) return
  if (!usage.has(kw)) usage.set(kw, new Set())
  usage.get(kw)!.add(src)
}

for (const u of units) {
  for (const k of u.keywords ?? []) add(k, `unit:${u.slug}`)
  for (const w of u.weapons ?? []) for (const k of w.keywords ?? []) add(k, `weapon:${u.slug}`)
}
for (const u of upgrades) for (const k of u.keywords ?? []) add(k, `upgrade:${u.slug}`)
for (const c of commands) for (const k of c.keywords ?? []) add(k, `command:${c.slug}`)

const missing = [...usage.keys()].filter((k) => define(k) === null).sort()

console.log(`Distinct keywords used: ${usage.size}`)
console.log(`Resolve to a tooltip:   ${usage.size - missing.length}`)
console.log(`MISSING (no tooltip):   ${missing.length}\n`)
for (const k of missing) console.log(`  ${k}  (${usage.get(k)!.size})`)

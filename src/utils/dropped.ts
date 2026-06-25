// Overlay for public/data/dropped.json — the owner-maintained list of cards DROPPED
// ENTIRELY from the app: first-edition (v1) cards with no current-edition equivalent
// (Feature 13, the 2.0 v2-only cutover). Unlike unreleased.ts `noImage` (which keeps the
// card and shows a placeholder image), these slugs are FILTERED OUT at store load, so they
// never appear in Browse / Build / Reference. Scrape-proof static asset; degrades to a
// no-op if the file is absent.

type Cat = 'units' | 'commands' | 'upgrades'

let cache: Record<Cat, Set<string>> | null = null

async function fetchDropped(): Promise<Record<Cat, Set<string>>> {
  if (cache) return cache
  try {
    const res = await fetch('/data/dropped.json')
    if (!res.ok) throw new Error(`${res.status}`)
    const raw = await res.json()
    cache = {
      units: new Set<string>(raw.units ?? []),
      commands: new Set<string>(raw.commands ?? []),
      upgrades: new Set<string>(raw.upgrades ?? []),
    }
  } catch {
    cache = { units: new Set(), commands: new Set(), upgrades: new Set() } // optional overlay
  }
  return cache
}

/** Remove dropped slugs from a catalogue list — they are excluded from the app entirely. */
export async function applyDropped<T extends { slug: string }>(items: T[], category: Cat): Promise<T[]> {
  const drop = (await fetchDropped())[category]
  return drop.size ? items.filter((it) => !drop.has(it.slug)) : items
}

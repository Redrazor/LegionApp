// Overlay for public/data/unreleased.json — the owner-maintained list of cards whose
// IMAGE is a pre-release preview or low-res placeholder (Feature 13). Stamps the note
// onto each catalogue item by slug so the UI can show an "unreleased / preview" badge.
// Scrape-proof (a static asset, like upgrade-weapons.json); degrades to no-op if absent.

type Cat = 'units' | 'commands' | 'upgrades'
// A note string keeps the (preview/low-res) first-party image and just badges it. An
// object with `noImage` ALSO expunges the image (cardImage → null) so the branded
// "image pending" placeholder shows — used for cards with NO first-party source whose
// legacy (Legion HQ) scan must not be shown.
type Entry = string | { note: string; noImage?: boolean }

let cache: Record<Cat, Record<string, Entry>> | null = null

async function fetchUnreleased(): Promise<Record<Cat, Record<string, Entry>>> {
  if (cache) return cache
  try {
    const res = await fetch('/data/unreleased.json')
    if (!res.ok) throw new Error(`${res.status}`)
    const raw = await res.json()
    cache = { units: raw.units ?? {}, commands: raw.commands ?? {}, upgrades: raw.upgrades ?? {} }
  } catch {
    cache = { units: {}, commands: {}, upgrades: {} } // optional overlay
  }
  return cache
}

/** Stamp `unreleased` (the note) on any listed card; expunge `cardImage` when `noImage`. */
export async function applyUnreleased<T extends { slug: string; unreleased?: string; cardImage?: string | null }>(
  items: T[],
  category: Cat,
): Promise<T[]> {
  const notes = (await fetchUnreleased())[category]
  return items.map((it) => {
    const e = notes[it.slug]
    if (!e) return it
    const note = typeof e === 'string' ? e : e.note
    const noImage = typeof e === 'object' && e.noImage
    return noImage ? { ...it, unreleased: note, cardImage: null } : { ...it, unreleased: note }
  })
}

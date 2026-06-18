import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'

// Verifies every catalogue card has an image file on disk — the gap the
// catalogue-integrity spec leaves open (it only checks JSON path strings).
//
// Card images are git-ignored, so on a fresh clone / CI runner the dirs are empty.
// In that case the suite SKIPS rather than fails: this is a pre-deploy gate for the
// owner's working tree, not a CI assertion. When images are present it asserts full
// coverage and reports orphan files.
//
// Allowlist: cards known to have no scan yet, scheduled to be sourced in the 2.0
// battle/cleanup phase (P7). Empty this set at the 2.0 cutover (P8).
const KNOWN_MISSING = new Set([
  'dc-15-clone-trooper', // upgrades
  'youre-not-all-the-same-to-me', // upgrades
])

const ROOT = join(__dirname, '..')
const DATA = join(ROOT, 'public', 'data')
const IMG = join(ROOT, 'public', 'images')

const CATEGORIES: Record<string, string> = {
  units: 'units.json', upgrades: 'upgrades.json', commands: 'commands.json', battle: 'battleCards.json',
}

function slugs(file: string): string[] {
  return (JSON.parse(readFileSync(join(DATA, file), 'utf8')) as { slug: string }[]).map((c) => c.slug)
}

function present(dir: string): boolean {
  return existsSync(dir) && readdirSync(dir).some((f) => f.endsWith('.webp'))
}

describe('image coverage (every catalogue card has a scan on disk)', () => {
  for (const [cat, file] of Object.entries(CATEGORIES)) {
    const dir = join(IMG, cat)
    const have = present(dir)

    it.skipIf(!have)(`${cat}: every slug has an image file`, () => {
      const missing = slugs(file).filter((s) => !KNOWN_MISSING.has(s) && !existsSync(join(dir, `${s}.webp`)))
      expect(missing, `missing ${cat} scans: ${missing.join(', ')}`).toEqual([])
    })

    it.skipIf(!have)(`${cat}: no orphan image files without a catalogue entry`, () => {
      const known = new Set(slugs(file))
      // `<slug>-front.webp` is the owner-captured art side of a unit card (Feature 13);
      // it has no catalogue entry of its own and is NOT an orphan.
      const isFrontArt = (s: string) => s.endsWith('-front') && known.has(s.slice(0, -'-front'.length))
      const orphans = readdirSync(dir).filter((f) => f.endsWith('.webp')).map((f) => f.replace(/\.webp$/, ''))
        .filter((s) => !known.has(s) && !isFrontArt(s))
      expect(orphans, `orphan ${cat} files: ${orphans.join(', ')}`).toEqual([])
    })
  }

  it('reports whether images are present locally', () => {
    const status = Object.keys(CATEGORIES).map((c) => `${c}:${present(join(IMG, c)) ? 'present' : 'absent'}`)
    // Always passes — this is informational so a fully-skipped run still shows one green dot.
    expect(status.length).toBe(4)
  })
})

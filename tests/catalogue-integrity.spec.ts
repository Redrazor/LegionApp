import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// Guards against the failure mode that shipped in 1.2.2: `npm run scrape` regenerates
// units.json/upgrades.json from LHQ2, which has NO portraitImage and leaves ~123 upgrades
// with empty keywords. The TTA-backed `npm run portraits` + `npm run upgrade-keywords`
// steps re-stamp them — but if a scrape isn't followed by those steps (per the CLAUDE.md
// run order), the data regresses: Build badges fall back to cropped card art and a handful
// of upgrades lose their keyword tooltips. These assertions fail loudly if that happens.
const load = (f: string) =>
  JSON.parse(readFileSync(join(__dirname, '../public/data', f), 'utf8')) as any[]

describe('catalogue data integrity', () => {
  it('units carry their portrait busts (npm run portraits was applied after the last scrape)', () => {
    const units = load('units.json')
    const withPortrait = units.filter((u) => u.portraitImage).length
    // ~175/180 today; a handful legitimately have no TTA bust. A wipe drops this to 0.
    expect(withPortrait).toBeGreaterThan(150)
  })

  it('keeps TTA-filled keywords on upgrades that LHQ2 ships empty (upgrade-keywords applied)', () => {
    const upgrades = load('upgrades.json')
    const kw = (name: string) => upgrades.find((u) => u.name === name)?.keywords ?? []
    expect(kw('DH-447 Sniper')).toContain('Sniper Team')
    expect(kw('Jetpack Rockets')).toContain('Anti-Materiel')
    expect(kw('Situational Awareness')).toContain('Outmaneuver')
  })

  it('applies the miniCount corrections (MINICOUNT_OVERRIDES survived the last scrape)', () => {
    const units = load('units.json')
    const mc = (slug: string) => units.find((u) => u.slug === slug)?.miniCount
    expect(mc('scout-troopers-strike-team')).toBe(1) // not the parent squad's 4
    expect(mc('the-bad-batch-clone-force-99')).toBe(5) // not 0
    expect(mc('the-bad-batch-clone-force-99-2')).toBe(5)
  })
})

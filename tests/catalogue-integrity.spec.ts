import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// Guards against the failure mode that shipped in 1.2.2: `npm run scrape` regenerates
// units.json/upgrades.json from LHQ2, which has NO portraitImage. `npm run portraits`
// crops a Build badge for every unit straight out of its card scan and re-stamps them —
// but if a scrape isn't followed by that step (per the CLAUDE.md run order), the data
// regresses: every Build badge falls back to the neutral "no portrait" indicator. These
// assertions fail loudly if that happens, and lock in that no third-party (formerly
// Tabletop Admiral) data lingers on the upgrades.
const load = (f: string) =>
  JSON.parse(readFileSync(join(__dirname, '../public/data', f), 'utf8')) as any[]

describe('catalogue data integrity', () => {
  it('units carry their card-crop portraits (npm run portraits was applied after the last scrape)', () => {
    const units = load('units.json')
    const withPortrait = units.filter((u) => u.portraitImage).length
    // Every unit has a hand-tuned crop in CARD_CROP_PORTRAITS, so all should carry a portrait;
    // a unit lacks one only if it has no entry there (e.g. new after a scrape) or no card scan.
    // A scrape that skips `npm run portraits` nulls every portraitImage — this catches that.
    expect(withPortrait).toBeGreaterThan(150)
    const portrait = (slug: string) => units.find((u) => u.slug === slug)?.portraitImage
    expect(portrait('anakin-skywalker-mounted-jedi-general')).toBe('/images/portraits/anakin-skywalker-mounted-jedi-general.webp')
  })

  it('keeps the owner-maintained keyword tags on upgrades LHQ2 ships empty', () => {
    // These keyword tags read off the physical cards; they used to be filled from a
    // third-party source but are now owner-maintained directly in upgrades.json. Every
    // tag must resolve against the keyword glossary (keywords.json).
    const upgrades = load('upgrades.json')
    const kw = (name: string) => upgrades.find((u) => u.name === name)?.keywords ?? []
    expect(kw('DH-447 Sniper')).toContain('Sniper Team')
    expect(kw('Jetpack Rockets')).toContain('Anti-Materiel')
    expect(kw('Situational Awareness')).toContain('Outmaneuver')
  })

  it('carries owner-maintained upgrade weapon profiles (upgrade-weapons.json), keyed by real slugs', () => {
    const weapons = JSON.parse(readFileSync(join(__dirname, '../public/data/upgrade-weapons.json'), 'utf8')) as Record<string, { name: string; range: number[]; dice: { red: number; black: number; white: number }; keywords: string[] }[]>
    const slugs = new Set(load('upgrades.json').map((u) => u.slug))
    const keys = Object.keys(weapons)
    expect(keys.length).toBeGreaterThan(150)
    // Every keyed slug must exist in the catalogue (no orphans after a re-scrape rename).
    for (const slug of keys) expect(slugs.has(slug), `upgrade-weapons.json slug "${slug}" not in upgrades.json`).toBe(true)
    // Spot-checks verified against the card scans — guards against dice/colour regressions.
    const dice = (slug: string) => weapons[slug]?.[0]?.dice
    expect(dice('the-darksaber')).toEqual({ red: 0, black: 5, white: 0 }) // 5 black (NOT white — the pilot misread)
    expect(dice('z-6-trooper')).toEqual({ red: 0, black: 0, white: 6 })
    expect(dice('dlt-19-stormtrooper')).toEqual({ red: 2, black: 0, white: 0 })
    // Corrected during the full image-verification sweep (source had black/white swapped):
    expect(dice('lightsaber')).toEqual({ red: 2, black: 3, white: 1 })
    expect(dice('the-armorer')).toEqual({ red: 2, black: 0, white: 2 })
    expect(dice('e-5s-b1-battle-droid')).toEqual({ red: 1, black: 0, white: 1 })
    // Every weapon profile has at least one die and a name.
    for (const ws of Object.values(weapons)) for (const w of ws) {
      expect(w.name).toBeTruthy()
      expect(w.dice.red + w.dice.black + w.dice.white).toBeGreaterThan(0)
    }
  })

  it('applies the miniCount corrections (MINICOUNT_OVERRIDES survived the last scrape)', () => {
    const units = load('units.json')
    const mc = (slug: string) => units.find((u) => u.slug === slug)?.miniCount
    // All verified against the card's printed count badge in the full 180-card audit.
    expect(mc('scout-troopers-strike-team')).toBe(1) // not the parent squad's 4
    expect(mc('stormtroopers-heavy-response-unit')).toBe(3) // not 4
    expect(mc('ig-100-magnaguard-prototype-assassin-droids')).toBe(4) // not 3
    expect(mc('clan-wren-veterans')).toBe(4) // not 3
    expect(mc('the-bad-batch-clone-force-99')).toBe(5) // republic, 5 members (badge 0)
    expect(mc('the-bad-batch-clone-force-99-2')).toBe(4) // mercenary, 4 members (badge 0)
  })
})

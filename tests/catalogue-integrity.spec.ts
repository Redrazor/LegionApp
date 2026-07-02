import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { unitMeetsRequirements } from '../src/utils/army.ts'

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
    expect(keys.length).toBeGreaterThan(130) // v2 reconcile dropped ~31 legacy weapon overlays
    // Every keyed slug must exist in the catalogue (no orphans after a re-scrape rename).
    for (const slug of keys) expect(slugs.has(slug), `upgrade-weapons.json slug "${slug}" not in upgrades.json`).toBe(true)
    // Spot-checks verified against the card scans — guards against dice/colour regressions.
    const dice = (slug: string) => weapons[slug]?.[0]?.dice
    expect(dice('the-darksaber')).toEqual({ red: 0, black: 5, white: 0 }) // 5 black (NOT white — the pilot misread)
    expect(dice('z-6-trooper')).toEqual({ red: 0, black: 0, white: 6 })
    expect(dice('dlt-19-stormtrooper')).toEqual({ red: 2, black: 0, white: 0 })
    // Corrected during the full image-verification sweep (source had black/white swapped):
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

  it('restricts the Strike Team sniper heavy weapons to the Strike Team profile only', () => {
    // Rules guard: the four sniper heavy weapons (DLT-19x, DH-447, BX-Series, DC-15x ARC)
    // are exclusive to the 2-mini "Strike Team" profile in the current (v2) game — the
    // full-strength unit that shares the name canNOT equip them. Their requirements must
    // therefore keep the `title: "Strike Team"` criterion; dropping it (e.g. to match an
    // out-of-date 1st-edition source) wrongly opens the sniper to the full unit.
    const upgrades = load('upgrades.json') as Array<{ slug: string; requirements?: unknown[] }>
    const units = load('units.json') as Array<Parameters<typeof unitMeetsRequirements>[0]>
    const pairs: Record<string, string> = {
      'dlt-19x-sniper': 'Scout Troopers',
      'dh-447-sniper': 'Rebel Commandos',
      'bx-series-droid-sniper': 'BX-Series Droid Commandos',
      'dc-15x-arc-trooper-sniper': 'ARC Troopers',
    }
    for (const [slug, name] of Object.entries(pairs)) {
      const up = upgrades.find((u) => u.slug === slug)
      expect(up, `${slug} missing from catalogue`).toBeTruthy()
      const profiles = units.filter((u) => (u as { name: string }).name === name)
      expect(profiles.length, `${name} should have full + Strike Team profiles`).toBe(2)
      for (const unit of profiles) {
        const isStrikeTeam = (unit as { title: string }).title === 'Strike Team'
        expect(
          unitMeetsRequirements(unit, up!.requirements as never),
          `${name} (${(unit as { title: string }).title || 'full'}) equip-eligibility for ${slug}`,
        ).toBe(isStrikeTeam)
      }
    }
  })

  // Mandalorian update (AMG DOC56, June 2026 — Feature 11). The errata-removed cards stay
  // in the catalogue (flagged, shown in Browse) but must never be selectable in Build.
  it('flags exactly the 9 errata-removed upgrades and nothing else', () => {
    const upgrades = load('upgrades.json')
    const removed = upgrades.filter((u) => u.removed).map((u) => u.slug).sort()
    expect(removed).toEqual(
      [
        'bobas-flame-projector',
        'dins-flame-projector',
        'electro-grappling-line',
        'jetpack-rockets',
        'sabines-combat-shield',
        'saxons-combat-shield',
        'saxons-zx-flame-projector',
        'super-commando-combat-shields',
        'super-commando-jetpack-rockets',
      ].sort(),
    )
    // The current Mandalorian-trooper Jetpack Rockets (jetpack-rockets-2) is NOT removed.
    expect(upgrades.find((u) => u.slug === 'jetpack-rockets-2')?.removed).toBeFalsy()
  })

  it('restricts the current Jetpack Rockets away from Mandalorian Initiates', () => {
    const jr = load('upgrades.json').find((u) => u.slug === 'jetpack-rockets-2')
    expect(jr.requirements).toEqual([
      { cardSubtype: 'mandalorian trooper' },
      ['NOT', { cardName: 'Mandalorian Initiates' }],
    ])
  })

  it('keeps the Mandalorian-trooper unit-type errata + Beskad single-red die (Clan Wren v2 card)', () => {
    const units = load('units.json')
    const ut = (slug: string) => units.find((u) => u.slug === slug)?.unitType
    expect(ut('boba-fett-daimyo-of-mos-espa')).toBe('mandalorian trooper')
    expect(ut('gar-saxon-militant-commando')).toBe('mandalorian trooper')
    expect(ut('sabine-wren-explosive-artist')).toBe('mandalorian trooper')
    const weapons = JSON.parse(
      readFileSync(join(__dirname, '../public/data/upgrade-weapons.json'), 'utf8'),
    ) as Record<string, { dice: { red: number; black: number; white: number } }[]>
    // Beskad Duelist (Clan Wren Veterans version, DOC56 UpgradeCards p.23): Vibro Sword, 1 red, Pierce 1.
    expect(weapons['beskad-duelist-2'][0].dice.red).toBe(1)
  })

  it("carries Axe Woves' errata weapon keyword (Lethal 1)", () => {
    const axe = load('units.json').find((u) => u.slug === 'axe-woves-cunning-warrior')
    expect(axe.weapons[0].name).toBe('Vibroknife and Pistol')
    expect(axe.weapons[0].keywords).toContain('Lethal 1')
  })

  // Card-accuracy fixes surfaced by the errata QA pass (matched against the printed cards).
  it('matches the printed Mandalorian cards (QA pass)', () => {
    const upgrades = load('upgrades.json')
    // Ursa Wren upgrade grants Defend 1 (card), not Defend 2.
    const ursa = upgrades.find((u) => u.slug === 'ursa-wren-2')
    expect(ursa.keywords).toContain('Defend 1')
    expect(ursa.keywords).not.toContain('Defend 2')
    // Saxon's Jetpack Rockets is restricted to Gar Saxon, Militant Commando (not Head of Clan Saxon).
    const sjr = upgrades.find((u) => u.slug === 'saxons-jetpack-rockets')
    expect(sjr.requirements).toEqual([{ cardName: 'Gar Saxon', title: 'Militant Commando' }])
  })

  // Feature 12: owner-maintained battle-force doctrines (scrape-proof, overlaid at load).
  it('battle-force doctrines reference real forces, and their effects map to real catalogue slugs', () => {
    const doctrines = JSON.parse(
      readFileSync(join(__dirname, '../public/data/battle-force-doctrines.json'), 'utf8'),
    ) as Record<string, { pick: number; options: { id: string; name: string; text: string; effect?: string }[] }>
    const forceIds = new Set(load('battleForces.json').map((b) => b.linkId))
    const upgradeSlugs = new Set(load('upgrades.json').map((u) => u.slug))
    const unitSlugs = new Set(load('units.json').map((u) => u.slug))

    // Mandalorian Clans is currently the only force with a "Choose N" doctrine.
    expect(Object.keys(doctrines)).toEqual(['mc'])
    const mc = doctrines.mc
    expect(forceIds.has('mc')).toBe(true)
    expect(mc.pick).toBe(2)
    expect(mc.options).toHaveLength(5)
    for (const o of mc.options) {
      expect(o.id && o.name && o.text).toBeTruthy()
    }
    // The computable effects' target slugs must exist (Phase 2 wiring guard).
    expect(upgradeSlugs.has('galaar-15-carbines')).toBe(true) // Veterans
    for (const s of ['flame-projector', 'jetpack-rockets', 'whipcord-launcher']) expect(upgradeSlugs.has(s)).toBe(true) // Tools of the Trade
    for (const s of ['a-a5-speeder-truck-2', 'tx-225-gavw-occupier-tank', 'wlo-5-speeder-tank']) expect(unitSlugs.has(s)).toBe(true) // Guns for Hire
  })

  // Feature 13 (2.0): cards dropped entirely from the app (first-edition v1 cards with no
  // current-edition equivalent). Every slug in dropped.json must still resolve to a real
  // catalogue card — otherwise the drop is a silent no-op (a typo or a renamed slug).
  it('dropped.json slugs all resolve to real catalogue cards', () => {
    const dropped = JSON.parse(
      readFileSync(join(__dirname, '../public/data/dropped.json'), 'utf8'),
    ) as Record<'units' | 'commands' | 'upgrades', string[]>
    const byCat: Record<string, Set<string>> = {
      units: new Set(load('units.json').map((u) => u.slug)),
      commands: new Set(load('commands.json').map((c) => c.slug)),
      upgrades: new Set(load('upgrades.json').map((u) => u.slug)),
    }
    for (const cat of ['units', 'commands', 'upgrades'] as const) {
      for (const slug of dropped[cat] ?? []) {
        expect(byCat[cat].has(slug), `dropped ${cat} slug not in catalogue: ${slug}`).toBe(true)
      }
    }
    // Known first-edition drops (guard against an accidental wipe of the list). the-darksaber-maul
    // is intentionally NOT here — it's a current card kept as an unreleased noImage placeholder.
    expect(dropped.upgrades).toEqual(
      expect.arrayContaining(['at-st-mortar-launcher', 'dc-15-clone-trooper', 'kx-series-security-droids', 'mertalizer', 'r5-astromech-droid', 'rook-kast']),
    )
    // rook-kast (v1 heavy weapon) is dropped, but its v2 replacement rook-kast-2 is NOT.
    expect(byCat.upgrades.has('rook-kast-2')).toBe(true)
    expect(dropped.upgrades).not.toContain('rook-kast-2')
  })

  it('every named Equip keyword resolves to a live (non-dropped) upgrade', () => {
    // Guards the v2 reconciliation: dropping a legacy upgrade must never orphan a unit's
    // mandatory Equip target (e.g. Tagge's "Equip Logistical Prowess"). Slot-type equips
    // ("Equip Doctrine/Armament") name a slot, not a card, so they're excluded.
    const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '')
    const upgrades = load('upgrades.json')
    const slots = new Set(upgrades.map((u) => norm(u.slot)))
    const byName = new Map(upgrades.map((u) => [norm(u.name), u]))
    const dropped = new Set(
      (JSON.parse(readFileSync(join(__dirname, '../public/data/dropped.json'), 'utf8')).upgrades ?? []) as string[],
    )
    for (const u of load('units.json')) {
      for (const kw of (u.keywords ?? []) as string[]) {
        const m = /^equip[:\s]+(.+)$/i.exec(kw)
        if (!m) continue
        for (const t of m[1].split(/,| and /i).map((s) => s.trim()).filter(Boolean)) {
          if (slots.has(norm(t))) continue // slot-type equip, not a named card
          const up = byName.get(norm(t))
          expect(up, `${u.slug}: Equip "${t}" has no catalogue upgrade`).toBeTruthy()
          expect(dropped.has(up!.slug), `${u.slug}: Equip "${t}" (${up!.slug}) is dropped`).toBe(false)
        }
      }
    }
  })

  // Feature 14 — the owner-maintained counterpart overlay. Every key must be a real
  // parent-unit slug and every referenced card scan must exist on disk, else the profile
  // drawer would show a broken image or attach a counterpart to nothing.
  it('counterparts.json keys are real unit slugs with images that exist', () => {
    type CP = { name: string; cardImage: string; frontImage?: string }
    const counterparts = JSON.parse(
      readFileSync(join(__dirname, '../public/data/counterparts.json'), 'utf8'),
    ) as Record<string, CP>
    const slugs = new Set(load('units.json').map((u) => u.slug))
    const publicPath = (p: string) => join(__dirname, '../public', p)

    for (const [parentSlug, cp] of Object.entries(counterparts)) {
      expect(slugs.has(parentSlug), `counterpart parent not in catalogue: ${parentSlug}`).toBe(true)
      expect(cp.name, `counterpart for ${parentSlug} missing a name`).toBeTruthy()
      expect(existsSync(publicPath(cp.cardImage)), `missing counterpart image: ${cp.cardImage}`).toBe(true)
      if (cp.frontImage) {
        expect(existsSync(publicPath(cp.frontImage)), `missing counterpart front image: ${cp.frontImage}`).toBe(true)
      }
    }
    // Lock in the counterparts sourced (guards an accidental wipe of the overlay).
    expect(counterparts['iden-versio-inferno-squad-leader']?.name).toBe('ID10 Seeker Droid')
    expect(counterparts['r2-d2-independent-astromech']?.name).toBe('C-3PO')
    expect(counterparts['r2-d2-hero-of-a-thousand-devices']?.name).toBe('C-3PO')
    expect(counterparts['din-djarin-the-mandalorian']?.name).toBe('Grogu')
  })

  // Feature 15 — the owner-maintained card-flips overlay. Every key must be a real slug in its
  // category and every flip-side scan must exist on disk, else the Flip button shows a broken image.
  it('card-flips.json keys are real slugs with flip-side images that exist', () => {
    type Side = { image: string; label: string; keywords?: string[] }
    const flips = JSON.parse(
      readFileSync(join(__dirname, '../public/data/card-flips.json'), 'utf8'),
    ) as { units: Record<string, Side>; upgrades: Record<string, Side> }
    const publicPath = (p: string) => join(__dirname, '../public', p)

    for (const [cat, file] of [['units', 'units.json'], ['upgrades', 'upgrades.json']] as const) {
      const slugs = new Set(load(file).map((c) => c.slug))
      for (const [slug, side] of Object.entries(flips[cat])) {
        expect(slugs.has(slug), `card-flips ${cat} slug not in catalogue: ${slug}`).toBe(true)
        expect(side.label, `card-flips ${cat}/${slug} missing a label`).toBeTruthy()
        expect(existsSync(publicPath(side.image)), `missing flip image: ${side.image}`).toBe(true)
      }
    }
    // Every unit with a front-art scan should offer a flip.
    expect(Object.keys(flips.units).length).toBeGreaterThan(150)
    // EVERY Reconfigure upgrade is double-sided, so each must carry a flip entry — this is the guard
    // that catches a newly-added reconfigure card whose second config wasn't collected.
    const reconfigure = load('upgrades.json').filter((u) => (u.keywords ?? []).includes('Reconfigure'))
    expect(reconfigure.length).toBeGreaterThanOrEqual(5)
    for (const u of reconfigure) {
      expect(flips.upgrades[u.slug], `Reconfigure upgrade missing a flip side: ${u.slug}`).toBeTruthy()
    }
    // Lock in the collected configs (guards against an accidental wipe / mislabel).
    expect(flips.upgrades['e-11d-focused-fire-configuration']?.label).toBe('Grenade Launcher')
    expect(flips.upgrades['a280']?.label).toBe('Rifle Config')
    expect(flips.upgrades['dc-17m-icws-config']?.keywords).toContain('Impact')
    expect(flips.upgrades['offensive-stance']?.label).toBe('Defensive Stance')
  })
})

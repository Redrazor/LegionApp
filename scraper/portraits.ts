// Self-hosted unit portrait icons — hand-tuned crops from our own card scans.
//
// Our single card-data source (Legion HQ 2) ships full card scans, not bust portraits, and we
// depend on no third-party portrait set. Every unit's round Build badge is a square crop of its
// OWN card scan, hand-tuned per unit (CARD_CROP_PORTRAITS) and centred on the figure's face so the
// badge frames head+shoulders. left/top/size are in the card image's native pixels (sizes vary:
// most scans are 1039×726, some 487×341, etc.). Art is © AMG, covered by the app disclaimer.
//
// Crops regenerate from source on every run, so nothing binary is committed and they survive a
// re-scrape. A unit with no entry here (e.g. a brand-new unit after a scrape) gets
// `portraitImage: null` and the UI shows a neutral "no portrait" silhouette (`UnitBadge.vue`) —
// add a tuned crop to give it a badge.
//
// To tune a crop: preview a candidate region, e.g.
//   node -e 'require("sharp")("public/images/units/<slug>.webp").extract({left,top,width:size,height:size}).resize(160,160).toFile("/tmp/x.webp")'
// then adjust left/top/size until the face is centred.
//
// Run:  npm run portraits        (re-run after a re-scrape; safe + idempotent)

import { mkdir, writeFile, readFile, access, rm } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const UNITS_JSON = join(ROOT, 'public', 'data', 'units.json')
const PORTRAIT_DIR = join(ROOT, 'public', 'images', 'portraits')
const UNIT_IMG_DIR = join(ROOT, 'public', 'images', 'units')

// Hand-tuned portrait crops, keyed by unit slug. Each is a square region (native pixels) of the
// unit's own card scan, centred on the figure's face. One entry per unit in the catalogue.
const CARD_CROP_PORTRAITS: Record<string, { left: number; top: number; size: number }> = {
  "anakin-skywalker-mounted-jedi-general": { left: 338, top: 48, size: 86 },
  "agent-kallus-hunter-of-spectres": { left: 751, top: 100, size: 200 },
  "jyn-erso-stardust": { left: 726, top: 100, size: 180 },
  "arc-troopers-strike-team": { left: 475, top: 65, size: 150 },
  "paz-vizsla-proud-warrior": { left: 351, top: 46, size: 92 },
  "darth-vader-dark-lord-of-the-sith": { left: 727, top: 89, size: 196 },
  "director-orson-krennic-architect-of-terror": { left: 722, top: 94, size: 196 },
  "general-tagge-imperial-high-command": { left: 790, top: 80, size: 190 },
  "general-veers-master-tactician": { left: 742, top: 94, size: 196 },
  "grand-admiral-thrawn-imperial-high-command": { left: 475, top: 62, size: 128 },
  "grand-moff-tarkin-imperial-high-command": { left: 495, top: 58, size: 126 },
  "iden-versio-inferno-squad-leader": { left: 722, top: 94, size: 196 },
  "imperial-officer-ruthless-efficiency": { left: 355, top: 48, size: 96 },
  "moff-gideon-long-live-the-empire": { left: 717, top: 84, size: 196 },
  "darth-vader-the-emperors-apprentice": { left: 780, top: 80, size: 155 },
  "fifth-brother-the-kill-is-mine": { left: 717, top: 99, size: 196 },
  "imperial-agent-bringing-order-to-the-galaxy": { left: 380, top: 48, size: 96 },
  "seventh-sister-compelled-to-inflict-pain": { left: 717, top: 89, size: 196 },
  "df-90-mortar-trooper": { left: 840, top: 185, size: 170 },
  "shoretroopers": { left: 730, top: 80, size: 190 },
  "snowtroopers": { left: 725, top: 100, size: 185 },
  "stormtrooper-riot-squad": { left: 720, top: 160, size: 185 },
  "stormtroopers": { left: 810, top: 90, size: 185 },
  "stormtroopers-heavy-response-unit": { left: 690, top: 115, size: 175 },
  "imperial-death-troopers": { left: 720, top: 115, size: 190 },
  "imperial-probe-droid": { left: 465, top: 95, size: 155 },
  "imperial-special-forces": { left: 717, top: 110, size: 190 },
  "imperial-special-forces-inferno-squad": { left: 720, top: 110, size: 190 },
  "scout-troopers": { left: 725, top: 80, size: 185 },
  "74-z-speeder-bikes": { left: 715, top: 108, size: 190 },
  "dewback-rider": { left: 690, top: 70, size: 210 },
  "e-web-heavy-blaster-team": { left: 717, top: 99, size: 196 },
  "range-troopers": { left: 717, top: 99, size: 196 },
  "scout-troopers-strike-team": { left: 525, top: 85, size: 120 },
  "at-st": { left: 715, top: 110, size: 195 },
  "imperial-dark-troopers": { left: 705, top: 75, size: 215 },
  "laat-le-patrol-transport": { left: 720, top: 130, size: 260 },
  "major-marquand-tempest-scout-2": { left: 757, top: 99, size: 196 },
  "tx-225-gavw-occupier-tank": { left: 700, top: 75, size: 120 },
  "gar-saxon-head-of-clan-saxon": { left: 300, top: 35, size: 78 },
  "rook-kast-devoted-to-the-cause": { left: 315, top: 40, size: 78 },
  "sabine-wren-back-in-the-fold": { left: 308, top: 55, size: 80 },
  "super-commandos": { left: 340, top: 45, size: 72 },
  "black-sun-vigo": { left: 700, top: 80, size: 210 },
  "bo-katan-kryze-savior-of-mandalore": { left: 352, top: 42, size: 90 },
  "c-3p0-golden-god": { left: 700, top: 60, size: 210 },
  "gar-saxon-militant-commando": { left: 730, top: 80, size: 210 },
  "logray-superstitious-shaman": { left: 720, top: 110, size: 180 },
  "mandalorian-leader": { left: 355, top: 75, size: 90 },
  "pyke-syndicate-capo": { left: 730, top: 70, size: 210 },
  "the-armorer-forging-the-future": { left: 348, top: 38, size: 96 },
  "ursa-wren-leader-of-clan-wren": { left: 276, top: 36, size: 86 },
  "wicket-hero-of-bright-tree": { left: 727, top: 99, size: 196 },
  "axe-woves-cunning-warrior": { left: 348, top: 34, size: 96 },
  "boba-fett-infamous-bounty-hunter": { left: 765, top: 100, size: 175 },
  "boba-fett-daimyo-of-mos-espa": { left: 700, top: 120, size: 185 },
  "bossk-trandoshan-terror": { left: 775, top: 105, size: 175 },
  "cad-bane-needs-no-introduction": { left: 817, top: 95, size: 170 },
  "din-djarin-the-mandalorian": { left: 300, top: 26, size: 86 },
  "han-chewie-notorious-scoundrels": { left: 398, top: 92, size: 88 },
  "hondo-ohnaka-trustworthy-compatriot": { left: 256, top: 40, size: 78 },
  "ig-11-nurse-and-protect": { left: 767, top: 108, size: 150 },
  "ig-88-notorious-assassin-droid": { left: 737, top: 105, size: 150 },
  "mandalorian-hunter": { left: 318, top: 66, size: 92 },
  "maul-a-rival": { left: 767, top: 100, size: 165 },
  "savage-opress-mauls-enforcer": { left: 325, top: 42, size: 92 },
  "the-bad-batch-clone-force-99-2": { left: 810, top: 120, size: 165 },
  "black-sun-enforcers": { left: 760, top: 135, size: 170 },
  "ewok-skirmishers": { left: 815, top: 185, size: 150 },
  "mandalorian-initiates": { left: 360, top: 40, size: 88 },
  "mandalorian-warriors": { left: 360, top: 38, size: 88 },
  "pyke-syndicate-foot-soldiers": { left: 800, top: 115, size: 175 },
  "weequay-pirates": { left: 490, top: 75, size: 126 },
  "clan-kryze-veterans": { left: 390, top: 40, size: 92 },
  "clan-wren-veterans": { left: 768, top: 185, size: 170 },
  "ewok-slingers": { left: 770, top: 175, size: 175 },
  "mandalorian-super-commandos": { left: 700, top: 75, size: 175 },
  "mandalorian-warriors-fire-support": { left: 710, top: 100, size: 175 },
  "swoop-bike-riders": { left: 780, top: 118, size: 165 },
  "a-a5-speeder-truck-2": { left: 690, top: 280, size: 185 },
  "chewbacca-let-the-wookiee-win": { left: 760, top: 150, size: 196 },
  "wlo-5-speeder-tank": { left: 470, top: 90, size: 150 },
  "han-solo-unorthodox-general": { left: 727, top: 72, size: 175 },
  "lando-calrissian-canny-general": { left: 773, top: 95, size: 165 },
  "leia-organa-fearless-and-inventive": { left: 790, top: 95, size: 196 },
  "luke-skywalker-hero-of-the-rebellion": { left: 790, top: 90, size: 196 },
  "luke-skywalker-commander-skywalker": { left: 478, top: 45, size: 125 },
  "rebel-officer-fighting-for-freedom": { left: 545, top: 80, size: 150 },
  "ahsoka-tano-fulcrum": { left: 760, top: 85, size: 196 },
  "cassian-andor-capable-intelligence-agent": { left: 760, top: 80, size: 196 },
  "chewbacca-walking-carpet": { left: 763, top: 85, size: 155 },
  "han-solo-reluctant-hero": { left: 505, top: 62, size: 130 },
  "k-2so-sardonic-security-droid": { left: 740, top: 60, size: 196 },
  "luke-skywalker-jedi-knight": { left: 745, top: 75, size: 196 },
  "r2-d2-hero-of-a-thousand-devices": { left: 755, top: 80, size: 196 },
  "rebel-agent-defender-of-democracy": { left: 545, top: 62, size: 130 },
  "sabine-wren-explosive-artist": { left: 772, top: 82, size: 165 },
  "fleet-troopers": { left: 782, top: 84, size: 158 },
  "mark-ii-medium-blaster-trooper": { left: 790, top: 70, size: 175 },
  "rebel-troopers": { left: 760, top: 75, size: 185 },
  "rebel-veterans": { left: 730, top: 140, size: 185 },
  "guerilla-troopers": { left: 346, top: 40, size: 86 },
  "mandalorian-resistance": { left: 735, top: 105, size: 185 },
  "mandalorian-resistance-clan-wren": { left: 755, top: 100, size: 185 },
  "rebel-commandos": { left: 760, top: 90, size: 185 },
  "rebel-sleeper-cell-ready-to-strike": { left: 758, top: 235, size: 150 },
  "wookiee-warriors-freedom-fighters": { left: 730, top: 85, size: 165 },
  "wookiee-warriors-kashyyyk-resistance": { left: 840, top: 140, size: 185 },
  "14-fd-laser-cannon-team": { left: 730, top: 160, size: 185 },
  "at-rt": { left: 725, top: 70, size: 170 },
  "rebel-commandos-strike-team": { left: 470, top: 78, size: 140 },
  "tauntaun-riders": { left: 717, top: 99, size: 196 },
  "a-a5-speeder-truck": { left: 720, top: 170, size: 230 },
  "t-47-airspeeder": { left: 730, top: 150, size: 230 },
  "x-34-landspeeder": { left: 740, top: 140, size: 185 },
  "ahsoka-tano-padawan-commander": { left: 760, top: 110, size: 185 },
  "anakin-skywalker-the-chosen-one": { left: 780, top: 95, size: 180 },
  "chewbacca-hero-of-kashyyyk": { left: 698, top: 125, size: 190 },
  "clone-captain-rex-honorable-soldier": { left: 720, top: 75, size: 185 },
  "clone-commander-trained-for-leadership": { left: 730, top: 110, size: 190 },
  "clone-commander-cody-leader-of-the-212th": { left: 770, top: 90, size: 185 },
  "jedi-knight-mounted-jedi-general": { left: 340, top: 62, size: 90 },
  "jedi-knight-general-strong-in-the-force": { left: 805, top: 90, size: 185 },
  "ki-adi-mundi-jedi-council": { left: 350, top: 55, size: 92 },
  "mace-windu-jedi-council": { left: 348, top: 55, size: 92 },
  "obi-wan-kenobi-civilized-warrior": { left: 770, top: 140, size: 200 },
  "wookiee-chieftain-clan-leader": { left: 725, top: 120, size: 215 },
  "yoda-grand-master-of-the-jedi-order": { left: 760, top: 120, size: 200 },
  "jedi-knight-keeper-of-the-peace": { left: 795, top: 185, size: 200 },
  "padme-amidala-spirited-senator": { left: 760, top: 90, size: 190 },
  "plo-koon-jedi-council": { left: 340, top: 46, size: 80 },
  "r2-d2-independent-astromech": { left: 725, top: 135, size: 200 },
  "shaak-ti-jedi-council": { left: 342, top: 35, size: 95 },
  "the-bad-batch-clone-force-99": { left: 825, top: 135, size: 200 },
  "clone-trooper-infantry": { left: 740, top: 100, size: 200 },
  "clone-trooper-marksmen": { left: 468, top: 78, size: 125 },
  "arc-troopers": { left: 720, top: 100, size: 200 },
  "arf-troopers": { left: 512, top: 98, size: 125 },
  "wookiee-warriors-kashyyyk-defenders": { left: 705, top: 80, size: 160 },
  "wookiee-warriors-noble-fighters": { left: 775, top: 160, size: 195 },
  "at-rt-2": { left: 790, top: 100, size: 175 },
  "barc-speeder": { left: 855, top: 160, size: 170 },
  "clone-commandos": { left: 760, top: 115, size: 200 },
  "clone-commandos-delta-squad": { left: 720, top: 125, size: 200 },
  "raddaugh-gnasp-fluttercraft": { left: 790, top: 210, size: 175 },
  "raddaugh-gnasp-fluttercraft-attack-craft": { left: 790, top: 210, size: 175 },
  "infantry-support-platform": { left: 800, top: 160, size: 190 },
  "laat-le-patrol-transport-2": { left: 790, top: 140, size: 180 },
  "saber-class-tank": { left: 821, top: 110, size: 160 },
  "count-dooku-darth-tyranus": { left: 760, top: 120, size: 200 },
  "general-grievous-sinister-cyborg": { left: 720, top: 120, size: 220 },
  "general-grievous-wheel-bike-warlord": { left: 879, top: 125, size: 155 },
  "kalani-super-tactical-droid": { left: 740, top: 100, size: 190 },
  "kraken-super-tactical-droid": { left: 720, top: 110, size: 200 },
  "poggle-the-lesser-public-leader-of-the-geonosians": { left: 760, top: 110, size: 200 },
  "super-tactical-command-droid-command-and-control-droid": { left: 750, top: 60, size: 180 },
  "t-series-tactical-droid-programmed-for-strategy": { left: 765, top: 100, size: 200 },
  "asajj-ventress-separatist-assassin": { left: 765, top: 58, size: 180 },
  "maul-impatient-apprentice": { left: 793, top: 58, size: 175 },
  "savage-opress-dookus-apprentice": { left: 292, top: 30, size: 90 },
  "sun-fac-ruthless-lieutenant": { left: 762, top: 135, size: 160 },
  "super-tactical-command-droid-auxiliary-command-droid": { left: 778, top: 88, size: 175 },
  "b1-battle-droids": { left: 825, top: 92, size: 155 },
  "b2-super-battle-droids": { left: 828, top: 92, size: 140 },
  "geonosian-warriors-soldiers-of-the-hive": { left: 790, top: 228, size: 125 },
  "geonosian-warriors-geonosian-engineers": { left: 500, top: 82, size: 130 },
  "bx-series-droid-commandos": { left: 744, top: 108, size: 145 },
  "drk-1-sith-probe-droids": { left: 770, top: 225, size: 150 },
  "ig-100-magnaguard": { left: 753, top: 100, size: 148 },
  "ig-100-magnaguard-prototype-assassin-droids": { left: 820, top: 58, size: 140 },
  "tsmeu-6-wheel-bikes": { left: 455, top: 75, size: 170 },
  "bx-series-droid-commandos-strike-team": { left: 495, top: 70, size: 131 },
  "droidekas": { left: 285, top: 55, size: 115 },
  "dsd1-dwarf-spider-droid": { left: 660, top: 230, size: 300 },
  "lm-432-crab-droid": { left: 530, top: 150, size: 160 },
  "stap-riders": { left: 700, top: 115, size: 190 },
  "aat-battle-tank": { left: 730, top: 130, size: 280 },
  "aqua-droids": { left: 505, top: 75, size: 130 },
  "persuader-class-tank-droid": { left: 740, top: 130, size: 290 },
  "persuader-class-tank-droid-prototype-tank-droid": { left: 720, top: 140, size: 270 },
}

interface OurUnit { slug: string; name: string; title: string; portraitImage: string | null }

async function exists(p: string) {
  try { await access(p); return true } catch { return false }
}

// Crop a unit's badge from its card scan. Returns true if written.
async function cropPortrait(slug: string, c: { left: number; top: number; size: number }): Promise<boolean> {
  const src = join(UNIT_IMG_DIR, `${slug}.webp`)
  if (!(await exists(src))) {
    console.warn(`  ! crop skipped, missing card scan: ${slug}.webp (run a scrape first)`)
    return false
  }
  const img = sharp(src)
  const { width = 0, height = 0 } = await img.metadata()
  let { left, top, size } = c
  // Clamp so the region never runs off the card edge.
  size = Math.min(size, width, height)
  left = Math.max(0, Math.min(left, width - size))
  top = Math.max(0, Math.min(top, height - size))
  await img
    .extract({ left, top, width: size, height: size })
    .resize(40, 40)
    .webp({ quality: 82 })
    .toFile(join(PORTRAIT_DIR, `${slug}.webp`))
  return true
}

async function main() {
  await mkdir(PORTRAIT_DIR, { recursive: true })
  const ours: OurUnit[] = JSON.parse(await readFile(UNITS_JSON, 'utf8'))

  let cropped = 0, noCrop = 0
  const withPortrait = new Set<string>()
  const limit = 8
  for (let i = 0; i < ours.length; i += limit) {
    await Promise.all(ours.slice(i, i + limit).map(async (u) => {
      const c = CARD_CROP_PORTRAITS[u.slug]
      if (c && (await cropPortrait(u.slug, c))) {
        withPortrait.add(u.slug)
        cropped++
      } else {
        // No tuned crop (or missing scan) → ensure no stale portrait lingers for deploy.
        await rm(join(PORTRAIT_DIR, `${u.slug}.webp`), { force: true })
        noCrop++
      }
    }))
  }

  // Stamp portraitImage onto units.json (null = UI shows the "no portrait" indicator).
  for (const u of ours) u.portraitImage = withPortrait.has(u.slug) ? `/images/portraits/${u.slug}.webp` : null
  await writeFile(UNITS_JSON, JSON.stringify(ours, null, 2) + '\n')

  console.log(`Portraits: ${cropped} hand-tuned crops written; ${noCrop} units without a crop (show the "no portrait" indicator).`)
}

main().catch((e) => { console.error(e); process.exit(1) })

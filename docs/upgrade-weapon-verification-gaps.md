# Upgrade-weapon verification gaps — PENDING QUALITY PASS

**Status: open / revisit later.** During the full image-verification sweep of
`public/data/upgrade-weapons.json` (Feature 10 Phase B, v1.15.0) every weapon-bearing
upgrade was read against its card scan. 25 dice errors in the structured source were found
and fixed (mostly black↔white swaps). The entries below are the **~12 that could NOT be
independently confirmed** at the 800px scan resolution — the black-vs-white diamond is
genuinely ambiguous on these cards. They are currently left at the **source value** (which
may be right or wrong) and should be re-verified against higher-res scans or the physical
cards in a future quality pass.

## How to resolve
- Pull a higher-resolution scan (or check the physical card) and read the dice diamonds.
- Rule of thumb confirmed during the sweep: **number of diamonds on the weapon row = number
  of distinct dice colours**; red is unambiguous; the hard call is black (dark fill) vs white
  (pale fill). Crit/Impact/Pierce keywords and ranges in the data are already correct.
- Edit `public/data/upgrade-weapons.json` directly (owner-maintained) and update the
  `tests/catalogue-integrity.spec.ts` guards if a flagged value changes.

## Entries to re-verify (current source value)

| slug | current value | why flagged |
|---|---|---|
| `dh-447-sniper` | DH-447 Sniper Rifle — 0r/1b/2w | snow/grey card, 2-die b/w ambiguous |
| `dlt-19x-sniper` | DLT-19x Sniper Rifle — 0r/1b/2w | snow/grey card, 2-die b/w ambiguous |
| `bx-series-droid-sniper` | BX Sniper Rifle — 0r/1b/2w | grey card, 2-die b/w ambiguous |
| `dc-15x-arc-trooper-sniper` | DC-15x Sniper Rifle — 0r/1b/2w | desert card, 2-die b/w ambiguous |
| `flametrooper` | Flamethrower — 0r/1b/0w | single pale diamond, b vs w unclear |
| `emp-droid-poppers` | EMP Droid Poppers — 0r/1b/0w | single pale diamond, b vs w unclear |
| `sonic-imploders` | Sonic Imploder — 0r/1b/0w | single pale diamond, b vs w unclear |
| `tristan-wren` | Tristan's Blaster — 0r/2b/0w | single grey diamond, b vs w unclear |
| `micro-grenade-launcher` | Micro-Grenade Launcher — 0r/1b/2w | grey card, 2-colour b/w split unclear |
| `mpl-57-barrage-trooper` | Scatter Gun — 0r/1b/2w | grey card, 2-colour b/w split unclear |
| `a280` | A280 Pistol 2r/1b/0w ; A280 Rifle 1r/1b/0w | low-res two-config composite thumbnail |
| `e-11d-focused-fire-configuration` | Focused Fire 0r/1b/0w ; Grenade Launcher 1r/0b/0w | low-res two-config composite thumbnail |

> Also note `dc-15-clone-trooper` (DC-15 Clone Trooper, 2r/0b/0w) has **no card scan on
> disk**, so its value is unverifiable from images — restore/obtain the scan to confirm.

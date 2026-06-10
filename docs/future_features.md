# Future Features

A running log of features for LegionApp, newest first.

## Feature 1 — Mandalorians as a faction

**Status:** in progress (branch `feature/mandalorian-faction`)

Promote `mandalorians` from a folded-into-mercenary alias to a first-class 6th
faction, matching Legion HQ 2's source key and AMG's June 2026 Mandalorian Battle
Force release.

- Stop folding `mandalorians → mercenary` in `scraper/normalise.ts`; add it to
  `FACTIONS`, the `Faction` type, `FACTION_META`/`FACTION_ORDER`, and a theme
  colour token (amber). Re-scrape + reseed.
- Browse/Build/Collection/Reference pick it up automatically (they iterate
  `FACTION_ORDER`).

### Deliberately out of scope (follow-up)

The Mandalorian **Battle Force** specifics are not modelled yet:

- Recon-level (600pt) army format and clan-trait selection.
- Mandalorian units that can ally as **Mercenaries** into Rebels/Republic — for
  now `army.ts` treats Mandalorians as a normal standalone faction (a pure
  Mandalorian list is single-faction legal; mixing flags as multi-faction).

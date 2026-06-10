# Future Features

A running log of features for LegionApp, newest first.

## Feature 3 — Dice roller

**Status:** in progress (branch `feature/dice-roller`)

Port ShatterApp's dice roller, adapted to Legion's dice. A new `/roll` route +
nav tab with two tabs: an interactive **Roller** and a Monte-Carlo
**Probability** calculator.

- **Dice model** (`utils/dice.ts`, pure + tested): three attack d8 colours
  (Red 5/1/1/1, Black 3/1/1/3, White 1/1/1/5 — Hit/Crit/Surge/Blank) and two
  defense d6 colours (Red 3/1/2, White 1/1/4 — Block/Surge/Blank). `resolveCombat`
  applies the surge charts and modifiers and returns wounds.
- **Surge** is per-side (unit cards convert surges differently): attack surge →
  Crit / Hit / None, defense surge → Block / None.
- **Modifiers** modelled: Aim (reroll up to 2 blanks per token), Pierce (cancel
  blocks), Cover & Dodge (cancel hits, never crits). Order: surges → cover →
  dodge (hits) → blocks → pierce → `wounds = max(0, hits+crits − blocks)`.
- **Probability** (`utils/diceProb.ts`): simulates a mixed pool with all of the
  above (Aim played greedily), 50k rolls, P(≥ n wounds) table + mean.
- **UI:** `DieFace.vue` renders the new Legion symbols as colour-aware SVGs;
  `DiceColumn.vue` (per-colour steppers + surge/mods), `DiceRoller.vue` (duel
  result + persisted history), `ProbabilityCalculator.vue`.

### Deliberately out of scope

The multiplayer half of ShatterApp's roller (`DicePanel`, `rollSession` store,
`useDiceRoom` socket sync) is not ported — it's bound to the Play feature, which
is still scaffolding here. The roller is solo-only for now.

## Feature 2 — Collection: real product boxes

**Status:** in progress (branch `feature/collection-real-catalog`)

Replace the synthetic one-expansion-per-unit Collection with the **real AMG
product catalogue**, each box showing box art, the EAN/UPC, and an outbound store
link.

- **Source:** Philibert (`philibertnet.com`) SW:Legion category listing — the only
  reachable structured source (AMG's own store is Akamai-blocked). Gives box art
  (self-hosted to `public/images/products/<ean>.jpg`, git-ignored), the EAN
  (embedded in the product URL = AMG/Asmodee barcode), faction (category) and title.
- **Pipeline:** `scraper/products.ts` (pure: parse → faction → title-match unit
  membership → dedupe FR/EN) + hand curation in `scraper/product-curation.ts`
  (`EXCLUDE` card/upgrade/foam packs & FR dups, `RENAME` to English, `CONTENTS`
  for boxes whose title names no unit). `Product` gains `ean`/`storeUrl`/`image`;
  schema + seed + route + `CollectionView` updated.
- **Box contents** aren't on Philibert detail pages (only counts), so multi-unit
  box contents (starters, army boxes, Heroes/Leaders packs, Officer&Agent variant
  cards) were researched from AMG/retailer/Wookieepedia and hand-curated.

### Known limitation

Philibert doesn't stock every unit's box, so **~43 units have no product** and
aren't trackable in Collection (real-boxes-only, no synthetic fallback — by
request). Mostly operative/character packs and vehicles (Cad Bane, Bossk, Asajj,
Jedi Council operatives, LAAT/Persuader). A second source or hand-added entries
could close the gap later.

## Feature 1 — Mandalorians as a faction

**Status:** done (v0.3.0)

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

# Future Features

A running log of features for LegionApp, newest first.

## Feature 5 — Full battle-force support (all factions)

**Status:** planned (not started). Deferred from the 2026-06-13 Mandalorian validation work, where
only the **Mandalorian Clans** battle force was handled — and only its Corps-min override.

**Problem.** Battle forces are alternative army-building rules that replace the standard rank table and
restrict eligible units. Today we model exactly ONE, by accident of the data model: LHQ2 ships
**Mandalorian Clans** as its own faction (`mandalorians`), so it flows into our catalogue as a normal
buildable army. Every other battle force — **Blizzard Force, Echo Base Defenders, Bright Tree Village,
Shadow Collective**, the Separatist/Republic ones, etc. — sits *underneath* a parent faction in LHQ2
(pick faction → battle-force dropdown). Our scraper never extracts those, so they aren't selectable and
none of their rules exist. Even for Mandalorians we only did the rank override, skipping `countMercs`
and the affiliation-cohesion rule.

**Scope (single source of truth = LHQ2 bundle).**
- **Scrape battle-force definitions** from the LHQ2 bundle (the `faction`/`linkId` BF objects already
  found at research time): rank tables (per format), eligible-unit lists, `unitLimits`, `countMercs`,
  affiliation/cohesion rules, `plainTextRules`. Emit `public/data/battleForces.json`. Run order
  `scrape → … → seed`. Keep card DATA LHQ2-only (see `data-source-single-truth`).
- **Battle force becomes a first-class concept**, not a faction alias. A **selector in Build**
  (faction → optional battle force, since they're a layer below faction). `Army` gains an optional
  `battleForce` id.
- **Validation driven by BF data**, replacing the hard-coded `BATTLE_FORCE_RANKS` override in
  `factions.ts`: per-BF rank table, per-BF unit eligibility, `countMercs` (no merc caps; mercs satisfy
  minimums), affiliation-cohesion ("all units share an affiliation with a fielded Commander/Operative"),
  and the **`Special Issue`** keyword (already in `keywords.json`: *"This unit may only be included in X
  battleforce"*) gating units to their BF.
- **Migrate the existing Mandalorian Clans handling** onto this system (retire the bespoke `MANDO_CLANS`
  set / `isMandalorianClanUnit` / the `corps:{min:2}` override once the data-driven path covers them).

**Effort:** multi-cycle. Pure logic + scraper + a UI selector + a real data-model addition. Pairs with
EPIC D/E of Feature 4 but is independent of them.

## Feature 4 — Build section redesign ("Roster Canvas")

**Status:** in progress — see the full plan in `docs/Build Section Development.md` (Epics A–F).

A multi-feature rebuild of the Build tab into the core army-list builder: permanent rank-tracker
footer, always-visible catalogue, tap-to-add, render-time `×N` quantities, inline-expand unit detail +
slot-filtered upgrade attach, command-hand + battle-deck builders, print/share/Longshanks export, and an
**Army Stats analytics panel**. Multi-format (Recon 600 / Standard 800 / Standard 1000 / Grand Army 1600).

> **Scope change (2026-06-13):** EPIC F **drag-and-drop dropped** (no longer fits the tap-first catalogue)
> and replaced by **F1 — Army Stats panel**: a full statistics breakdown of the built list (dice pool by
> colour + expected hits/crits via the dice engine, defence-die mix, durability/effective-HP, points-by-rank
> and other graphs, keyword tallies, mobility/morale). See `docs/Build Section Development.md` EPIC F.

Sub-features ship one per `/workflow` cycle:

- **A1 — Format + multi-size rank limits** (branch `feature/build-format-rank-limits`, v0.6.0). `FORMATS`
  table + `rankLimits(cap)` (clamp-to-bracket) replaces the constant rank limits; `validateArmy` +
  BuildView consume it; default new army = Standard 1000. Corrects the pre-2024 "800/500" assumption.
- **A2 — Build-time keyword rules** (branch `feature/build-keyword-rules`). Pure logic in `utils/army.ts`,
  surfaced via the existing validation checklist (plus a one-line BuildView "+ Add" gating fix for
  Entourage): **Field Commander** (0 commanders legal with the
  keyword), **Entourage** (`"Entourage X"` widens X's rank max +1), **Detachment** (`"Detachment X"` needs
  a parent unit/rank present), and **limited cards** — the source's `uniqueCount` caps 16 non-unique
  upgrades at 2 (HQ Uplink, Jedi Training family, …); `Upgrade.limit` now flows through scrape → seed →
  API and folds into the Uniques check.
- **A4 — Upgrade eligibility** (branch `feature/upgrade-eligibility`, done as a side cycle ahead of A3).
  The Browse profile's "Available Upgrades" and Build's upgrade picker now only show upgrades a unit can
  legally equip. The legionhq2 source's structured `requirements` (on 364/413 upgrades) + unit `affiliation`
  were being dropped by `normalise.ts`; both now flow scrape → seed → API. Pure `unitMeetsRequirements`
  matcher in `utils/army.ts` (AND/OR/NOT groups, nested; `forceAffinity` via a hand-set `FORCE_SIDE` list,
  fail-open).
- **A3 — Mercenary affiliation counting** (branch `feature/mercenary-counting`). Pure logic via the
  validation checklist: a `mercenary` unit is legal only if the army faction is among its `affiliations`
  (new **Allies** item); mercenaries capped at ≤2 Corps / ≤1 of each other rank (**Mercenaries** item,
  `MERC_RANK_CAP`); and they don't satisfy rank minimums (no-min — min measured against non-merc counts).
  Carried the dropped plural `affiliations` array onto `Unit` (scrape → seed → API). **Epic A (rules) is
  now complete.** Next: the Roster Canvas UI epics — B1 (layout shell) → B2 (rank-tracker footer) → B3
  (always-visible catalogue) → C1.

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

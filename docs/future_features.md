# Future Features

A running log of features for LegionApp, newest first.

> **Status: 1.0 LAUNCHED (2026-06-15)** — live at https://www.legion-app.com (Vercel SPA + Firebase
> image CDN + Render API; see Feature 6). SEO/social/sitemap + Vercel Web Analytics done (Feature 7).

## Roadmap (post-1.0, priority order)

1. **Play tab** — the big open feature. Live at-the-table tracker (wounds, suppression, tokens, command
   pips, order pool, battle deck) + real-time multiplayer via room codes. socket.io + `server/rooms.ts`
   are scaffolded; this is the main reason the Render backend exists.
2. **Launch loose ends** — reverse ShatterApp→Legion footer link (edit + deploy in `../ShatterApp`);
   asset kit (3 screenshots + a build→validate→share GIF); post the `community/` launch copy.
3. **Feature 5 — full battle-force support** (all factions) — see below; still planned.
4. **Brand polish** — a real logo to replace the placeholder "L" mark.

## Backlog — owner-specified (2026-06-15)

Three features the owner detailed post-launch. B2/B3 are blocked on a curated upgrade-effects
data layer (see notes). Priority among the three: TBD by owner.

### B1 — Complete keyword tooltip coverage

**Goal:** every keyword shown anywhere has a tooltip describing what it does.

**Audit (2026-06-15, `npm run audit:keywords`):** 368 distinct keywords used, **63 have no
tooltip**. Full triaged list in `docs/keyword-tooltip-gaps.md`. The 63 split four ways:
- **A. Real keywords missing a definition** (Transport×21, Prepared Position×14, Overwhelm×13,
  Reliable, Sniper Team, Weak Point, Mobile, Strafe, Primitive, Shields, …) — need official rules
  text. **Source it** (newer Electrynth `keywords.js` / LegionHQ glossary / the rules reference) or
  the owner provides text. This is the core of the request.
- **B. Affiliation/special-issue strings** mis-stored in `keywords[]` ("Mercenary Rebels",
  "Special Issue Tempest Force", …) — **filter out** in `normalise.ts`; not tooltip candidates.
- **C. Card-specific named abilities** ("This is the Way", "Victory or Death", …) — effect text is
  card-only; show "see card" rather than a universal glossary entry.
- **D. Parsing artifacts** — two keywords concatenated ("…Steady", "…Aim 2"); split in the scraper.

**Work:** fix B/D classification at the data layer; source A's text into `keywords.json`; decide C's
UX. Re-run `npm run audit:keywords` after a scrape to keep it at zero.

### B2 — Upgrades that modify the unit profile (granted slots & keywords) in Build

When an equipped upgrade **grants a new upgrade slot**, the Build roster must add that slot to the
unit's `upgradeBar` live (and allow filling it). When an upgrade **grants keywords** to the unit,
those keywords must appear on the Build "inspect" profile **in a distinct colour** so they read as
upgrade-added, not innate.

> **⚠ Data blocker — needs a new curated layer.** This behaviour is encoded in upgrade **effect
> text**, which per `CLAUDE.md` exists **nowhere as structured data** (LHQ2 + TTA `text` both null).
> An upgrade's `keywords[]` are its *own* keywords, with no flag for "grants this slot/keyword to the
> equipping unit." So B2 requires a hand-maintained map: `upgrade → { grantsSlots: [...], grantsKeywords: [...] }`.
> Build then merges these into the unit's slot bar + keyword list (tagged "from upgrade") reactively.

### B3 — Explicit model (mini) count, adjusted by upgrades

A unit added to a list should clearly show its **number of models/minis**. Upgrades that **add a
mini** to the unit increase that count (and the unit's effective wounds / attack dice etc. scale
with it); an upgrade that **replaces** a mini does not; an upgrade that adds **X** minis adds X.

> **⚠ Data blocker — needs a new curated layer.** Units have **no `miniCount` field** today (stats
> are per-mini), and upgrades have no "adds/replaces N minis" data (again, effect-text only). B3
> requires: (a) a base mini count per unit, and (b) per-upgrade mini delta (`+N` / `replace` / `none`).
> Both must be curated (or sourced) before the UI aggregation can be built.

**Note:** B2 and B3 share the same root — both need a small **owner-curated data layer** for
upgrade effects, since the card effect text isn't scrapeable. Worth designing that layer once
(e.g. `public/data/upgrade-effects.json`, keyed by upgrade slug) and serving both features.

---

## Feature 7 — SEO, social share cards & launch comms

**Status:** done (v1.1.0). Made the app discoverable + shareable at every level: full Open Graph + Twitter
Card + canonical + JSON-LD (`WebApplication`) base tags in `index.html`, per-route `useHead`
(Browse/Build/Collection/Reference/Roll/Play), and per-unit `useHead` on `/browse/:slug` whose
`og:image` is the unit's **own Firebase card scan** (rich per-unit previews, no serverless function).
Added a generated 1200×630 `public/og-image.png` (`npm run og`), `public/robots.txt`, and a
build-time `public/sitemap.xml` (`npm run generate:sitemap`, wired into `build`; 179 units + static
routes). Also modernised the `community/` launch copy — corrected formats (Standard **1000** / Recon
**600**, not the old 800/500), the real `www.legion-app.com` domain, and the current feature set
(command hand, battle deck, export/import).

## Feature 6 — 1.0 release (Vercel + Firebase + Render deployment)

**Status:** done (v1.0.0). The first public deployment. Three hosts:

- **Vercel** — the Vue SPA + the committed `public/data/*.json` catalogue. SPA rewrite in
  `vercel.json`. Build-time env (`VITE_API_BASE`, `VITE_IMAGE_BASE`, `VITE_WS_URL`) set in the
  Vercel dashboard (see `.env.production.example`).
- **Firebase Hosting** (`legionapp-images`) — the 105 MB of card scans, compressed to ~52 MB WebP
  (`npm run images:compress` → `images-compressed/`, deployed with `npm run images:deploy`). The app
  rewrites `/images/...` paths to the CDN via `src/utils/imageUrl.ts` (`VITE_IMAGE_BASE`); empty base =
  local `public/images`. Output lives at repo root (not under `public/`) so Vite never bundles it.
- **Render.com** (`legionapp-api`) — the Express API + socket.io (`render.yaml`). Stateless: SQLite
  reseeds from `public/data` on boot. The SPA falls back to static JSON, so a cold/absent backend
  doesn't break Browse/Build/Collection/Reference. (Play, which needs the socket server, ships later.)

Also: generated the missing PWA install icons from `public/favicon.svg` (`npm run icons` →
`public/icons/`), and made the service worker cross-origin aware (precache JSON only; runtime-cache
images by request destination). Runbook: `community/RELEASE-1.0-CHECKLIST.md`.

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

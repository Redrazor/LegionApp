# Future Features

**This is the single canonical tracker for LegionApp's roadmap and shipped features.** Record every new
feature idea here, and mark it shipped (with the version + PR) when it lands. The open queue is the one
numbered list under "Roadmap — open items"; everything completed is logged in the **Feature 1–7** and
**Completed backlog** sections below (newest first) plus the in-app changelog (`ChangelogModal.vue`).

> **Status: shipped through v1.7.0** (prod auto-deploys on every push to `main`; live at
> https://www.legion-app.com — Vercel SPA + Firebase image CDN + Render API). 1.0 launched 2026-06-15
> (Feature 6); SEO/social/sitemap + Vercel Web Analytics done (Feature 7). The Build "Roster Canvas"
> rebuild (Feature 4, A–F) and full battle-force support (Feature 5) are both fully delivered.

## Roadmap — open items (single priority list)

The one reference for everything still open, highest priority first. Done work is logged in the
**Feature 1–7** sections below and the in-app changelog; the older "B1–B6" backlog IDs are mapped into
this list (and their detailed write-ups are kept further down for reference).

1. **Play tab** — the big open feature. A live at-the-table tracker (wounds, suppression, tokens, command
   pips, order pool, battle deck) + real-time multiplayer via room codes. socket.io + `server/rooms.ts`
   are scaffolded and the `/play` route ships a "Coming Soon" placeholder (`src/views/PlayView.vue`), but
   `socket.io-client` is not yet wired into the SPA — no tracker/multiplayer UI exists. The main reason
   the Render backend exists.
2. **Launch loose ends** — an asset kit (3 screenshots + a build→validate→share GIF). (The reverse
   ShatterApp→Legion footer link is already DONE — `src/App.vue` footer.)
3. **Protect curated data from re-scrape** _(was B5)_ — `npm run scrape` still overwrites curated
   `keywords.json` wholesale (and drifts `products.json`); add a tracked overrides file merged in at write
   time so curation survives automatically. Self-contained scraper tech-debt fix. Detail below under **B5**.
4. **Two remaining shown-as-text battle-force flags** — `minOneOfEachCorps` (Imperial Remnant; must field
   at least one of each Corps type) and `take2NonEwokRebs` (Bright Tree Village) are still surfaced as
   rule text, not auto-validated. The rest of the battle-force rule set is now enforced (see "Recently
   shipped" below). Low priority — both are single-battle-force niceties.
5. **Upgrade-weapon dice verification pass** _(Feature 10 Phase B follow-up)_ — ~12 grey/low-res upgrade
   cards whose black-vs-white dice couldn't be confirmed at scan resolution are left at source value.
   Re-verify against higher-res scans / physical cards. Full list: `docs/upgrade-weapon-verification-gaps.md`.
6. **Flip double-sided cards** _(owner-requested during Feature 13 P2)_ — a **Flip** button beside Select
   in the card inspect view that shows the card's other side (persisted per card): unit stats↔art (the
   Feature 13 P2 `-front` art files), and Reconfigure upgrades like the E-11D config (Focused Fire ↔
   Grenade Launcher). See **Feature 15** below.
7. **Counterpart unit cards** _(surfaced during Feature 13 P2)_ — model the **Counterpart** mechanic: some
   units deploy with a second mini that has its OWN card (e.g. Iden Versio's **ID10 Seeker Droid**,
   Bossk's, etc.). The catalogue has no slug for these, so their card scans currently can't be attached.
   Collect the counterpart cards (the Iden ID10 faces are already staged at
   `scraper/amg-cards/units/empire/DOC51_GalacticEmpire_Units-p10-10.webp` / `-p10-11.webp`) and attach
   them to their parent unit's profile via a `counterpart` field. See **Feature 14** below.
8. **Card legality catalogue** _(owner-requested 2026-07-02)_ — a fully searchable reference of every unit,
   upgrade and command that tells you at a glance whether each card is **legal to field** (released, not
   errata-removed, and — for a chosen faction/format — buildable). Extends the existing Browse tab. The
   community has no single place for this. See **Feature 18** below.

**Recently shipped (was on this list):**
- ✅ **Recon format support** (`feature/recon-format-support`, was open item 10) — the Recon (600 pt) build was
  already validated correctly (points + rank table); the missing piece was the **fixed Recon Battle Cards set**.
  Added the 9 Recon card images (cropped from the Recon PDF), a read-only **Recon Battle Cards** tab in Build
  (with a format explainer + tap-to-zoom) shown in place of the Standard deck-builder, and print integration.
  A full read of the Recon PDF confirmed the earlier-speculated command-hand/duplicate/restricted-unit changes
  **don't exist** — dropped. See **Feature 20** below.
- ✅ **Browse command cards & upgrades** (v1.9.0, was B6) — Browse gained **Commands** and **Upgrades**
  sections beside Units, navigated by a segmented tab header as separate sub-routes (`/browse/commands`,
  `/browse/upgrades`) with their own `:slug` card-scan lightbox drawers (`CardLightbox`). Commands group by
  faction (pip-sorted), upgrades by slot (cost-sorted); each section has free-text name search, a
  faction/slot filter, and an **explicit "filter by character"** dropdown (commander/operative) that narrows
  to that character's cards — commands via `commandMatchesCharacter`, upgrades via a `cardName` requirement
  match (`upgradeForCharacter`). All filter/group logic is pure + tested in `src/utils/browse.ts`. No data
  or scraper changes — the existing `byCommander` / `requirements` plumbing already supported it.
- ✅ **Battle-force follow-ups** (v1.8.0) — completed the three Feature 5 remnants. `validateArmy` now
  honours **`countMercs`** (battle forces with it let mercenaries count toward rank minimums uncapped;
  the rest apply the per-rank merc caps + no-min inside the battle force too); the bespoke `MANDO_CLANS` /
  `isMandalorianClanUnit` path was **retired** — a `mandalorians` army now defaults to the data-driven
  **Mandalorian Clans** battle force (`defaultBattleForceId`), so clan-native units, `countMercs`, and
  cohesion all flow from the BF data; and the **affiliation-cohesion** rule is implemented as an
  auto-derived `validateArmy` check (`affiliationCohesionIssues`) faithful to the printed rule — every
  unit must share an affiliation with a fielded **Commander/Operative**, so mixed-clan armies are legal
  (each clan brings its own leader). A unit's affiliation is its chosen clan — generic `Mandalore` units
  (Warriors/Initiates) pick a clan by equipping a **clan-slot upgrade** (`CLAN_UPGRADE_AFFILIATION` →
  `effectiveAffiliation`), so a clan-assigned generic is held to that clan while an unassigned one (and
  affiliation-less detachments) are always allowed. No picker/UI or army-state field — the allowed clans
  are read from the commanders/operatives you field (per AMG's Mandalorian transmissions). The two flags
  above were de-scoped to remain shown-as-text.
- ✅ **Brand logo** (v1.7.1) — the placeholder "L" was replaced with an original battle-station-style orb
  mark across the nav, favicon, PWA install icons and the OG share card (`public/favicon.svg`,
  `src/App.vue` nav, `scripts/generate-og.ts`).

## Completed backlog — owner-specified (2026-06-15)

The owner detailed B1–B6 post-launch. **DONE:** B1 keyword tooltips (v1.2.1, PRs #33/#34); B2 granted
slots/keywords + B3 model counts (v1.4.0, PR #38 — the presumed "data blocker" didn't exist: LHQ2 carries
`additionalUpgradeSlots` on upgrades and `stats.minicount` on units, so no curated layer was needed); B4
configurable print (v1.6.0, PR #43); **B6 Browse commands & upgrades (v1.9.0)**. **Still open:** B5 →
roadmap item 3. The B-numbered write-ups below are retained as reference detail.

### B1 — Complete keyword tooltip coverage ✅ DONE (v1.2.1, PRs #33 + #34)

**Goal:** every keyword shown anywhere has a tooltip describing what it does.

**Outcome (`npm run audit:keywords`):** 368 distinct keywords used, **365 resolve** — down from
63 missing → 33 → **3 intentional non-keywords**. Two levers got there:
- A smarter resolver (`src/utils/keywords.ts`) peels value/qualifier forms back to the base entry
  ("Weak Point 1: Rear" → Weak Point, "Mercenary Rebels" → Mercenary). Adding the **base** glossary
  entries then auto-resolves the old scraper-concatenation artifacts via whole-word-prefix match
  ("Eyes on the Prize Steady" → Eyes on the Prize, "Associate Anakin Skywalker" → Associate) — so
  groups B/D never needed a `normalise.ts` data-layer fix.
- Official definitions sourced into `keywords.json` for every real keyword (2024 + 2025 rulebook
  glossaries and verified card/forum text): Transport, Overwhelm, Prepared Position, Sniper Team,
  Shields, Strafe, Mobile, Vaapad/Shien Mastery, Anti-Materiel, … plus card-specific abilities
  (This is the Way, Victory or Death, Interrogate, Hold the Line, …).

**Residual 3 — intentional, render no tooltip by design** (allowlisted; do NOT invent text):
`Dodge` (a token term), `Ranged` (a `Sidearm` attack-type qualifier LHQ2 split out), and
`Pull The Strings Empire Trooper` (Tarkin card-specific ability; text lives on the card).

**Regression guard:** `tests/keywords.spec.ts` loads the real catalogue and fails if a future
scrape introduces an unresolved keyword outside the 3-term allowlist. Re-run
`npm run audit:keywords` after a scrape; full detail in `docs/keyword-tooltip-gaps.md`.

### B2 — Upgrades that modify the unit profile (granted slots & keywords) in Build ✅ DONE (v1.4.0, PR #38)

When an equipped upgrade **grants a new upgrade slot**, the Build roster adds that slot to the unit's
bar live (and lets you fill it; removing the granter prunes the slot + anything in it). Upgrade-granted
**keywords** show on the Build "inspect" profile **in the holo accent colour** so they read as
upgrade-added, not innate.

> **Resolved — no curated layer needed.** The presumed data blocker was wrong. LHQ2 upgrade cards
> carry `additionalUpgradeSlots` (25/418 grant a slot: comms/training/gear/command/force/programming/
> heavy weapon); the scraper just never extracted it. Now mapped → `Upgrade.grantedSlots`.
> `effectiveUpgradeBar(unit, bf, equipped, upgradesById)` appends granted slots; `pruneOrphanedUpgrades`
> (fixpoint) drops equips whose slot vanished. Granted keywords reuse the upgrade's own `keywords[]`,
> surfaced via `UnitProfile`'s `grantedKeywords` prop + `KeywordPill variant="granted"`.

### B3 — Explicit model (mini) count, adjusted by upgrades ✅ DONE (v1.4.0, PR #38)

A built list shows its total **model/mini count** (footer + Army Stats panel). Each unit contributes
its printed mini count; equipped **heavy weapon / personnel** upgrades add +1 each (the standard
mini-adding slot types).

> **Resolved — base count is real data.** LHQ2 carries `stats.minicount` on every unit (180/180);
> now mapped → `Unit.miniCount`. Pure `unitModelCount` / `armyModelCount` in `army.ts`. The "adds a
> mini" delta has no explicit LHQ2 flag, so `upgradeMinisAdded` resolves it as: a curated count for
> the 16 "Squad" personnel upgrades (`UPGRADE_MINIS_ADDED`, keyed by slug — read from the cards, since
> they add a whole squad, e.g. Stormtrooper Squad +5, B1 Battle Droid Squad +7, Weequay Pirate +3),
> else **+1** for any other heavy weapon / personnel upgrade (verified: DLT-19 Stormtrooper, Comms
> Technician each "Add 1 …"), else 0. A new Squad upgrade must be added to the map or it under-counts.
> Replace/+X distinctions aren't modelled (no data); revisit if needed.
>
> **Base-count caveat:** LHQ2's `stats.minicount` is wrong for a few units (a "Strike Team" detachment
> can inherit its parent squad's count, e.g. Scout Troopers Strike Team → 4 when the card shows 1; The
> Bad Batch ships as 0). `normalise.ts` `MINICOUNT_OVERRIDES` (keyed by slug, verified against the card
> art) corrects them; `catalogue-integrity.spec.ts` guards the values across re-scrapes.

### B4 — Configurable print: opt-in sections via checkboxes ✅ DONE (v1.6.0, PR #43)

**Goal:** before printing an army, let the user pick how much detail goes on the printout via a set
of checkboxes. Each ticked option appends another section to the print output, so a player can print
anything from a one-page roster up to a full at-the-table packet (roster + reference sheets + every
card to proxy).

**Where:** extends the existing print flow — `printSheet()` → `window.print()` in
`src/views/BuildView.vue`, rendering `src/components/build/PrintSheet.vue` (a print-only,
black-on-white sheet Teleported to `<body>`; the print stylesheet in `style.css` hides `#app` and
shows `.print-sheet`). Today it prints the roster (units, upgrades, points, activations) plus the
battle-deck **names**. B4 adds a print-options panel (e.g. a small popover/dialog off the Print
button) whose state drives which `PrintSheet` sections render.

**Options (each a checkbox; each adds a section):**
1. **Command Deck Reference** — compact textual list of the army's command cards (name + pips, and
   rules text where we have it) for quick lookup.
2. **Battle Deck Reference** — compact textual list of the battle deck (already grouped primary →
   secondary → advantage); optionally with objective/rules summaries.
3. **All Unit Cards** — full card scan images for every unit in the list (proxy/print-and-play),
   from `public/images/units/…` via `imageUrl()`.
4. **All Upgrade Cards** — full card scan images for every equipped upgrade.
5. **Command Deck** — full card scan images of the command cards (the deck itself, to cut out).
6. **Battle Deck** — full card scan images of the battle-deck cards.

> **Distinction:** *Reference* options (1–2) are compact text summaries; *Cards/Deck* options (3–6)
> are full-bleed card **images** laid out for printing/proxying. Roster sheet stays the default (no
> checkbox needed — always printed).

**Notes / unknowns:**
- **Command-deck data:** the army's command cards must be available on the sheet. Confirm `ArmySheet`
  carries command-card refs (it carries `battleDeck`; check whether command cards are modelled in the
  builder yet — may need to surface them from the army state first).
- **Image-heavy print:** options 3–6 emit many full-size images — needs a print-friendly grid
  (e.g. 2×N per page, page-break rules) and graceful handling of missing scans / `overrides`.
- **Rules text for references:** unit/upgrade effect text isn't scrapeable (see B2/B3); command &
  keyword text we partly have. Reference sections should degrade to name-only where text is absent
  rather than block the option.
- Persist the user's last-used selection (localStorage) so a re-print doesn't re-tick every box.

### B5 — Stop `npm run scrape` from wiping curated `keywords.json`

**Problem:** `scrape.ts` `main()` does `fetchKeywords()` → `writeJson('keywords.json', keywords)`,
**overwriting** `public/data/keywords.json` wholesale with the upstream Electrynth glossary
(~169 entries). That silently discards the hand-curated tooltip definitions built up across the
1.2.x keyword work (~205 entries — the official rules text for Anti-Materiel, Overwhelm, Sniper
Team, the card-specific abilities, etc.). Today the only safeguard is remembering to
`git checkout HEAD -- public/data/keywords.json` after every scrape (which is how the foot-Grievous
fix in 1.2.2 avoided regressing it). Same fragility hits `products.json` (Philibert re-fetch drift).

**Goal:** curated keyword definitions survive a scrape automatically.

**Approach:** keep a tracked **curated overrides** file (e.g. `public/data/keywords.overrides.json`)
holding only the hand-authored entries, and have `writeJson('keywords.json', …)` write the
**merge** of upstream ⊕ overrides (overrides win on key collisions). Then a scrape refreshes upstream
text without ever dropping curation. Move the ~36 curated-only entries into the overrides file as the
one-time migration; `scripts/audit-keywords.ts` keeps verifying coverage.

> Until this lands, **always** `git checkout HEAD -- public/data/keywords.json public/data/products.json`
> after `npm run scrape` unless you explicitly intend to refresh them.

---

### B6 — Browse Command cards & Upgrades (+ filter by commander/operative)

**Goal:** the Browse tab currently browses **Units** only. Add two more browsable card
types — **Command cards** and **Upgrades** — each its own section, with a search bar that, in
addition to free-text name search, lets you type a **commander/operative's name** to filter the
list down to just that character's associated cards (their command cards; upgrades restricted to
them).

**Where / current shape (verified):**
- `src/views/BrowseView.vue` lists units grouped by faction via the `useSearch()` composable
  (`src/composables/useSearch.ts` — `filters`/`filtered`/`grouped`), rendering `UnitCard.vue` in a
  responsive grid. The `/browse/:slug` child route (`src/router/index.ts`) opens
  `components/browse/UnitProfile.vue` (Teleported drawer, slide transition).
- **Command data** already supports this: `CommandCard` has `commander: string | null`
  (`types/index.ts`), the `commands` store exposes a **pre-computed `byCommander` Map**
  (`stores/commands.ts`), and `commandCommanders(card)` (`utils/army.ts`) splits multi-name cards.
  Generic/faction cards have `commander: null`. Images: `/images/commands/<slug>.webp`.
- **Upgrade data**: `Upgrade.requirements` (`UpgradeRequirementList`) can carry a `cardName`
  criterion tying an upgrade to a named unit; `unitMeetsRequirements(unit, reqs)` (`utils/army.ts`)
  already matches it (`matchCriterion` tests `cardName`). Images: `/images/upgrades/<slug>.webp`.
  Reusable thumb: `components/build/UpgradeThumb.vue`.

**Approach (proposed — confirm at kickoff):**
1. **Browse section switcher** — a segmented toggle in the Browse header: `[Units] [Commands] [Upgrades]`
   (default Units). Keep faction grouping per section; commands also sort by pip, upgrades by slot.
2. **Pure filter logic in `utils/` + specs** — extend/clone the search predicate so it covers each
   card type. The headline behaviour: when the query matches a fielded **commander/operative name**,
   show only that character's cards. For Commands: `commandsStore.byCommander` (case-insensitive,
   multi-name via `commandCommanders`). For Upgrades: an upgrade is "associated with" a unit when
   `unitMeetsRequirements(thatUnit, upgrade.requirements)` is true AND the requirement names that
   unit (i.e. a `cardName` criterion matches) — so generic upgrades aren't swept in. Free-text name
   search still works alongside.
3. **Card grid + profile drawer per type** — reuse the `UnitCard` grid pattern for `CommandCard.vue`
   / `UpgradeCard.vue` browse tiles (card image + fallback text, pip badge for commands, slot/cost
   for upgrades). Tap → a profile/lightbox view of the full card scan (commands/upgrades have no
   stat block, just the card image + keyword tooltips, like the Build inspect gallery).
4. **Routing/SEO** — extend `/browse` with a section query or sub-routes (`/browse/commands`,
   `/browse/upgrades`) and `:slug` drawers for each; add titles/canonicals like the unit profile.

**Decisions to settle at kickoff:** segmented toggle vs separate routes for the three sections;
whether "filter by commander" is automatic (detect when the query resolves to a commander/operative
name) or an explicit mode/chip; how to present generic (commander-less) command cards and
unrestricted upgrades when no character filter is active.

---

## Feature 20 — Recon format support (fixed Recon Battle Cards set)

**Status:** SHIPPED (`feature/recon-format-support`). Owner-requested 2026-07-02.

**Key finding (the scope was much smaller than first assumed).** A full read of the **Recon Rulebook PDF**
(DOC13, eff. 2025-04-30) confirmed Recon "follows all the rules of a standard game … with the following
exceptions", and there are only three, of which just one needed new work:
- **Points cap 600** — already enforced via `Army.gameSize`.
- **Rank composition** (Commander **exactly 1**, Operative 0–1, Corps 2–4, Special 0–2, Support 0–2, Heavy
  0–1) — already enforced; the `recon` entry in `FORMATS` (`src/utils/factions.ts`) is an **exact match** to
  the PDF, applied through `rankLimits(cap)`.
- **Battle Cards** — Recon uses **one fixed, shared set** of 9 cards (3 Primary + 3 Secondary + 3 Advantage),
  drawn at the table; you do **not** build a deck, and Standard battle cards can't be used in Recon (and vice
  versa). This is the piece that was missing a surface. (`usesBattleDeck(600)` already correctly disables the
  Standard deck-builder and its validation; `battleCardEligible` already excludes `isRecon` cards from
  Standard decks; the 9 Recon cards were already in `battleCards.json` as `isRecon: true` with `-2` slugs.)

The earlier draft of this feature also speculated a **smaller command hand**, **duplicate/unique-limit
changes**, and **Recon-restricted units** — the PDF has **none of those** (command hand is built normally;
uniques/duplicates unchanged; no unit is Recon-illegal). Those were dropped. Deployment / Prepared Positions /
round timing / objective scoring are gameplay, not list-building → future **Play tab** (roadmap item 1).

**What shipped:**
- **9 Recon battle card images** cropped from DOC13 (pages 5–6) → `public/images/battle/{slug}-2.webp`
  (owner-maintained, per [[extract-from-card-images-not-scraping]]). Primaries keep the map+rules at their
  native tall ratio (726×2079); secondary/advantage at 726×1040.
- **Read-only Recon Battle Cards panel** (`src/components/build/ReconBattleCardsView.vue`) shown in the Build
  "Recon" tab in place of the Standard deck-builder (`BuildLayout` gains `hasReconCards`; the `battle` pane
  hosts either view; tab relabels **Deck → Recon**). Grouped Primary/Secondary/Advantage, tap-to-zoom
  (self-contained full-card overlay, since the rules text lives on the image), with a short **Recon format
  explainer** (600 pts, 3′×3′, fixed set, tighter ranks).
- **Print integration** — `buildArmySheet` populates the sheet's `battleDeck` from the fixed Recon set in
  Recon (new `isReconDeck` flag drives labels: "Recon Battle Cards" vs "Battle Deck"); `PrintOptionsModal`
  relabels the two battle-card options in Recon and enables them (they'd been gated on the Standard deck).
- **Pure + tested** — `reconBattleCardGroups(cards)` (`utils/army.ts`) returns the `isRecon` cards grouped
  in canonical subtype order, name-sorted; specs cover it + the `buildArmySheet` Recon path.

**Deliberately not done (confirmed unnecessary by the PDF):** command-hand resizing, duplicate/unique-limit
changes, per-unit Recon legality. If AMG later publishes a Recon ban list, that would ride the **Feature 18**
legality plumbing, not this feature.

---

## Feature 19 — Competitive (errata) points costs + Build casual/competitive toggle

**Status:** ❌ PARKED (owner decision 2026-07-02) — the premise doesn't hold.

**Why parked (investigated at kickoff):** the feature assumed the catalogue holds the *printed card*
("casual") cost and we'd overlay the *competitive* errata on top. The reverse is true — **the LHQ2
catalogue already holds the current tournament/competitive points** (verified against AMG's April 2026
update: Pyke Syndicate Capo 42, Maul A Rival 130, The Bad Batch 150, Rebel Commandos 42, Wookiee Warriors
62 — all the *post*-update values). So there is nothing to layer on for "competitive"; it's already the
default. Flipping it (Competitive = catalogue default, **Casual = original as-printed cost**) would need a
whole *original-printed-cost* dataset, which is the hard, opposite dataset. And in Star Wars: Legion there
is **no official "casual points" format** — tournament points *are* the points everyone uses; the printed
value is just outdated. Net: low value, high data cost. Owner chose to park it rather than build.

**If ever revived:** the only tractable version is a "points-update history" overlay — model the *latest*
AMG Points Adjustments deltas (old→new, ~15–20 cards from the one doc) and let Build toggle to the
pre-update values / badge changed cards. That's a different, smaller feature than the one below and would
need the AMG Points Adjustments doc as its source. The original casual/competitive design is retained below
for reference only.

---

**Original design (obsolete — retained for reference):**

**Goal:** AMG periodically issues a **points-adjustment errata** that re-costs units and upgrades for
competitive/tournament play while the printed card cost stays the "casual" value. Build should let the
player choose which costing to use and recompute **every** points total live:
- a **casual** mode = the printed card cost (today's behaviour, unchanged), and
- a **competitive** mode = the errata-adjusted cost.

**Source of truth (per the image/PDF directive, [[extract-from-card-images-not-scraping]]):** the AMG
**Points Errata / Balance Update** document (e.g. the current `Points Adjustments` PDF). Transcribe the
deltas verbatim as **owner-maintained** data — do NOT scrape and do NOT overwrite the LHQ2 catalogue cost.
Only cards whose cost changed appear in the errata; everything else uses its printed cost.

**Where:**
- **Data (scrape-proof):** an owner-maintained `public/data/points-errata.json` keyed by slug, e.g.
  `{ units: { "darth-vader": 205 }, upgrades: { "hunter": 22 } }` — the **competitive** cost only (absolute
  value, so a re-scrape that changes the printed cost can't silently corrupt the delta). Kept SEPARATE from
  `units.json` / `upgrades.json` for the same reason `upgrade-weapons.json` is separate. Include a small
  `meta` block (errata document name + effective date) to show provenance in-app. The `units` / `upgrades`
  stores overlay it at load (like the `upgrade-weapons.json` overlay), exposing e.g.
  `Unit.competitiveCost?: number` / `Upgrade.competitiveCost?: number` (absent ⇒ same as printed).
- **Costing:** thread a **costing mode** through the single cost path so there is exactly one source of
  truth. `unitCost` (`utils/army.ts`) already centralises unit+upgrade summation; give it (and `armyPoints`,
  `doctrineUpgradeCost`, the rank-budget helpers) a `costing: 'casual' | 'competitive'` input that picks
  `competitiveCost ?? cost` per card. Doctrine discounts (Feature 12) still apply on top of whichever base
  is chosen. Keep it pure + tested — a spec that asserts the same army totals differently under each mode.
- **State + share:** add `costing` to `Army` (default `'casual'`), and bump the versioned share-code
  serializer so a shared list round-trips its mode (an army costed competitively must reopen competitively,
  or its legality vs. the 600/1000 cap changes).
- **UI:** a **Casual / Competitive** segmented toggle in the Build header near the points cap, with a small
  "as of <errata date>" note and a subtle indicator on any unit/upgrade whose cost the errata changed (so
  the player can see *what* moved). The footer points total, per-rank budgets, over-cap validation and the
  print/share output all follow the chosen mode automatically because they read the one cost path.

**Notes / edge cases:**
- Some errata adjust **upgrade** costs, not just units — the overlay must cover both (hence the split
  `units` / `upgrades` maps).
- The over-points validation (`validateArmy`) compares against `gameSize`; nothing there changes except the
  numbers it sums — competitive costing can push a previously-legal list over cap, which is correct.
- If AMG ever issues errata that *removes* or *restricts* a card (not just re-costs it), that is the
  **Feature 18** `removed` / legality plumbing, not this feature — keep the two concerns separate.

**Decisions to settle at kickoff:** default mode (recommend **casual** to preserve current behaviour);
whether to also show *both* costs side-by-side on a card, or only the active one; whether the toggle is
per-army (stored on `Army`, recommended) or a global app preference.

---

## Feature 18 — Card legality catalogue (searchable "is this card valid?" reference)

**Status:** queued. Owner-requested 2026-07-02 ("the community really needs something like this").

**Goal:** a fully **searchable catalogue of every unit, upgrade and command** that tells the player, at a
glance, whether each card is **currently legal to field** — and *why not*, when it isn't. There is no single
public place today that answers "is this card still legal?"; this makes LegionApp that reference.

**What "valid / legal" means (the legality signals — all already partly modelled):**
- **Released vs. preview** — `Unit.unreleased` / `Upgrade.unreleased` / `CommandCard.unreleased` (a note
  string set from `public/data/unreleased.json`): a pre-release/preview card, not yet tournament-legal.
- **Errata-removed** — `Upgrade.removed?: boolean` (Feature 11) already flags cards pulled from play; extend
  the same flag to units/commands if AMG removes any. These stay visible but are never Build-selectable.
- **Format legality** — with a chosen **format** (Recon 600 / Standard 1000 / …) and optionally a
  **faction**, a card is "buildable" only if it passes the rank/faction/format gates already computed in
  `utils/army.ts` (`unitAllowedInFaction`, `catalogueForRank`, `rankLimits`) and the Feature 20 Recon
  restrictions. So the catalogue can answer "legal in Recon?" and "legal for the Empire?" per card.
- **Requirement-gated** — an upgrade legal only on a named character (its `requirements` / `cardName`), a
  detachment that needs its parent, a unit locked behind a battle force. Surface *why* a card is
  conditionally legal, reusing `unitMeetsRequirements` and the battle-force pool logic.

**Where (extends Browse, not a new tab):** the Browse tab already ships the three searchable sections
(`/browse`, `/browse/commands`, `/browse/upgrades`) with faction/slot grouping, free-text name search and a
by-character filter (Feature B6 / v1.9.0, `src/composables/useSearch.ts` + `src/utils/browse.ts`). This
feature adds a **legality layer** on top:
- **Per-card legality badge** on every Browse tile + profile drawer: e.g. ✔ *Legal* / ⚠ *Preview
  (unreleased)* / ⛔ *Removed by errata* / *Legal only for <faction>* / *Requires <character>*. Pure resolver
  `cardLegality(card, ctx)` in `src/utils/browse.ts` (or a new `utils/legality.ts`), fully unit-tested,
  returning a status enum + human reason so both the badge and any tooltip read from one place.
- **Legality filters** in the Browse header: a **format** picker (reuses `FORMATS`) and a **faction** filter,
  plus quick toggles like *Hide unreleased* / *Hide errata-removed* / *Tournament-legal only*. With a format
  + faction chosen the catalogue becomes a live "what can I actually field?" list.
- **Deep-linkable** — each card's `/browse/...:slug` drawer already has a canonical URL; the legality state
  is derived from the (optional) format/faction query params so a player can share "here's the card and it's
  legal in Standard-Empire" as a link. Good for the community-reference goal + SEO.

**Data:** no new sourcing needed for the core — the legality signals already exist (`unreleased`, `removed`,
`requirements`, faction, rank, battle-force pools). New data only if AMG maintains an explicit
**tournament-legal card list / ban list** distinct from the above; if so, capture it as an owner-maintained
`public/data/legality.json` overlay (same ethos as the other owner-maintained overlays), keyed by slug.

**Decisions to settle at kickoff:** whether "legal" defaults to *any format* (a card is legal if legal in at
least one) or requires the user to pick a format first; how to present a card that is legal in Standard but
not Recon (badge vs. only-when-format-chosen); whether commands get the same removed/unreleased treatment as
units/upgrades; and whether this ships alongside Feature 20 (which supplies the Recon legality inputs) or
before it (degrading to release/errata legality only until Recon restrictions land).

---

## Feature 17 — Print list refinements (per-card keywords + primary-objective fit)

**Status:** SHIPPED v2.1.0 (`feature/print-list-refinements`). Owner-requested 2026-07-02.

**What shipped:**
- **Per-card keyword reference.** When the Print Options include *both* "Keyword reference" and
  "Unit cards", the army-wide alphabetical Keyword Reference section is suppressed and each unit's
  own keywords (unit + weapon, resolved to glossary text, alphabetised) print beside its card in the
  Unit Cards section (card left ~46%, keywords right). Printing the reference *without* unit cards
  keeps the alphabetical list exactly as before. A unit's per-card list also folds in keywords
  granted by its **equipped upgrades** (e.g. Tactical from a training), flagged `fromUpgrade` and
  rendered italic with a "from upgrade" tag (an intrinsic keyword is never flagged, even if an
  upgrade also grants it).
- **One unit card per page when its reference is long.** Each per-card block is `break-inside: avoid`,
  so a long keyword list flows that unit onto its own page instead of clipping; short lists still
  pack two per page.
- **Primary objectives fit A4.** Primary objective scans fold the deployment "map" into a tall
  (726×1422) card that clipped in the 2-up grid. They now print one-per-page, height-capped
  (`.ps-tall-card { max-height: 250mm }`) to the full A4 sheet; secondary/advantage cards keep the
  compact 2-up grid. Added an explicit `@page { size: A4; margin: 10mm }` for deterministic geometry.
- **Impl:** `ArmySheetCard.keywords?` + `unitCardKeywords()` (pure, tested) in `utils/army.ts`;
  `distinctCards()` stamps unit cards via a `keywordsFor` resolver; template changes in
  `PrintSheet.vue`; print CSS in `style.css`.

## Feature 16 — Mandatory-equip keyword validation (+ Tarkin keyword fix)

**Status:** SHIPPED v1.30.0 (`feature/mandatory-equip-keywords`). Surfaced by owner 2026-06-30 while
reviewing what the Build validator does and doesn't enforce.

**What shipped:**
- **Mandatory-equip enforcement** — a new pure `mandatoryEquipUnmet` (`utils/army.ts`) generalises the
  existing Heavy Weapon Team check to the other slot-based mandatory-equip keywords, blocking the army as
  illegal until satisfied:
  - `Equip <slot>[, <slot>…]` → one upgrade in each named slot type (Imperial/Rebel Officer & Agent →
    Doctrine; Mandalorian Leader/Hunter & Jedi Knight → Armament + Doctrine; Super Tactical Droid → Doctrine).
  - `Programmed` → ≥1 Programming upgrade (IG-11, DSD1, Crab Droid, Persuader).
  - `Flexible Response N` → ≥N Heavy Weapon upgrades (Stormtroopers 2).
  - Wired into both the footer checklist (`validateArmy`, new **Equip** row) and the per-unit card
    indicator (`unitLegalityIssues` → `Needs <Slot>`).
- **Satisfiability guard** — a requirement is only enforced when the unit's printed upgrade bar can
  actually fulfil it, so a catalogue data gap never permanently bricks a unit. This deliberately skips
  **Guerilla Troopers** (`Flexible Response 2` but 0 Heavy Weapon slots in its bar — a data bug to fix
  separately).
- **Tarkin keyword fix** — Grand Moff Tarkin's keyword was stored as the LHQ2 misspelling
  `"Pull The Strings Empire Trooper"`, which matched no glossary entry, so the app showed no rules text.
  Corrected in `units.json` to the qualified `"Pulling the Strings: Empire Trooper"` (verified against his
  card scan), which resolves via the resolver's colon-qualifier path. Removed the now-stale entry from the
  keyword guard's `KNOWN_UNRESOLVED` allowlist (`scraper/keywords.ts`) + the catalogue-coverage test so the
  guard is strict for it again. **Re-scrape caveat:** a future LHQ2 scrape would re-introduce the
  misspelling — re-apply this fix (same class as the owner-maintained upgrade-keyword tags).

**Deliberately out of scope (→ Feature 14 Counterpart):** name-token Equips, where the listed upgrades are
specific counterpart cards rather than slot types — The Bad Batch (`Equip Hunter, Wrecker, Echo, Tech`),
Imperial Special Forces (`Del Meeko, Gideon Hask`), General Tagge (`Logistical Prowess`), Cassian Andor
(`A280`), Clone Commandos (`Katarn Pattern Armor`), Mandalorian Resistance (`Tristan Wren, Ursa Wren`).
Several have real edge cases (5 names for 4 slots; Wren upgrades need a Personnel slot the unit lacks) that
need the counterpart model. The validator ignores name-tokens entirely until then.

**Pulling the Strings** itself is a gameplay card-action, not an army-building rule — no build logic needed
beyond making its text display.

---

## Feature 15 — Flip double-sided cards

**Status:** queued (owner-requested during Feature 13 P2, 2026-06-18). Not started. This is the
"future feature" the Feature 13 P2 **unit front-art** capture was for.

Several Legion cards are double-sided with BOTH sides meaningful, and the app currently only ever
shows one image per card:
- **Unit cards** — a stats/play side and an art side. Feature 13 P2 now stores both
  (`units/<slug>.webp` + `units/<slug>-front.webp`, files-only, no data field yet).
- **Reconfigure upgrades** — one physical card, two configs you flip between in-game. E.g. the E-11D
  config (Imperial Death Troopers): **Focused Fire** (⚁1-4 Suppressive) ↔ **Grenade Launcher**
  (⚁1-2 Blast). The catalogue models only the Focused Fire slug; the Grenade Launcher side is already
  staged at `scraper/amg-cards/upgrades/empire/DOC51_GalacticEmpire_Upgrades-p11-22.webp`.
- **Reconfigure upgrades — GENERIC flip cards found during P7a (2026-06-21):** the generic Training
  upgrade **Offensive Stance ↔ Defensive Stance** is one double-sided card (both faces read "it may flip
  this card"; Aim side gains 2 Aim & can't spend Dodge, Dodge side gains 2 Dodge & can't spend Aim, both
  cost 5). The catalogue models only `offensive-stance`; the **Defensive Stance** back has **no catalogue
  slug**. Faces staged at `DOC51_Generic_Upgrades` **p11-10 (Offensive/front)** + **p11-01 (Defensive/back)**.
  For the flip feature this needs the back image overlaid on `offensive-stance` (+ likely a catalogue-data
  add for the Defensive Stance side). Checked the other 9 generic Training tokens (Offensive Push, Into the
  Fray, Overwatch, Protector, Seize the Initiative, Situational Awareness, Tenacity, Up Close and Personal)
  — all single-faced, no flip text. This was the ONLY generic reconfigure card in the two generic PDFs.

**Scope:**
- **UI:** in the card inspect view (Browse profile drawer / Build card lightbox), add a **Flip** button
  beside the existing **Select** button that toggles to the card's other side. The shown side
  **persists** per card (e.g. localStorage keyed by slug; survives reload).
- **Data:** a scrape-proof second-image overlay keyed by slug (like `upgrade-weapons.json`) — unit
  art fronts already exist on disk; reconfigure-upgrade alternate configs need their second image
  collected (E-11D grenade side already staged). No points/validation impact; purely a display flip.
- Collect any other reconfigure/double-config cards during the Feature 13 re-source (per faction).

## Feature 14 — Counterpart unit cards

**Status:** SHIPPED v1.31.0 (`feature/counterpart-cards`). Owner-requested during Feature 13 P2 (2026-06-18).

Some Legion units field a second miniature that carries its **own** card — the **Counterpart** keyword
(e.g. **Iden Versio** deploys with the **ID10 Seeker Droid**). The catalogue models each such unit as a
single profile with no entry for the counterpart, so the counterpart's card scan had nowhere to attach.

**Complete counterpart set (verified by reading every faction's unit-card scans, NOT the reads-manifests
— which missed `DOC13_Mercenary_Units` entirely).** 4 parent profiles, 3 distinct minis:
| Parent (slug) | Faction | Counterpart | Source scan |
|---|---|---|---|
| `iden-versio-inferno-squad-leader` | Empire | ID10 Seeker Droid | `DOC51_GalacticEmpire_Units-p10-10/11` |
| `r2-d2-independent-astromech` | Republic | C-3PO | `DOC51_GalacticRepublic_Units-p06-12/20` |
| `r2-d2-hero-of-a-thousand-devices` | Rebels | C-3PO | `DOC51_RebelAlliance_Units-p08-12/20` |
| `din-djarin-the-mandalorian` | Mercenary | Grogu | `DOC13_Mercenary_Units-p06-10/11` |

Separatists have no counterpart cards. **Din Djarin/Grogu was nearly missed** because Din Djarin was
sourced as a transmission "extra" (not the mercenary PDF the manifests read) — the lesson: verify
counterparts by looking at the card scans, not by grepping manifests.

**What shipped:**
- **Data:** owner-maintained `public/data/counterparts.json` keyed by parent slug (`{ name, cardImage,
  frontImage?, portraitImage?, keywords[] }`), overlaid onto units at store load like `upgrade-weapons.json`
  (scrape-proof). `Counterpart` type in `types/index.ts`; `keywords` transcribed off the cards.
- **Portraits:** `scripts/crop-counterpart-portraits.ts` crops a round 40×40 bust from each counterpart
  card scan (same as unit portraits) — does NOT touch the frozen `npm run portraits` pipeline. Counterpart
  card scans + portraits live in `public/images/{units,portraits}/` (git-ignored → Firebase deploy).
- **UI:** `CounterpartBadge.vue` — a round portrait badge shown after the unit's name in the army list
  (`ArmyUnitCard`), click opens the full card in a lightbox. The Browse/Build profile drawer
  (`UnitProfile`) shows a collapsible section: round badge + name + glossary keyword pills (visible even
  when the card is collapsed) + a "Show card" toggle.
- **Tests:** counterparts guarded by `catalogue-integrity` (real slug + images exist + names locked),
  `keywords` coverage (all resolve), `image-coverage` (not orphans), and a units-store overlay test.
- Pure additive — no points/validation/army-building impact; the counterpart deploys with its parent.

**Not a counterpart (verified & rejected):** Din Djarin himself is NOT a counterpart of Grogu the other
way; there is also a legacy "Din Djarin" *upgrade* card (`upgrades/p7d/din-djarin.webp`, "Add 1 Din Djarin
miniature") in the P7d.1 backlog — a separate representation, out of scope here.

## Feature 13 — 2.0: re-source every card image from official AMG PnP PDFs

**Status:** in progress. **SHIPPED:** P1 tooling (PR #65); P2 empire v1.18.0 (#67); P3 republic v1.19.0 (#68);
P4 rebels v1.20.0 (#69); P5 separatists v1.21.0 (#71); P6 mercenary+ewoks v1.22.0 (#72); **P7a generic upgrades
v1.23.0 (#73)**; **P7b battle 34/43 v1.24.0 (#74)**; **P7b.1 battle 43/43 — Pack II from owner photos — v1.25.0
(#75)**; **P7c commands 31→11 v1.26.0 (#76)**; **P7d upgrades 147→81 (this branch)**. **REMAINING:** **P7c.1**
11 commands (need owner photos); **P7d.1** 81 upgrades with NO first-party PnP (see P7d below); **P8** 2.0 cutover
(flip image-coverage to hard assert, assert 0 LHQ2, reword CLAUDE.md/README to first-party AMG, `npm version major`
→ 2.0.0). **Current LHQ2 baseline = 92** (units 0, upgrades 81, commands 11, battle 0) + **59 noImage placeholders**
(2 units + 57 legacy upgrades, no external image). **DEPLOY PENDING:** P7a+P7b+P7b.1 images are applied locally
but NOT yet pushed to Firebase (owner batched them) — run `images:compress` + `npx -y firebase-tools deploy
--only hosting` to make the new art live; the version bumps already bust the `?v=` CDN cache. Detail per phase
below + in memory `feature-13-p7-cleanup`. 8-phase rollout follows.

**Portraits are NOT a step (owner directive, 2026-06-19).** All unit portraits are finished/owner-maintained;
do NOT run `npm run portraits` / `portraits:validate` or re-tune `CARD_CROP_PORTRAITS` during a re-source. The
per-faction run order is `amg:apply → seed → amg:origins → images:compress → deploy`.

Every card scan in the app was originally downloaded from the Legion HQ 2 CDN
(`d2maxvwz12z6fm.cloudfront.net`). The only exception is the Mandalorian errata batch we self-sourced
from AMG DOC56 ([[Feature 11]], commit `c61ac31`). For **2.0** we replace all remaining LHQ-sourced art
with AMG's **own print-and-play (PnP) PDFs** (`atomicmassgames.com/swlegiondocs`), so every image is
first-party and self-sourced — the stated goal: *every card sourced by us; all foreign image content
expunged*. Each PnP PDF embeds every card as its own full-res raster (verified: units ~1039×726 CMYK
300-DPI JPEG, the exact aspect our scans use), so extraction is mechanical; only name→slug matching is
hard, and it is faction+category-scoped by which PDF a card lives in.

Owner decisions: re-source **all 4 card types** (~876 images; portraits auto-regenerate, product box art
out of scope); **report & pause** on any card with no AMG PnP source; deliver as **phased PRs → 2.0 major**.

**Both unit sides captured (owner directive, P2).** A Legion unit card is double-sided: the **stats/play
side** (name, weapons, defense/surge, upgrade bar — what every builder shows, stored as `units/<slug>.webp`)
and the **art "front" side** (full-bleed character art + points value + icon strip). The PnP unit PDFs embed
*both* rasters per unit. We now extract and store **both**: the art front is staged to
`public/images/units/<slug>-front.webp` (same dir, `-front` suffix — distinct from the `-2`/`-3` dedup
slugs; excluded from the catalogue-slug coverage glob). **Files-only for now — no `Unit` data field and no
UI**; the front art is captured so a future feature can use it (owner: "we don't show it now but it might be
useful"). Applies to **units only** — upgrade/command backs are generic shared templates with no per-card
info. This changes `selectFronts`/matching (keep both unit sides; the vision matcher tags each as
`stats` vs `front`); a unit whose PDF yields only one side lands in the gap report.

**Source PDFs (downloaded, not scraped):** units `DOC51_{GalacticEmpire,GalacticRepublic,RebelAlliance}_Units`,
`DOC51_SeparatistAlliance_Units_05-01_Update`, `DOC13_Mercenary_Units`, `DOC13_Mercenary_Ewoks`; upgrades
`DOC51_{GalacticEmpire,GalacticRepublic,RebelAlliance,SeparatistAlliance}_Upgrades`, `DOC51_Generic_Upgrades`,
`DOC13_Mercenary_Upgrades`, `DOC51_UpgradeCards`; commands `DOC13_{GalacticEmpire,RebelAlliance,SeparatistAlliance}_Commands`,
`SWQ_GalacticRepublic_Commands`, `DOC51_Mercenary_Commands_05-01_Update`; battle `DOC41_BattleCards_11.26.2025`.
The full per-card source list is recorded in `card_list_origin.md` (the durable provenance record, since
scans are git-ignored).

### Pipeline (P1 — SHIPPED, PR #65, `feature/amg-image-resource-tooling`, merged as a chore, no bump)

All in `scraper/` + `scripts/`, mirroring the existing scraper/portraits conventions. The PnP PDFs and
extracted cards are git-ignored; `card_list_origin.md` is the durable provenance record.

- **`scraper/amgNormalise.ts`** (pure, 100% covered, in vitest `include`): `AMG_SOURCES` (the 19 PnP PDF
  URLs tagged by category+faction), category-scoped `PRESERVE_SLUGS`/`isPreserved` (the 14 self-sourced
  DOC56 cards — **keyed by category** because slugs collide across categories, e.g. upgrade vs command
  `whipcord-launcher`), `selectFronts` (md5 dedup; drops the byte-identical shared card backs), `matchCard`
  (read-name+title → catalogue slug, returns `{slug}` / `{ambiguous}` / null, reuses `slugify`).
- **`scraper/amgDocs.ts`** → `npm run amg:fetch` — downloads PnP PDFs to `scraper/amg-pdfs/`.
- **`scraper/amgExtract.ts`** → `npm run amg:extract` — `pdfimages -all` per PDF, `selectFronts`, sharp
  CMYK→sRGB WebP into `scraper/amg-cards/<cat>/<faction>/` + `index.json`. (Verified on rebel units:
  94 raw → 52 fronts → WEBP 1039×726 sRGB.)
- **`scripts/generate-image-validation.ts`** → `npm run images:validate` — **the validation gate**: builds
  `image-validation.html` (repo root, git-ignored), a side-by-side **OLD (current on-disk scan) vs NEW (AMG
  candidate)** contact sheet grouped by source PDF, with per-card Approve/Reject (persisted to
  localStorage), per-section bulk approve/reject, name filter, "only pending", and **Export approvals** →
  `scraper/amg-approvals.json`. Mirrors the `portraits:validate` pattern. Reviewed in batches.
- **`scraper/amgApply.ts`** → `npm run amg:apply` — copies staged fronts to `public/images/<cat>/<slug>.webp`.
  Honors `amg-approvals.json` if present (applies **only approved**); always skips `isPreserved`; warns +
  applies all if no approvals file.
- **`scripts/generate-card-origins.ts`** → `npm run amg:origins` — regenerates `card_list_origin.md` from
  the data files + `PRESERVE_SLUGS` + `amg-card-map.json`. Baseline: **14 self-sourced (DOC56), 862 LHQ2**.
- **Tests:** `amgNormalise.spec.ts` (sources/dedup/matcher/preserve + the `whipcord-launcher` collision);
  `image-coverage.spec.ts` (every catalogue slug has a scan on disk — skips when images absent in CI;
  allowlists the 2 known-missing upgrades `dc-15-clone-trooper` / `youre-not-all-the-same-to-me` until P7).
- **Intermediate artifacts (git-ignored):** `scraper/amg-pdfs/`, `scraper/amg-cards/`,
  `scraper/amg-card-map.json`, `scraper/amg-approvals.json`, `image-validation.html`.

### P2 (empire) findings — pipeline corrections (IMPORTANT, apply to all factions)

Two things discovered re-sourcing empire that changed the tooling (both now fixed):

1. **`pdfimages` was the wrong extractor for the DOC51/DOC13 PnP sheets.** Those PDFs render card
   TEXT (names, weapons, keywords, costs) as **vector overlays**, so the embedded rasters are
   text-less backgrounds. `amgExtract.ts` was rewritten to **render pages (`pdftoppm` @300dpi) and
   crop the 3×3 card grid** (cells 726×1040 at origin 185,90 on letter; unit cards are landscape
   rotated 90° on the sheet — rotation auto-detected from the embedded raster orientation), then
   perceptual-hash (16×16 aHash) dedup of print duplicates. (The DOC56 errata cards extracted fine
   with `pdfimages` only because that PDF embedded one *pre-flattened* full card per image.) Adds
   `--faction`/`--category` filters so a phase only processes its faction.

1b. **Render at 600 DPI + supersample down** (quality fix, P3). Rendering the page at the output
   resolution (300dpi) left the vector text noticeably softer than the LHQ2 scans. `amgExtract` now
   renders at **600 DPI** and downsamples each card to the 726×1040 output (lanczos3) — supersampling
   that makes the text crisp (matches LHQ2). Dedup also changed from a perceptual aHash to **exact
   md5** so every page-cell is staged under a deterministic filename: the perceptual hash collapsed
   near-dup prints differently at different DPIs, which orphaned the filename-keyed matching reads on
   re-extraction. **The Empire cards shipped in P2 were rendered at 300dpi — re-render + re-deploy
   them at 600dpi** (`amg:extract --faction empire` with the current code, then re-apply/compress/deploy).

2. **Both unit sides are captured** (owner directive): the stats/play side → `units/<slug>.webp`,
   the art side → `units/<slug>-front.webp` (files-only, no data field). On the sheet these are two
   adjacent cells; the matching step tags each `play`/`front`.

3. **AMG's newest units ship as individual transmission-page card images, not in the DOC51 PDF.**
   6 empire units were absent from `DOC51_GalacticEmpire_Units` (Tarkin, Thrawn, Tagge, Imperial
   Officer, Imperial Agent, Imperial Probe Droid). Tarkin/Thrawn/Tagge are published as per-card
   PNGs on the **Imperial High Command** transmission page (product `SWQ42`, on the asmodee CDN).
   New owner-maintained `scraper/amg-extra-cards.json` + `npm run amg:extras` (`scraper/amgExtras.ts`)
   download such cards, webp them into `amg-cards/<cat>/extra/`, and merge into `amg-card-map.json`.
   For AMG unit cards, `_Front` = the stats/play side, `_Back` = the art side. Run order:
   `amg:extract` → `build-card-map` → `amg:extras` → `images:validate`. Matching is scripted in
   `scripts/build-card-map.ts` (consumes the vision reads in `scraper/_match/reads.json`).

   Extra sources used for P2 empire (all in `amg-extra-cards.json`): `SWQ42_ImperialHighCommand`
   (Tarkin/Thrawn/Tagge units + 8 commands + Security Detail), `SWQ98_ImperialProbeDroid` (Imperial
   Probe Droid unit), `SWQ09_ImperialOfficerAgent` (Officer & Agent units + their 2 commands).
   Notes on AMG's CDN: individual card URLs are not always linked on the transmission page but exist
   under predictable `SWQ##_UnitCard_N_Front/Back.png` / `SWQ##_CommandCard_N.png` names (probe them;
   a 200 with a ~79-byte body is a stub = does NOT exist). And the **`*_Fan.png`** unit images, at
   FULL res (drop the `-1024x373` WP thumbnail suffix), are the play side + art side laid SIDE BY
   SIDE (2088×760 = two 1040×760 cards) — `amgExtras` supports a per-card `crop` box to split them.

   **P2 = FULL coverage: 35/35 units, 49/49 commands, all DOC51 upgrades + Security Detail re-sourced
   first-party.** The only two residual items are NOT sourcing gaps but catalogue-modelling gaps,
   logged for a later data feature: (1) the upgrade **E-11D Grenade Launcher Configuration** is in
   the PnP but MISSING from the catalogue (belongs to **Imperial Death Troopers**, same as the
   Focused Fire config); (2) the **Iden's ID10 Seeker Droid** counterpart card has no catalogue slug.

### The matching step (between extract and validate)

`scraper/amg-card-map.json` (`[{ category, slug, sourcePdf, extractedFile }]`) maps each staged front to a
catalogue slug. It is produced **per faction batch** by reading each extracted card's name+title (vision)
and matching against that PDF's faction+category candidate set via `matchCard`, **with a verification
re-read pass** (CLAUDE.md mandates this — dice/name misreads are real). Unmatched catalogue slugs (no
candidate) and unmatched extracted fronts (no slug) → **gap report → pause for owner**.

### Per-faction batch workflow (P2–P7), exact order

```
npm run amg:fetch                       # once — download all PnP PDFs
npm run amg:extract                     # once (or per-PDF) — stage fronts + index.json
# → matching: build/append scraper/amg-card-map.json for this faction (vision + matchCard + re-read pass)
npm run images:validate                 # open image-validation.html, review OLD vs NEW in batches,
                                        #   Export approvals → scraper/amg-approvals.json
npm run amg:apply                       # applies only approved; skips preserve-list
# NO portraits step — portraits are finished/owner-maintained (directive 2026-06-19)
npm run seed                            # reseed the API DB
npm run amg:origins                     # refresh card_list_origin.md (this faction → AMG <pdf>)
npm run images:compress                 # → images-compressed/ (800px Q80)
npx -y firebase-tools deploy --only hosting   # deploy so prod doesn't 404 (version bump busts the ?v= cache)
```

### Phases

- **P1 — SHIPPED.** Tooling + provenance + validation tool (above). No image/app change; merged as a chore.
- **P2–P6 — one faction per PR** (empire, republic, rebels, separatists, mercenary+ewoks): units + upgrades
  + commands for that faction. AC = OLD-vs-NEW batch validation + faction spot-check in Browse. **Minor bump
  each** (the version bump busts the immutable image CDN). No portraits step (finished/owner-maintained).
  - **P4 rebels SHIPPED v1.20.0:** 34/34 units (29 from `DOC51_RebelAlliance_Units` + extras: SWQ13 Rebel
    Officer/Agent, SWQ41 Captain Solo & Commander Skywalker on Tauntauns, AdeptiCon-slide Guerilla Troopers
    preview w/ unreleased badge), 48/48 commands (36 DOC13 + SWQ13 ×2 + SWQ41 ×3 + 7 Ewok commands from
    `DOC13_Mercenary_Ewoks`), 55/56 upgrades. Residuals deferred: C-3PO counterpart (→ Feature 14), 6 new
    R2-D2/Sabine command cards + `astromech-droid` generic upgrade (→ catalogue-data / P7). `images:validate`
    gained a `--faction` filter. Guerilla Troopers stays preview-quality until AMG ships a clean PnP.
- **P7 — battle deck + cleanup.** SCOPE CORRECTION (2026-06-21): the one-line "cleanup" badly understated
  this. The current `card_list_origin.md` baseline shows **309 cards still on LHQ2**: **233 upgrades** (the
  faction-null GENERIC upgrade PDFs `DOC51_Generic_Upgrades` 22pp + `DOC51_UpgradeCards` 5pp ≈ 243 slots were
  never processed), **43 battle** (none re-sourced yet), **31 commands** (4 generic pips + ~27 named
  Mandalorian/faction cards), **2 units** (`clone-trooper-marksmen`, `tsmeu-6-wheel-bikes`). Far too much to
  validate in one OLD-vs-NEW pass, so P7 is **split into sub-phases**, each its own PR + validation + minor bump:
  - **P7a — generic upgrade PDFs (IN PROGRESS, this branch `feature/amg-image-resource-p7a`).** Extracted
    `DOC51_Generic_Upgrades` (195 cells) + `DOC51_UpgradeCards` (43 cells) = **238 cells → 88 distinct upgrades**
    (heavy print-duplication: e.g. Vigilance ×3, Ascension Cables ×4). Read via bottom-name-strip contact sheets
    with the staged filename burned in (the upgrade NAME is at the card BOTTOM; cost top-right; slot icon centre).
    NOTE: the `index.json` 16×16 ahash is **useless for dedup here** — the token-upgrade cards (Offensive Push,
    Defensive Stance, Into the Fray…) are near-identical at 16×16 and collapse together, so all 238 were read by
    hand off large-code sheets, not ahash-deduped. New tooling: `scripts/build-card-map-generic.ts` (faction-null,
    TWO source PDFs, upgrades-only; **skips slugs already AMG-sourced from a faction/extra PDF** so reprints like
    `dc-15x-arc-trooper-gunner` don't double-map) + `reads-generic.json`; `images:validate --faction generic` now
    scopes to faction-null sources. **Result: 86 LHQ2 upgrades matched & mapped, 0 new dups, 1 skipped (dc-15x,
    faction source wins), 1 gap:** "Defensive Stance" (GU-p11-01) — **no catalogue slug** (catalogue has
    `offensive-stance` only; likely its flip side → Feature 15 / catalogue-data). Awaiting owner OLD-vs-NEW
    validation → apply → seed → origins. The 2 "missing scans" (`dc-15-clone-trooper`, `youre-not-all-the-same-to-me`)
    are NOT in these generic PDFs → they fall to P7d.
  - **P7d — upgrades 147→81 (this branch `feature/amg-image-resource-p7d`).** The P7a hypothesis — "the 147 remaining
    LHQ2 upgrades live unmatched in the faction `DOC51_<Faction>_Upgrades`/`DOC13_Mercenary_Upgrades` PDFs" — turned out
    **FALSE**. A full vision-read pass over EVERY unread non-blank cell across all 7 upgrade PDFs (5 faction + `DOC51_Generic_Upgrades`
    22pp + `DOC51_UpgradeCards` 5pp + `DOC51_GalacticEmpire_Upgrades`) matched only **9** of the 147 — all republic clone
    upgrades (`clone-captain`, `clone-commander`, `clone-medic`, `clone-shock-trooper-pilot`, `gnasp-gunner`,
    `mortar-clone-trooper`, `rps-6-clone-trooper`, `twin-laser-turret`, `waxer`). The OTHER **~138 simply are not in any
    AMG PnP we hold.** They split into: legacy 1st-ed generics v2 replaced (lightsaber, jedi-training×4, thermal-detonator,
    combat-shields, the generic melee/heavy-weapon/comms gear); legacy empire personnel upgrades whose v2 successors are
    already AMG (`shoretrooper`, `dlt-19d-trooper`, `t-7-ion-snowtrooper`, `imperial-dark-trooper`…); and **current-v2
    expansion cards AMG has not published as PnP** (characters Ahsoka/Shaak-Ti/Din-Djarin/Sabine/Bo-Katan/Armorer, the
    Pyke/Black-Sun/Weequay syndicate upgrades, GALAAR-15/Beskar mando gear, the Ewok upgrades).
    - **APPLIED 9** — appended to `reads-republic.json`, `build-card-map --faction republic`, `amg:apply` (9 added to
      `amg-approvals.json` after visual verify). Upgrades AMG 271→**280**.
    - **DROPPED 57 legacy → `unreleased.json` `noImage`** (owner directive: drop the clearly-legacy v1 cards like the 2
      units in f2f88e6; same `cardImage:null` placeholder via `src/utils/unreleased.ts`, scans expunged). 31 generic +
      8 jedi-training + 18 empire-legacy. Kept 4 ambiguous-but-likely-current (`electrostaff-pirate`, `herbal-medicine`,
      `secret-ingredients`, `dual-armaments`) on the photos pile.
    - **12 pre-existing dup upgrade slugs cleaned** (a card reprinted in two packs, e.g. `at-rt-laser-cannon` Rebel+Republic,
      `a280` twice in the Rebel pack). Fix codified in `build-card-map.ts` (new cross-pack `alreadyUpg` skip, mirroring
      `build-card-map-generic`) so a full rebuild stays deduped — not just a one-time map edit. Unique upgrade map slugs 275.
    - **REMAINING 81 → P7d.1** (= 81 LHQ2 upgrades: ~24 current-v2 expansion cards needing owner photos + the rest legacy
      the owner may also choose to drop). Mirrors P7c.1's owner-photo path. Upgrades now AMG 280 / LHQ2 81 / none 57.
  - **P7b — battle deck (43):** `DOC41_BattleCards_11.26.2025` covers only **24/43** (it is the Standard deck,
    dated 11.26.2025). DOC41 splits each **primary objective** into a separate TEXT card + landscape **Map Card**
    (the text reads "as shown on the … Map Card"); the catalogue stores ONE combined image per primary, so the
    two AMG cards are **composited** (text top, map below) into one image. DOC41 page 4 also carries the **4
    generic pip command cards** (Ambush/Push/Assault/Standing Orders → P7c). The **19 cards DOC41 lacks** — 9
    Recon (`-2`, `isRecon:true`) + 10 newer Standard (`cauldron`, `payload`, `contact-contact`,
    `retrieve-the-data`, `failed-negotiations`, `align-the-relay`, `scrambled-orders`, `extreme-discipline`,
    `armored-assault`, `rapid-deployment`) — need owner-provided PDFs (a Recon-deck PnP + a battle-cards update
    newer than 11.26.2025); automated discovery is blocked (AMG site 403, web tools down). The DOC41 3×3/726×1040
    grid extracts the cells fine; the battle work is the **compositor + matcher**, not re-extraction.
    - **Compositor BUILT (`scraper/amgBattle.ts`, tested):** `compositePrimary(textBuf, mapBuf)` recreates the
      LHQ2 combined primary — text card (top, cropped to 985px to clear the blank footer/frame while keeping the
      fullest card, Intercept Signals, which fills to ~960) above the map card (left title spine cropped 100px,
      rotated 90° CW into a landscape strip). Output **726×1422**, matching the LHQ2 ~726×1450 primaries
      near-exactly (verified vs OLD shifting-priorities + intercept-signals). `computeLayout` is pure + unit-tested.
    - **SHIPPED 34/43 (this branch `feature/amg-image-resource-p7b`).** Sources, all codified in
      `scripts/build-battle-cards.ts` (`npm run amg:battle`) so they reproduce despite the git-ignored image dir:
      - **24 standard from DOC41** — 17 single adv/sec (copied) + 7 primaries composited via `compositePrimary`
        (the 3 dup-map primaries intercept/bunker/close: the FIRST map cell is standard — verified vs LHQ2 — the
        2nd is the recon map). DOC41 cells come from `amg:extract --category battle`.
      - **9 Recon from `DOC13_ReconRulebook` pp.5–6** (owner-supplied) — laid out on a **print cut-mark grid**
        (detected by scanning the margin strips: x=186/912/1638/2364, y=809/1848/2887 → 726×1039 cells, 300dpi).
        Adv/sec are single cards; primaries are two stacked cells (map row0 / text row1) → `compositePrimary`.
      - **Cauldron from `DOC56_ErrataReference-2` p11** (errata'd objective TEXT card) + **owner-supplied Map Card**
        (no AMG PnP exists; preserved at `scraper/amg-assets/cauldron-map.png`) composited text-top/map-bottom.
      `BATTLE_BUILD_SOURCES` (amgNormalise) makes amg:fetch pull the rulebook + errata; `build-battle-cards`
      emits the 34 battle entries into `amg-card-map.json`. **9 still LHQ2 = Battle Deck Card Pack II** (released
      2026-03-20: payload, contact-contact, retrieve-the-data, failed-negotiations, align-the-relay,
      scrambled-orders, extreme-discipline, armored-assault, rapid-deployment) — no AMG PnP exists. The DOC41
      page-4 pip commands → P7c. Minor bump 1.24.0; DEPLOY skipped (batch later).
    - **P7b.1 — Pack II complete, battle deck 43/43 (this branch `feature/amg-battle-pack2`).** The 9 Pack II
      cards came from **owner-supplied photos of the physical cards** (no AMG PnP). New tooling:
      `scripts/rectify-card.ts` (deskew a hand photo via 4-corner perspective from a card-vs-mat mask, inflate
      horizontally to keep the coloured frame bars, trim mat slivers, fixed sharp bottom cut) +
      `scripts/split-cards.ts` (split a sheet aggregating several cards — the 8 advantages came 2-per-faction on
      4 sheets — at the inter-card gap; those 4 seam cuts were hand-tuned as the cards nearly touch with dark
      art). Primaries (Contact/Payload) composited text+map. The FINAL 9 cards are durable tracked assets at
      `scraper/amg-assets/pack2/*.webp` (photos aren't in the repo); `build-battle-cards.ts` gains a `pack2`
      source (`OwnerPhotos_BattleDeckCardPackII`) that copies them in + emits map entries. **battle 0→43 AMG /
      0 LHQ2; total LHQ2 189→180.** Same self-sourced ethos as Cauldron's map + the DOC56 errata. Minor bump
      1.25.0; deploy still batched.
  - **P7c — commands 31→11, units unchanged (SHIPPED v1.26.0, branch `feature/amg-image-resource-p7c`).** 20 of
    the 31 LHQ2 commands re-sourced first-party:
    - **13 from local PDFs** via `scripts/build-p7c-commands.ts` (`npm run amg:p7c`): the 4 generic pip commands
      (ambush/push/assault/standing-orders) copied from the already-extracted DOC41 pg-4 battle cells, and the 9
      Mandalorian Clans force commands hand-cropped from `DOC56_Mandalorian_BattleForceCards` pp.1–3 right column
      (3 cards/page, uniform boxes x=1655 w=715, tops 0/1113/2186 @300dpi). Staged to `commands/p7c/`.
    - **7 from transmissions** via `amg-extra-cards.json` + `amg:extras`: SWQ82 Mandalorian Leaders (a-higher-purpose,
      mandalore-will-survive, **go-there-are-too-many** [Paz Vizsla — shipped in SWQ82, not unreleased],
      we-shape-ourselves, both-hunter-and-prey) + SWQ45 Hondo (thats-just-good-business, stories-so-many-of-them-true).
      `amgExtras` gained an optional per-card `url` override (SWQ82 CommandCards-5 is only published as the
      image-converter webp; the raw png 404s).
    - **REMAINING 11 commands + 2 units → P7c.1** (need owner photos / deeper digging): R2-D2 ×3 (blast-off,
      impromptu-immolation, smoke-screen) + rebel Sabine ×3 (explosions, legacy-of-mandalore, symbol-of-rebellion)
      live in the Sept-2025 Rebel Alliance Command Card Pack (no per-card images published); Din Djarin's
      i-like-those-odds (only an old 1st-ed landscape image found); 4 preview characters (honor-and-strength,
      no-escape, i-smell-fear-and-it-smells-good, we-shall-start-with-revenge); units tsmeu-6-wheel-bikes (not on the
      SWQ31 article) + clone-trooper-marksmen (Republic, no scan even on disk). **LHQ2 baseline 180→160** (units 2,
      upgrades 147, commands 11, battle 0). Minor bump 1.26.0; deploy still batched.
- **P8 — 2.0 cutover:** flip `image-coverage.spec.ts` to a hard assert (every slug has a scan, empty the
  allowlist) + assert `card_list_origin.md` has 0 LHQ2 rows; reword the `CLAUDE.md` Data-sourcing section &
  `README.md:100` credit to first-party AMG PnP (keep the AMG/Lucasfilm disclaimer, `README.md:105-107` /
  `CLAUDE.md:96`); changelog + `npm version major` → **2.0.0**; deploy the full compressed image set.

### Key facts to resume cold

- Slug = filename: `public/images/<cat>/<slug>.webp`; `cardImage` derived. Slugs unique only **within** a
  category. Counts: units 180, upgrades 418 (**416 on disk** — 2 missing above), commands 235, battle 43.
- `src/utils/imageUrl.ts` appends `?v=<appVersion>`; each version bump busts the Firebase immutable cache,
  so prod picks up new art on release. Components read `cardImage`/`portraitImage` — none build paths from slugs.
- Portraits (`scraper/portraits.ts`) crop hand-tuned `CARD_CROP_PORTRAITS` pixel regions from the unit
  scans → re-tuning needed wherever AMG framing differs from LHQ.
- `selectFronts` over-includes non-unit/back art (52 fronts for ~34 rebel units) → the matching step's gap
  report is where those land; tune `maxRepeat` per PDF if needed.

---

## Feature 12 — Battle-force doctrines ("choose N of the following")

**Status:** SHIPPED v1.17.0 (Phase 1 + Phase 2). The general mechanism is in place — any force gets
doctrines by adding an entry to the owner-maintained `public/data/battle-force-doctrines.json` (overlaid
onto the `battleForces` store like `upgrade-weapons.json`). **Mandalorian Clans is currently the only
populated force**: it is the only battle force whose rules (DOC56_BattleForces, verified against the card
image) carry a list-building "Choose N of the following" doctrine — the AMG docs site publishes no such
doctrine for the other 19 forces (their rules live on physical cards). Add others to the JSON when their
verbatim text is in hand; no code change needed. Phase 2 computable effects implemented for Mandalorian
Clans: Veterans (GALAAR-15 Carbines −5 via `unitCost`/`doctrineUpgradeCost`), Tools of the Trade (its three
upgrades free on a Mandalorian Trooper bearer — per-unit so unit rows, slot chips and the total agree — plus
restriction bypass for Mandalorian Troopers via `applyDoctrineEffects`/`forSlot`), Guns for Hire (vehicles
unlocked into the Heavy pool). Cost effects are per-upgrade/deterministic so every cost display is consistent
(`doctrineUpgradeCost`); the literal card wording is "1 additional copy each, free" — identical in the common
single-copy case, a minor undercount only if multiple copies of the same upgrade are fielded. Rapid Deployment & Feats of Valor stay text-only (pure in-game effects).
Share code bumped to v3 (`o?` key); `applyDoctrineEffects` bakes pool/eligibility effects onto a per-army
copy of the force in `useArmyValidation` so downstream code needs no doctrine awareness.

**Original design (for reference):**

**Status (original):** queued (design agreed; not started). Follow-up surfaced during Feature 11 QA.

Several battle forces let you pick a fixed number of army-build benefits at list-building time —
e.g. **Mandalorian Clans** "**Choose 2 of the following**": Veterans, Tools of the Trade, Rapid
Deployment, Guns for Hire, Feats of Valor. The app currently doesn't model these at all (the
Mandalorian update's "Veterans clerical fix" had no surface to land on — see [[feature-tracking-doc]]).
This shares the exact shape of the existing `commandHand` / `battleDeck` pickers (pick N from a list →
store chosen ids on `Army` → render a picker → enforce the count → surface the text).

**Where each piece goes:**
- **Data (scrape-proof):** a new owner-maintained `public/data/battle-force-doctrines.json`
  (`{ [linkId]: { pick: number, options: { id, name, text }[] } }`), transcribed verbatim from the
  AMG BattleForces PDF (same ethos as `Keyword_glossary.md` / `upgrade-weapons.json`). NOT in
  `battleForces.json` — that file is scraper-generated (`scrape.ts`) and would wipe it. Overlay it
  onto the `battleForces` store at load, mirroring the `upgrade-weapons.json` overlay.
- **Type:** optional `doctrines?: { pick: number; options: {id,name,text}[] }` on `BattleForce`.
- **Army:** `doctrines: string[]` (chosen option ids), mirroring `commandHand`/`battleDeck`; add to
  the versioned share-code serializer.
- **UI:** a "Doctrines — Choose N" panel in the Build battle-force section, shown only when the
  selected force has `doctrines`; reuse the command-hand multi-select (chips capped at `pick`, each
  showing its rules text).
- **Validation (`army.ts`):** army is *incomplete* until exactly `pick` are chosen (like the 6-card
  command hand); surface the chosen text in the summary/export.
- **Enforcement — phased:** Phase 1 = selection + count + shown-as-text (most of the value, low risk).
  Phase 2 (optional) = wire the *computable* effects into the engine (Veterans −5pts GALAAR-15
  Carbines; Tools of the Trade free upgrade copies + restriction bypass; Guns for Hire unlocking the
  three vehicles into `rankUnits`). Pure in-game effects (Rapid Deployment, Feats of Valor) stay
  text-only.

Generalises beyond Mandalorian Clans — transcribe every battle force's "choose N" list when built.

---

## Feature 11 — Mandalorian Update (AMG DOC56, June 2026)

**Status:** in progress (`feature/mandalorian-update-2026`).

Bring the catalogue in line with AMG's 2026-06-17 Mandalorian errata + Print-and-Play card
refresh (the **DOC56** document batch). Source documents (downloaded, not re-scraped — per
[[extract-from-card-images-not-scraping]]): `DOC56_Mandalorian_BattleForceCards-2.pdf` (card art,
one 727×1040 / 300 DPI image per card), `DOC56_ErrataReference-2.pdf`, `DOC56_SWQ_Rulebook-2.pdf`,
`DOC56_BattleForces-3.pdf`. Changelog source: forums.atomicmassgames.com topic 20841.

Owner decisions: **removed cards are kept but flagged** (still shown in Browse/Reference, excluded
from Build selection), not deleted; shipped as **one PR**.

- **Removed-upgrade flag.** New `Upgrade.removed?: boolean`; Build's selectable-upgrade filter
  excludes flagged cards. 9 cards flagged (Boba's/Din's/Saxon's-ZX Flame Projector, Electro Grappling
  Line, Jetpack Rockets (Mandalorian Resistance), Sabine's/Saxon's/Super Commando Combat Shields,
  Super Commando Jetpack Rockets) — correct variant matched against each card's restriction text.
- **Keywords** (`Keyword_glossary.md` → `npm run keywords`): **Impervious** reworded to "reduce the
  Attack Pool's Pierce X by 1, min 0, at the start of Modify Defense Dice" (was "cancel one fewer
  Block"); **Mandalorians Are Stronger Together** reworded (Aim↔Dodge token gain, after the attack).
- **Unit data** (`units.json`): Clan Wren → 4 minis / 92 pts (both slugs); `unitType` → "Mandalorian
  Trooper" on Boba Daimyo, Gar Saxon Militant Commando, Sabine Explosive Artist.
- **Upgrade data**: Beskad Duelist → 2 red attack dice + Axe Woves weapon (`upgrade-weapons.json`);
  Whipcord Launcher Trooper-only; Mandalorian Initiates lose Jetpack Rockets; The Darksaber
  (Bo-Katan's) restricted to Mandalorian Clans BF; Children of the Watch clerical.
- **Battle forces** (`battleCards.json`/`battleForces`): Shadow Collective Gar Saxon restriction,
  Veterans clerical fix, Customizable Mandalorian Doctrines added to the allowed unique-upgrade list
  (Battle Master, Deadeye, Guildmember, War Party Leader, Full Beskar Armor).
- **Card art**: extract + replace the changed cards from the PnP PDF (unit cards rotated to landscape),
  re-run `npm run portraits` for Din Djarin + Clan Wren, new `ursa-wren` upgrade card.

---

## Feature 10 — Build unit-row weapons (best ranged + best melee) & count-first layout

**Phase A — display + reorder (done, v1.14.0).** Each Build unit row (`ArmyUnitCard.vue` roster
+ `CatalogueUnitRow.vue`) now leads with the unit's **miniature count** and shows the **best
ranged (`R:`) over best melee (`M:`)** weapon as stacked dice pips, replacing the single
"most dice" pip cluster.
- "Best" = **highest expected wounds** (hits + crits from the dice EV engine, `poolEV`, under
  the unit's surge chart) — NOT raw dice count. Owner correction: use the probability model.
- `src/utils/bestWeapons.ts` (pure, tested): melee-capable = range reaches 0; ranged-capable =
  reaches band 1+ or rangeless (Fixed). A Versatile [0,2] weapon headlines both pools.
- `UnitIndicators.vue` gained `hideModels` (army card shows the count at the row head instead)
  and `extraWeapons` (equipped-upgrade weapons fold into the best-of computation — wired in
  Phase B).

**Phase B — upgrade weapons (done, v1.15.0).** Equipping a weapon upgrade now feeds the live
best-R/best-M (e.g. a DLT-19 replaces the stock blaster as the shown ranged when stronger),
keeping one R and one M where available.
- Data: owner-maintained `public/data/upgrade-weapons.json` (`{ slug: Weapon[] }`), 177 upgrades /
  182 weapon profiles. Materialised ONCE via `scraper/upgradeWeapons.ts` (`npm run upgrade-weapons`)
  then owner-maintained — kept separate from `upgrades.json` so a re-scrape can't wipe it.
- Sourcing decision: seeded from the structured data we already had in hand, then ran a **FULL
  image-verification sweep of all 177 cards** against the scans. 25 dice errors in the source were
  found and fixed (mostly black↔white swaps, incl. the owner-spotted E-5s). ~12 grey/low-res cards
  could not be confirmed at scan resolution and are left at source value — logged in
  **`docs/upgrade-weapon-verification-gaps.md`** as a PENDING QUALITY PASS to revisit with higher-res
  scans. The image-reading discipline ([[extract-from-card-images-not-scraping]]) governs future fields.
- Wiring: `Upgrade.weapons` added; the `upgrades` store overlays the file by slug at load (works for
  API + static); `ArmyUnitCard.vue` passes equipped-upgrade weapons as `extraWeapons` to
  `UnitIndicators`. `tests/catalogue-integrity.spec.ts` guards key dice + slug integrity.

---

## Feature 9 — Unit-type (subtype) rules in profile drawer + print

**Status:** done (v1.13.0). Units carry a `unitType` (e.g. `clone trooper`, `droid trooper`,
`ground vehicle`) that was previously a display-only header label — its associated rulebook rules
were surfaced nowhere. Now the seven subtypes that have their **own** rules show a green
unit-subtype pill in the Keywords section of `UnitProfile.vue` (Browse + Build); tapping it shows
the verbatim rule text, and the rule is folded into the print keyword reference.

- **Source:** transcribed verbatim from the core rulebook **Appendix B: Unit Types** (April 2026
  edition, pp. 39–40) into the APP REFERENCE section of `Keyword_glossary.md` → `npm run keywords`.
  The old condensed Creature/Droid/Emplacement entries were replaced with the verbatim Appendix B
  text, and Clone Trooper, Heavy Droid Trooper, Ground Vehicle and Repulsor Vehicle were added. The
  stale paraphrased `Vehicle` entry was dropped (split into Ground/Repulsor; base-Vehicle Resiliency
  rules omitted — the Resilience stat already conveys them).
- **Mapping:** `src/utils/unitTypes.ts#unitTypeRuleKey` maps a `unitType` to its glossary key, or
  null for types with no distinct rules — base `trooper`, `mandalorian trooper` (not a rulebook
  subtype) and `wookiee trooper` (Appendix B: "no additional special rules"). Those show no pill.
- **UI:** new `unitType` variant on `KeywordPill.vue` (green / `lg-valid`); the pill renders first in
  the Keywords list. Print: `armyKeywordReference` (`utils/army.ts`) injects each unit's subtype rule
  into the deduped, alphabetised reference. The Reference tab picks the entries up automatically (it
  iterates the whole glossary).
- The scrape does not touch `keywords.json` (owner-maintained), so these survive a re-scrape.

---

## Feature 8 — Expunge Tabletop Admiral (portraits from card crops; owner-maintained keywords)

**Status:** done (v1.12.0). Removed the last third-party data dependency: Tabletop Admiral was
previously used for two owner-approved things — unit portrait busts and ~24 upgrade keyword fills —
and both are now sourced in-house.

- **Portraits** — rewrote `scraper/portraits.ts` to drop all TTA fetch/match/CDN/cache logic and
  instead crop the round Build badge straight out of each unit's OWN LHQ2 card scan with `sharp`.
  All 180 units have a **hand-tuned** crop region in `CARD_CROP_PORTRAITS` (a face-centred square
  in the card's native pixels), tuned via per-card visual review. Deleted `scraper/.tta-units.json`
  (matching cache) and its `.gitignore` line. Added `npm run portraits:validate` →
  `portrait-validation.html`, a single-page contact sheet of every badge with a #id for QA.
- **No-portrait indicator** — `UnitBadge.vue` dropped the on-the-fly CSS card-crop fallback (and the
  initials tier); a unit with no `portraitImage` (no `CARD_CROP_PORTRAITS` entry or missing card
  scan) now shows a neutral silhouette instead of a guessed crop.
- **Upgrade keywords** — deleted `scraper/upgradeKeywords.ts` + the `upgrade-keywords` npm script. The
  ~24 affected upgrades keep their keyword tags **baked into `upgrades.json`** as owner-maintained data
  (read off the physical cards; every tag resolves against `Keyword_glossary.md`). A re-scrape
  re-empties them, so re-apply by hand if they regress — `tests/catalogue-integrity.spec.ts` guards it.
- Run order after a re-scrape is now `scrape` → `portraits` → `seed`. CLAUDE.md + release checklists +
  [[data-source-single-truth]] updated.

## Feature 7 — SEO, social share cards & launch comms

**Status:** done (v1.1.0). Made the app discoverable + shareable at every level: full Open Graph + Twitter
Card + canonical + JSON-LD (`WebApplication`) base tags in `index.html`, per-route `useHead`
(Browse/Build/Collection/Reference/Roll/Play), and per-unit `useHead` on `/browse/:slug` whose
`og:image` is the unit's **own Firebase card scan** (rich per-unit previews, no serverless function).
Added a generated 1200×630 `public/og-image.png` (`npm run og`), `public/robots.txt`, and a
build-time `public/sitemap.xml` (`npm run generate:sitemap`, wired into `build`; 179 units + static
routes). Also modernised the launch copy — corrected formats (Standard **1000** / Recon
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
images by request destination).

## Feature 5 — Full battle-force support (all factions)

**Status:** ✅ DONE (v0.21.0, PRs #20 Stage 1 + #21 Stage 2). Originally deferred from the 2026-06-13
Mandalorian validation work (where only the **Mandalorian Clans** battle force was handled, and only its
Corps-min override); subsequently delivered in full. Verified 2026-06-16: **20 battle forces** across all
6 factions in `public/data/battleForces.json` (scraped via `extractBattleForces()` in `scraper/scrape.ts`);
a `BattleForcePicker.vue` selector wired into `BuildView.vue`; `Army.battleForce` (`types/index.ts:188`,
serialised as key `b`); and data-driven validation in `validateArmy` (per-BF rank table via
`rankLimits(cap, bf)`, `battleForcePool()` eligibility, combined `commOp` cap, per-unit `unitLimits`,
`ignoreDetach`, single-faction check skipped under a BF, and **`Special Issue`** gating). The hard-coded
`BATTLE_FORCE_RANKS` override is gone.

**Remaining follow-ups (none blocking — see Roadmap item 4):** `countMercs` is declared in the rules
interface and present in 9 BFs' data but never read (inside a BF the merc checks are simply skipped, which
approximates the intent); the bespoke `MANDO_CLANS` / `isMandalorianClanUnit` handling was never retired
onto the data-driven path (the two coexist); and the affiliation-cohesion army rule is not implemented as
an army-wide check (`forceAffinity` is only used for upgrade eligibility).

**Original scope, for reference:**

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

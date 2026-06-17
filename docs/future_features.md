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

**Recently shipped (was on this list):**
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

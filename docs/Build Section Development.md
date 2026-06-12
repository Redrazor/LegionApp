# Build Section Development

The plan for rebuilding LegionApp's **Build** section into the core army-list builder —
the "Roster Canvas". Derived from a multi-agent design convergence + rules research
against the AMG Core Rulebook v2.6.0 (eff. 2024-07-19) and Recon Rulebook (eff. 2025-04-30),
cross-checked with LegionHQ2's source.

---

## 0. Key finding — the formats are not what the app assumes

The app's (and CLAUDE.md's) "800 standard / 500 skirmish" is **pre-2024**. As of the v2 refresh:

| Size | What it is | Status | Cap | Rank table (Cmd / Op / Corps / Spec / Sup / Heavy) |
|------|------------|--------|-----|----------------------------------------------------|
| 600  | **Recon** (renamed from Skirmish) | ✅ AMG-official | 600 | **1–1** / 0–1 / **2–4** / 0–2 / 0–2 / 0–1 |
| 800  | Legacy Standard (1st ed) | ⚪ legacy | 800 | 1–2 / 0–2 / 3–6 / 0–3 / 0–3 / 0–2 |
| 1000 | **Standard** (current) | ✅ AMG-official | 1000 | 1–2 / 0–2 / 3–6 / 0–3 / 0–3 / 0–2 |
| 1600 | Grand Army | 🟡 community/legacy | 1600 | 2× standard: 2–4 / 0–4 / 6–12 / 0–6 / 0–6 / 0–4 |

The rank table is **identical** for 600 = old-500 and for 1000 = old-800; only the caps moved.
The current app numbers aren't wrong — they're hard-wired to the wrong caps and don't switch per format.

### Variable point lists
There is **no points→rank formula** in any AMG rule — formats are discrete hand-authored
lookup tables (LegionHQ2 confirms: a lookup keyed by format, not a calculation). Model:
- `rankLimits(format)` → lookup, one row per format = `{ cap, ranks }`.
- For an arbitrary/custom cap: **clamp to the nearest defined bracket ≤ cap** (recommended) or
  multiplier-of-standard `ceil(standardMax × pts/1000)` — both labeled *unofficial*.
- Ship the format dropdown (600/800/1000/1600) first; add optional "Custom" mode later.

### Build-time keywords to enforce
- **Field Commander** — an army with 0 commanders is legal if it contains a unit with this keyword.
- **Entourage** — a unit widens another rank's max by 1.
- **Detachment** — a detachment unit requires ≥1 matching parent unit in the list.
- **Bullet-count uniques** — limit is "N copies of this name across units AND upgrades AND command
  cards", not a bare boolean (most are 1, some 2). Cross-card-type check required.

### Battle deck (now in scope)
v2 deck = **9 cards**: 3 Objective (primary) + 3 Secondary + 3 Advantage. They live in the **same
legionhq2 bundle** the scraper already parses (`cardType:"battle"`; fields
`{id, cardName, cardSubtype, keywords, faction?, imageName}`; Recon flagged by keyword). Map cards
are NOT in their data (gap to flag).

### Longshanks export
Our `Unit.id` already **is** legionhq2's short code (Luke = `"ad"`), and the Longshanks "coded list"
JSON is keyed by exactly those codes — so the exporter is one live-export id-diff from working.

---

## 1. Converged design — "Roster Canvas"

A single responsive component tree that morphs across breakpoints (not two layouts).

- **Permanent rank-tracker footer** (`fixed bottom-0`, safe-area inset): 6 chips `count·min–max`
  (red below min, red+ring over max, muted in-range) + totals `points/cap (N left) · N act · ✓/✗`.
  Save / Share / Print / Export live here so they never scroll away. Tap → full validation checklist.
- **Always-visible catalogue** grouped by rank — desktop shows all 6 groups (sticky headers),
  tablet collapses all but active, phone uses a rank tab-strip. No drawer to *browse*.
- **Tap-to-add is the universal path** (units land deterministically in their rank bag);
  **drag-and-drop is a desktop-only enhancement** with a tap fallback.
- **Quantity via render-time `×N` grouping** — duplicates stay separate `ArmyUnit` entries
  (rules-correct for order tokens); stepper `[− N +]` hidden for uniques; explicit 🗑 always present.
- **Edit is inline-expand-first** — tapping a chip expands it in place (card scan + slot rows);
  tapping an empty slot opens the existing `UpgradePickerDrawer` pre-filtered to that slot + faction
  + unique-safe (bottom-sheet on phone, drawer on tablet, inline on desktop). Live recalc.

### Desktop (≥1024px)
```
┌───────────────────────────────────────────────────────────────────────────┐
│ LEGION ▸ Build  [Empire ▾] [Standard 1000 ▾]   ⌕ Search…           ··· menu │
├──────────────────────────────────┬────────────────────────────────────────┤
│ CATALOGUE (~46%, scrolls)        │ MY ARMY ▸ "Vader's Fist"      [✎ rename] │
│ ▼ COMMANDER          1·1–2 ✓     │ ▼ COMMANDER          1·1–2 ●ok           │
│ ┌─┐ Darth Vader ◈  190 [+] ⠿     │ │⠿ ◈ Vader  Force·Force·Force·Cmd 190 ⌄│ │
│ ┌─┐ Krennic ◈ 90 [✓+] ⠿          │  └ expanded: card scan + slot rows ──┐   │
│ ▼ CORPS              4·3–6 ✓     │   ⬡ Force#0 Force Push (10) ✕         │   │
│ ┌─┐ Stormtroopers 44 [+] ⠿ ×3    │   ⬡ Force#1 + Add Force               │   │
│ ┌─┐ Snowtroopers  48 [+] ⠿       │ ▼ CORPS              4·3–6 ●ok           │
│ … all 6 rank groups, sticky …    │ │⠿ Stormtroopers DLT-19(34) [−3+] 234 ⌄│ │
│ ▸ MERCENARIES (hireable)         │ COMMAND HAND   6/7 ●incomplete [edit ▸] │
│   ≤2 corps / ≤1 each · +1 Allies │ BATTLE DECK    9/9 ●ok        [edit ▸]   │
├──────────────────────────────────┴────────────────────────────────────────┤
│ ⬣C1·1–2 │◆O0·0–2 │▲Corps4·3–6 │✦Sp0·0–3 │⛨Su0·0–3 │⬛H0·0–2 │11act·758/1000 ✓│
│ tap ⌃ → validation checklist            [Save][Share][Print ▾][Export ▾]    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Mobile (375px)
Segmented `[Catalogue] [My Army]` toggle sharing one sticky footer (chips wrap to 2×3); catalogue is
a rank tab-strip; adding uses a full-height sheet that stays open for batch-adding; detail expands
inline; upgrade picker is a bottom-sheet.

### Tablet (768–1023px)
Two panes (catalogue ~50% | army ~50%); catalogue groups collapse except active; footer single row;
unit detail = right-side slide-in drawer (not inline); DnD off (coarse pointer).

---

## 2. Data-model delta

- **`ArmyUnit` — NO change.** `{ uid, unitId, upgrades: {slot,upgradeId}[] }`. No `qty`; `×N` is render-time.
- **`Army`** — replace `gameSize:number` with a **`format`** concept (`{ id, cap }`), plus additive
  optional `commandHand?: string[]` and `battleDeck?: { objective[]; secondary[]; advantage[] }`
  (omitted in Recon).
- **`Unit`/`Upgrade`** — add optional `limit?: number` (default `isUnique ? 1 : 0`) for bullet counts.
- **New `BattleCard` type** (from D0 scrape): `{ id, slug, name, subtype: 'objective'|'secondary'|'advantage', keywords[], faction?, cardImage, isRecon }`.
- **`utils/factions.ts`** — `FORMATS` table + `rankLimits(format)`; keep `RANK_ORDER`, `slotLabel`.
- **`utils/army.ts`** — `validateArmy(army, unitsById, upgradesById, format)`; Field Commander /
  Entourage / Detachment / merc / limit-aware uniques; new pure helpers `groupArmyUnits`,
  `validateCommandHand`, `validateBattleDeck`, `toPlainText`, `toTtsJson`, `toLongshanksJson`.
- **`CompactArmy`** — versioned `v:2` + optional `c` (command hand) / `b` (battle deck); `fromCompact`
  v1-tolerant so existing `?a=` links and saved armies still decode.
- **`stores/army.ts`** — `addCopy(uid)`, `setFormat`, `setCommandHand`/`clearCommandCard`,
  `setBattleCard`/`setBattleDeck`. Existing actions unchanged.

---

## 3. Feature breakdown

Each feature = one `/workflow` cycle (branch → implement → AC → tests → merge → bump).
`[REQUIRED]` = needed for a rules-correct / tournament-legal list. `[NICE]` = enhancement.

### EPIC A — Rules-correct core (pure logic, no UI)
- **A1. Format + multi-size rank limits** `[REQUIRED] M` — `FORMATS` (Recon 600 / Standard 1000 /
  Legacy 800 / Grand Army 1600) + `rankLimits(format)`; `validateArmy(…, format)`; optional Custom
  clamp-to-bracket. Replaces constant `RANK_META`; migrate `Army.gameSize` → `format`; fix CLAUDE.md.
  Files: `utils/factions.ts`, `utils/army.ts`, `composables/useArmyValidation.ts`, `types/index.ts`,
  `stores/army.ts`. Deps: none.
- **A2. Field Commander + Entourage + Detachment + bullet-count uniques** `[REQUIRED] M`. Deps: A1.
- **A3. Mercenary affiliation counting** `[REQUIRED] M` — merc caps + no-min rule; all 6 factions stay
  selectable. Deps: A1.
- **A4. Upgrade eligibility (`requirements`)** `[REQUIRED] M` — the upgrade picker must only offer
  upgrades a given unit can actually equip (e.g. "Bad Batch only", "Stormtroopers only", clone-only,
  keyword/Force-side gated). **Investigation verdict (2026-06-10): the data EXISTS in the legionhq2
  source as a structured `requirements` array but is DROPPED by `normalise.ts` — no card-text parsing
  needed.** Shape: array of criterion objects (`cardName` / `cardSubtype`(=unitType) / `rank` / `faction`
  / `title` / `affiliation` / `keywords[]` / `upgradeBar[]` / `forceAffinity`), with optional
  `"AND"`/`"OR"`/`"NOT"` combinator tokens, recursively nestable; a bare object is an implicit AND.
  364/413 upgrades carry it. Work: (1) keep `requirements` in `buildUpgrades` + tighten its type in
  `normalise.ts` (already declared `unknown[]` at line 22); add `requirements` to the `Upgrade` type
  (`normalise.ts` + `src/types/index.ts`) and to the JSON-serialized field list in `server/db/seed.ts`;
  (2) also carry the dropped `affiliation` field onto `Unit` (needed for `{affiliation}` criteria);
  (3) re-run `npm run scrape -- --skip-images && npm run seed`; (4) add a pure `unitMeetsRequirements(unit, reqs)`
  matcher (`utils/army.ts`) + spec; (5) extend `stores/upgrades.ts` `forSlot(slot, faction, unit?)` to AND
  it in; update the one caller `UpgradePickerDrawer.vue`. Note `forceAffinity` (light/dark side) is the only
  criterion with no direct unit field — needs a small hand-maintained Force-user slug set or fail-open.
  Also fixes the same gap on the Browse tab's suggested upgrades. Deps: A1 (independent; can go anytime).

### EPIC B — Roster Canvas layout
- **B1. Layout shell + breakpoints** `M` — `useBreakpoint`, `BuildLayout`. Deps: none.
- **B2. Permanent rank-tracker footer + live totals + format switcher** `[REQUIRED] M`. Deps: A1, B1.
- **B3. Always-visible catalogue grouped by rank** `L`. Deps: B1, B2.
- **B4. Quantity (`×N`) + delete controls** `[NICE] S`. Deps: B3.

### EPIC C — Edit & upgrades
- **C1. Inline-expand unit detail + slot-filtered upgrade attach** `M` (reuse `UpgradePickerDrawer`).
  Deps: B3.

### EPIC D — Tournament completeness
- **D0. Battle-card scrape → `battlecards.json` + images** `[prereq] M` — extend `scraper/scrape.ts`
  + `normalise.ts`; add `BattleCard` type; seed + route. Deps: none (data only).
- **D1. Command-hand builder** `[REQUIRED] M` — 2/2/2 + auto Standing Orders; commander/faction/unique
  gating (command data already scraped). Deps: A1, B2.
- **D2. Battle-deck builder** `[REQUIRED-standard] M` — 3/3/3, no dupes, hidden in Recon. Deps: D0, D1.

### EPIC E — Export & print
- **E1. Versioned share link (`v:2`)** `[REQUIRED] S`. Deps: D1, D2.
- **E2. Print sheet** `[NICE] S`. Deps: B3, D1.
- **E3. Plain-text + TTS export** `[NICE] S`. Deps: B3.
- **E4. Longshanks JSON export** `[NICE] M` — includes id-crosswalk verification (live legionhq2 diff).
  Deps: E3.

### EPIC F — Enhancements
- **F1. Desktop-only drag-and-drop** (`vue-draggable-plus`, tap fallback) `[NICE] S/M`. Deps: B3, B4.

### Delivery order
A1 → A2/A3 → B1 → B2 → B3 → C1 → B4 → D0 → D1 → D2 → E1 → E2/E3 → E4 → F1.

Data model stays compatible throughout (additive `Army.format`/`commandHand`/`battleDeck`; no `qty`;
`v:2` share format still decodes old `?a=` links).

---

## 4. Open questions / notes
- New official Grand Army (2000+, Adepticon 2026) rank table unpublished — not modeled.
- Map cards absent from legionhq2 battle data — battle deck tracks the 3 objectives only.
- Confirm live legionhq2 battle-deck JSON keys before the E4 Longshanks exporter.

## Status log / resume point

### 2026-06-12 — B3 implemented
**Branch:** `feature/catalogue-by-rank` (off `main`). **Status:** code complete, verified in-app across all
breakpoints, awaiting PR. Continues **Epic B**; fills `BuildLayout`'s `#catalogue` placeholder.

**B3 — Always-visible catalogue grouped by rank: DONE.** Replaces the per-rank "+ Add" → `UnitPickerDrawer`
flow with an always-visible, rank-grouped catalogue. `UnitPickerDrawer.vue` deleted.
- **`utils/army.ts`** — pure `catalogueForRank(units, faction, rank, query)`: units of a rank legal for the
  faction (`unitAllowedInFaction` — mercs by affiliation), filtered by name/title query, cheapest-first.
- **`components/build/RankCatalogue.vue`** — morphs per breakpoint: **desktop** all 6 groups open + sticky
  headers + a **rank-focus chip row** (`All` / per-rank, narrows to one group); **tablet** accordion (one
  group open, `Rank | null` state, click-open-to-collapse-all); **mobile** horizontal rank **tab-strip**
  (`mobileRank` falls back to first rank so an empty accordion state can't crash it). Shared search box;
  `[+]` add disabled when the rank is at its Entourage-adjusted max.
- **`components/build/CatalogueUnitRow.vue`** — row with a legible **landscape art-crop** thumbnail
  (`aspect-[1.41/1] object-cover object-top`, ~96px, matches Browse's card treatment — `portraitImage` is
  never scraped, only the full `cardImage` exists). Tapping the row body **views** the unit; `[+]` adds.
- **`components/browse/UnitProfile.vue`** — refactored to **dual-mode**: optional `slug` prop + `close`
  emit (Build mounts it directly) with the original `/browse/:slug` route behavior as fallback (Browse
  unchanged). Build opens the same full profile drawer (`viewingSlug` ref) — one source of truth, responsive.
- **`views/BuildView.vue`** — renders `<RankCatalogue>` in `#catalogue` (counts/limits/breakpoint props,
  `@add`/`@view`); mounts `<UnitProfile>` in the overlay slot; removed per-rank "+ Add" + the picker drawer.
- **Tests:** `tests/army.spec.ts` +4 `catalogueForRank` (rank+faction filter, sort, merc affiliation gating,
  query). **138 pass; coverage 73.69% (≥50). vue-tsc clean.** Verified in-browser at 1280/900/375 + Browse
  drawer regression check.

**Refinements (user-requested mid-cycle, all in):** tap-to-view via the reused Browse drawer; desktop
rank-focus chips; and a second round on the row itself:
- **Art-square icon** — the row icon is no longer the squished full card. It's a square crop of the card's
  right-hand **character portrait**, zoomed past the rules text via `background-image` + `background-size:
  270%` + `background-position: 86% 9%` in a rounded mask. Legion cards are templated (art always right), so
  the one fixed crop frames the character across humans/Ewoks/etc. (`portraitImage` is still never scraped —
  pure CSS crop, no re-scrape). Tuned in-browser.
- **Stat indicators** — decided by spanning **3 parallel agents** (competitive / rules-efficiency / UX lenses;
  see session). Consensus set, shown as two clusters: **durability** = defense-die pill (red/white + a surge
  ring) · `♥ wounds`; **capability** = `⬡ upgrade-slot count` · best-weapon dice pips (red/black/white).
  **Speed** chevrons are desktop-only (`showSpeed = isDesktop`). Omitted from the row (→ drawer): courage,
  attack/defense surge as their own cells, raw keyword list. New pure `primaryWeaponDice(unit)` (+2 specs).
- **Round portrait icons (2nd round, user rejected the card-crop icons).** The card-crop icon read as
  "awful — white bleeding, miniscule": LHQ2 ships only full card scans, which never crop to a clean bust.
  **Owner-approved exception to single-source:** new `scraper/portraits.ts` (`npm run portraits`) maps our
  units → Tabletop Admiral unit ids (normalised name+title, faction tiebreak; **178/179** matched, 1 miss =
  Paz Vizsla) and self-hosts TTA's bust portraits to `public/images/portraits/<slug>.webp` (**174** have a
  portrait), stamping `portraitImage` onto `units.json`. The whole `portraitImage` pipeline (type, schema
  `portrait_image`, seed, units route) already existed — only needed populating. `CatalogueUnitRow` now shows
  a **round** `<img>` portrait (w-14), `@error`/no-portrait → card-art crop fallback. **Icons only; all card
  DATA stays LHQ2.** CLAUDE.md sourcing section updated; run order `scrape → portraits → seed`.
- **Shared visual language (3rd round).** Extracted `UnitBadge.vue` (round portrait in a faction-coloured
  ring, card-crop/initials fallback) + `UnitIndicators.vue` (the durability/capability/speed cluster) and
  reused both in the catalogue row AND `ArmyUnitCard` — so a fielded unit now shows the same badge + the same
  glanceable stats under its name as the picker. Catalogue rows gained a subtle per-row border for separation.

**Bug found & fixed during verification:** tablet "collapse all" set the active rank to `'' as Rank`;
resizing to mobile then crashed the tab-strip on `undefined.length` — fixed by typing the state `Rank | null`
+ a mobile fallback.

**Next up: C1** — inline-expand unit detail + slot-filtered upgrade attach (reuse `UpgradePickerDrawer`).
Then B4 (qty ×N) → EPIC D. Each = one `/workflow` cycle.

### 2026-06-12 — B2 implemented
**Branch:** `feature/rank-tracker-footer` (off `main`). **Status:** code complete, AC verified in-app,
awaiting PR. Continues **Epic B — Roster Canvas layout** (builds on B1's `#footer` slot + `useBreakpoint`).

**B2 — Permanent rank-tracker footer + live totals + format switcher: DONE.** Fills the pinned footer
slot with the real rank tracker; the standalone "Army Status" block left over in B1's army pane is gone.
- **`src/components/build/RankTrackerFooter.vue`** (new) — presentational; all data via props, all actions
  via emits (`setGameSize`/`save`/`share`/`print`). Renders: **6 rank chips** (`RANK_ORDER`) each
  `Abbr count ·min–max` coloured by `rankChipState` (under = faction-rebels tint, over = same + ring, ok =
  neutral); **totals** (points/cap, `(N left)`, activations `sm:` only, Legal/Illegal pill); the **format
  switcher relocated from the header** (`FORMATS`, `cap`-active); **Save/Share/Print** (Update label when
  editing; Share/Print disabled on empty army); points **progress bar** + optional `shareMsg`.
- **Expanding checklist (revised from plan).** Original build used a Teleported bottom-sheet popup; on
  review we switched to an **in-place footer expansion** — the totals button **toggles** an inline panel at
  the top of the footer that grows **upward** via a `grid-template-rows: 0fr → 1fr` transition (300ms ease-out,
  `max-h-[50vh]` internal scroll). Chevron rotates up↔down; `aria-expanded` reflects state. No Teleport/backdrop.
- **`src/utils/army.ts`** — new pure `rankChipState(count, min, max) → 'under'|'over'|'ok'` (+ `RankChipState`).
- **`src/views/BuildView.vue`** — `ranks` computed (`{count,min,max}` per rank; **max folds in the Entourage
  bonus** via `limits`, not raw `rankLimits`); renders `<RankTrackerFooter>` in `#footer`; header format
  switcher + the old inline footer/Army-Status blocks removed.
- **Tests:** `tests/army.spec.ts` +3 `rankChipState` cases (at-min/at-max ok, over, under, optional-empty).
  **134 pass; vue-tsc clean.** AC 1–10 verified in-browser (Playwright): chips colour live, format switch
  recomputes limits, footer expands/collapses up with animation.

**Decisions locked:** footer is a dumb presentational component (no store access — BuildView owns state);
checklist is inline-expand, not a popup (user preference); chip max uses Entourage-adjusted `limits`.

**Next up:** **B3** — always-visible catalogue grouped by rank (fills the `#catalogue` placeholder) → C1
(inline-expand unit detail + slot-filtered upgrade attach) → B4 (qty ×N). Each = one `/workflow` cycle.

### 2026-06-12 — B1 implemented & merged (v0.10.0)
**Branch:** `feature/build-layout-shell` (off `main`). **PR #8 merged (squash, `410f07c`).** Epic A is
complete; this opens **Epic B — Roster Canvas layout**.

**B1 — Layout shell + breakpoints: DONE.** Foundation only — no new builder behavior; existing Build
functionality preserved end-to-end.
- **`src/composables/useBreakpoint.ts`** — reactive `'mobile' | 'tablet' | 'desktop'` (edges **768** /
  **1024**, Tailwind md/lg-aligned) + `isMobile/isTablet/isDesktop` refs; SSR-safe (defaults desktop when
  no `window`); resize listener removed on unmount. Pure `resolveBreakpoint(width)` + `TABLET_MIN`/
  `DESKTOP_MIN` exported for the spec.
- **`src/components/build/BuildLayout.vue`** — the shell that *morphs* (not swaps): desktop/tablet = two
  panes `grid lg:grid-cols-[minmax(0,46fr)_minmax(0,54fr)] md:grid-cols-2` (catalogue | army) + a
  `fixed bottom-0` footer (safe-area inset); mobile = sticky segmented `[Catalogue][My Army]` toggle
  (`mobilePane` ref, defaults `army`) showing one pane via `v-show`. Named slots `header` / `catalogue` /
  `army` / `footer` + a **default slot** for overlays (the pickers live there, else they wouldn't mount).
  Body has `pb-24` so content clears the fixed footer.
- **`src/views/BuildView.vue`** — rendered through `BuildLayout`. Header controls → `#header`; rank
  sections + Army Status checklist + Saved Armies → `#army`; live totals (pts/cap, left, act, Legal pill)
  + progress bar + **Save/Share/Print moved into the footer** → `#footer`; `UnitPickerDrawer` in the
  default slot. Catalogue pane is a **dashed placeholder** until B3; per-rank **+ Add** → unit picker flow
  unchanged. (The old sticky-top summary is gone — its content is now the pinned footer.)
- **Tests:** `tests/useBreakpoint.spec.ts` +4 (boundaries 767/768/1023/1024). **131 pass; coverage 73.37%
  (≥50). vue-tsc clean; production build OK.**

**Next up:** **B2** — permanent rank-tracker footer (6 rank chips `count·min–max`, totals) + format
switcher relocated into the footer; tap → validation checklist. Then B3 (always-visible catalogue grouped
by rank) → C1 (inline-expand unit detail + slot-filtered upgrade attach). The footer slot + `useBreakpoint`
from B1 are the hooks B2 builds on.

### 2026-06-12 — A3 implemented
**Branch:** `feature/mercenary-counting` (off `main`). **Status:** code complete, awaiting AC sign-off + PR.

**A3 — Mercenary affiliation counting: DONE.** Pure logic in `src/utils/army.ts`, surfaced via the
validation checklist. Rules confirmed with the user: affiliation match + per-rank caps + no-min.

- **Data:** carried the dropped plural `affiliations` (joinable factions, e.g. Boba `["empire"]`, Cad Bane
  `["empire","separatists"]`, Pyke Foot Soldiers all four) onto `Unit` — scrape → normalise (filtered to
  valid FACTIONS) → schema/seed (`affiliations` JSON col) → `units` route. 26/40 mercenary units carry it;
  the 14 without are Mandalorian/clan units (Battle Force still out of scope). Re-scrape diff = +affiliations
  on units only (reverted a transient Philibert `products.json` drop — unrelated live-fetch churn).
- **Rules (`validateArmy` + `mercenaryIssues` / `MERC_RANK_CAP`):**
  - **Affiliation** — a `faction:'mercenary'` unit is legal only if `army.faction ∈ unit.affiliations`
    (none ⇒ can't ally; flagged). A mercenary-faction army fields them natively (check skipped). New
    **Allies** checklist item.
  - **Caps** — ≤2 mercenary Corps, ≤1 of each other rank (`MERC_RANK_CAP`). New **Mercenaries** item.
  - **No-min** — mercenaries count toward rank *maximums* but not *minimums*: the rank loop measures the
    minimum against non-merc counts (`count − merc.rankCounts[rank]`), detail reads e.g. `3 (need 3 non-merc)`.
    Field Commander relaxation now also keys off the non-merc commander count.
- **One UI touch:** shared helper `unitAllowedInFaction(unit, faction)` (non-merc → own faction; merc →
  affiliation match / native in a merc army) gates the Build **unit picker** (`UnitPickerDrawer.vue`) so it
  only *suggests* legal choices — e.g. the two Boba Fett operatives (`aw` Empire / `tl` Rebels) no longer
  both appear; Empire offers only `aw`. The same helper backs `mercenaryIssues`' Allies check, so picker and
  validation can't diverge. (Mirrors how A4 gated the upgrade picker.)
- **Tests:** +6 specs (mercenaryIssues affiliation/native/caps; validateArmy no-min/Allies/Mercenaries).
  **124 pass; coverage 74.12% (≥50). vue-tsc clean.** Real-data check: Boba legal in Empire, flagged in Rebels.

**Next up:** Epic B — the Roster Canvas UI. **B1** (layout shell + breakpoints: `useBreakpoint`, `BuildLayout`)
→ B2 (permanent rank-tracker footer + format switcher) → B3 (always-visible catalogue grouped by rank) → C1.

### 2026-06-12 — A4 implemented (side cycle, ahead of A3)
**Branch:** `feature/upgrade-eligibility` (off `main`). **Status:** code complete, awaiting AC sign-off + PR.
Done out of order (user asked for the Browse-profile angle first); A3 still pending.

**A4 — Upgrade eligibility (`requirements`): DONE.** The upgrade picker (Build) AND the Browse profile's
"Available Upgrades" now only offer upgrades a unit can legally equip.

- **Data was present but dropped, as the plan predicted.** The legionhq2 source carries a structured
  `requirements` array on **364/413 upgrades** — no card-text parsing. Verified shape: a group = array of
  criterion objects and/or nested sub-groups, optionally led by `AND`/`OR`/`NOT` (default AND). Criterion
  keys: `cardName, cardSubtype (unitType), rank, faction, title, affiliation, keywords[], upgradeBar[],
  forceAffinity`. Examples: Jedi Training `["OR",{cardName:"Jedi Knight"},{cardName:"Jedi Knight General"}]`;
  Echo `["AND",{cardSubtype:"clone trooper"},["OR",{rank:"corps"},{rank:"special"}]]`; T-21
  `["AND",{cardName:"Imperial Special Forces"},["NOT",{title:"Inferno Squad"}]]`.
- **Pipeline:** `scraper/normalise.ts` — carry `requirements` in `buildUpgrades`; carry unit `affiliation`
  (also dropped; needed for `{affiliation}` criteria, e.g. Mandalorian clans). New `UpgradeRequirement`
  types (NB: modelled the recursive group as an `interface … extends Array` — a recursive `… | T[]` type
  alias trips TS2589 "excessively deep" when inferred through the upgrades store's `byId` Map). Added to
  `src/types/index.ts`, `server/db/schema.ts` + `seed.ts` (`requirements` JSON col on upgrades,
  `affiliation` col on units), and both routes. Re-scrape diff: +`affiliation` on 179 units, +`requirements`
  on 364 upgrades, nothing else.
- **Matcher:** pure `unitMeetsRequirements(unit, requirements)` in `src/utils/army.ts` (+ `evalReqGroup` /
  `matchCriterion` / `unitHasKeyword`). Empty/absent ⇒ equippable; criteria the unit can't determine fail
  open. `forceAffinity` (light/dark) is the only criterion with no unit field → hand-set `FORCE_SIDE` map in
  `utils/factions.ts` (keyed by lowercased name; unlisted Force users fail open). **Audit: every force-slot
  unit in the catalogue is covered — no fail-open gaps.**
- **Consumers:** `stores/upgrades.ts` `forSlot(slot, faction, unit?)` ANDs the matcher when a unit is given;
  `ProfileUpgrades.vue` now takes the whole `unit` (was bar+faction); `UpgradePickerDrawer.vue` takes a
  `unit?` prop, threaded from `ArmyUnitCard.vue`.
- **Real-data sanity:** Stormtroopers 198→31 legal, The Bad Batch 92→4 (Bad-Batch-only heavy weapons),
  Luke sees only light Force powers, Vader only dark. **Tests:** +8 matcher specs; **118 pass; coverage
  73.25% (≥50). vue-tsc clean.**

**Next up:** A3 (mercenary affiliation counting), then B1 (layout shell) — the Roster Canvas UI epics.

### 2026-06-11 — A2 implemented
**Branch:** `feature/build-keyword-rules` (off `main`). **Status:** code complete, awaiting AC sign-off + PR.

**A2 — Field Commander + Entourage + Detachment + bullet-count "uniques": DONE.** Mostly pure logic in
`src/utils/army.ts`, surfaced through the existing `validateArmy` checklist. One small UI touch was
unavoidable: `BuildView.vue`'s catalogue "+ Add" button gates on its own per-rank max, so it now folds the
Entourage bonus into its `limits` computed (reusing `entourageBonuses`) — otherwise Add stayed disabled at
the base cap and you couldn't add the over-cap unit. Epic B still owns the broader UI rebuild.

- **Investigation finding (corrects the plan):** the "some uniques allow 2" framing was inverted. The
  legionhq2 source carries **`uniqueCount`** — a per-army copy cap on **16 non-unique "limited" upgrades**
  (all value 2: HQ Uplink, the Jedi Training family, Flame Projector, etc.), *not* a 2-copy allowance on
  uniques. The 4 "Jedi Training — …" cards share `cardName "Jedi Training"`, so the cap of 2 is across the
  family (already grouped because `buildUpgrades` sets `name = cardName`). No 2-copy uniques exist.
- **Data pipeline:** `scraper/normalise.ts` — `Lhq2Card.uniqueCount` + `Upgrade.limit?` (emitted only when
  capped). `src/types/index.ts` — `Upgrade.limit?`. `server/db/schema.ts` + `seed.ts` — `limit_count`
  column (`limit` is a SQL reserved word). `server/routes/upgrades.ts` — maps it back out. Re-ran
  `npm run scrape -- --skip-images` + reseed: **only** diff is +16 `"limit"` lines in `upgrades.json`.
- **Validation (`src/utils/army.ts`):** new pure helpers `cardLimit` (`limit ?? (isUnique?1:0)`, 0=unlimited),
  `limitViolations` (counts units+upgrades by name; folds duplicate-uniques and over-cap limited upgrades
  into the existing **Uniques** item), `hasFieldCommander` (0 commanders legal if a unit has the keyword —
  relaxes the commander min, detail `"0 / 2 (Field Commander)"`), `entourageBonuses` (`"Entourage <name>"`
  widens that unit's rank max +1), `unmetDetachments` (`"Detachment <name>"` needs a non-detachment parent
  of that name; `"Detachment <rank>"` needs a unit of that rank — surfaces a new **Detachment** item).
- **Tests:** `tests/army.spec.ts` +12 (cardLimit / limitViolations / Field Commander / Entourage /
  Detachment + integration). **109 tests pass; coverage 71.67% (≥50). vue-tsc clean.**

**Decisions locked:** `limit` keyed by card `name` (groups the Jedi Training family); command-hand cards
not yet counted toward limits (no command hand until D1 — fold in then); detachment rank-token check uses
the `Rank` enum. **Entourage names can be ambiguous** — "Darth Vader" exists as both a commander (`at`) and
an operative (`fn`) card, so `entourageBonuses` indexes name → *all* ranks it spans and bumps each (a single
name-keyed lookup silently picked the operative and the bonus missed commander). Slightly permissive in the
two-Vader edge case (grants +1 to both ranks) but correct for every real entourage; bonus applies even when
the named unit isn't fielded yet, which is what lets the Add button enable before you add it.

**Next up (delivery order):** A3 (mercenary affiliation counting) → A4 (upgrade `requirements` — investigation
already done, see Epic A) → B1 → B2 → B3 → C1 → … Each = one `/workflow` cycle.

### 2026-06-10 — A1 implemented, PR open
**Branch:** `feature/build-format-rank-limits` (off `main`). **PR:** https://github.com/Redrazor/LegionApp/pull/4
**Status:** code complete, PR open, awaiting merge approval. Do NOT merge until the user approves the PR.

**A1 — Format + multi-size rank limits: DONE.**
- `src/utils/factions.ts` — added `GameFormat`/`RankLimits` types, `FORMATS` table (Recon 600,
  Standard-800 legacy, Standard 1000, Grand Army 1600), `formatForCap(cap)` (clamp-to-nearest-bracket,
  floor at smallest), `rankLimits(cap)`, `formatName(cap)`. `RANK_META` now derived from the Standard
  format (kept for Reference tab + browse filters). Removed the old constant `RANK_META`/`RANK_ORDER` block.
- `src/utils/army.ts` — `validateArmy` reads `rankLimits(army.gameSize)`; removed the hard-coded
  `commander===0` / `corps<3` fallbacks (the rank loop now surfaces required-but-empty ranks itself).
- `src/types/index.ts` — `Army.gameSize` comment updated (it stores the points cap).
- `src/stores/army.ts` — `emptyArmy()` default cap is now **1000** (current Standard).
- `src/views/BuildView.vue` — 4-format selector (was 800/500); rank headers + "+ Add" disable use a
  reactive `limits = rankLimits(draft.gameSize)`.
- `CLAUDE.md` — corrected the stale "800/500" data-model lines to the per-format model.
- `tests/army.spec.ts` — +8 tests (formatForCap exact/clamp/floor, rank tables vs rulebooks,
  per-format validateArmy). **97 tests pass; coverage 68.96% (≥50). vue-tsc clean.**

**Decisions locked:** numeric `gameSize` cap (no `format` id field, no share-link migration in A1);
all 6 factions stay selectable; clamp-to-bracket for arbitrary caps.

**Next up (delivery order):** A2 → A3 → A4 (upgrade `requirements` — investigation done, see Epic A) →
B1 → B2 → B3 → C1 → B4 → D0 → D1 → D2 → E1 → E2/E3 → E4 → F1. Each = one `/workflow` cycle.

**After PR merges (Step 8):** `npm version minor` on `main` (new feature). No App.vue footer version
string exists, so nothing to bump there.

**Env note:** dev server may still be running in the background (Vite :5180, API :3001).

### 2026-06-10 — Plan created.

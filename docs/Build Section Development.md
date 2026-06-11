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

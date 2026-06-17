# LegionApp — Claude Instructions

A companion app for **Star Wars: Legion** (Atomic Mass Games), sister to ShatterApp
(`../ShatterApp`, for Shatterpoint). Same architecture: Vue 3 + TS + Vite + Tailwind v4 +
Pinia, with an Express + SQLite (Drizzle) backend and a TypeScript data scraper.

## Architecture

- **`scraper/`** — `scrape.ts` (orchestrator + Legion HQ 2 bundle extraction + image
  download), `normalise.ts` (pure, testable transforms from the single source). Run `npm run scrape`.
- **`public/data/*.json`** — generated catalogue: `units`, `upgrades`, `commands`,
  `products`, `keywords`, `battleForces`, `battleCards`. **`public/images/{units,upgrades,commands,battle}/`** — self-hosted
  card scans (git-ignored). **`public/images/overrides/<slug>.webp`** — hand-placed
  high-res cards; copied in and never overwritten (tracked in git).
- **`server/`** — Express API. `db/schema.ts` + `db/seed.ts` (raw-SQL create + JSON seed;
  array fields incl. `weapons` stored as JSON text). Routes: `units`, `upgrades`,
  `commands`, `products`. `rooms.ts` + socket.io in `index.ts` are scaffolding for the
  future Play feature. The DB reseeds from `public/data` on every server start.
- **`src/`** — Vue app. `types/index.ts` is the shared data contract (`Unit` incl.
  `weapons: Weapon[]`). Stores fetch via `utils/api.ts` (`loadCatalogue`) which tries the
  API then falls back to static JSON. Pure logic lives in `utils/army.ts` (validation,
  points, share encoding) and `utils/factions.ts` (faction/rank metadata, army limits,
  slot labels) — keep it there and tested. Theme tokens in `style.css` switch on
  `html.light` (dark default, orange accent; light = monochrome); `composables/useTheme.ts`.

## Data model (Legion-specific)

- **Factions:** `rebels`, `empire`, `republic`, `separatists`, `mercenary` (LHQ `fringe` → `mercenary`).
- **Ranks:** `commander`, `operative`, `corps`, `special`, `support`, `heavy`. Limits are
  **per-format** — `rankLimits(cap)` (`utils/factions.ts`), not a constant. Standard (1000):
  1–2 / 0–2 / 3–6 / 0–3 / 0–3 / 0–2. `RANK_META` still exports the Standard table for the
  Reference tab + browse filters.
- **Game formats** (`FORMATS` in `utils/factions.ts`, keyed by points cap): Recon 600 &
  Standard 1000 are AMG-official (2024 v2); Standard-800 (1st-ed legacy) and Grand Army 1600
  (community, 2× standard) are also selectable. `rankLimits(cap)` clamps an arbitrary cap down
  to the nearest bracket — there is NO points→rank formula. `Army.gameSize` stores the cap.
  (Old "800/500 standard/skirmish" was pre-2024.)
- A unit's `upgradeBar` is an ordered list of slot types; the builder keys equipped
  upgrades by `"<slot>#<index>"` so duplicate slots (e.g. Force×3) are independent.

## Data sourcing — SINGLE SOURCE OF TRUTH: Legion HQ 2

- **Legion HQ 2** (`legionhq2.com`) is the **only** card-data source. It is the
  current-edition (2024 "v2" refresh) builder. `scrape.ts` fetches its SPA JS bundle and
  brace-matches/extracts every embedded card (`extractCards`): ~179 units, ~413 upgrades,
  ~235 commands — each keyed by a unique id with its own `stats`, `weapons`, `keywords`,
  `upgradeBar`, and `imageName`. Images come from its open CDN
  `d2maxvwz12z6fm.cloudfront.net/{unitCards,upgradeCards,commandCards}/<imageName>`.
- Because each card is keyed by id, there is **no merging or name-based reconciliation** —
  multi-card characters (e.g. Han Solo Commander vs Operative) stay distinct with their
  own data. Do NOT reintroduce name-keyed merging.
- The keyword **glossary** text is **owner-maintained**, NOT scraped. `Keyword_glossary.md`
  (repo root) is the single source of truth — every keyword's name + rules text transcribed
  verbatim from the official rulebook (currently the April 2026 PDF, glossary pp. 46–63).
  `npm run keywords` (`scraper/keywords.ts` → pure parser `scraper/keywordGlossary.ts`)
  regenerates `public/data/keywords.json` from it and fails loudly if any card-referenced
  keyword stops resolving. **To change a keyword's text, edit the `.md` and re-run `npm run
  keywords`** — never hand-edit `keywords.json`. (The old `Electrynth/legion-hq-web` keyword
  dump was 1st-edition and ~41 entries were materially wrong; it is no longer used.)
- **No third-party data sources.** LHQ2 + the owner-maintained `Keyword_glossary.md` are the
  whole supply. (Tabletop Admiral was previously used for portrait busts and a few upgrade
  keyword fills; **both were expunged in Feature 8** — do NOT reintroduce TTA or any other
  external source.)
  - **Unit portrait icons** — LHQ2 ships only full card scans, so `npm run portraits`
    (`scraper/portraits.ts`) crops the round Build badge straight out of each unit's OWN card
    scan (`public/images/units/<slug>.webp` → `public/images/portraits/<slug>.webp`, 40×40) and
    stamps `portraitImage` for all 180. Every crop is **hand-tuned per unit** in
    `CARD_CROP_PORTRAITS` (a square region in native pixels, centred on the figure's face) — one
    entry per catalogue unit. A unit only lacks a portrait if it has no entry there (e.g. a new
    unit after a scrape) or its card scan is missing — the UI then shows a neutral "no portrait"
    silhouette (`UnitBadge.vue`), never a guessed crop. `portrait-validation.html` (repo root,
    `npm run portraits:validate`) renders every badge with its #id for eyeballing the crops.
  - **Upgrade keywords** — the ~24 upgrades LHQ2 ships with empty `keywords` (e.g. DH-447 Sniper
    → Sniper Team) carry **owner-maintained** keyword tags directly in `upgrades.json`, read off
    the physical cards. Every tag resolves against `Keyword_glossary.md`. There is no fetch step;
    edit `upgrades.json` directly to change them. LHQ2 stays authoritative where it has keywords.
  - **Effect *text* exists nowhere as data** (LHQ2 `text` is null) — only on the card image, which
    the Build inspect gallery shows. Do not try to source it.
  - **Everything else stays LHQ2-only** (stats, weapons, costs, ranks, requirements, etc.). Run
    order after a re-scrape: `scrape` → `portraits` → `seed`.
- Card art & rules text are © AMG / Lucasfilm — keep the in-app + README disclaimers.

## Conventions

- Match ShatterApp patterns. Mobile-first; the `/browse/:slug` child route opens the
  profile drawer over the grid (Teleport + slide transition). Popovers/lightboxes that
  must escape the drawer's overflow are Teleported to `<body>` with fixed positioning.
- Keep `vue-tsc --noEmit` clean (strict, `noUnusedLocals`). Run `npm test` before finishing.
- New pure logic → a `utils/`/`scraper/` module with a spec in `tests/`. Coverage
  threshold 50% (`vitest.config.ts`); scraper/normalise, army utils, API routes carry it.
- After changing `normalise.ts` (or any re-scrape), run the FULL pipeline, not just seed:
  `npm run scrape -- --skip-images` → `npm run portraits` → `npm run seed`. A scrape regenerates
  `units.json`/`upgrades.json` from LHQ2, which has **no `portraitImage`** — skipping the
  portraits step nulls every Build badge (they fall back to the "no portrait" silhouette).
  A scrape also re-empties the ~24 owner-maintained upgrade keyword tags (LHQ2 ships them blank),
  so re-apply them by hand if they regress. `tests/catalogue-integrity.spec.ts` guards both; run
  `npm test` before committing scraped data. The scrape no longer touches `keywords.json`
  (owner-maintained from `Keyword_glossary.md` — see above), but still drifts Philibert products, so
  `git checkout HEAD -- public/data/products.json` after a scrape.
- Follow the `/workflow` skill for features (branch → implement → AC → tests → merge → bump).

## Deploy

- **App** → Vercel (SPA), **API** → Render, **card images** → Firebase Hosting (project
  `legionapp-images`, live at `https://legionapp-images.web.app`). `src/utils/imageUrl.ts`
  rewrites `/images/...` paths to that CDN in production.
- **Images are self-hosted and git-ignored.** Firebase serves the top-level `images-compressed/`
  dir (NOT `public/images/`). After any scrape that adds units/upgrades, deploy the new scans or
  production 404s them. Flow: `npm run images:compress` (compresses `public/images` → WebP 800px
  Q80 into `images-compressed/`, incremental) then deploy.
- **Deploy gotcha:** the `images:deploy` script is `firebase deploy --only hosting`, which assumes
  a global `firebase` binary that is often NOT on PATH here. Use
  `npx -y firebase-tools deploy --only hosting` instead (note: the CLI package is `firebase-tools`,
  not `firebase` — `npx firebase` resolves the web SDK and fails). The login token is stored in
  `~/.config/configstore/firebase-tools.json`, so the deploy runs non-interactively.

## Verify

`npm run dev:all` → 5173 (app) + 3001 (API). Browse groups by faction; Build enforces
rank/points/faction/unique rules live; Collection persists; Reference shows the glossary.

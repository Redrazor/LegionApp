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
- The keyword **glossary** text is the one secondary source: `keywords.js` from
  `Electrynth/legion-hq-web` (MIT), for the Reference tab + keyword popovers only.
- **Tabletop Admiral is a secondary source for two owner-approved things only:**
  - **Unit portrait icons** — TTA's purpose-made busts (`units-new/portraits/<id>.webp`). LHQ2
    ships only full card scans, so the Build round icons come from TTA, self-hosted via
    `npm run portraits` (maps our units→TTA ids by name, downloads to
    `public/images/portraits/<slug>.webp`, stamps `portraitImage`; ~174/179, rest fall back to a
    card-art crop).
  - **Missing upgrade keywords** — LHQ2 leaves ~123/413 upgrades with empty `keywords` (e.g.
    Situational Awareness → Outmaneuver). `npm run upgrade-keywords` fills ONLY the empty ones from
    TTA's `keyword_ids` (+`/api/keywords` names; strips the literal "X" value placeholder), matched
    by name (+24; the rest are genuinely effect-only upgrades). LHQ2 stays authoritative where it
    has keywords.
  - **Effect *text* exists nowhere as data** (LHQ2 + TTA `text` both null) — only on the card image,
    which the Build inspect gallery shows. Do not try to source it.
  - **Everything else stays LHQ2-only** (stats, weapons, costs, ranks, requirements, etc.). Run order
    after a re-scrape: `scrape` → `portraits` → `upgrade-keywords` → `seed`.
- Rejected as a *data* source for stats/scans: tabletopadmiral.com card scans (1st-edition art) and
  legion-hq-web `cards.json` (older; name collisions cross-contaminated skills). TTA is used only for
  the two narrow things above — never for unit/upgrade stats.
- Card art & rules text are © AMG / Lucasfilm — keep the in-app + README disclaimers.

## Conventions

- Match ShatterApp patterns. Mobile-first; the `/browse/:slug` child route opens the
  profile drawer over the grid (Teleport + slide transition). Popovers/lightboxes that
  must escape the drawer's overflow are Teleported to `<body>` with fixed positioning.
- Keep `vue-tsc --noEmit` clean (strict, `noUnusedLocals`). Run `npm test` before finishing.
- New pure logic → a `utils/`/`scraper/` module with a spec in `tests/`. Coverage
  threshold 50% (`vitest.config.ts`); scraper/normalise, army utils, API routes carry it.
- After changing `normalise.ts` (or any re-scrape), run the FULL pipeline, not just seed:
  `npm run scrape -- --skip-images` → `npm run portraits` → `npm run upgrade-keywords` →
  `npm run seed`. A scrape regenerates `units.json`/`upgrades.json` from LHQ2, which has **no
  `portraitImage`** and leaves ~123 upgrades with empty keywords — skipping the portraits/
  upgrade-keywords steps nulls every Build badge (they fall back to cropped card art) and drops
  the TTA keyword fills. `tests/catalogue-integrity.spec.ts` guards this; run `npm test` before
  committing scraped data. Also `git checkout HEAD -- public/data/keywords.json public/data/products.json`
  after a scrape (it overwrites the curated glossary + drifts Philibert products).
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

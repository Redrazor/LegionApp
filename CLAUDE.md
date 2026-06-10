# LegionApp — Claude Instructions

A companion app for **Star Wars: Legion** (Atomic Mass Games), sister to ShatterApp
(`../ShatterApp`, for Shatterpoint). Same architecture: Vue 3 + TS + Vite + Tailwind v4 +
Pinia, with an Express + SQLite (Drizzle) backend and a TypeScript data scraper.

## Architecture

- **`scraper/`** — `scrape.ts` (orchestrator + Legion HQ 2 bundle extraction + image
  download), `normalise.ts` (pure, testable transforms from the single source). Run `npm run scrape`.
- **`public/data/*.json`** — generated catalogue: `units`, `upgrades`, `commands`,
  `products`, `keywords`. **`public/images/{units,upgrades,commands}/`** — self-hosted
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
- **Ranks:** `commander` (1–2), `operative` (0–2), `corps` (3–6), `special` (0–3),
  `support` (0–3), `heavy` (0–2). Limits live in `RANK_META` (`utils/factions.ts`).
- **Game sizes:** 800 (standard) / 500 (skirmish).
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
- Rejected earlier: tabletopadmiral.com (its Cloudinary scans were 1st-edition art) and
  legion-hq-web `cards.json` (older; name collisions cross-contaminated skills).
- Card art & rules text are © AMG / Lucasfilm — keep the in-app + README disclaimers.

## Conventions

- Match ShatterApp patterns. Mobile-first; the `/browse/:slug` child route opens the
  profile drawer over the grid (Teleport + slide transition). Popovers/lightboxes that
  must escape the drawer's overflow are Teleported to `<body>` with fixed positioning.
- Keep `vue-tsc --noEmit` clean (strict, `noUnusedLocals`). Run `npm test` before finishing.
- New pure logic → a `utils/`/`scraper/` module with a spec in `tests/`. Coverage
  threshold 50% (`vitest.config.ts`); scraper/normalise, army utils, API routes carry it.
- After changing `normalise.ts`, re-run `npm run scrape -- --skip-images` then `npm run seed`.
- Follow the `/workflow` skill for features (branch → implement → AC → tests → merge → bump).

## Verify

`npm run dev:all` → 5173 (app) + 3001 (API). Browse groups by faction; Build enforces
rank/points/faction/unique rules live; Collection persists; Reference shows the glossary.

# LegionApp — Claude Instructions

A companion app for **Star Wars: Legion** (Atomic Mass Games), sister to ShatterApp
(`../ShatterApp`, for Shatterpoint). Same architecture: Vue 3 + TS + Vite + Tailwind v4 +
Pinia, with an Express + SQLite (Drizzle) backend and a TypeScript data scraper.

## Architecture

- **`scraper/`** — `scrape.ts` (orchestrator), `normalise.ts` (pure, testable merge transforms),
  `fkey-maps.ts` (tabletopadmiral numeric key → string maps). Run `npm run scrape`.
- **`public/data/*.json`** — generated catalogue: `units`, `upgrades`, `commands`,
  `products`, `keywords`. **`public/images/`** — self-hosted card scans (git-ignored).
- **`server/`** — Express API. `db/schema.ts` + `db/seed.ts` (raw-SQL create + JSON seed;
  array fields stored as JSON text). Routes: `units`, `upgrades`, `commands`, `products`.
  `rooms.ts` + socket.io in `index.ts` are scaffolding for the future Play feature.
  The DB reseeds from `public/data` on every server start.
- **`src/`** — Vue app. `types/index.ts` is the shared data contract. Stores fetch via
  `utils/api.ts` (`loadCatalogue`) which tries the API then falls back to static JSON.
  Pure logic lives in `utils/army.ts` (validation, points, share encoding) and
  `utils/factions.ts` (faction/rank metadata + army limits) — keep it there and tested.

## Data model (Legion-specific)

- **Factions:** `rebels`, `empire`, `republic`, `separatists`, `mercenary` (LHQ `fringe` → `mercenary`).
- **Ranks:** `commander` (1–2), `operative` (0–2), `corps` (3–6), `special` (0–3),
  `support` (0–3), `heavy` (0–2). Limits live in `RANK_META` (`utils/factions.ts`).
- **Game sizes:** 800 (standard) / 500 (skirmish).
- A unit's `upgradeBar` is an ordered list of slot types; the builder keys equipped
  upgrades by `"<slot>#<index>"` so duplicate slots (e.g. Force×3) are independent.

## Data sourcing

- **tabletopadmiral.com** `/api/allunits-for-collection` — current unit list + Cloudinary
  card images (public). Lightweight stats; hidden/not-public cards are filtered out.
- **Legion HQ** (`Electrynth/legion-hq-web`, MIT) `cards.json` + `keywords.js` — structured
  stats, upgrade slots, command cards, keyword glossary, points history. Merged by
  normalised card name; LHQ-only units are appended (no scan, render from data).
- Card art & rules text are © AMG / Lucasfilm — keep the in-app + README disclaimers.

## Conventions

- Match ShatterApp patterns. Mobile-first; the `/browse/:slug` child route opens the
  profile drawer over the grid (Teleport + slide transition).
- Keep `vue-tsc --noEmit` clean (strict, `noUnusedLocals`). Run `npm test` before finishing.
- New pure logic → a `utils/` module with a spec in `tests/`. Coverage threshold is 50%
  (see `vitest.config.ts`); the scraper/normalise, army utils, and API routes carry it.
- After changing `normalise.ts` or `fkey-maps.ts`, re-run `npm run scrape -- --skip-images`
  then `npm run seed`.

## Verify

`npm run dev:all` → 5173 (app) + 3001 (API). Browse groups by faction; Build enforces
rank/points/faction/unique rules live; Collection persists; Reference shows the glossary.

# LegionApp

A companion web app for **Star Wars: Legion**, the miniatures battle game by Atomic Mass Games.

LegionApp lets you browse units, build and validate armies, and track your collection — from a clean, mobile-first interface built for the game table. Free, no login, installable as a PWA. It's the sister app to [ShatterApp](https://shatterapp.com) (for Star Wars: Shatterpoint).

> **Data source:** All card data and images come from [Legion HQ 2](https://legionhq2.com), the current-edition (2024 "v2" refresh) army builder — the single source of truth for units, upgrades, commands, stats, weapons, keywords, and upgrade bars. The keyword **glossary** text is the one secondary source, from the open-source [Legion HQ](https://github.com/Electrynth/legion-hq-web) project (MIT). Huge thanks to both for maintaining such thorough Legion databases.

---

## Features

### Browse
- **Faction-grouped grid** of every unit, with card-scan thumbnails, points cost, rank, and unique markers
- **Search** by name, title, or keyword; **filter** by faction, rank, keyword (type-ahead), favorites, and owned-only
- Filter state is reflected in the URL for **shareable links**
- **Unit profile drawer** — full card scan, a native stat block (defense / wounds / courage / speed / surge), the upgrade-slot bar, keywords with **tap-to-define glossary popovers**, errata & points history, and related units
- **Favorites** persist across sessions

### Build *(the heart of the app)*
- **Faction-based army builder** at Standard (800) or Skirmish (500) points
- Add units by rank via a searchable picker; equip **upgrades into each slot** with a slot-aware, faction-legal picker
- **Live validation**: rank limits (1–2 Commander, 0–2 Operative, 3–6 Corps, 0–3 Special Forces, 0–3 Support, 0–2 Heavy), points ceiling, single-faction rule (mercenaries may ally in), and duplicate-unique conflicts — each shown with a plain-English ✓/✕ status
- Running **points bar**, **activation count**, and legality badge
- **Save, load, rename, and delete** multiple armies (persisted locally)
- **Share via URL** (compact encoded list) and **print** a clean army sheet

### Play
- *Coming soon* — a live in-game tracker (wounds, suppression, tokens, command pips) with real-time multiplayer. The socket.io backend is already scaffolded.

### Collection
- Track which **expansions** you own, by quantity, grouped by faction
- **Stats dashboard**: expansions owned / total and per-faction progress bars
- Owned expansions power the **“Owned” filter** in Browse
- **JSON import / export** backup of your collection and favorites

### Reference
- **Keyword glossary** — searchable definitions of every game keyword
- **Icons & limits** — upgrade-slot reference, rank army limits, and factions
- **Rulebook** — embedded viewer + link to the official AMG Core Rulebook and Organized Play docs

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vue 3 + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| State | Pinia (with `pinia-plugin-persistedstate`) |
| Backend | Express 5 + SQLite via Drizzle ORM |
| Multiplayer (future) | socket.io (scaffolded) |
| Data pipeline | TypeScript scraper → `public/data/*.json` + `public/images/` |
| PWA | `vite-plugin-pwa` (Workbox) |
| Tests | Vitest + happy-dom + Supertest |

## Getting Started

```bash
npm install

# Fetch latest data + download card images (writes public/data + public/images)
npm run scrape

# Seed the local SQLite database from public/data
npm run seed

# Run the Vite dev server + API server together
npm run dev:all
```

Frontend runs on **http://localhost:5173**, the API on **http://localhost:3001**.

The frontend works **with or without the backend** — stores try the API first and fall back to the static JSON in `public/data/`, so a static deploy (no server) still has full Browse / Build / Collection functionality.

### Useful scripts
```bash
npm run scrape -- --skip-images   # rebuild JSON only (skip image download)
npm test                          # run the test suite
npm run test:coverage             # coverage report
npm run build                     # type-check + production build
```

---

## Data Pipeline

`scraper/scrape.ts` fetches the Legion HQ 2 SPA JavaScript bundle and brace-matches/extracts every embedded card (~179 units, ~413 upgrades, ~235 commands). Each card is keyed by a unique id with its own `stats`, `weapons`, `keywords`, `upgradeBar`, and `imageName` — so multi-card characters (e.g. Han Solo Commander vs Operative) stay distinct, with **no name-based merging**. Card images are downloaded from Legion HQ 2's open CDN. `scraper/normalise.ts` holds the pure, testable transforms. The pipeline writes:

- `public/data/units.json` · `upgrades.json` · `commands.json` · `products.json` · `keywords.json`
- `public/images/{units,upgrades,commands}/<imageName>` — self-hosted card scans
- `public/images/overrides/<slug>.webp` — hand-placed high-res cards, copied in and never overwritten

Re-run `npm run scrape` to pick up the latest data.

---

## Disclaimer

LegionApp is an **unofficial fan-made tool** and is not affiliated with Atomic Mass Games or Lucasfilm Ltd. Star Wars: Legion and all related marks, card text, and artwork are property of Atomic Mass Games, Lucasfilm Ltd., and Disney. Card images are used for fan-reference purposes only.

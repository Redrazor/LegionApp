# LegionApp 1.0 — Deployment Runbook (Vercel + Firebase + Render)

Do these **in order**. Steps marked **[you]** need the browser / an interactive login and
can't be automated — run shell ones in the session with `! <command>`. Steps marked **[done]**
are already wired into the repo by the 1.0 release branch.

**Architecture:** Vercel hosts the SPA + catalogue JSON · Firebase hosts the card images ·
Render hosts the Express API + socket.io (Play, later). The SPA falls back to static JSON, so it
stays usable even if Render is cold or down.

---

## 0. Pre-flight (local) — **[done] in repo, re-verify before deploy**
- [ ] `npm test` — green (incl. `tests/imageUrl.spec.ts`).
- [ ] `npm run test:coverage` — ≥ 50%.
- [ ] `npm run build` — succeeds; PWA precache is small (~24 entries, **not** 50 MB — that would
      mean images leaked into `dist/`).
- [ ] **Re-scrape for launch-day data:** `npm run scrape` → `npm run portraits` →
      `npm run seed`. (Skip if the catalogue is already current.)
- [ ] `npm run icons` — regenerates `public/icons/` from `favicon.svg` (only if the favicon changed).

---

## 1. Firebase — image CDN  (`legionapp-images`)
Config is committed: `firebase.json` (serves `images-compressed/`, immutable cache + CORS) and
`.firebaserc` (project `legionapp-images`).

- [ ] **[you]** Create the Firebase project **`legionapp-images`** at <https://console.firebase.google.com>
      (or `firebase projects:create legionapp-images`). Enable **Hosting**.
- [ ] **[you]** `! npx firebase login` (interactive Google auth).
- [ ] Build the compressed image set: `npm run images:compress` → writes `images-compressed/`
      (~52 MB WebP from the 105 MB originals). Requires `public/images/` to exist (run `npm run scrape` first).
- [ ] **[you]** Deploy: `! npm run images:deploy`  (`firebase deploy --only hosting`).
- [ ] **Verify:** open `https://legionapp-images.web.app/units/darth-vader-dark-lord-of-the-sith.webp`
      — it should load and return `access-control-allow-origin: *`.
- [ ] Note the final base URL (`https://legionapp-images.web.app`) for Vercel's `VITE_IMAGE_BASE`.

---

## 2. Render — Express API  (`legionapp-api`)
Config is committed: `render.yaml` (free web service, `npm ci` build, `npm run server` start,
health check `/api/health`).

- [ ] **[you]** Push the release branch / merge to `main` first (Render deploys from `main`).
- [ ] **[you]** At <https://dashboard.render.com> → **New → Blueprint**, connect the
      `Redrazor/LegionApp` repo. Render reads `render.yaml` and creates **`legionapp-api`**.
      (Or **New → Web Service** manually: Build `npm ci`, Start `npm run server`, Health `/api/health`.)
- [ ] **Verify:** `https://legionapp-api.onrender.com/api/health` → `{"status":"ok"}` and
      `/api/units` returns JSON. (First hit on free tier cold-starts ~50 s — expected.)
- [ ] Note the service URL for Vercel's `VITE_API_BASE` / `VITE_WS_URL`.

---

## 3. Vercel — the SPA  (frontend)
Config is committed: `vercel.json` (SPA rewrite, `npm run build` → `dist`). Env reference:
`.env.production.example`.

- [ ] **[you]** At <https://vercel.com/new>, import `Redrazor/LegionApp`. Framework preset **Vite**
      (build `npm run build`, output `dist` — already in `vercel.json`).
- [ ] **[you]** Set **Environment Variables** (Production) — Vite inlines these at build time:
      - `VITE_API_BASE` = `https://legionapp-api.onrender.com`
      - `VITE_IMAGE_BASE` = `https://legionapp-images.web.app`
      - `VITE_WS_URL` = `https://legionapp-api.onrender.com`
- [ ] **[you]** Deploy. Then **redeploy after** setting env vars if they were added after the first build.
- [ ] **Verify on the Vercel URL:** cards/portraits load (Network tab → image requests hit
      `legionapp-images.web.app`, **not** the Vercel origin), Build validation works, deep links
      (e.g. `/browse/<slug>`) resolve (SPA rewrite), no console errors.

---

## 4. Domain & DNS — **[you]**
- [ ] Register the domain (e.g. `legionapp.com`) and add it to the Vercel project; follow Vercel's
      DNS records. (Optionally CNAME a subdomain for the API; the Render default URL is fine for 1.0.)
- [ ] Update the `VITE_*` env if you move the API/images to custom subdomains, then redeploy.

---

## 5. Post-deploy smoke test (real phone) — **[you]**
- [ ] **PWA install** — "Add to Home Screen" shows the LegionApp icon; launches standalone.
- [ ] **Offline** — load once, enable airplane mode, reopen: Browse/Build still work, viewed images
      cached (runtime image-cache), data served from precached JSON.
- [ ] **Build** — add units past a rank/points/faction/unique limit → live validation flags it.
- [ ] **Share / Print / Export / Import** — share code round-trips; print sheet renders; export +
      re-import a list.
- [ ] **Collection** persists across reloads; **Reference** glossary loads.

---

## 6. Pre-launch polish (from the original checklist)
- [ ] In-app footer disclaimer: *unofficial / fan-made, not affiliated with AMG / Lucasfilm / Disney.*
- [ ] "Sister app → shatterapp.com" footer cross-link (and reverse link from ShatterApp).
- [ ] Discreet **"Support my work ☕ → ko-fi.com/redrazor"** footer link.
- [ ] Privacy-friendly analytics (Plausible/Umami) to see which channel converts.
- [ ] Replace every `legionapp.com *(update once live)*` placeholder in the `community/` copy.
- [ ] Asset kit: 3 screenshots (Browse grid / valid Build / Unit profile) + one 15–30 s build→validate→share GIF.

---

## 7. Launch sequence (see `community/discord.md`, `reddit-r-SWlegion.md`)
- [ ] **T-1 wk:** be present + helpful in The Legion Discord; confirm its self-promo channel/rules.
- [ ] **Day 0:** post to The Legion Discord (right channel).
- [ ] **Day 1:** post to r/SWlegion (Tue/Wed ~10:00 GMT).
- [ ] **First 24 h:** reply to every comment; ship quick wins.
- [ ] **+1 wk:** r/starwarsminiaturesGame, BGG forum, FB groups.
- [ ] **+2–4 wks:** DM Fifth Trooper / Notorious Scoundrels offering a tool spotlight.

---

## Re-deploy cheatsheet (after launch)
- **Card data/images changed:** `npm run scrape` → `portraits` → `seed`, then
  `npm run images:compress` → `npm run images:deploy` (Firebase). Push to `main` → Vercel + Render
  auto-deploy.
- **Frontend only:** push to `main` → Vercel auto-deploys.
- **Backend only:** push to `main` → Render auto-deploys.

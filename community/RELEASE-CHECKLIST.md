# LegionApp — Release Checklist

Launch scope: **Browse · Build · Collection · Reference** (all done). **Play ships later** —
fine to launch without it; market it as "coming soon."

## A. Ship-blockers (do first)
- [ ] **Register the domain** (e.g. `legionapp.com`) + DNS.
- [ ] **Deploy config** — LegionApp has none yet (ShatterApp uses Vercel + Firebase for images).
      Add `vercel.json` mirroring ShatterApp; decide image hosting (Firebase like Shatter, or bundle).
- [ ] **First production deploy** + smoke-test on a real phone (PWA install, offline, Build validation).
- [ ] **Re-run `npm run scrape`** so card data/images are current as of launch day.
- [ ] Update every `legionapp.com *(update once live)*` placeholder in the `community/` copy.

## B. Pre-launch polish
- [ ] Disclaimer visible in-app footer: *unofficial / fan-made, not affiliated with AMG/Lucasfilm/Disney.*
- [ ] "Sister app → shatterapp.com" cross-link in footer (and the reverse link added to ShatterApp).
- [ ] Discreet **"Support my work ☕ → ko-fi.com/redrazor"** footer link (generic, not "fund this app").
- [ ] Privacy-friendly analytics (Plausible/Umami) on the app to see which channel converts.
- [ ] Known-issues pass: anything embarrassing in Build validation / share-link / print.

## C. Asset kit (reused in every post)
- [ ] 3 clean screenshots: **Browse** (faction grid), **Build** (valid 800pt army), **Unit profile** (upgrade bar + glossary).
- [ ] One 15–30s screen-capture GIF (build an army → validate → share).
- [ ] One-line pitch + the disclaimer line (already in the `community/` files).

## D. Launch sequence (see ../../AppSeries/communication-plan.md §2)
- [ ] **T-1 wk warm-up:** be present + helpful in The Legion Discord; confirm its self-promo channel/rules.
- [ ] **Day 0:** post to **The Legion Discord** (right channel) — copy in `discord.md`.
- [ ] **Day 1:** post to **r/SWlegion** — copy in `reddit-r-SWlegion.md`, Tue/Wed ~10:00 GMT.
- [ ] **First 24h:** reply to every comment; ship quick wins and say "added that, thanks."
- [ ] **+1 wk:** `r/starwarsminiaturesGame`, BGG forum, FB groups.
- [ ] **+2–4 wks:** DM Fifth Trooper / Notorious Scoundrels offering a tool spotlight.

## E. Have an answer ready
- [ ] "Why not Tabletop Admiral?" → mobile-first PWA, collection tracking, in-app glossary/reference,
      and the upcoming at-the-table Play tracker with multiplayer.

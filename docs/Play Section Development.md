# Play Section — Development Plan

**Roadmap item #1** ("Play tab", the big open feature — the main reason the Render backend exists).
This is the canonical phased plan for the Play section. It is built as a **series of separate,
progressively shippable `/workflow` features** (branch → implement → AC → tests → merge → bump), each
layering on the previous. Kickoff planning: 2026-07-02.

## What already exists (do not rebuild)

- **Route + nav + shell** — `/play` route (`src/router/index.ts`), a `Play` nav entry (`src/App.vue`),
  and a "Coming Soon" placeholder `src/views/PlayView.vue`. Phase 1 replaces the placeholder.
- **Socket scaffolding (server)** — `server/rooms.ts` (~48 lines): in-memory `Room` registry, 4-char
  join codes (A–Z/2–9), `createRoom`/`joinRoom`/`getRoomBySocket`/`removePlayer`. `server/index.ts`
  wires `create-room`, `join-room`, `disconnect`. **No persistence, no player names, no state-sync
  events.** `socket.io` + `socket.io-client` v4.8.3 are both installed.
- **Socket client** — NOT wired. No composable/store uses `socket.io-client` yet. We build
  `usePlayRoom` (mirroring ShatterApp's `useDiceRoom.ts`, minus the 2v2/team complexity).
- **List import** — free via existing `src/utils/army.ts`: `decodeArmy()` / `fromCompact()` /
  `importFromString()`. Saved lists live in the Pinia `army` store (`saved: CompactArmy[]`,
  localStorage-persisted). `Army` already carries `battleDeck` (9 ids = 3 primary + 3 secondary +
  3 advantage), `commandHand` (6 ids), `units`, `gameSize`, `faction`.
- **Dice engine** — `src/utils/dice.ts` is complete: `rollAttack`/`rollDefense`, surge charts, and
  `resolveCombat(atkPool, defPool, mods) → { hits, crits, blocks, wounds }` (applies cover/dodge/pierce
  in rulebook order). `src/stores/rollHistory.ts` persists recent rolls. Reused wholesale in Phase 7.
- **Battle-card data** — `public/data/battleCards.json`: cards tagged `subtype` ∈ {primary, secondary,
  advantage} + an `isRecon` flag. Standard deck = 10 primary / 10 secondary / 14 advantage; Recon deck
  = 3 / 3 / 3. **Rules text lives only on the card scans** (`public/images/battle/<slug>.webp`) — JSON
  has names/subtypes/images, no scoring text.

## Locked architecture decisions (2026-07-02)

1. **Server-authoritative + SQLite.** The backend holds canonical game state, validates each action,
   mutates, **persists to SQLite (Drizzle)**, and broadcasts patches to both players. A room has a
   durable **UUID** + a human **join code**. Reconnect-by-UUID replays the persisted state → the game
   "resumes until destroyed." (Relay-only was rejected — it can't guarantee persistence/resume.)
   - ⚠️ **Reseed gotcha:** CLAUDE.md notes the DB reseeds from `public/data` on every server start.
     Game-state tables MUST live outside that reseed path so a restart doesn't wipe live games.
2. **Standard mission draft — owner-confirmed.** The Standard-format Primary/Secondary/Advantage
   **veto-draft procedure** (deal/reject counts, who rejects first per category) is NOT in the repo
   (only the 6-page Recon quickstart is). **Owner confirms the exact procedure from the physical Battle
   Card rules insert before Phase 3.** Recon = pure random draw (repo-cited, DOC13 pp.2).
3. **Change-log substrate lands early (Phase 4).** Every later feature emits log entries as it is built,
   so the "log every change" requirement (originally #8) is nearly free and never retrofitted.

## Rules reference (for the phases)

- **Turn structure** — up to 6 rounds; each round: Command Phase → Activation Phase → End Phase.
  End Phase scores Primary, advances the round counter, and clears turn-scoped tokens.
- **VP** — cap **12**; Primary is the main scoring engine (per End Phase), Secondary is smaller/one-off.
- **Tokens — two classes.** Turn-cleared: **aim, dodge, standby** (+ immobilize/ion clear at end of the
  unit's own activation). Persistent: **suppression, panic, ion, poison, shield, wound**. Verbatim repo
  text exists only for Ion/Poison/Shield/Surge/Immobilize (`Keyword_glossary.md` "APP REFERENCE
  ENTRIES", line 637+); core tokens aim/dodge/standby/suppression/panic/wound are absent and would need
  owner-added glossary entries for cited tooltips.
- **Orders + bag** — command card issues face-up orders to chosen units (deliberate activation);
  every un-ordered unit's token goes face-down into that player's bag and is drawn at random. Players
  alternate single activations; each unit activates once per round.
- **Command cards** — hand of ~7 (Standard); both players secretly pick 1, reveal simultaneously; fewer
  pips = priority (Blue/first). Card dictates how many/which units get orders. Discarded after use.
- **Wounds/defeat** — single-wound minis: each wound removes a mini; multi-wound minis/vehicles: wound
  tokens up to the Wound value, then the mini is defeated. A unit is defeated when its last mini is
  removed; defeated units stay tracked for VP/tiebreak (not deleted).

## Phased plan

Each phase is one PR / `/workflow` feature. New pure logic → a `utils/` module + `tests/` spec.

### Phase 1 — Play shell + list importer  *(user #1)*
Replace the `PlayView` placeholder. Define the serializable **game-session store** (the unit that
multiplayer will later sync — design it sync-ready from day one). Import a saved list from Collection
via `decodeArmy()`/`fromCompact()`. Single-device; establishes the session data model.

### Phase 2 — Real-time multiplayer substrate  *(user #2)*
Server-authoritative, SQLite-persisted rooms (UUID + join code), reconnection/resume, presence, and
state-sync events. Client `usePlayRoom` composable. **Random player-name generator** (adjective+noun;
ShatterApp has none to port). Both players join by code, get a name, import their lists.

### Phase 3 — Mission picker  *(user #3)*
Format-driven off `isRecon`: **Recon = random draw**, **Standard = deal/alternate-veto draft** (owner-
confirmed procedure) across Primary → Secondary → Advantage. Synced two-player state machine, card-image
display, veto UI. Persists chosen Primary/Secondary/Advantage to the session.

### Phase 4 — Turn + VP tracker + change-log substrate  *(user #4 + #8 foundation)*
Round counter (≤6), VP track (cap 12) per player, phase advance. Stand up the **event-log bus**; all
later phases emit typed log entries (who/what/when). Log panel with full history.

### Phase 5 — Unit roster + status tokens  *(user #5)*
Tabbed my-army / opponent-army roster; unit drawer (reuse Browse drawer patterns). Add/remove tokens
split into **turn-cleared** (aim/dodge/standby) vs **persistent** (suppression/immobilize/ion/poison/
shield). End-Phase action wipes only the turn-cleared class.

### Phase 6 — Wounds, models & defeat  *(user #6 + #7)*
Wound tokens for multi-wound minis; model-count reduction for single-wound units; "defeated" marking
(kept for VP, not removed). Emits to the log.

### Phase 7 — Dice roller wiring  *(user #9)*
Reuse `dice.ts` `resolveCombat()`: attacker's unit rolls attack dice → defender's unit rolls defense →
resolved hits/wounds returned. Synced between players; results logged and optionally applied as wounds.

### Phase 8 — Orders + order-token bag  *(user #10)*
Face-up ordered units (deliberate) vs face-down bag (random draw) per player; alternating activation;
"activate" flow. Randomised draw at round start, held for the round (order-chip pull).

### Phase 9 — Command cards  *(user #11)*
Simultaneous secret select → reveal → pip-priority (sets Blue/first) → issue that card's orders to
chosen units (feeds Phase 8's bag). Discard after use; hand shrinks over the game.

## Open verifications / owner inputs

- [ ] **Phase 3 blocker:** owner confirms the Standard veto-draft deal/reject counts from the cards.
- [ ] **Phase 5 nicety:** owner-added verbatim glossary entries for aim/dodge/standby/suppression/panic
      if we want fully-cited token tooltips (currently keyword-only in `Keyword_glossary.md`).
- [ ] **Phase 2:** define room lifecycle end state ("until destroyed") — TTL, explicit close, and the
      reconnection grace window.

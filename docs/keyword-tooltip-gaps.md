# Keyword tooltip gaps

Run `npm run audit:keywords` to regenerate. It lists every keyword used by units (incl.
weapons), upgrades and commands that doesn't resolve to a glossary tooltip. A vitest guard
(`tests/keywords.spec.ts` → "glossary coverage") enforces the same thing in CI: a new scrape
that introduces an unresolved keyword fails the build until it's triaged here.

## Status (post-v1.2.0)

- **368** distinct keywords used · **365** resolve · **3** intentionally unresolved.
- Down from **63 → 33 → 3 missing**. The resolver (`src/utils/keywords.ts`) peels
  value/qualifier forms back to the base entry ("Weak Point 1: Rear" → Weak Point,
  "Uncanny Luck X" → Uncanny Luck, "Special Issue Blizzard Force" → Special Issue,
  "Mercenary Rebels" → Mercenary), and official definitions were added from the 2024 Core
  Rulebook glossary, the 2025 rulebook glossary, and verified card text.
- Adding the **base** entries also mops up the old scraper-concatenation artifacts via the
  resolver's whole-word-prefix match: "Eyes on the Prize Steady" → Eyes on the Prize,
  "Associate Anakin Skywalker" → Associate, "This is the Way Aim 2" → This is the Way.

## Residual 3 — not glossary keywords (correctly show no tooltip)

These resolve to `null` by design, so the app renders the chip with no popover. Do NOT
invent glossary text for them — they are allowlisted in the coverage guard.

- **Dodge** (upgrade: defense-protocols) — a token/action term, not a keyword.
- **Ranged** (upgrade: the-darksaber-maul) — an attack-type qualifier of the `Sidearm`
  keyword that LHQ2 stored as a separate array entry; not a standalone keyword.
- **Pull The Strings Empire Trooper** (unit: grand-moff-tarkin-imperial-high-command) —
  a card-specific named ability. Its effect text lives only on the card image (shown in the
  Build inspect gallery); there is no universal glossary entry.

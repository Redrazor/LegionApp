# Keyword tooltip gaps

Run `npm run audit:keywords` to regenerate. It lists every keyword used by units (incl.
weapons), upgrades and commands that doesn't resolve to a glossary tooltip.

## Status (v1.2.0)

- **368** distinct keywords used · **335** resolve · **33** still missing.
- Down from **63** missing: the resolver (`src/utils/keywords.ts`) now peels value/qualifier
  forms back to the base entry ("Weak Point 1: Rear" → Weak Point, "Uncanny Luck X" →
  Uncanny Luck, "Special Issue Blizzard Force" → Special Issue, "Mercenary Rebels" → Mercenary),
  and 9 official definitions were added from the 2024 Core Rulebook glossary (Transport,
  Reliable, Primitive, Death from Above, Weighed Down, Advanced Targeting, Jar'Kai Mastery,
  We're Not Regs, Mercenary).

## Residual 33 — three groups

### A. Real keywords still needing official text (~15) — owner to provide / source from cards
These are **not in any official PDF I could fetch** (post-2024 Core Rulebook; on specific unit
cards). Need verbatim rules text:

- Overwhelm (13), Prepared Position (14), Sniper Team (4), Command Vehicle (3), Assault (3),
  Mobile (2), Anti-Materiel (2), Shien Mastery (2), Vaapad Mastery (1), Mechanized Infantry (1),
  Shields (1), Attack Run (1), Strafe (1), Ranged (1), Dodge (1)

_(Candidate text exists from an AMG-forum search for **Overwhelm** and **Prepared Position**, but
unverified — confirm before adding.)_

### B. Card-specific ability names (~12) — effect text lives on the card, no universal entry
Not glossary keywords. Decide UX: suppress the tooltip, or show "see card". Do NOT invent text.

- This is the Way (4), Victory or Death (4), We Fight for Our Family (4), Mandalorians Are
  Stronger Together (5), One Step Ahead (2), Complete the Mission (2), Interrogate (2),
  My Mood Is Based On Profit (1), Master Storyteller (1), Divine Influence (1), Hold the Line (1),
  Swashbuckler (1)

### C. Scraper parsing artifacts (~6) — fix in normalise.ts (two strings concatenated)
- Eyes on the Prize Steady, This is the Way Aim 2, This is the Way Move 1 or Recover 2,
  Pull The Strings Empire Trooper, Associate Anakin Skywalker, Associate Fifth Brother

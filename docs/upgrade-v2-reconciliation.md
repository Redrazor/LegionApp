# Upgrade v2 Reconciliation Manifest (pre-2.0)

**Branch:** `feature/upgrades-v2-reconcile` · **Status:** awaiting owner sign-off before any deletions.

Source of truth = the AMG swlegiondocs upgrade PDFs (5 faction + generic/universal). This manifest
reconciles all **416** catalogue upgrades against them and proposes a disposition for every card that
isn't already covered.

## Method & reliable signals

Reconciliation used the recorded PDF vision-reads in `scraper/_match/reads-*.json` (no new reads needed):

- **In an upgrade PDF → KEEP** (v2-canonical). **281** upgrades. All but a handful already imaged; not listed here.
- **Imaged but not in a PDF → KEEP.** **60** cards. These are current v2 *expansion* cards sourced from
  other first-party AMG channels (transmissions / expansion articles / owner photos) — AMG only PnPs core
  content, so their absence from the PDFs is expected. We only ever placed scans for current cards.
- **Not in a PDF and not imaged → the decision set. 75 cards.** Classified below by cluster.

⚠️ **Note on units:** the *unit* PDF reads are **incomplete** — many clearly-current units (Imperial/Rebel
Officer, Mandalorian Leader/Hunter, Shaak Ti, Wheel Bikes, Clone Trooper Marksmen…) are absent from them.
So "unit not in PDF" is **not** a valid v1 signal, and unit cleanup is handled separately (see bottom).
Upgrade disposition below relies on the *upgrade* PDFs + imaging + per-cluster judgment, not unit-PDF membership.

## Summary

| Disposition | Count | Action |
|---|---|---|
| **KEEP** (imaged, current) | 60 | none — already correct |
| **DROP** (v1 legacy) | 48 | delete row + scan + weapon overlay |
| **NEEDS-PHOTO** (current v2, no PnP) | 25 | placeholder now, backfill from your photos |
| **FLAG** (needs your call) | 2 | decide drop vs keep |
| _(already applied — Clan Wren)_ | 2 | `beskad-duelist`, `tristan-wren` old rows dropped |

---

## DROP — v1 legacy (recommend delete) — 48

Delete the catalogue row, the `.webp` scan, and any `upgrade-weapons.json` entry.

### Generic Force / Jedi upgrades (11) — removed in v2 (lightsabers are baked into unit cards)
`lightsaber`, `twin-lightsabers`, `double-bladed-lightsaber`, `jedi-training`, `jedi-training-2`,
`jedi-training-3`, `jedi-training-4`, `jedi-consular`, `jedi-negotiator`, `jedi-guardian`, `jedi-guardian-2`

### Rebel Agent/Officer 1st-ed gear (5) — v2 uses Doctrines (which we already have, imaged)
`combat-armor`, `repeating-blaster`, `heavy-blaster-pistol-2`, `vibro-axe`, `thermal-detonator`

### Imperial Agent/Officer 1st-ed gear (5)
`combat-armor-2`, `command-and-control-uplink`, `heavy-blaster-pistol`, `stun-baton`, `z-6-riot-baton`

### Legacy trooper weapon-minis / personnel (19) — the v2 versions ARE in the Empire/Republic PDFs
_(verified: e.g. the Empire PDF ships "DLT-19 Stormtrooper" / "T-21 Stormtrooper" that replace these)_
- Stormtroopers: `hh-12-stormtrooper`, `rt-97c-stormtrooper`, `stormtrooper-captain`
- Shoretroopers: `t-21b-shoretrooper`, `shoretrooper`, `shoretrooper-squad`
- Imperial Dark Troopers: `mertalizer`, `imperial-dark-trooper`
- Range Troopers: `dlt-20a-range-trooper`, `t-21a-range-trooper`
- Scout Troopers: `dlt-19x-sniper` · Snowtroopers: `t-7-ion-snowtrooper`
- Imperial Special Forces: `t-21-special-forces-trooper` · Imperial Death Troopers: `dlt-19d-trooper`
- AT-ST: `at-st-mortar-launcher` · TX-225: `pintle-mounted-dlt-19`
- Stormtrooper Riot Squad: `kx-series-security-droids` · LM-432 Crab Droid: `heavy-laser-cannon`
- Phase I Clone Troopers: `dc-15-clone-trooper`

### Generic legacy, no unit requirement (7)
`r5-astromech-droid`, `imperial-comms-technician`, `imperial-tie-pilot`, `micro-grenade-launcher`,
`combat-shields`, `personal-combat-shield`, `flame-projector`

### Superseded by a v2 unit card (1)
`shaak-ti` — the character *upgrade*; v2 has her as the **`shaak-ti-jedi-council`** unit (same pattern as Ursa Wren).

---

## NEEDS-PHOTO — current v2 cards AMG hasn't PnP'd (25)

Ship 2.0 with these as `noImage` placeholders; backfill from your photos later. Grouped by host unit.

### Mandalorian Leader / Hunter — "build-a-Mandalorian" menu (9)
`deadeye`, `battlemaster`, `guild-member`, `vibrosword`, `dual-armaments`, `ee-3-carbine-rifle`,
`galaar-15-carbine`, `full-beskar-armor`, `war-party-leader`

> **Re: the GALAAR-15 "typo" you spotted** — it's **not** a typo-dup. `galaar-15-carbine` is the
> Mandalorian Leader/Hunter *armament* version, exactly parallel to `galaar-90-sniper-rifle-2` (which we
> **do** have imaged). It's a genuine current card that's just missing its scan → NEEDS-PHOTO. The naming
> is only inconsistent: the Mandalorian Warriors card is plural "Carbines" (`galaar-15-carbines`, imaged,
> KEEP), the Leader/Hunter card is singular "Carbine". Recommend keeping both; no dedup.

### Super Tactical Command Droid (11)
Programming (v2 mechanic): `sliced-comms`, `overclock`, `targeting-relay`, `limiter-override`,
`optimized-task-flow`, `strategic-programming`, `enhanced-combat-subroutines`.
Other kit: `electrostaff`, `heavy-arm-cannon`, `mobility-upgrade`, `expanded-databanks`.
_(The 4 non-Programming ones are lower-confidence — worth a glance at your cards to confirm they're current.)_

### TSMEU-6 Wheel Bikes (2) — `turbo-charge`, `ig-100-magnaguard-pilot`
### Clone Trooper Marksmen (2) — `clone-trooper-marksman`, `clone-trooper-marksmen-squad`  _(the unit itself also still needs a scan)_
### General Tagge (1) — `logistical-prowess`

---

## FLAG — need your decision (2)

- **`the-darksaber-maul`** (armament, requires Maul — current & in-PDF). We already have 4 imaged
  "The Darksaber" variants. Is Maul's a distinct current card (→ photo) or redundant/legacy (→ drop)?
- **`caught-in-a-web`** (command, requires "Admiral Trench" — **no Trench unit exists in the catalogue**).
  Orphaned: either the Trench unit is missing and should be added (then photo this), or drop it.

---

## Units side (separate, smaller pass)

Unit-PDF membership is unreliable (see note above), so units need a different reconciliation (imaged /
`removed` / superseded-by-v2). **Confirmed v1 unit drops so far** (from the Clan Wren transmission):

- `mandalorian-resistance`, `mandalorian-resistance-clan-wren` — replaced by **Clan Wren Veterans**.
- Old character *upgrades* now promoted to units (drop the upgrade, keep the unit): `ursa-wren`/`ursa-wren-2`
  (→ `ursa-wren-leader-of-clan-wren`), and the `shaak-ti` case above.

I'll produce a dedicated unit manifest after the upgrade set is signed off.

---

## Proposed execution order (after sign-off)

1. **DROP 48** — remove rows from `upgrades.json`, delete scans + `upgrade-weapons.json` entries, update any test spot-guards.
2. **NEEDS-PHOTO 25** — mark as `noImage` placeholders (`unreleased.ts` mechanism), emit the photo shopping-list.
3. **FLAG 2** — apply your decisions.
4. Update `image-coverage.spec.ts` allowlist, run `npm test`, reseed.
5. Unit reconciliation pass → then **P8 / 2.0 cutover** (hard image-coverage assert, changelog, `npm version major`, deploy).

// Pure, testable core for the AMG print-and-play image re-source pipeline (2.0).
//
// LegionApp's card scans were originally downloaded from the Legion HQ 2 CDN. For
// 2.0 we re-source every card image from Atomic Mass Games' own print-and-play
// (PnP) PDFs at atomicmassgames.com/swlegiondocs, so all art is first-party.
//
// This module holds the bits that are pure and worth testing: the source-PDF
// catalogue, the preserve-list of cards we already self-sourced (Mandalorian
// errata, DOC56), front-vs-shared-back dedup, and the read-name → catalogue-slug
// matcher. The side-effecting scripts (amgDocs / amgExtract / amgApply) build on it.

import { slugify } from './normalise.ts'

export type CardCategory = 'units' | 'upgrades' | 'commands' | 'battle'
export type SourceFaction = 'empire' | 'republic' | 'rebels' | 'separatists' | 'mercenary' | null

export interface AmgSource {
  category: CardCategory
  /** Faction the PDF is scoped to, or null for faction-agnostic packs (generics, battle deck). */
  faction: SourceFaction
  /** Absolute CDN URL of the PDF. */
  url: string
}

const CDN = 'https://cdn.svc.asmodee.net/production-amgcom/uploads'

/**
 * The official AMG PnP PDFs that embed catalogue card art. Rulebooks, the errata
 * reference, Tours-of-Duty rulebooks and registers are intentionally excluded —
 * they carry no per-card images. Mandalorian-faction units and the June-2026
 * errata cards are NOT listed here: they were already self-sourced from DOC56 and
 * live in PRESERVE_SLUGS.
 */
export const AMG_SOURCES: AmgSource[] = [
  // Units (current edition: DOC51, 2026; mercenary still DOC13, 2025-04)
  { category: 'units', faction: 'empire', url: `${CDN}/2026/04/DOC51_GalacticEmpire_Units.pdf` },
  { category: 'units', faction: 'republic', url: `${CDN}/2026/04/DOC51_GalacticRepublic_Units.pdf` },
  { category: 'units', faction: 'rebels', url: `${CDN}/2026/04/DOC51_RebelAlliance_Units.pdf` },
  { category: 'units', faction: 'separatists', url: `${CDN}/2026/05/DOC51_SeparatistAlliance_Units_05-01_Update.pdf` },
  { category: 'units', faction: 'mercenary', url: `${CDN}/2025/04/DOC13_Mercenary_Units.pdf` },
  { category: 'units', faction: 'mercenary', url: `${CDN}/2025/04/DOC13_Mercenary_Ewoks.pdf` },
  // Upgrades
  { category: 'upgrades', faction: 'empire', url: `${CDN}/2026/04/DOC51_GalacticEmpire_Upgrades.pdf` },
  { category: 'upgrades', faction: 'republic', url: `${CDN}/2026/04/DOC51_GalacticRepublic_Upgrades.pdf` },
  { category: 'upgrades', faction: 'rebels', url: `${CDN}/2026/04/DOC51_RebelAlliance_Upgrades.pdf` },
  { category: 'upgrades', faction: 'separatists', url: `${CDN}/2026/04/DOC51_SeparatistAlliance_Upgrades.pdf` },
  { category: 'upgrades', faction: 'mercenary', url: `${CDN}/2025/04/DOC13_Mercenary_Upgrades.pdf` },
  { category: 'upgrades', faction: null, url: `${CDN}/2026/04/DOC51_Generic_Upgrades.pdf` },
  { category: 'upgrades', faction: null, url: `${CDN}/2026/04/DOC51_UpgradeCards.pdf` },
  // Commands
  { category: 'commands', faction: 'empire', url: `${CDN}/2025/04/DOC13_GalacticEmpire_Commands.pdf` },
  { category: 'commands', faction: 'republic', url: `${CDN}/2025/11/SWQ_GalacticRepublic_Commands.pdf` },
  { category: 'commands', faction: 'rebels', url: `${CDN}/2025/04/DOC13_RebelAlliance_Commands.pdf` },
  { category: 'commands', faction: 'separatists', url: `${CDN}/2026/04/DOC13_SeparatistAlliance_Commands.pdf` },
  { category: 'commands', faction: 'mercenary', url: `${CDN}/2026/05/DOC51_Mercenary_Commands_05-01_Update.pdf` },
  // Battle deck (advantage / primary / secondary)
  { category: 'battle', faction: null, url: `${CDN}/2025/12/DOC41_BattleCards_11.26.2025.pdf` },
]

/**
 * PDFs that `scripts/build-battle-cards.ts` processes specially because they are NOT clean
 * 3×3 PnP sheets (so amgExtract can't handle them) — kept out of AMG_SOURCES for that reason:
 *  - DOC13_ReconRulebook: the 9 Recon battle cards, on a cut-mark grid (pp.5–6).
 *  - DOC56_ErrataReference-2: the errata'd Cauldron objective TEXT card (p11). Its Map Card
 *    is owner-supplied (no AMG PnP) and lives at scraper/amg-assets/cauldron-map.png.
 * Downloaded by amg:fetch alongside AMG_SOURCES; consumed only by build-battle-cards.
 */
export const BATTLE_BUILD_SOURCES: string[] = [
  `${CDN}/2025/04/DOC13_ReconRulebook_04302025.pdf`,
  `${CDN}/2026/06/DOC56_ErrataReference-2.pdf`,
]

/**
 * Card slugs whose scans we sourced ourselves from AMG DOC56 (the 2026-06-17
 * Mandalorian errata + PnP refresh, commit c61ac31). These are never overwritten
 * by the re-source pipeline — they are already first-party and current.
 *
 * Keyed by category because a slug is only unique WITHIN a category: e.g. the
 * upgrade `whipcord-launcher` was self-sourced, but the separate 1-pip command of
 * the same name was NOT and must still be re-sourced.
 */
export const PRESERVE_SLUGS: Record<CardCategory, ReadonlySet<string>> = {
  units: new Set([
    'din-djarin-the-mandalorian', 'clan-wren-veterans', 'axe-woves-cunning-warrior',
  ]),
  upgrades: new Set([
    'beskad-duelist', 'whipcord-launcher', 'jetpack-rockets', 'jetpack-rockets-2',
    'super-commando-marksman', 'super-commando-gunslinger', 'children-of-the-watch',
    'ursa-wren', 'tristan-wren', 'the-darksaber-2', 'saxons-jetpack-rockets',
  ]),
  commands: new Set(['out-of-the-shadows']),
  battle: new Set(),
}

/** True if this card's scan is already self-sourced (DOC56) and must not be overwritten. */
export function isPreserved(category: CardCategory, slug: string): boolean {
  return PRESERVE_SLUGS[category]?.has(slug) ?? false
}

/** Filename (basename) of a PDF URL, e.g. ".../DOC51_RebelAlliance_Units.pdf" → "DOC51_RebelAlliance_Units.pdf". */
export function pdfBasename(url: string): string {
  return url.split('/').pop() ?? url
}

/**
 * From a flat list of images extracted out of a PDF (one entry per placement),
 * keep only unique card fronts. Card backs and shared templates are byte-identical
 * across every card, so the same md5 recurs many times — anything appearing more
 * than `maxRepeat` times is dropped, and remaining duplicates are collapsed to the
 * first occurrence. Order is preserved.
 */
export function selectFronts<T extends { md5: string }>(imgs: T[], maxRepeat = 2): T[] {
  const counts = new Map<string, number>()
  for (const i of imgs) counts.set(i.md5, (counts.get(i.md5) ?? 0) + 1)
  const seen = new Set<string>()
  const out: T[] = []
  for (const i of imgs) {
    if ((counts.get(i.md5) ?? 0) > maxRepeat) continue
    if (seen.has(i.md5)) continue
    seen.add(i.md5)
    out.push(i)
  }
  return out
}

export interface CatalogueCard {
  slug: string
  name: string
  title?: string | null
}

export type MatchResult =
  | { slug: string }
  | { ambiguous: string[] }
  | null

/**
 * Match a card name (and optional title) read off a PnP card image to a catalogue
 * slug, within an already faction+category-scoped candidate set. Tries the full
 * `name + title` slug first, then `name` alone. Multiple same-name candidates with
 * no distinguishing title return `{ ambiguous }` for manual disambiguation; no
 * match returns null (→ gap report). The catalogue's `-2`/`-3` de-dup suffixes are
 * resolved through the title, so always read the title when present.
 */
export function matchCard(readName: string, readTitle: string | null, candidates: CatalogueCard[]): MatchResult {
  const full = slugify(readName, readTitle ?? undefined)
  const byFull = candidates.filter((c) => slugify(c.name, c.title ?? undefined) === full)
  if (byFull.length === 1) return { slug: byFull[0].slug }

  const nameOnly = slugify(readName)
  const byName = candidates.filter((c) => slugify(c.name) === nameOnly)
  if (byName.length === 1) return { slug: byName[0].slug }
  if (byName.length > 1) return { ambiguous: byName.map((c) => c.slug) }
  return null
}

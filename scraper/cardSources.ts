// Pure builder for `public/data/card-sources.json` — the app-facing card provenance
// table (Feature 18, Card Sources reference). It answers, per catalogue card: where was
// its card sourced from, when, and is that an official AMG source (valid) or the legacy
// Legion HQ 2 scan still awaiting re-sourcing (unknown).
//
// This mirrors the categorisation in `scripts/generate-card-origins.ts` (which writes the
// developer-facing `card_list_origin.md`) but emits structured, dated, app-facing data.
// The date + human label for each AMG document come from the owner-maintained
// `scraper/amg-doc-dates.json`. Kept pure + tested; the runner (`scraper/buildCardSources.ts`)
// reads the files and calls this.
import type { CardCategory } from './amgNormalise.ts'

export type { CardCategory }

// `valid`   — sourced from an official AMG document (PnP PDF or self-sourced errata).
// `unknown` — still the legacy Legion HQ 2 scan, or an image-pending placeholder: no
//             official source on record yet.
export type SourceValidity = 'valid' | 'unknown'

export interface CatalogueCard {
  category: CardCategory
  slug: string
  name: string
  title?: string | null
}

export interface CardSourceDeps {
  /** `${category}:${slug}` → the raw AMG source-doc key (from amg-card-map.json). */
  sourceBySlug: Map<string, string>
  /** Self-sourced Mandalorian errata cards (amgNormalise `isPreserved`). */
  preserved: (category: CardCategory, slug: string) => boolean
  /** `${category}:${slug}` with an intentional image-pending placeholder (unreleased noImage). */
  noImageSlugs: Set<string>
  /** `${category}:${slug}` dropped from the app entirely (v1 cards) — excluded from the table. */
  droppedSlugs: Set<string>
}

/** Human label + month/year (YYYY-MM) for an AMG source document. */
export interface DocMeta {
  label: string
  date: string
}

export interface CardSource {
  category: CardCategory
  slug: string
  name: string
  title?: string
  /** Human-readable source (AMG document label, or the legacy/pending note). */
  source: string
  /** Month/year the source is dated, `YYYY-MM`, or null when unknown/undated. */
  date: string | null
  validity: SourceValidity
}

// Self-sourced Mandalorian errata cards (isPreserved) came from AMG's June 2026 DOC56
// batch, read straight off the cards rather than a fold-sheet PDF.
const SELF_SOURCED: DocMeta = { label: 'June 2026 Mandalorian Update (self-sourced)', date: '2026-06' }
const LEGACY: string = 'Legacy scan (Legion HQ 2) — not yet officially sourced'
const IMAGE_PENDING: string = 'Image pending (no source yet)'

// Display order: browsable types first (their rows link to a card drawer), battle cards
// last (no Browse section → not clickable), so the table doesn't open on unclickable rows.
const CATEGORY_ORDER: CardCategory[] = ['units', 'upgrades', 'commands', 'battle']
const catRank = (c: CardCategory) => CATEGORY_ORDER.indexOf(c)

/**
 * Resolve every catalogue card to its source provenance. Cards dropped from the app
 * (v1 removals) are omitted. Sorted by category then display name.
 */
export function buildCardSources(
  cards: CatalogueCard[],
  deps: CardSourceDeps,
  docDates: Record<string, DocMeta>,
): CardSource[] {
  const out: CardSource[] = []
  for (const c of cards) {
    const key = `${c.category}:${c.slug}`
    if (deps.droppedSlugs.has(key)) continue // not in the app

    const base = { category: c.category, slug: c.slug, name: c.name, ...(c.title ? { title: c.title } : {}) }

    if (deps.preserved(c.category, c.slug)) {
      out.push({ ...base, source: SELF_SOURCED.label, date: SELF_SOURCED.date, validity: 'valid' })
      continue
    }
    const pdf = deps.sourceBySlug.get(key)
    if (pdf) {
      const meta = docDates[pdf]
      out.push({ ...base, source: meta?.label || pdf, date: meta?.date || null, validity: 'valid' })
      continue
    }
    // No official source: an image-pending placeholder, or the legacy LHQ2 scan.
    out.push({
      ...base,
      source: deps.noImageSlugs.has(key) ? IMAGE_PENDING : LEGACY,
      date: null,
      validity: 'unknown',
    })
  }
  return out.sort((a, b) => catRank(a.category) - catRank(b.category) || a.name.localeCompare(b.name))
}

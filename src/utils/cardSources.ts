import type { CardSource, CardCategory } from '../types/index.ts'

// Pure helpers for the Card Sources reference (Feature 18): filtering/search, the
// Browse deep-link for a valid card, a coverage summary, and date display.

export interface CardSourceFilters {
  query: string
  category: CardCategory | ''
  unknownOnly: boolean
}

export function emptyCardSourceFilters(): CardSourceFilters {
  return { query: '', category: '', unknownOnly: false }
}

/** Filter the source list by free-text (name/source), card type, and validity. */
export function filterCardSources(list: CardSource[], f: CardSourceFilters): CardSource[] {
  const q = f.query.trim().toLowerCase()
  return list.filter((c) => {
    if (f.category && c.category !== f.category) return false
    if (f.unknownOnly && c.validity !== 'unknown') return false
    if (q) {
      const hay = `${c.name} ${c.title ?? ''} ${c.source}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}

// Browsable card types map to their Browse drawer route; battle cards have no Browse
// section, so they get no link.
const BROWSE_PATH: Partial<Record<CardCategory, (slug: string) => string>> = {
  units: (slug) => `/browse/${slug}`,
  commands: (slug) => `/browse/commands/${slug}`,
  upgrades: (slug) => `/browse/upgrades/${slug}`,
}

/** The Browse deep-link that opens this card's drawer, or null if it isn't browsable. */
export function browseLinkFor(c: CardSource): string | null {
  return BROWSE_PATH[c.category]?.(c.slug) ?? null
}

export interface CardSourceSummary {
  total: number
  valid: number
  unknown: number
}

/** Coverage totals across a list. */
export function sourceSummary(list: CardSource[]): CardSourceSummary {
  let valid = 0
  for (const c of list) if (c.validity === 'valid') valid++
  return { total: list.length, valid, unknown: list.length - valid }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Format a `YYYY-MM` source date as e.g. "Jun 2026"; falls back gracefully. */
export function formatSourceDate(date: string | null): string {
  if (!date) return '—'
  const m = /^(\d{4})-(\d{2})$/.exec(date)
  if (!m) return date
  const month = MONTHS[Number(m[2]) - 1]
  return month ? `${month} ${m[1]}` : m[1]
}

export const CARD_CATEGORY_LABELS: Record<CardCategory, string> = {
  units: 'Units',
  upgrades: 'Upgrades',
  commands: 'Commands',
  battle: 'Battle Cards',
}

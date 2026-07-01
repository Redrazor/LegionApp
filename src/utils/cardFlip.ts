import type { CardFlipSide } from '../types/index.ts'

// Feature 15 — Flip double-sided cards. Two concerns, both pure/testable:
//  1. Loading the owner-maintained overlay (public/data/card-flips.json), split into a `units` and an
//     `upgrades` map keyed by slug — a scrape-proof static asset (mirrors counterparts.json). The stores
//     overlay the matching side onto each Unit/Upgrade as `flip`.
//  2. Persisting which side the user last viewed, per card, in localStorage — so a flipped card stays
//     flipped across reloads and across the Browse/Build inspect views.

interface CardFlipsFile {
  units?: Record<string, CardFlipSide>
  upgrades?: Record<string, CardFlipSide>
}

/** Fetch card-flips.json once and return the requested side-map. Empty on any failure — the flip side
 *  is purely additive, so a missing/invalid file just means no card offers a Flip button. */
async function loadCardFlips(kind: 'units' | 'upgrades'): Promise<Record<string, CardFlipSide>> {
  try {
    const res = await fetch('/data/card-flips.json')
    if (res.ok) {
      const data = (await res.json()) as CardFlipsFile
      return data[kind] ?? {}
    }
  } catch {
    // optional overlay — degrade to no flips
  }
  return {}
}

export const loadUnitCardFlips = (): Promise<Record<string, CardFlipSide>> => loadCardFlips('units')
export const loadUpgradeCardFlips = (): Promise<Record<string, CardFlipSide>> => loadCardFlips('upgrades')

// --- Per-card persistence -------------------------------------------------------------------------

const KEY_PREFIX = 'lg-flip'

/** localStorage key for a card's flipped state, namespaced by kind so a unit and an upgrade that
 *  happen to share a slug never cross-wire. */
export function flipStorageKey(kind: 'unit' | 'upgrade', slug: string): string {
  return `${KEY_PREFIX}:${kind}:${slug}`
}

/** Whether this card was last viewed on its flip side. Defaults to false (the printed/stats side).
 *  Safe when localStorage is unavailable (SSR / private mode). */
export function isFlipped(kind: 'unit' | 'upgrade', slug: string): boolean {
  try {
    return localStorage.getItem(flipStorageKey(kind, slug)) === '1'
  } catch {
    return false
  }
}

/** Persist which side of a card the user is viewing. Removes the key when back on the default side so
 *  the store doesn't accumulate an entry per inspected card. */
export function setFlipped(kind: 'unit' | 'upgrade', slug: string, flipped: boolean): void {
  try {
    const key = flipStorageKey(kind, slug)
    if (flipped) localStorage.setItem(key, '1')
    else localStorage.removeItem(key)
  } catch {
    // persistence is best-effort; a failure just means the flip won't survive reload
  }
}

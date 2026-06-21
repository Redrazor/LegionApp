import { describe, it, expect } from 'vitest'
import { computeLayout, CELL_W, CELL_H } from '../scraper/amgBattle.ts'

describe('computeLayout (primary battle composite geometry)', () => {
  it('defaults: text footer/frame trimmed, spine cropped, map rotated to a landscape strip', () => {
    const L = computeLayout()
    // Text keeps the top 985 rows (clears the blank footer + bottom frame; Intercept
    // Signals — the fullest card — fills only to ~960).
    expect(L.textCropH).toBe(985)
    // Map: drop the 100px left title spine, keep the rest of the portrait cell.
    expect(L.mapCrop).toEqual({ left: 100, top: 0, width: CELL_W - 100, height: CELL_H })
    // After rotate 90° the spine-cropped 626×1040 becomes 1040×626, scaled to width 726.
    expect(L.mapW).toBe(726)
    expect(L.mapH).toBe(Math.round((626 * 726) / 1040)) // 437
    // Combined portrait card, mirroring the LHQ2 ~726×1450 primaries.
    expect(L.outW).toBe(726)
    expect(L.outH).toBe(985 + L.mapH)
  })

  it('honours overrides and recomputes the map strip + canvas height', () => {
    const L = computeLayout({ textCropH: 900, spineCropX: 80, outW: 700 })
    expect(L.textCropH).toBe(900)
    expect(L.mapCrop.left).toBe(80)
    expect(L.mapCrop.width).toBe(CELL_W - 80)
    expect(L.mapW).toBe(700)
    expect(L.mapH).toBe(Math.round((CELL_W - 80) * 700 / CELL_H))
    expect(L.outH).toBe(900 + L.mapH)
  })
})

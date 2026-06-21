// amgBattle — composite a primary-objective battle card from its two AMG PnP cards.
//
// AMG's 2025 battle deck (DOC41) prints each PRIMARY objective as TWO physical cards:
// a portrait TEXT card (name + Setup/Scoring/Special Rules) and a portrait MAP card
// (the battlefield, with the objective name repeated vertically down the left spine).
// The catalogue, inherited from Legion HQ 2, stores ONE combined image per primary —
// text on top, a landscape map strip on the bottom (the 726×1450-ish tall cards).
//
// To re-source primaries first-party we recreate that combined layout: keep the text
// card (minus its blank footer/frame) on top, and below it the map card with its left
// title spine cropped off and rotated 90° clockwise into a landscape strip. Advantage
// and secondary battle cards are single-faced and need no compositing — they apply like
// any other category. This module is the primary-only step P7b runs before amg:apply.
//
// DOC41 cells extract at a fixed 726×1040 (the same grid amgExtract uses), so the crop
// geometry is constant; computeLayout is pure + tested, the sharp I/O is the wrapper.

import sharp from 'sharp'

export const CELL_W = 726
export const CELL_H = 1040

export interface CompositeOpts {
  /** Rows of the text card to keep from the top — clears the blank footer + bottom frame
   *  while preserving the fullest text card (Intercept Signals fills to ~960px). */
  textCropH?: number
  /** Columns to drop from the LEFT of the map card — removes the vertical title spine. */
  spineCropX?: number
  /** Output width (and the text card's native width). */
  outW?: number
}

export interface CompositeLayout {
  textCropH: number
  /** Map region kept from the portrait card before rotation. */
  mapCrop: { left: number; top: number; width: number; height: number }
  /** Landscape map size after rotate-90 + resize to outW. */
  mapW: number
  mapH: number
  /** Final composite canvas size. */
  outW: number
  outH: number
}

const DEFAULTS = { textCropH: 985, spineCropX: 100, outW: CELL_W } as const

/** Pure geometry: given the crop options, what size is every piece and the final card?
 *  Rotating the spine-cropped map 90° swaps its axes; resizing to outW scales height. */
export function computeLayout(opts: CompositeOpts = {}): CompositeLayout {
  const textCropH = opts.textCropH ?? DEFAULTS.textCropH
  const spineCropX = opts.spineCropX ?? DEFAULTS.spineCropX
  const outW = opts.outW ?? DEFAULTS.outW

  const mapCrop = { left: spineCropX, top: 0, width: CELL_W - spineCropX, height: CELL_H }
  // After rotate 90°: width = mapCrop.height, height = mapCrop.width. Then scale to outW.
  const rotW = mapCrop.height
  const rotH = mapCrop.width
  const mapW = outW
  const mapH = Math.round((rotH * outW) / rotW)

  return { textCropH, mapCrop, mapW, mapH, outW, outH: textCropH + mapH }
}

/** Composite the text card (top) and map card (bottom, spine-cropped + rotated) into one
 *  webp buffer. Inputs are normalised to the 726×1040 cell size first so the fixed crop
 *  geometry holds even if a source is off by a pixel. */
export async function compositePrimary(
  textBuf: Buffer,
  mapBuf: Buffer,
  opts: CompositeOpts = {},
): Promise<Buffer> {
  const L = computeLayout(opts)

  // Normalise each source to the 726×1040 cell first (its own pipeline), so the fixed
  // crop geometry holds; sharp mis-computes extract bounds when resize+extract are mixed
  // in a single pipeline, so each stage is materialised to a buffer.
  const textCell = await sharp(textBuf).resize(CELL_W, CELL_H, { fit: 'fill' }).png().toBuffer()
  const text = await sharp(textCell)
    .extract({ left: 0, top: 0, width: L.outW, height: L.textCropH })
    .png()
    .toBuffer()

  const mapCell = await sharp(mapBuf).resize(CELL_W, CELL_H, { fit: 'fill' }).png().toBuffer()
  const mapCropped = await sharp(mapCell).extract(L.mapCrop).png().toBuffer()
  const map = await sharp(mapCropped)
    .rotate(90) // clockwise → landscape, red/blue zones match the LHQ2 orientation
    .resize({ width: L.outW })
    .png()
    .toBuffer()

  return sharp({
    create: { width: L.outW, height: L.outH, channels: 3, background: '#ffffff' },
  })
    .composite([
      { input: text, top: 0, left: 0 },
      { input: map, top: L.textCropH, left: 0 },
    ])
    .webp({ quality: 92 })
    .toBuffer()
}

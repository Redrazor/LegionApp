// rectify-card — straighten + crop a hand-photo of a card to a clean borderless rectangle.
// Detects the card vs the (desaturated grey) playmat by a saturated|bright|warm mask, finds
// the 4 extreme corners of that mask, and perspective-transforms them to a rectangle. Used to
// turn owner-supplied Pack II card photos into first-party battle-card art. (No AMG PnP exists.)
//   npx tsx scripts/rectify-card.ts <in.png> <out.png> [outWidth=726]
import sharp from 'sharp'
import { execFileSync } from 'child_process'

const [src, out, wArg, infArg, bShaveArg] = process.argv.slice(2)
const oW = wArg ? parseInt(wArg) : 726
// Outward inflation (px): the eroded mask sits at the cream interior, so push the detected
// corners out along the diagonals to capture the card's coloured frame bars. ~12 for these photos.
const INFLATE = infArg !== undefined ? parseFloat(infArg) : 12
const { data, info } = await sharp(src).blur(1.2).raw().toBuffer({ resolveWithObject: true })
const { width: W, height: H, channels: C } = info
// card = saturated (map zones), bright (text cards) or warm (red borders); mat = neutral grey
const m = new Uint8Array(W * H)
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = (y * W + x) * C, r = data[i], g = data[i + 1], b = data[i + 2]
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0
  m[y * W + x] = (sat > 0.33 || mn > 180 || (r - b) > 12) ? 1 : 0
}
const solid = (x: number, y: number) => {
  let c = 0
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const xx = x + dx, yy = y + dy
    if (xx >= 0 && yy >= 0 && xx < W && yy < H && m[yy * W + xx]) c++
  }
  return c >= 18
}
let tl = [0, 0, 1e9], br = [0, 0, -1e9], tr = [0, 0, -1e9], bl = [0, 0, 1e9]
for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
  if (!m[y * W + x] || !solid(x, y)) continue
  const s = x + y, d = x - y
  if (s < tl[2]) tl = [x, y, s]; if (s > br[2]) br = [x, y, s]
  if (d > tr[2]) tr = [x, y, d]; if (d < bl[2]) bl = [x, y, d]
}
// Push corners outward to include the coloured frame bars — mostly HORIZONTALLY (the side
// bars need the room) with only a small vertical nudge, so the top/bottom don't overshoot
// into the playmat (which a pure-diagonal push does, leaving grey to trim).
const cx = (tl[0] + tr[0] + br[0] + bl[0]) / 4, cy = (tl[1] + tr[1] + br[1] + bl[1]) / 4
const INFLATE_Y = Math.min(INFLATE, 3)
const push = (p: number[]) => [p[0] + Math.sign(p[0] - cx) * INFLATE, p[1] + Math.sign(p[1] - cy) * INFLATE_Y]
const TL = push(tl), TR = push(tr), BR = push(br), BL = push(bl)
const wTop = Math.hypot(TR[0] - TL[0], TR[1] - TL[1]), hL = Math.hypot(BL[0] - TL[0], BL[1] - TL[1])
const oH = Math.round(oW * hL / wTop)
const coords = `${TL[0]},${TL[1]} 0,0  ${TR[0]},${TR[1]} ${oW},0  ${BR[0]},${BR[1]} ${oW},${oH}  ${BL[0]},${BL[1]} 0,${oH}`
execFileSync('convert', [src, '-virtual-pixel', 'white', '-define', `distort:viewport=${oW}x${oH}+0+0`, '-distort', 'Perspective', coords, '+repage', out])

// The diagonal inflation overshoots edges into the (grey/blue) playmat. Re-detect the card
// in the rectified output by the same card mask and crop to its tight bounding box — removes
// mat slivers on ALL edges uniformly (incl. a sharp bottom cut at the coloured frame). A tiny
// inset keeps the cut clean.
const r2 = await sharp(out).raw().toBuffer({ resolveWithObject: true })
const { data: D, info: I } = r2
// Edge test = bright cream body OR a coloured frame that is NOT blue-dominant (green
// advantage / orange-red secondary & primary frames). Excludes the bluish playmat and a
// map's blue zones (b-dominant) so those don't read as card and the edges trim cleanly.
const cardPx = (x: number, y: number) => {
  const i = (y * I.width + x) * I.channels, r = D[i], g = D[i + 1], b = D[i + 2]
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0
  return mn > 168 || (r - b) > 16 || (sat > 0.30 && b < mx - 8) // bright / warm / saturated-non-blue
}
const rowFrac = (y: number) => { let c = 0, n = 0; for (let x = 0; x < I.width; x += 2) { n++; if (cardPx(x, y)) c++ } return c / n }
const colFrac = (x: number) => { let c = 0, n = 0; for (let y = 0; y < I.height; y += 2) { n++; if (cardPx(x, y)) c++ } return c / n }
// Mean brightness per row: the card (cream body / coloured frame) is bright, the playmat is
// dark — so the card→mat transition at the bottom is a brightness drop. Cut just below the
// lowest still-bright row for a sharp bottom edge.
// Only trim columns/rows that are CLEARLY empty mat (very low card fraction) and only a small
// band — so a card's dark ART near an edge isn't mistaken for background and cut.
let t = 0; while (t < I.height * 0.06 && rowFrac(t) < 0.22) t++
let l = 0; while (l < I.width * 0.06 && colFrac(l) < 0.22) l++
let rt = I.width - 1; while (rt > I.width * 0.94 && colFrac(rt) < 0.22) rt--
// Fixed bottom shave: the playmat-detection is unreliable on these photos (mat colours overlap
// the card), so just trim a small fixed band — the inflated bottom corner sits ~that far into
// the mat. `--bottomShave` (fraction) overrides per card.
const bShave = bShaveArg !== undefined ? parseFloat(bShaveArg) : 0.03
let bo = I.height - 1 - Math.round(I.height * bShave)
const ins = 2
t += ins; l += ins; rt -= ins
await sharp(out).extract({ left: l, top: t, width: rt - l + 1, height: bo - t + 1 }).resize({ width: oW }).toFile(out + '.t')
execFileSync('mv', [out + '.t', out])
console.log(`corners TL=${tl[0]},${tl[1]} TR=${tr[0]},${tr[1]} BR=${br[0]},${br[1]} BL=${bl[0]},${bl[1]} crop[t${t} b${I.height-1-bo} l${l} r${I.width-1-rt}] → ${out}`)

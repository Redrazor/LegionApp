// split-cards — split an image that aggregates several cards side-by-side (e.g. AMG's
// per-faction advantage sheets) into one sub-image per card, by finding the dark gaps
// between them. Each sub-image is then fed to rectify-card.ts. Cards sit on a dark surface,
// so a "card column" has many non-dark pixels and the gaps are columns that don't.
//   npx tsx scripts/split-cards.ts <in.png> <outPrefix> [nCards=2]
// → writes <outPrefix>-1.png, <outPrefix>-2.png, ...
import sharp from 'sharp'
import { execFileSync } from 'child_process'

const [src, prefix, nArg] = process.argv.slice(2)
const N = nArg ? parseInt(nArg) : 2
const { data, info } = await sharp(src).blur(1.2).raw().toBuffer({ resolveWithObject: true })
const { width: W, height: H, channels: C } = info
// card pixel = not dark surface (bright / coloured)
const card = (x: number, y: number) => {
  const i = (y * W + x) * C, r = data[i], g = data[i + 1], b = data[i + 2]
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0
  return mx > 90 && (sat > 0.18 || mx > 130)
}
const raw = new Float64Array(W)
for (let x = 0; x < W; x++) { let c = 0; for (let y = 0; y < H; y += 2) if (card(x, y)) c++; raw[x] = c / (H / 2) }
// Smooth so a single dark column inside a card's art isn't mistaken for the inter-card seam;
// the genuine seam is a sustained low-density gap and survives smoothing.
const R = Math.round(W * 0.018)
const colFrac = new Float64Array(W)
for (let x = 0; x < W; x++) { let s = 0, n = 0; for (let d = -R; d <= R; d++) { const xx = x + d; if (xx >= 0 && xx < W) { s += raw[xx]; n++ } } colFrac[x] = s / n }

// The cards can nearly touch (no wide dark gap), so for each expected boundary search a
// window around the even split point and cut at the lowest-density column (the seam).
const cuts: number[] = []
for (let k = 1; k < N; k++) {
  const center = Math.round((W * k) / N)
  const lo = Math.max(1, center - Math.round(W * 0.08)), hi = Math.min(W - 2, center + Math.round(W * 0.08))
  let best = lo, bv = Infinity
  for (let x = lo; x <= hi; x++) if (colFrac[x] < bv) { bv = colFrac[x]; best = x }
  cuts.push(best)
}

const bounds = [0, ...cuts, W]
for (let i = 0; i < N; i++) {
  const x0 = bounds[i], x1 = bounds[i + 1]
  const out = `${prefix}-${i + 1}.png`
  execFileSync('convert', [src, '-crop', `${x1 - x0}x${H}+${x0}+0`, '+repage', out])
  console.log(`  card ${i + 1}: x ${x0}..${x1} → ${out}`)
}
console.log(`cuts at x=${cuts.join(',')} (W=${W})`)

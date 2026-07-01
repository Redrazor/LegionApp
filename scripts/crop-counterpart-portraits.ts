// One-off, reproducible portrait crops for the Feature 14 Counterpart cards.
//
// Counterpart cards (Iden's ID10 Seeker Droid, C-3PO) carry the figure art on the LEFT of the
// card (unlike unit cards, whose art is on the right — see scraper/portraits.ts). They are NOT
// catalogue units, so they have no entry in CARD_CROP_PORTRAITS and are intentionally kept out
// of `npm run portraits` (which is owner-frozen). This script crops just the counterpart source
// scans to a round-ready 40×40 bust — same size/format as unit portraits — so CounterpartBadge
// can show a proper round badge instead of a shrunk card.
//
// Boxes are square regions in the card's native pixels (all three scans are 1040×726), hand-tuned
// centred on the figure's face. Regenerate: `npx tsx scripts/crop-counterpart-portraits.ts`.
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const UNIT_IMG = join(ROOT, 'public', 'images', 'units')
const PORTRAIT_DIR = join(ROOT, 'public', 'images', 'portraits')

const CROPS: Record<string, { left: number; top: number; size: number }> = {
  'id10-seeker-droid': { left: 35, top: 140, size: 300 },
  'c-3po-republic': { left: 45, top: 25, size: 260 },
  'c-3po-rebels': { left: 20, top: 34, size: 260 },
  'grogu': { left: 40, top: 230, size: 300 },
}

async function main() {
  for (const [slug, { left, top, size }] of Object.entries(CROPS)) {
    await sharp(join(UNIT_IMG, `${slug}.webp`))
      .extract({ left, top, width: size, height: size })
      .resize(40, 40)
      .webp({ quality: 82 })
      .toFile(join(PORTRAIT_DIR, `${slug}.webp`))
    console.log(`✓ ${slug}.webp`)
  }
  console.log(`Wrote ${Object.keys(CROPS).length} counterpart portraits.`)
}

main()

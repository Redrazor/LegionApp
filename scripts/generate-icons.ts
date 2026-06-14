/**
 * Generates the PWA icons referenced by the manifest (vite.config.ts) from
 * public/favicon.svg, so the app is installable with a proper icon.
 *
 *   public/icons/pwa-192.png           192×192, full-bleed
 *   public/icons/pwa-512.png           512×512, full-bleed
 *   public/icons/pwa-512-maskable.png  512×512, glyph in the safe zone on a flat bg
 *
 * Run: npm run icons
 */
import sharp from 'sharp'
import { readFileSync, mkdirSync, existsSync } from 'fs'

const SVG = 'public/favicon.svg'
const OUT_DIR = 'public/icons'
const BG = '#0a0a0f' // matches the manifest background_color / theme

async function render(size: number, glyphScale: number, outName: string) {
  // Rasterise the SVG to the glyph size, then centre it on a flat square so the
  // corners are never transparent (maskable-safe) and the background is solid.
  const glyphSize = Math.round(size * glyphScale)
  const glyph = await sharp(readFileSync(SVG))
    .resize(glyphSize, glyphSize, { fit: 'contain', background: BG })
    .png()
    .toBuffer()

  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: glyph, gravity: 'center' }])
    .png()
    .toFile(`${OUT_DIR}/${outName}`)

  console.log(`  ${OUT_DIR}/${outName}  (${size}×${size})`)
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })
  console.log('Generating PWA icons from', SVG)
  await render(192, 1, 'pwa-192.png')
  await render(512, 1, 'pwa-512.png')
  // Maskable: keep the glyph inside the ~80% safe zone the launcher mask crops to.
  await render(512, 0.8, 'pwa-512-maskable.png')
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

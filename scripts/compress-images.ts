/**
 * Compresses every image in public/images to WebP at max 800px wide.
 * Output goes to public/images-compressed/ preserving directory structure
 * (so /images/units/x.webp → /units/x.webp at the Firebase hosting root).
 *
 * Firebase serves public/images-compressed; the app rewrites /images/ paths to
 * the CDN via src/utils/imageUrl.ts. Run: npm run images:compress
 */
import sharp from 'sharp'
import { readdirSync, statSync, mkdirSync, existsSync } from 'fs'
import { join, relative, dirname, extname } from 'path'

const INPUT_DIR = 'public/images'
// Top-level (NOT under public/) so Vite never bundles it into the Vercel build —
// this set is the Firebase image-CDN payload only.
const OUTPUT_DIR = 'images-compressed'
const MAX_WIDTH = 800
const QUALITY = 80

function getAllFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry)
    return statSync(fullPath).isDirectory() ? getAllFiles(fullPath) : [fullPath]
  })
}

const supportedExts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif'])

async function main() {
  if (!existsSync(INPUT_DIR)) {
    console.error(`No ${INPUT_DIR} — run \`npm run scrape\` first to fetch the card images.`)
    process.exit(1)
  }

  const files = getAllFiles(INPUT_DIR).filter((f) => supportedExts.has(extname(f).toLowerCase()))
  console.log(`Compressing ${files.length} images → WebP ${MAX_WIDTH}px max, Q${QUALITY}`)

  let done = 0
  let skipped = 0

  for (const file of files) {
    const rel = relative(INPUT_DIR, file)
    const outPath = join(OUTPUT_DIR, rel.replace(/\.[^.]+$/, '.webp'))
    const outDir = dirname(outPath)
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

    try {
      await sharp(file)
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toFile(outPath)
      done++
    } catch (err) {
      console.warn(`  skip ${rel}: ${(err as Error).message}`)
      skipped++
    }

    if (done % 50 === 0) process.stdout.write(`  ${done}/${files.length}\r`)
  }

  console.log(`\nDone: ${done} compressed, ${skipped} skipped`)
  console.log(`Output: ${OUTPUT_DIR}  →  deploy with \`npm run images:deploy\``)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

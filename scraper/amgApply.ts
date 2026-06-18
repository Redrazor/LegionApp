// amgApply — place matched AMG card fronts into the app's image tree.
//
// Reads scraper/amg-card-map.json (produced by the matching step, one entry per
// resolved card: { category, slug, sourcePdf, extractedFile }) and copies each
// staged front from scraper/amg-cards/ to public/images/<category>/<slug>.webp.
// Slugs in PRESERVE_SLUGS (self-sourced DOC56 Mandalorian errata) are never
// overwritten. After this, run: portraits → seed → images:compress → deploy, and
// regenerate card_list_origin.md (npm run amg:origins).
//
// Run with: npm run amg:apply   (optionally `-- --faction empire` to scope output logging)

import { readFile, copyFile, mkdir, access } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { isPreserved, type CardCategory } from './amgNormalise.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const CARDS_DIR = join(__dirname, 'amg-cards')
const MAP_PATH = join(__dirname, 'amg-card-map.json')
const APPROVALS_PATH = join(__dirname, 'amg-approvals.json')
const IMG_DIR = join(ROOT, 'public', 'images')

interface MapEntry { category: CardCategory; slug: string; sourcePdf: string; extractedFile: string }
interface Approval { category: CardCategory; slug: string; status: 'approved' | 'rejected' }

async function exists(p: string): Promise<boolean> {
  try { await access(p); return true } catch { return false }
}

async function main() {
  if (!(await exists(MAP_PATH))) {
    console.error(`No map at ${MAP_PATH}. Produce it from scraper/amg-cards/index.json (matching step) first.`)
    process.exit(1)
  }
  const map: MapEntry[] = JSON.parse(await readFile(MAP_PATH, 'utf8'))

  // Validation gate: if amg-approvals.json exists (exported from image-validation.html),
  // apply ONLY cards the owner approved. Without it, apply every mapping (with a warning).
  let approvedKeys: Set<string> | null = null
  if (await exists(APPROVALS_PATH)) {
    const approvals: Approval[] = JSON.parse(await readFile(APPROVALS_PATH, 'utf8'))
    approvedKeys = new Set(approvals.filter((a) => a.status === 'approved').map((a) => `${a.category}:${a.slug}`))
    console.log(`Using validation gate: ${approvedKeys.size} approved card(s).`)
  } else {
    console.warn('! No amg-approvals.json — applying ALL mappings unvalidated. Run `npm run images:validate` to gate.')
  }

  let applied = 0, preserved = 0, missing = 0, skipped = 0
  for (const e of map) {
    if (isPreserved(e.category, e.slug)) { preserved++; continue }
    if (approvedKeys && !approvedKeys.has(`${e.category}:${e.slug}`)) { skipped++; continue }
    const src = join(CARDS_DIR, e.extractedFile)
    if (!(await exists(src))) { console.warn(`  ! missing staged file ${e.extractedFile} for ${e.slug}`); missing++; continue }
    const dest = join(IMG_DIR, e.category, `${e.slug}.webp`)
    await mkdir(dirname(dest), { recursive: true })
    await copyFile(src, dest)
    applied++
  }

  console.log(`Applied ${applied}; preserved ${preserved} self-sourced; skipped ${skipped} unapproved/pending; ${missing} missing.`)
  if (applied) console.log('Next: npm run portraits && npm run seed && npm run amg:origins && npm run images:compress')
}

main()

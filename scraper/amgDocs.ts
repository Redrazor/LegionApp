// amgDocs — download the official AMG print-and-play PDFs that source 2.0 card art.
//
// Mirrors scrape.ts's download shape (browser UA, retry, skip-if-present). Writes to
// the git-ignored scraper/amg-pdfs/ working dir. Run with: npm run amg:fetch
//
// Source list (which PDF covers which category/faction) lives in amgNormalise.ts.

import { writeFile, mkdir, access, stat } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { AMG_SOURCES, BATTLE_BUILD_SOURCES, pdfBasename } from './amgNormalise.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PDF_DIR = join(__dirname, 'amg-pdfs')

const BROWSER_UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36' }

async function exists(p: string): Promise<boolean> {
  try { await access(p); return true } catch { return false }
}

async function download(url: string, dest: string, attempt = 1): Promise<boolean> {
  try {
    if (await exists(dest)) return true
    const res = await fetch(url, { headers: BROWSER_UA })
    if (!res.ok) throw new Error(`${res.status}`)
    await mkdir(dirname(dest), { recursive: true })
    await writeFile(dest, Buffer.from(await res.arrayBuffer()))
    return true
  } catch (e) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, attempt * 800))
      return download(url, dest, attempt + 1)
    }
    console.warn(`  ! failed ${url} (${(e as Error).message})`)
    return false
  }
}

async function main() {
  console.log(`Fetching ${AMG_SOURCES.length} AMG PnP PDFs → ${PDF_DIR}`)
  await mkdir(PDF_DIR, { recursive: true })
  let ok = 0
  for (const src of AMG_SOURCES) {
    const name = pdfBasename(src.url)
    const dest = join(PDF_DIR, name)
    const had = await exists(dest)
    if (await download(src.url, dest)) {
      ok++
      const kb = Math.round((await stat(dest)).size / 1024)
      console.log(`  ✓ ${name} (${src.category}/${src.faction ?? 'generic'}, ${kb} KB)${had ? ' [cached]' : ''}`)
    }
  }
  // The special battle-build PDFs (Recon Rulebook + Errata) consumed by build-battle-cards.
  for (const url of BATTLE_BUILD_SOURCES) {
    const name = pdfBasename(url)
    const dest = join(PDF_DIR, name)
    const had = await exists(dest)
    if (await download(url, dest)) {
      const kb = Math.round((await stat(dest)).size / 1024)
      console.log(`  ✓ ${name} (battle-build, ${kb} KB)${had ? ' [cached]' : ''}`)
    }
  }
  console.log(`Done: ${ok}/${AMG_SOURCES.length} PnP PDFs + ${BATTLE_BUILD_SOURCES.length} battle-build PDFs.`)
}

main()

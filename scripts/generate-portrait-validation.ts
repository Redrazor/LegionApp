/**
 * Generates portrait-validation.html (repo root): a single-page contact sheet of every unit's
 * round Build badge (faction-coloured ring + the cropped portrait, or the "no portrait"
 * silhouette), grouped by faction, each tagged with a stable #id, name, title and slug for QA.
 *
 * Run:  npm run portraits:validate    (after `npm run portraits`)
 */
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

interface Unit { slug: string; name: string; title?: string; faction: string; portraitImage: string | null }

const FACTION: Record<string, { n: string; c: string }> = {
  rebels: { n: 'Rebel Alliance', c: '#d6453c' },
  empire: { n: 'Galactic Empire', c: '#5b6b78' },
  republic: { n: 'Galactic Republic', c: '#c9942e' },
  separatists: { n: 'Separatist Alliance', c: '#2f7fb5' },
  mercenary: { n: 'Mercenaries', c: '#8a8f3a' },
  mandalorians: { n: 'Mandalorians', c: '#d98a2b' },
}
const ORDER = ['rebels', 'empire', 'republic', 'separatists', 'mercenary', 'mandalorians']

const esc = (s = '') => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const SILH =
  '<svg viewBox="0 0 24 24" fill="currentColor" style="width:55%;height:55%;color:#5b6470"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.42 0-8 2.69-8 6v2h16v-2c0-3.31-3.58-6-8-6Z"/></svg>'

// Optional focus filter: `npm run portraits:validate -- <slug> [<slug>...]` renders only those
// units (e.g. to eyeball just a few re-tuned crops). No args → the full 180-unit contact sheet.
const focus = new Set(process.argv.slice(2))
const allUnits: Unit[] = JSON.parse(readFileSync(join(ROOT, 'public/data/units.json'), 'utf8'))
const units: Unit[] = focus.size ? allUnits.filter((u) => focus.has(u.slug)) : allUnits

const groups = ORDER
  .map((f) => ({
    meta: FACTION[f] ?? { n: f, c: '#888' },
    items: units.filter((u) => u.faction === f).sort((a, b) => (a.name + a.title).localeCompare(b.name + b.title)),
  }))
  .filter((g) => g.items.length)
const other = units.filter((u) => !ORDER.includes(u.faction))
if (other.length) groups.push({ meta: { n: 'Other', c: '#888' }, items: other })

const V = Date.now() // cache-buster so a refresh always shows freshly regenerated crops
let id = 0
const card = (u: Unit, ringColor: string) => {
  id++
  const inner = u.portraitImage
    ? `<img src="public/images/portraits/${u.slug}.webp?v=${V}" alt="${esc(u.name)}" loading="lazy">`
    : `<span class="silh">${SILH}</span>`
  return `<figure class="card" data-name="${esc((u.name + ' ' + (u.title ?? '')).toLowerCase())}" data-noportrait="${u.portraitImage ? 0 : 1}">
    <span class="badge" style="background:linear-gradient(145deg, ${ringColor}, transparent 70%)"><span class="badge-inner">${inner}</span></span>
    <figcaption>
      <span class="id">#${id}</span>
      <span class="name">${esc(u.name)}</span>
      <span class="title">${esc(u.title ?? '')}</span>
      <span class="slug">${esc(u.slug)}</span>
    </figcaption>
  </figure>`
}

let body = ''
for (const g of groups) {
  body += `<section><h2 style="border-color:${g.meta.c}"><span class="dot" style="background:${g.meta.c}"></span>${esc(g.meta.n)} <span class="cnt">${g.items.length}</span></h2><div class="grid">`
  for (const u of g.items) body += card(u, g.meta.c)
  body += `</div></section>`
}

const total = id
const noPortrait = units.filter((u) => !u.portraitImage).length

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>LegionApp — Portrait validation (${total} units)</title>
<style>
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:#0e0f12;color:#e7e9ee;font:14px/1.4 -apple-system,Segoe UI,Roboto,sans-serif}
header{position:sticky;top:0;z-index:5;background:#111317ee;backdrop-filter:blur(6px);padding:14px 20px;border-bottom:1px solid #23262d}
header h1{margin:0 0 6px;font-size:16px}
header .meta{color:#9aa1ad;font-size:12px}
header input[type=search]{margin-top:8px;width:min(360px,100%);padding:7px 10px;border-radius:7px;border:1px solid #2c2f37;background:#1a1c22;color:#e7e9ee}
header label{margin-left:12px;font-size:12px;color:#9aa1ad;user-select:none}
main{padding:8px 20px 60px}
section{margin-top:26px}
h2{display:flex;align-items:center;gap:10px;font-size:14px;letter-spacing:.04em;text-transform:uppercase;color:#cfd3db;border-left:3px solid;padding-left:10px;margin:0 0 14px}
h2 .dot{width:9px;height:9px;border-radius:50%}
h2 .cnt{color:#727884;font-weight:400}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:14px}
.card{margin:0;display:flex;flex-direction:column;align-items:center;text-align:center;background:#15171c;border:1px solid #21242b;border-radius:10px;padding:14px 8px 10px}
.badge{display:block;width:96px;height:96px;border-radius:50%;padding:3px}
.badge-inner{display:flex;align-items:center;justify-content:center;width:100%;height:100%;border-radius:50%;overflow:hidden;background:#0c0d10;box-shadow:inset 0 0 0 1px #00000066}
.badge-inner img{width:100%;height:100%;object-fit:cover}
.silh{display:flex;align-items:center;justify-content:center;width:100%;height:100%}
figcaption{display:flex;flex-direction:column;gap:1px;margin-top:9px;min-width:0;width:100%}
.id{font-weight:700;color:#ffb454;font-size:13px}
.name{font-weight:600;font-size:12.5px;line-height:1.25}
.title{color:#9aa1ad;font-size:11px;line-height:1.2}
.slug{color:#5b616c;font-size:9.5px;font-family:ui-monospace,Menlo,monospace;word-break:break-all;margin-top:3px}
.card.hide{display:none}
body.only-missing .card:not([data-noportrait="1"]){display:none}
</style></head><body>
<header>
  <h1>LegionApp — Portrait validation</h1>
  <div class="meta">${total} units · ${total - noPortrait} with portrait · ${noPortrait} showing the &ldquo;no portrait&rdquo; indicator · regenerated by <code>npm run portraits</code></div>
  <input id="q" type="search" placeholder="Filter by name / title&hellip;" autocomplete="off">
  <label><input type="checkbox" id="missing"> only &ldquo;no portrait&rdquo;</label>
</header>
<main>${body}</main>
<script>
const q=document.getElementById('q'),cards=[...document.querySelectorAll('.card')];
q.addEventListener('input',()=>{const t=q.value.trim().toLowerCase();for(const c of cards)c.classList.toggle('hide',t&&!c.dataset.name.includes(t));});
document.getElementById('missing').addEventListener('change',e=>document.body.classList.toggle('only-missing',e.target.checked));
</script>
</body></html>`

writeFileSync(join(ROOT, 'portrait-validation.html'), html)
console.log(`wrote portrait-validation.html — ${total} units, ${noPortrait} without portrait`)

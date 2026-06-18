/**
 * Generates image-validation.html (repo root): a side-by-side OLD-vs-NEW contact sheet
 * for the 2.0 card-image re-source. For every proposed mapping in
 * scraper/amg-card-map.json it shows the CURRENT on-disk scan (OLD, usually the Legion
 * HQ 2 image) next to the staged AMG print-and-play candidate (NEW), grouped by source
 * PDF so the owner can validate one batch at a time.
 *
 * Per card: Approve / Reject toggle (state persists in localStorage). "Export approvals"
 * downloads amg-approvals.json (`[{ category, slug, status }]`) — `npm run amg:apply`
 * then applies ONLY approved cards. This is the validation gate between match and apply:
 *   amg:extract → match → images:validate (review + export) → amg:apply → portraits → seed
 *
 * Run:  npm run images:validate    (after producing scraper/amg-card-map.json)
 *
 * Image paths are repo-root-relative so the page works opened directly via file://.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MAP_PATH = join(ROOT, 'scraper', 'amg-card-map.json')

type Cat = 'units' | 'upgrades' | 'commands' | 'battle'
interface Card { slug: string; name: string; title?: string | null }
interface MapEntry { category: Cat; slug: string; sourcePdf: string; extractedFile: string }

const esc = (s = '') => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const DATA_FILE: Record<Cat, string> = {
  units: 'units.json', upgrades: 'upgrades.json', commands: 'commands.json', battle: 'battleCards.json',
}
function loadNames(cat: Cat): Map<string, Card> {
  const arr: Card[] = JSON.parse(readFileSync(join(ROOT, 'public/data', DATA_FILE[cat]), 'utf8'))
  return new Map(arr.map((c) => [c.slug, c]))
}

if (!existsSync(MAP_PATH)) {
  console.error(`No mapping at ${MAP_PATH}. Produce it from scraper/amg-cards/index.json (matching step) first.`)
  process.exit(1)
}
const map: MapEntry[] = JSON.parse(readFileSync(MAP_PATH, 'utf8'))
const names: Record<Cat, Map<string, Card>> = {
  units: loadNames('units'), upgrades: loadNames('upgrades'), commands: loadNames('commands'), battle: loadNames('battle'),
}

// Group by source PDF — the natural batch the owner reviews at once.
const byPdf = new Map<string, MapEntry[]>()
for (const e of map) {
  if (!byPdf.has(e.sourcePdf)) byPdf.set(e.sourcePdf, [])
  byPdf.get(e.sourcePdf)!.push(e)
}

const V = Date.now() // cache-buster so a refresh shows freshly re-extracted candidates
let total = 0
let body = ''
for (const [pdf, entries] of [...byPdf.entries()].sort()) {
  entries.sort((a, b) => a.slug.localeCompare(b.slug))
  body += `<section><h2><span class="dot"></span>${esc(pdf)} <span class="cnt">${entries.length}</span>
    <button class="bulk" data-act="approve">Approve all visible</button>
    <button class="bulk" data-act="reject">Reject all visible</button></h2><div class="grid">`
  for (const e of entries) {
    total++
    const card = names[e.category].get(e.slug)
    const label = card ? `${card.name}${card.title ? ` — ${card.title}` : ''}` : e.slug
    const oldRel = `public/images/${e.category}/${e.slug}.webp`
    const oldImg = existsSync(join(ROOT, oldRel))
      ? `<img class="shot" src="${oldRel}?v=${V}" loading="lazy" alt="old">`
      : `<span class="noimg">no current image</span>`
    const newRel = `scraper/amg-cards/${e.extractedFile}`
    const newImg = `<img class="shot" src="${newRel}?v=${V}" loading="lazy" alt="new">`
    const key = `${e.category}:${e.slug}`
    body += `<figure class="card" data-key="${esc(key)}" data-cat="${e.category}" data-name="${esc(label.toLowerCase())} ${esc(e.slug)}">
      <div class="pair">
        <div class="side"><span class="tag old">OLD · ${e.category}</span>${oldImg}</div>
        <div class="side"><span class="tag new">NEW · AMG</span>${newImg}</div>
      </div>
      <figcaption>
        <span class="name">${esc(label)}</span>
        <span class="slug">${esc(e.slug)}</span>
        <div class="verdict">
          <button class="v approve" data-v="approved">Approve</button>
          <button class="v reject" data-v="rejected">Reject</button>
        </div>
      </figcaption>
    </figure>`
  }
  body += `</div></section>`
}

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>LegionApp — Image validation (${total} cards)</title>
<style>
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:#0e0f12;color:#e7e9ee;font:14px/1.4 -apple-system,Segoe UI,Roboto,sans-serif}
header{position:sticky;top:0;z-index:5;background:#111317ee;backdrop-filter:blur(6px);padding:14px 20px;border-bottom:1px solid #23262d}
header h1{margin:0 0 6px;font-size:16px}
header .meta{color:#9aa1ad;font-size:12px}
header .controls{margin-top:8px;display:flex;flex-wrap:wrap;gap:10px;align-items:center}
header input[type=search]{width:min(320px,100%);padding:7px 10px;border-radius:7px;border:1px solid #2c2f37;background:#1a1c22;color:#e7e9ee}
header label{font-size:12px;color:#9aa1ad;user-select:none}
header .count{font-size:12px;color:#cfd3db}
header .count b.ok{color:#5fce7e}header .count b.no{color:#e0685f}header .count b.pend{color:#ffb454}
button{cursor:pointer;border:1px solid #2c2f37;background:#1a1c22;color:#e7e9ee;border-radius:7px;padding:6px 10px;font-size:12px}
button.primary{background:#2b5e3a;border-color:#357a49}
main{padding:8px 20px 80px}
section{margin-top:26px}
h2{display:flex;align-items:center;gap:10px;font-size:13px;letter-spacing:.03em;color:#cfd3db;border-left:3px solid #ffb454;padding-left:10px;margin:0 0 14px}
h2 .dot{width:9px;height:9px;border-radius:50%;background:#ffb454}
h2 .cnt{color:#727884;font-weight:400;margin-right:auto}
.bulk{font-size:11px;padding:4px 8px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
.card{margin:0;background:#15171c;border:1px solid #21242b;border-radius:10px;padding:10px}
.card[data-status=approved]{border-color:#357a49;box-shadow:0 0 0 1px #357a4955}
.card[data-status=rejected]{border-color:#9c4039;box-shadow:0 0 0 1px #9c403955;opacity:.7}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.side{position:relative;background:#0c0d10;border-radius:8px;overflow:hidden;display:flex;align-items:center;justify-content:center;min-height:120px}
.shot{width:100%;height:auto;display:block}
.noimg{color:#5b616c;font-size:11px;padding:24px 8px;text-align:center}
.tag{position:absolute;top:4px;left:4px;font-size:9px;letter-spacing:.04em;padding:2px 5px;border-radius:4px;background:#000000aa}
.tag.old{color:#9aa1ad}.tag.new{color:#ffd9a0}
figcaption{display:flex;flex-direction:column;gap:2px;margin-top:9px}
.name{font-weight:600;font-size:12.5px;line-height:1.25}
.slug{color:#5b616c;font-size:9.5px;font-family:ui-monospace,Menlo,monospace;word-break:break-all}
.verdict{display:flex;gap:8px;margin-top:8px}
.verdict .v{flex:1}
.card[data-status=approved] .v.approve{background:#2b5e3a;border-color:#357a49}
.card[data-status=rejected] .v.reject{background:#7a322b;border-color:#9c4039}
.card.hide{display:none}
body.only-pending .card:not([data-status=pending]){display:none}
</style></head><body>
<header>
  <h1>LegionApp — Image validation (OLD vs NEW)</h1>
  <div class="meta">${total} proposed mappings · NEW = AMG print-and-play candidate · review per source PDF · regenerated by <code>npm run images:validate</code></div>
  <div class="controls">
    <input id="q" type="search" placeholder="Filter by name / slug&hellip;" autocomplete="off">
    <label><input type="checkbox" id="pending"> only pending</label>
    <span class="count">Approved <b class="ok" id="cOk">0</b> · Rejected <b class="no" id="cNo">0</b> · Pending <b class="pend" id="cPend">${total}</b></span>
    <button class="primary" id="export">Export approvals</button>
    <button id="reset">Reset all</button>
  </div>
</header>
<main>${body}</main>
<script>
const KEY='amg-approvals-v1';
const cards=[...document.querySelectorAll('.card')];
const state=JSON.parse(localStorage.getItem(KEY)||'{}');
function applyState(){for(const c of cards)c.dataset.status=state[c.dataset.key]||'pending';counts();}
function counts(){let ok=0,no=0,p=0;for(const c of cards){const s=c.dataset.status;if(s==='approved')ok++;else if(s==='rejected')no++;else p++;}
  cOk.textContent=ok;cNo.textContent=no;cPend.textContent=p;}
function set(key,v){if(state[key]===v)delete state[key];else state[key]=v;localStorage.setItem(KEY,JSON.stringify(state));applyState();}
document.addEventListener('click',e=>{
  const v=e.target.closest('.v');if(v){const c=v.closest('.card');set(c.dataset.key,v.dataset.v);return;}
  const b=e.target.closest('.bulk');if(b){const act=b.dataset.act==='approve'?'approved':'rejected';
    for(const c of b.closest('section').querySelectorAll('.card')){if(c.classList.contains('hide'))continue;state[c.dataset.key]=act;}
    localStorage.setItem(KEY,JSON.stringify(state));applyState();}
});
const q=document.getElementById('q');
q.addEventListener('input',()=>{const t=q.value.trim().toLowerCase();for(const c of cards)c.classList.toggle('hide',t&&!c.dataset.name.includes(t));});
document.getElementById('pending').addEventListener('change',e=>document.body.classList.toggle('only-pending',e.target.checked));
document.getElementById('reset').addEventListener('click',()=>{if(confirm('Clear all approve/reject decisions?')){for(const k in state)delete state[k];localStorage.removeItem(KEY);applyState();}});
document.getElementById('export').addEventListener('click',()=>{
  const out=cards.map(c=>({key:c.dataset.key,category:c.dataset.key.split(':')[0],slug:c.dataset.key.split(':').slice(1).join(':'),status:state[c.dataset.key]||'pending'}))
    .filter(e=>e.status!=='pending').map(({category,slug,status})=>({category,slug,status}));
  const blob=new Blob([JSON.stringify(out,null,2)+'\\n'],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='amg-approvals.json';a.click();
});
applyState();
</script>
</body></html>`

writeFileSync(join(ROOT, 'image-validation.html'), html)
console.log(`wrote image-validation.html — ${total} proposed mappings across ${byPdf.size} source PDFs`)

/**
 * Per-unit social/SEO meta for `/browse/:slug`.
 *
 * SPAs serve one static index.html for every route, so classic social scrapers
 * (Discord, Reddit, X, Facebook, Slack, iMessage) — which don't run JS — only ever
 * see the app-level Open Graph tags. The client-side `useHead` in UnitProfile.vue
 * upgrades the tags for browsers + JS-rendering crawlers (Google), but not for those
 * scrapers.
 *
 * This Vercel function closes that gap: `vercel.json` rewrites `/browse/:slug` here,
 * we fetch the built SPA shell, and inject THIS unit's title/description/og:image
 * (its own card scan on the Firebase CDN) into the served <head>. Humans get the
 * identical SPA (the meta tags don't affect rendering); scrapers get a real preview.
 */
import type { IncomingMessage, ServerResponse } from 'http'
import { readFileSync } from 'fs'
import { join } from 'path'

const SITE = 'https://www.legion-app.com'
const IMAGE_BASE = 'https://legionapp-images.web.app' // mirrors VITE_IMAGE_BASE / src/utils/imageUrl.ts

interface Unit {
  slug: string
  name: string
  title?: string | null
  faction?: string | null
  rank?: string | null
  cost?: number | null
  cardImage?: string | null
}

// Read once at cold start. `public/data/units.json` is bundled via vercel.json includeFiles.
const units = JSON.parse(
  readFileSync(join(process.cwd(), 'public/data/units.json'), 'utf-8'),
) as Unit[]
const bySlug = new Map(units.map((u) => [u.slug, u]))

const FACTIONS: Record<string, string> = {
  rebels: 'Rebel Alliance',
  empire: 'Galactic Empire',
  republic: 'Galactic Republic',
  separatists: 'Separatist Alliance',
  mercenary: 'Mercenary',
}
const RANKS: Record<string, string> = {
  commander: 'Commander',
  operative: 'Operative',
  corps: 'Corps',
  special: 'Special Forces',
  support: 'Support',
  heavy: 'Heavy',
}

// Same transform as src/utils/imageUrl.ts: /images/X.jpg → <cdn>/X.webp
function cardImageUrl(path: string): string {
  const stripped = path.replace(/^\/images\//, '/')
  const webp = stripped.replace(/\.(png|jpe?g|gif)$/i, '.webp')
  return `${IMAGE_BASE}${webp}`
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function setMeta(html: string, attr: 'property' | 'name', key: string, value: string): string {
  const re = new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`)
  return re.test(html) ? html.replace(re, `$1${esc(value)}$2`) : html
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const host = req.headers.host || 'www.legion-app.com'
  const url = new URL(req.url || '/', `https://${host}`)
  const slug = url.searchParams.get('slug') || url.pathname.replace(/^\/browse\//, '')
  const unit = slug ? bySlug.get(slug) : undefined

  // Always serve the real built shell (correct hashed asset tags) so the SPA boots.
  let html: string
  try {
    html = await fetch(`https://${host}/index.html`).then((r) => r.text())
  } catch {
    // Fall back to letting the SPA route resolve client-side.
    res.statusCode = 302
    res.setHeader('location', unit ? `/browse/${unit.slug}` : '/browse')
    res.end()
    return
  }

  if (unit) {
    const titled = `${unit.name}${unit.title ? ` — ${unit.title}` : ''}`
    const faction = FACTIONS[unit.faction ?? ''] ?? unit.faction ?? ''
    const rank = RANKS[unit.rank ?? ''] ?? unit.rank ?? ''
    const desc =
      `${unit.name}${unit.title ? ` (${unit.title})` : ''} — ${faction} ${rank}`.trim() +
      `${unit.cost != null ? `, ${unit.cost} points` : ''}. ` +
      `Card, stats, weapons, keywords and upgrade options on LegionApp.`
    const image = unit.cardImage ? cardImageUrl(unit.cardImage) : `${SITE}/og-image.png`
    const pageUrl = `${SITE}/browse/${unit.slug}`

    html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(titled)} — LegionApp</title>`)
    html = setMeta(html, 'name', 'description', desc)
    html = setMeta(html, 'property', 'og:type', 'article')
    html = setMeta(html, 'property', 'og:title', titled)
    html = setMeta(html, 'property', 'og:description', desc)
    html = setMeta(html, 'property', 'og:url', pageUrl)
    html = setMeta(html, 'property', 'og:image', image)
    html = setMeta(html, 'name', 'twitter:title', titled)
    html = setMeta(html, 'name', 'twitter:description', desc)
    html = setMeta(html, 'name', 'twitter:image', image)
    html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${pageUrl}$2`)
  }

  res.setHeader('content-type', 'text/html; charset=utf-8')
  // Edge-cache the rendered shell; SPA assets are already immutable.
  res.setHeader('cache-control', 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800')
  res.end(html)
}

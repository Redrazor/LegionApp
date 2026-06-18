const IMAGE_BASE = (import.meta.env.VITE_IMAGE_BASE as string | undefined) ?? ''

// Self-hosted CDN images (cards, portraits, products) are served `immutable` for a year, and
// card scans / portrait crops get re-pulled in place under the same filename. Tagging every CDN
// URL with the app version busts that cache on each release, so a returning client always
// refetches images that changed in the deploy. `__APP_VERSION__` is injected from package.json
// at build time (see vite.config.ts / vitest.config.ts); falls back to 'dev' if undefined.
const IMG_CACHE_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'

/**
 * Resolves a card/portrait/product image path against VITE_IMAGE_BASE.
 *
 * - Local dev / no CDN: IMAGE_BASE is empty → the `/images/...` path is served
 *   from `public/` as-is (relative to the app origin).
 * - Production: IMAGE_BASE = the Firebase image-CDN root (e.g.
 *   `https://legionapp-images.web.app`). Firebase hosts `public/images-compressed`
 *   at its root, so we strip the `/images/` prefix and force the `.webp`
 *   extension to match the compressed output (products ship as `.jpg` originals).
 *
 * Absolute URLs and `data:` URIs are passed through untouched.
 */
export function imageUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  if (path.startsWith('data:')) return path
  if (!IMAGE_BASE) return path

  // Firebase hosting root = public/images-compressed, so strip the /images/ prefix.
  const stripped = path.replace(/^\/images\//, '/')
  // Compressed files are all .webp regardless of the source extension.
  const webp = stripped.replace(/\.(png|jpe?g|gif)$/i, '.webp')
  // Tag with the app version so each release busts the immutable CDN + service-worker cache.
  return `${IMAGE_BASE}${webp}?v=${IMG_CACHE_VERSION}`
}

export { IMAGE_BASE }

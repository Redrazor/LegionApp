const IMAGE_BASE = (import.meta.env.VITE_IMAGE_BASE as string | undefined) ?? ''

// Self-hosted CDN images (cards, portraits, products) are served `immutable` for a year under
// stable filenames, so clients cache them indefinitely and the CDN edge stays warm across
// releases. We intentionally do NOT append an app-version query: that busted EVERY image cache
// on EVERY release (re-downloading ~870 images cold after each deploy) just to catch the rare
// case of an image re-pulled in place. Now that sourcing is stable, if a specific image is ever
// replaced under the same filename, bust that one (rename it or add a per-file query) rather
// than invalidating the whole cache every release.

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
  return `${IMAGE_BASE}${webp}`
}

export { IMAGE_BASE }

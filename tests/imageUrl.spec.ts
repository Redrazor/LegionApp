import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// imageUrl reads import.meta.env.VITE_IMAGE_BASE at module-eval time, so each
// base-specific case re-imports the module with a stubbed env.
async function loadWithBase(base: string | undefined) {
  vi.resetModules()
  if (base === undefined) vi.stubEnv('VITE_IMAGE_BASE', '')
  else vi.stubEnv('VITE_IMAGE_BASE', base)
  return (await import('../src/utils/imageUrl')).imageUrl
}

describe('imageUrl', () => {
  afterEach(() => vi.unstubAllEnvs())

  describe('with no IMAGE_BASE (local dev)', () => {
    let imageUrl: (p: string | null | undefined) => string
    beforeEach(async () => {
      imageUrl = await loadWithBase('')
    })

    it('returns the path unchanged', () => {
      expect(imageUrl('/images/units/darth-vader.webp')).toBe('/images/units/darth-vader.webp')
    })

    it('does not rewrite a .jpg product path', () => {
      expect(imageUrl('/images/products/123.jpg')).toBe('/images/products/123.jpg')
    })
  })

  describe('with a Firebase IMAGE_BASE (production)', () => {
    let imageUrl: (p: string | null | undefined) => string
    beforeEach(async () => {
      imageUrl = await loadWithBase('https://legionapp-images.web.app')
    })

    it('strips /images/ and prepends the base (no cache-busting query)', () => {
      expect(imageUrl('/images/units/darth-vader.webp')).toBe(
        'https://legionapp-images.web.app/units/darth-vader.webp',
      )
    })

    it('forces .webp for .jpg product originals', () => {
      expect(imageUrl('/images/products/8435407620759.jpg')).toBe(
        'https://legionapp-images.web.app/products/8435407620759.webp',
      )
    })

    it('forces .webp for .png and .jpeg too', () => {
      expect(imageUrl('/images/a.png')).toBe('https://legionapp-images.web.app/a.webp')
      expect(imageUrl('/images/b.jpeg')).toBe('https://legionapp-images.web.app/b.webp')
    })

    it('does NOT append a version query — images are immutable under stable filenames', () => {
      // The app-version cache-buster was removed: it re-downloaded every image after each
      // release. Plain immutable URLs stay cached across releases (see imageUrl.ts).
      expect(imageUrl('/images/portraits/darth-vader-dark-lord-of-the-sith.webp')).toBe(
        'https://legionapp-images.web.app/portraits/darth-vader-dark-lord-of-the-sith.webp',
      )
      expect(imageUrl('/images/upgrades/children-of-the-watch.webp')).toBe(
        'https://legionapp-images.web.app/upgrades/children-of-the-watch.webp',
      )
      expect(imageUrl('/images/units/darth-vader.webp')).not.toContain('?v=')
    })

    it('passes through absolute http(s) URLs untouched', () => {
      expect(imageUrl('https://cdn.example.com/x.webp')).toBe('https://cdn.example.com/x.webp')
    })

    it('passes through data URIs untouched', () => {
      expect(imageUrl('data:image/webp;base64,AAAA')).toBe('data:image/webp;base64,AAAA')
    })
  })

  describe('empty inputs', () => {
    it('returns "" for null/undefined/empty regardless of base', async () => {
      const imageUrl = await loadWithBase('https://legionapp-images.web.app')
      expect(imageUrl(null)).toBe('')
      expect(imageUrl(undefined)).toBe('')
      expect(imageUrl('')).toBe('')
    })
  })
})

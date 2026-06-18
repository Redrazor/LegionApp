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

    it('strips /images/ and prepends the base (with the app-version cache-buster)', () => {
      expect(imageUrl('/images/units/darth-vader.webp')).toBe(
        'https://legionapp-images.web.app/units/darth-vader.webp?v=test',
      )
    })

    it('forces .webp for .jpg product originals', () => {
      expect(imageUrl('/images/products/8435407620759.jpg')).toBe(
        'https://legionapp-images.web.app/products/8435407620759.webp?v=test',
      )
    })

    it('forces .webp for .png and .jpeg too', () => {
      expect(imageUrl('/images/a.png')).toBe('https://legionapp-images.web.app/a.webp?v=test')
      expect(imageUrl('/images/b.jpeg')).toBe('https://legionapp-images.web.app/b.webp?v=test')
    })

    it('appends the app-version cache-buster to every CDN image (cards + portraits)', () => {
      // Tied to the release version so each deploy busts the immutable CDN + SW image cache.
      expect(imageUrl('/images/portraits/darth-vader-dark-lord-of-the-sith.webp')).toBe(
        'https://legionapp-images.web.app/portraits/darth-vader-dark-lord-of-the-sith.webp?v=test',
      )
      expect(imageUrl('/images/upgrades/children-of-the-watch.webp')).toBe(
        'https://legionapp-images.web.app/upgrades/children-of-the-watch.webp?v=test',
      )
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

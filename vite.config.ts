import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Card images live on the Firebase CDN (cross-origin), not this origin — only
      // precache the catalogue JSON. Images are runtime-cached by destination below.
      includeAssets: ['data/**/*'],
      manifest: {
        name: 'LegionApp',
        short_name: 'LegionApp',
        description: 'Star Wars: Legion companion app',
        theme_color: '#0a0a0f',
        background_color: '#0a0a0f',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/pwa-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,webp,woff2}'],
        globIgnores: ['images/**'],
        runtimeCaching: [
          {
            // API on Render (cross-origin in prod) — match by pathname so it works
            // whether same-origin (dev) or on the Render host.
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            // Card/portrait/product images — origin-agnostic (Firebase CDN in prod,
            // public/ in dev). Match any image request so offline works either way.
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 1000, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
})

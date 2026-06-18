import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // Stable token for imageUrl's CDN cache-buster (real value is the package version at build).
  define: { __APP_VERSION__: JSON.stringify('test') },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: { lines: 50, functions: 50, branches: 50, statements: 50 },
      include: [
        'src/stores/**/*.ts',
        'src/composables/**/*.ts',
        'src/utils/**/*.ts',
        'scraper/normalise.ts',
        'scraper/amgNormalise.ts',
        'server/routes/**/*.ts',
        'server/db/seed.ts',
      ],
      exclude: ['src/main.ts', 'src/router/index.ts'],
    },
  },
})

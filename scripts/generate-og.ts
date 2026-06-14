/**
 * Generates the 1200×630 social share image (Open Graph / Twitter card) at
 * public/og-image.png. Referenced by index.html's og:image / twitter:image.
 * Run: npm run og
 */
import sharp from 'sharp'
import { mkdirSync, existsSync } from 'fs'

const OUT = 'public/og-image.png'
const BG = '#0a0a0f'
const ACCENT = '#d4a23a'
const TEXT = '#ededee'
const MUTED = '#9a9aa2'

// 1200×630 card: dark field, orange "L" mark, wordmark, tagline, feature row.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0a0a0f"/>
      <stop offset="1" stop-color="#14141c"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="1200" height="6" fill="${ACCENT}"/>

  <!-- L mark -->
  <rect x="90" y="150" width="150" height="150" rx="20" fill="${ACCENT}" opacity="0.14"/>
  <text x="165" y="270" font-family="Orbitron, Arial, sans-serif" font-size="150" font-weight="900"
        fill="${ACCENT}" text-anchor="middle">L</text>

  <!-- Wordmark -->
  <text x="290" y="245" font-family="Orbitron, Arial, sans-serif" font-size="86" font-weight="900"
        letter-spacing="4" fill="${TEXT}">LEGION<tspan fill="${ACCENT}">APP</tspan></text>

  <!-- Tagline -->
  <text x="92" y="400" font-family="Inter, Arial, sans-serif" font-size="40" font-weight="700" fill="${TEXT}">
    Your Star Wars: Legion companion
  </text>
  <text x="92" y="455" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="500" fill="${MUTED}">
    Browse every unit · Build &amp; validate armies · Track your collection
  </text>

  <!-- Footer row -->
  <text x="92" y="560" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="600" fill="${ACCENT}">
    www.legion-app.com
  </text>
  <text x="1108" y="560" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="500" fill="${MUTED}"
        text-anchor="end">Free · No login · Installable PWA</text>
</svg>`

async function main() {
  if (!existsSync('public')) mkdirSync('public', { recursive: true })
  await sharp(Buffer.from(svg)).png().toFile(OUT)
  console.log(`✓ ${OUT} (1200×630)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

// Generates the ManAlive placeholder icon set (Oxblood tile + Cream "MA").
// Writes PNGs into public/icons/. Run: node scripts/gen-icons.mjs
// These are throwaway placeholders; swap in the real mark later (same paths).
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

const OXBLOOD = '#4A1F1F'
const CREAM = '#ECE6D7'
const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

// `inset` is the fraction of padding around the wordmark — larger for the
// maskable variant so the "MA" stays inside the platform safe area when the
// launcher applies its own mask/crop.
function svg(size, { rounded, inset }) {
  const pad = Math.round(size * inset)
  const radius = rounded ? Math.round(size * 0.22) : 0
  const fontSize = Math.round((size - pad * 2) * 0.52)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="${OXBLOOD}"/>
  <text x="50%" y="50%" dy="0.02em" text-anchor="middle" dominant-baseline="central"
    font-family="Oswald, 'Arial Narrow', sans-serif" font-weight="700"
    font-size="${fontSize}" letter-spacing="${Math.round(fontSize * 0.02)}" fill="${CREAM}">MA</text>
</svg>`
}

async function render(name, size, opts) {
  const buf = Buffer.from(svg(size, opts))
  const file = join(outDir, name)
  await sharp(buf).png().toFile(file)
  console.log(`  wrote public/icons/${name}`)
}

console.log('Generating ManAlive placeholder icons:')
await render('icon-192.png', 192, { rounded: true, inset: 0.12 })
await render('icon-512.png', 512, { rounded: true, inset: 0.12 })
// Maskable: full-bleed background, generous safe-area padding (no rounding —
// the launcher supplies the shape).
await render('icon-maskable-512.png', 512, { rounded: false, inset: 0.2 })
console.log('Done.')

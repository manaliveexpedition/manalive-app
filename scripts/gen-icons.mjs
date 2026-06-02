// Generates the ManAlive app icon set: the cream Expedition logo on an oxblood
// tile. Writes PNGs into public/icons/. Run: node scripts/gen-icons.mjs
import { mkdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

const OXBLOOD = '#4A1F1F'
const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

const logoSvg = readFileSync(join(here, '..', 'public', 'manalive-expedition-logo-cream.svg'))

// Oxblood background tile. `rounded` for the standard icons (the OS may round
// further); square + extra padding for the maskable variant's safe area.
function bgSvg(size, rounded) {
  const r = rounded ? Math.round(size * 0.22) : 0
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="${OXBLOOD}"/></svg>`
}

async function render(name, size, { rounded, inset }) {
  const logoW = Math.round(size * (1 - 2 * inset))
  const logoPng = await sharp(logoSvg, { density: 384 }).resize({ width: logoW }).png().toBuffer()
  await sharp(Buffer.from(bgSvg(size, rounded)))
    .composite([{ input: logoPng, gravity: 'center' }])
    .png()
    .toFile(join(outDir, name))
  console.log(`  wrote public/icons/${name}`)
}

console.log('Generating ManAlive icons from the Expedition logo:')
await render('icon-192.png', 192, { rounded: true, inset: 0.1 })
await render('icon-512.png', 512, { rounded: true, inset: 0.1 })
await render('icon-maskable-512.png', 512, { rounded: false, inset: 0.18 })
console.log('Done.')

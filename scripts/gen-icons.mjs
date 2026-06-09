// Generates the ManAlive app icon set from the source icon
// (public/manalive-journey-icon.png — the rounded MANALIVE / JOURNEY tile).
// Writes PNGs into public/icons/. Run: node scripts/gen-icons.mjs
import { mkdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

const OXBLOOD = '#4A1F1F'
const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

const source = readFileSync(join(here, '..', 'public', 'manalive-journey-icon.png'))

// "any" purpose: the rounded tile as-is (the OS rounds further if it likes).
await sharp(source).resize(512, 512).png().toFile(join(outDir, 'icon-512.png'))
await sharp(source).resize(192, 192).png().toFile(join(outDir, 'icon-192.png'))
console.log('  wrote icon-512.png, icon-192.png')

// "maskable" purpose: full-bleed oxblood square (no transparent corners) with
// the art sized into the safe zone, so circle/squircle masks never clip it.
const inner = Math.round(512 * 0.84)
const art = await sharp(source).resize(inner, inner).png().toBuffer()
const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="${OXBLOOD}"/></svg>`
await sharp(Buffer.from(bg)).composite([{ input: art, gravity: 'center' }]).png().toFile(join(outDir, 'icon-maskable-512.png'))
console.log('  wrote icon-maskable-512.png')

// Notification small-icon: Android masks it to its alpha channel, so it must be
// flat white on transparent. The "Lively" campfire: a multi-tongue flame over
// crossed logs.
const LIVELY = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">
  <path d="M48 12 C50 22 56 26 55 35 C60 33 60 28 58 25 C64 35 61 45 60 53 C65 50 64 45 63 42 C67 53 58 60 48 60 C38 60 29 53 34 43 C34 48 38 49 40 46 C36 38 41 34 44 36 C43 29 46 26 46 21 C48 25 50 23 48 12 Z" fill="#ffffff"/>
  <g stroke="#ffffff" stroke-width="7" stroke-linecap="round">
    <line x1="24" y1="82" x2="72" y2="70"/>
    <line x1="24" y1="70" x2="72" y2="82"/>
  </g>
</svg>`
await sharp(Buffer.from(LIVELY)).png().toFile(join(outDir, 'notification.png'))
console.log('  wrote notification.png (lively)')
console.log('Done.')

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
// flat white on transparent. The "Sparks" campfire the guys picked: a bonfire
// flame + rising embers over crossed logs.
const SPARKS = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">
  <path d="M34 60 C29 50 35 44 37 50 C35 40 33 35 41 27 C42 34 46 33 45 27 C44 18 41 17 48 9 C52 18 49 26 53 31 C56 35 60 32 58 25 C64 35 60 43 61 51 C64 47 67 50 63 60 Z" fill="#ffffff"/>
  <circle cx="62" cy="22" r="3" fill="#ffffff"/>
  <circle cx="37" cy="18" r="2.5" fill="#ffffff"/>
  <circle cx="66" cy="38" r="2.5" fill="#ffffff"/>
  <g stroke="#ffffff" stroke-width="7" stroke-linecap="round">
    <line x1="24" y1="82" x2="72" y2="70"/>
    <line x1="24" y1="70" x2="72" y2="82"/>
  </g>
</svg>`
await sharp(Buffer.from(SPARKS)).png().toFile(join(outDir, 'notification.png'))
console.log('  wrote notification.png (sparks)')
console.log('Done.')

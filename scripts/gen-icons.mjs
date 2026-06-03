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
console.log('Done.')

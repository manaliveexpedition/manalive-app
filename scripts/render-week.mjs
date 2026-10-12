// Build a week's printable review doc: wrap a drafted <body> in the branded
// head (styles from the Week 1 doc) and print it to PDF with headless Edge.
//
//   node scripts/render-week.mjs <body.html> <week-number> "<Session title>" <slug>
//   e.g. node scripts/render-week.mjs docs/content-rebuild/drafts/week-03-body.html 3 "The Poser" the-poser
//
// Writes docs/content-rebuild/week-NN-<slug>.html and "The Journey - Week N - <title> (draft).pdf".
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const [bodyPath, weekArg, title, slug] = process.argv.slice(2)
if (!bodyPath || !weekArg || !title || !slug) {
  console.error('Usage: node scripts/render-week.mjs <body.html> <week-number> "<Session title>" <slug>')
  process.exit(1)
}
const week = Number(weekArg)
const dir = resolve('docs/content-rebuild')
const nn = String(week).padStart(2, '0')

// Styles for story slots and the "Your stories" page, which Week 1/2 didn't need.
const EXTRA_CSS = `
  .story-slot { break-inside: avoid; border: 1.5px dashed var(--ox); background: var(--ox-tint); padding: 0.1in 0.18in; margin: 0.1in 0 0.6em; }
  .story-slot .label { font-size: 8.5pt; }
  .story-slot p { font-style: italic; margin: 0.04in 0 0; }
  .ask { break-inside: avoid; margin: 0.22in 0 0; }
  .ask .label { font-size: 9pt; }
  .ask p { margin: 0.04in 0 0.02in; }
  .ask .ln { height: 0.34in; border-bottom: 1px solid var(--line); }
`

const w1 = readFileSync(join(dir, 'week-01-heart-of-a-man.html'), 'utf8')
const head = w1.slice(0, w1.indexOf('<body>'))
  .replace(/<title>[^<]*<\/title>/, `<title>Week ${week} · ${title}</title>`)
  .replace('THE JOURNEY  ·  WEEK 1  ·  DRAFT FOR REVIEW', `THE JOURNEY  ·  WEEK ${week}  ·  DRAFT FOR REVIEW`)
  .replace('</style>', `${EXTRA_CSS}</style>`)
const body = readFileSync(bodyPath, 'utf8').replace(/^\uFEFF/, '')
if (!body.trimStart().startsWith('<body>')) throw new Error(`${bodyPath} must start with <body>`)

const htmlPath = join(dir, `week-${nn}-${slug}.html`)
writeFileSync(htmlPath, head + body, 'utf8')

const pdfPath = join(dir, `The Journey - Week ${week} - ${title} (draft).pdf`)
const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
if (!existsSync(edge)) throw new Error('Microsoft Edge not found for PDF printing')
execFileSync(edge, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--allow-file-access-from-files',
  `--print-to-pdf=${pdfPath}`, pathToFileURL(htmlPath).href], { stdio: 'ignore' })
console.log(`wrote ${htmlPath}\nwrote ${pdfPath}`)

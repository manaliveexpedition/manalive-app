// Run a .sql file against the linked remote DB via the Supabase session pooler.
// Reads the pooler host from supabase/.temp/pooler-url and the password from
// .secrets.local (gitignored). Usage: node scripts/db-exec.mjs <path-to.sql>

import { readFileSync } from 'node:fs'
import pg from 'pg'

function getval(key, file) {
  try {
    const line = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
      .split('\n')
      .find((l) => l.startsWith(`${key}=`))
    return line ? line.slice(key.length + 1).replace(/[\r\n]/g, '').trim() : ''
  } catch {
    return ''
  }
}

const sqlPath = process.argv[2]
if (!sqlPath) {
  console.error('Usage: node scripts/db-exec.mjs <path-to.sql>')
  process.exit(1)
}

const poolerUrl = readFileSync(new URL('../supabase/.temp/pooler-url', import.meta.url), 'utf8').trim()
const password = getval('SUPABASE_DB_PASSWORD', '.secrets.local')
if (!password) {
  console.error('Missing SUPABASE_DB_PASSWORD in .secrets.local')
  process.exit(1)
}

const u = new URL(poolerUrl)
const client = new pg.Client({
  host: u.hostname,
  port: Number(u.port || 5432),
  user: decodeURIComponent(u.username),
  password,
  database: u.pathname.replace(/^\//, '') || 'postgres',
  ssl: { rejectUnauthorized: false },
})

const sql = readFileSync(sqlPath, 'utf8')
await client.connect()
try {
  await client.query(sql)
  console.log(`Applied ${sqlPath}`)
} finally {
  await client.end()
}

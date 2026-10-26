# Scripts

Node one-off tooling, not part of the shipped app. Each reads credentials from the
gitignored `.env.local` / `.secrets.local` at the repo root. Run from the repo root
with `node scripts/<name>.mjs`. The two most-used have npm aliases.

Because these use the service role key, they bypass RLS. Use them for admin/ops
work only, never expose them to the browser.

## Content and data

| Script | Does | Run |
|--------|------|-----|
| `db-exec.mjs` | Runs a `.sql` file against the remote DB via the session pooler. The safe way to apply data changes and to validate `seed.sql` (wrap it in `begin; ... rollback;` first). | `node scripts/db-exec.mjs path/to.sql` |
| `load-roster.mjs` | Loads a camp's men (any list with emails) into `camp_roster` so only they can sign up, starting on the camp's Day 1. `--dry` previews. | `node scripts/load-roster.mjs list.csv --start=2026-10-26 --cohort="TX Oct 2026"` |
| `check-content.mjs` | Audits the `entries` table (which days exist, which fields are filled). | `node scripts/check-content.mjs` |
| `build-week-sql.mjs` | Turns reviewed week drafts (`docs/content-rebuild/week-NN-*.html`) into the SQL that loads them into `entries`. Writes SQL only; apply with `db-exec`. See `docs/content-rebuild/README.md`. | `node scripts/build-week-sql.mjs <week.html> ... > out.sql` |

Loading a week's reads/prompts/tags/heart lines is done with a short throwaway
script that upserts into `entries` (see the Notion runbook). Canonical content
lives in `supabase/seed.sql`.

## Audio

| Script | Does | Run |
|--------|------|-----|
| `upload-audio-batch.mjs` | Uploads every `audio-source/day-NN.mp3` to the private `daily-audio` bucket and sets `entries.audio_url` for each matching day. Warns (does not fail) for files with no matching entry. | `npm run upload:audio` |
| `upload-audio.mjs` | Single-file precursor to the batch uploader. Prefer the batch script. | `node scripts/upload-audio.mjs` |
| `check-audio.mjs` | Verifies audio is set and the objects resolve. | `node scripts/check-audio.mjs` |

## Verification and checks

| Script | Does |
|--------|------|
| `test-rls.mjs` | RLS harness: confirms a member cannot read another member's rows and that admin-only paths are locked. Run after any policy change. (`npm run test:rls`) |
| `check-today.mjs` | Sanity-checks day resolution for a given start date. |
| `check-progress.mjs` | Checks streak / progress derivation. |
| `check-checkin.mjs` | Checks check-in read/write. |
| `check-admin.mjs` | Exercises the admin dashboard data path. |
| `check-notes.mjs` | The Day 7 / Notes-tab query: his notes only, filtered to the week, with day context; another man can't read them. |

## Notifications and email

| Script | Does | Run |
|--------|------|-----|
| `send-test-push.mjs` | Sends a test Web Push to your subscription (verifies VAPID + the service worker). | `node scripts/send-test-push.mjs` |
| `send-test-email.mjs` | Sends a test email via SMTP (verifies the Gmail app password). | `node scripts/send-test-email.mjs` |

## Assets

| Script | Does | Run |
|--------|------|-----|
| `gen-icons.mjs` | Generates the PWA + notification icons (uses `sharp`). | `node scripts/gen-icons.mjs` |

## Notes

- Env files written from PowerShell can carry stray leading spaces or a doubled
  `https://`. The scripts parse defensively (trim, extract the 20-char project
  ref) rather than trusting the raw string.
- The DB password for `db-exec.mjs` is `SUPABASE_DB_PASSWORD`; the pooler host is
  read from `supabase/.temp/pooler-url`.

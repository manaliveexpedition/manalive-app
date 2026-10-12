# Content rebuild (Oct 2026)

The Journey's daily content is being rebuilt to follow the camp sessions in
order, one session per week. Each week is drafted as a printable review page
here (`week-NN-*.html` plus its PDF). That HTML is the source of truth for the
words; the database copy is generated from it.

## The daily shape

Reading (`body_text`) · Carry this (`carry_line`) · Audio from John
(`audio_url`) · With Dad (`with_dad_prompt` + `with_dad_minutes`, with an
optional timer) · Share (`share_prompt`, copies his words and opens the alumni
group) · Notes (private). Every Day 7 also shows that week's notes, and the
Notes tab shows all of them. The weekly email uses `recap_line`.

Days without the new fields still render the old way, so the original 49 days
keep working until they are replaced.

## Going live with a week

Do these in order. Nothing here happens automatically.

1. **Record the audio** from the scripts in the week's PDF. Save them as
   `audio-source/day-NN.mp3` (e.g. `day-08.mp3`).
2. **Ship the app** (merge the `content-rebuild-app` branch to `main`; Vercel
   deploys it). Safe to do before the content: old days render as before.
3. **Deploy the email change**: `npx supabase functions deploy send-weekly-digest`.
4. **Load the words**: regenerate if the review HTML changed, then apply.
   ```
   node scripts/build-week-sql.mjs docs/content-rebuild/week-01-heart-of-a-man.html docs/content-rebuild/week-02-the-larger-story.html > supabase/content/weeks-01-02.sql
   node scripts/db-exec.mjs supabase/content/weeks-01-02.sql
   ```
   This clears the old audio pointer for those days, so they show no audio
   until step 5.
5. **Upload the audio**: `npm run upload:audio` (sets `audio_url` again).
6. **Update `supabase/seed.sql`** for those days. Its `ON CONFLICT` rewrites
   titles and readings, so re-running the old seed would put the old content
   back.

Run step 4 as a dry run first: replace the final `commit;` with `rollback;`
in a copy of the file and run that through `db-exec`.

Anyone mid-journey sees the new words for any rebuilt day from the moment
step 4 runs.

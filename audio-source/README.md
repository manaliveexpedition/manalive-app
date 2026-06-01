# Audio source files

Drop John's recorded audio here, then run the uploader. These files are **not**
committed to git (only this README is) — they're pushed to the private Supabase
`daily-audio` bucket and served to signed-in users via short-lived signed URLs.

## Naming

One file per day, named `day-<N>.<ext>`:

```
day-1.mp3
day-9.mp3
day-13.mp3
day-30.mp3
```

- `<N>` is the journey day number (1–30 so far) — the same number shown as the
  day's `sort_index`. Leading zeros optional (`day-9.mp3` and `day-09.mp3` both work).
- Supported formats: `.mp3`, `.m4a`, `.wav`, `.aac`. **`.mp3`, mono, ~96–128 kbps**
  is recommended for voice (small files, fine quality).

## Upload

From the project root:

```
npm run upload:audio
```

(or `node scripts/upload-audio-batch.mjs`)

For each `day-<N>` file it finds, the script:
1. uploads it to the private `daily-audio` bucket as `day-<NN>.<ext>`, and
2. sets that day's `entries.audio_url` so the **"▶ Listen"** button appears.

Re-running overwrites existing files (upsert), so you can drop in corrections
and re-run safely. You can upload a few at a time or the whole set at once.

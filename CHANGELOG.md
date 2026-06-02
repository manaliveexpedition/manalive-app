# Changelog

A running log of notable changes to the ManAlive "The Journey" app.

## 2026-06-02

**Audio (Days 1–10)**
- Brought the Day 1–10 recordings into the app: uploaded to the private bucket,
  linked to each day, playback verified.
- Converted WAV → MP3 (~5.5× smaller) and re-linked.
- Reframed the Today audio as John's commentary: it now sits **after** the
  reading, labeled "John's thoughts" with a "From John, on today's reading" note.

**Branding**
- Added the ManAlive Expedition cream logo to the login screen with "The Journey".
- Enlarged "The Journey"; added the logo + "The Journey" to the interior header
  (logo left, name centered, sign-out right).
- Regenerated app icons (192/512/maskable) from the logo.

**Check-in layout**
- Split the check-in into two boxes: the prompt/instruction, and the
  reflection fields + save.

**Cleanup**
- Removed orphaned WAVs from storage (MP3s only now).
- Scrubbed ~100MB of accidentally-committed raw audio from git history
  (.git 102MB → 377KB); hardened .gitignore against audio.

## 2026-06-01

**Content**
- Loaded the real first 30 days of The Daily from Notion (read = entry text,
  "sit with it" = per-day reflection prompt).
- Tagged all 30 days with Format (Anchor/Question/Truth/Story/Listen/Challenge/
  Pause) and Phase (Re-entry/The drift/The cliff) from the 84-Day Map.
- Day 9 alumni Facebook link rendered as a tappable button.

**Brand & PWA**
- Finished the ManAlive restyle; corrected primary to exact oxblood (#4A1F1F).
- Placeholder app icons + installable manifest.

**Launch**
- Pushed to GitHub; deployed to Vercel (manalive-app.vercel.app); wired Supabase
  auth URLs to the domain; published Google sign-in to everyone.

**Product**
- Removed "Did you sit with it?"; opening the reading is now the engagement
  signal. Aligned the admin metrics to match.

**Engagement analytics (admin)**
- Per-man stats (days, revisits, listens, group clicks, on-time/habit %).
- Content scorecard per day; drop-off curve; By-Format / By-Phase rollups.
- Link-click tracking (alumni button).
- Audio upload pipeline (audio-source/ + `npm run upload:audio`).

**Fixes**
- Fixed the admin "Something went wrong" crash (own-row queries weren't scoped).
- Fixed a test harness that was overwriting real Day-1 content.

---

### Still queued
- Record audio for Days 11+; write Days 31+.
- 5am Google Sheet auto-sync + 5am email digest for the Council.
- Optional: square monogram icon for crisper home-screen appearance.

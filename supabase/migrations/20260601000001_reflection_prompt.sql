-- Per-day "Sit with it" reflection prompt for each entry.
-- Shared content (like body_text/title), not user data — readable by any
-- logged-in member under the existing "read entries" policy. The member's
-- private answers still live in checkins (what_landed / what_didnt) and are
-- never exposed to the admin view.
alter table public.entries
  add column if not exists reflection_prompt text;

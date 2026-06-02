-- Content tags from the 84-Day Map: the delivery Format (Anchor, Question,
-- Truth, Story, Listen, Challenge, Pause) and the journey Phase (Re-entry,
-- The drift, The cliff, ...). Both are shared content metadata (like title),
-- used by the admin engagement view to roll up which content shapes land.
alter table public.entries
  add column if not exists format text,
  add column if not exists phase text;

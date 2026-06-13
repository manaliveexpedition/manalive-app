-- Per-day "heart" line used to auto-assemble the end-of-week recap email.
-- Shared content like body_text (entries are read-only for members), so no RLS
-- or grant change. Nullable; weeks get a line as their content is finalized.
alter table public.entries add column if not exists recap_line text;

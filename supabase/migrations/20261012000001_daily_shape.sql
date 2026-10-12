-- The rebuilt daily shape (Oct 2026 content rebuild): Reading, Carry this,
-- Audio, With Dad, Share, Notes. body_text stays the reading and recap_line
-- stays the weekly-email heart line; these four columns carry the rest.
--
-- Shared content like body_text (entries are read-only for members), so no RLS
-- or grant change. All nullable: an entry without them renders the old way, so
-- the live 49 days keep working until the new weeks are loaded.
alter table public.entries
  add column if not exists carry_line       text, -- the one line he carries all day ("Whip or well?")
  add column if not exists with_dad_prompt  text, -- the question he takes to the Father
  add column if not exists with_dad_minutes int,  -- quiet time for the With Dad timer
  add column if not exists share_prompt     text; -- the prompt on the share-to-the-group box

-- Week 1 seed (days 1-7), text only. PLACEHOLDER COPY — replace body_text/title
-- with the real devotional content. Fixed UUIDs so check-ins/events and the
-- Today screen can reference entries deterministically during development.
-- Audio is added in build step 4 (audio_url stays null for now).

insert into public.entries (id, week, day, title, body_text, audio_url, sort_index)
values
  ('e1000001-0001-0001-0001-000000000001', 1, 1, 'Day 1 — [placeholder title]', '[Placeholder body for week 1, day 1. Replace with real content.]', null, 1),
  ('e1000001-0001-0001-0001-000000000002', 1, 2, 'Day 2 — [placeholder title]', '[Placeholder body for week 1, day 2. Replace with real content.]', null, 2),
  ('e1000001-0001-0001-0001-000000000003', 1, 3, 'Day 3 — [placeholder title]', '[Placeholder body for week 1, day 3. Replace with real content.]', null, 3),
  ('e1000001-0001-0001-0001-000000000004', 1, 4, 'Day 4 — [placeholder title]', '[Placeholder body for week 1, day 4. Replace with real content.]', null, 4),
  ('e1000001-0001-0001-0001-000000000005', 1, 5, 'Day 5 — [placeholder title]', '[Placeholder body for week 1, day 5. Replace with real content.]', null, 5),
  ('e1000001-0001-0001-0001-000000000006', 1, 6, 'Day 6 — [placeholder title]', '[Placeholder body for week 1, day 6. Replace with real content.]', null, 6),
  ('e1000001-0001-0001-0001-000000000007', 1, 7, 'Day 7 — [placeholder title]', '[Placeholder body for week 1, day 7. Replace with real content.]', null, 7)
on conflict (id) do nothing;

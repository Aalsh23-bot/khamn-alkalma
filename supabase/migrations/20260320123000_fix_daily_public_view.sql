-- Fix: daily_puzzles_public must NOT use security_invoker,
-- otherwise anon/authenticated cannot read the view after we revoked
-- SELECT on the underlying daily_puzzles table.

create or replace view public.daily_puzzles_public
with (security_invoker = false)
as
select date_key, puzzle_number, created_at
from public.daily_puzzles;

grant select on public.daily_puzzles_public to anon, authenticated;

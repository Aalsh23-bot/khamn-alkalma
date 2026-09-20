-- Step 4: server-side game logic (RPC) — verify / anti-cheat / daily / leaderboard
-- Deployed via Postgres so it works without Edge Function access tokens.

alter table public.words
  add column if not exists sort_index integer;

create unique index if not exists words_sort_index_uidx
  on public.words (sort_index)
  where sort_index is not null;

-- ---------------------------------------------------------------------------
-- evaluate_guess (Wordle rules, matching client evaluate.ts)
-- ---------------------------------------------------------------------------
create or replace function public.evaluate_guess(p_guess text, p_answer text)
returns text[]
language plpgsql
immutable
as $$
declare
  n int := char_length(p_answer);
  result text[] := array_fill('absent'::text, array[n]);
  remaining int[] := array_fill(0, array[256]); -- unused; use jsonb map instead
  rem jsonb := '{}'::jsonb;
  i int;
  ch text;
  cnt int;
begin
  if char_length(p_guess) <> n then
    raise exception 'guess length mismatch';
  end if;

  for i in 1..n loop
    if substr(p_guess, i, 1) = substr(p_answer, i, 1) then
      result[i] := 'correct';
    else
      ch := substr(p_answer, i, 1);
      rem := jsonb_set(rem, array[ch], to_jsonb(coalesce((rem->>ch)::int, 0) + 1));
    end if;
  end loop;

  for i in 1..n loop
    if result[i] = 'correct' then
      continue;
    end if;
    ch := substr(p_guess, i, 1);
    cnt := coalesce((rem->>ch)::int, 0);
    if cnt > 0 then
      result[i] := 'present';
      rem := jsonb_set(rem, array[ch], to_jsonb(cnt - 1));
    end if;
  end loop;

  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- ensure_daily_puzzle — same algorithm as client daily.ts (common pool)
-- ---------------------------------------------------------------------------
create or replace function public.ensure_daily_puzzle(p_date date default (timezone('Asia/Riyadh', now()))::date)
returns public.daily_puzzles
language plpgsql
security definer
set search_path = public
as $$
declare
  epoch date := date '2026-08-29';
  puzzle_n int;
  pool_size int;
  idx int;
  chosen_id bigint;
  row public.daily_puzzles;
begin
  select * into row from public.daily_puzzles where date_key = p_date;
  if found then
    return row;
  end if;

  puzzle_n := (p_date - epoch) + 1;
  if puzzle_n < 1 then
    puzzle_n := 1;
  end if;

  select count(*)::int into pool_size
  from public.words
  where is_answer and tier = 'common';

  if pool_size is null or pool_size = 0 then
    raise exception 'no common answer words seeded';
  end if;

  idx := ((puzzle_n - 1) % pool_size);

  select w.id into chosen_id
  from public.words w
  where w.is_answer and w.tier = 'common'
  order by w.sort_index nulls last, w.id
  offset idx
  limit 1;

  insert into public.daily_puzzles (date_key, puzzle_number, word_id)
  values (p_date, puzzle_n, chosen_id)
  on conflict (date_key) do update
    set puzzle_number = excluded.puzzle_number
  returning * into row;

  return row;
end;
$$;

revoke all on function public.ensure_daily_puzzle(date) from public;
grant execute on function public.ensure_daily_puzzle(date) to service_role;

-- Public meta only (no answer)
create or replace function public.get_daily_meta(p_date date default (timezone('Asia/Riyadh', now()))::date)
returns table (date_key date, puzzle_number integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.daily_puzzles;
begin
  row := public.ensure_daily_puzzle(p_date);
  date_key := row.date_key;
  puzzle_number := row.puzzle_number;
  return next;
end;
$$;

grant execute on function public.get_daily_meta(date) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- submit_daily_result — anti-cheat verification + leaderboard update
-- ---------------------------------------------------------------------------
create or replace function public.submit_daily_result(
  p_guesses text[],
  p_won boolean,
  p_hard_mode boolean default false,
  p_duration_ms integer default null
)
returns public.game_results
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  today date := (timezone('Asia/Riyadh', now()))::date;
  daily public.daily_puzzles;
  answer text;
  guess text;
  gcount int;
  i int;
  last_guess text;
  result_row public.game_results;
  prev public.leaderboard_scores;
  new_streak int;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  gcount := coalesce(array_length(p_guesses, 1), 0);
  if gcount < 1 or gcount > 6 then
    raise exception 'invalid guess count';
  end if;

  daily := public.ensure_daily_puzzle(today);
  select w.word into answer from public.words w where w.id = daily.word_id;
  if answer is null then
    raise exception 'daily answer missing';
  end if;

  foreach guess in array p_guesses loop
    if char_length(guess) <> 5 then
      raise exception 'invalid guess length';
    end if;
    -- ensure dictionary membership (answers or guessable)
    if not exists (
      select 1 from public.words w
      where w.word = guess and w.is_guessable
    ) then
      raise exception 'guess not in dictionary: %', guess;
    end if;
  end loop;

  last_guess := p_guesses[gcount];

  if p_won then
    if last_guess <> answer then
      raise exception 'anti-cheat: won without final answer';
    end if;
    -- no earlier guess should already be the answer (except last)
    if gcount > 1 then
      for i in 1..gcount - 1 loop
        if p_guesses[i] = answer then
          raise exception 'anti-cheat: answer appeared before final guess';
        end if;
      end loop;
    end if;
  else
    if gcount <> 6 then
      raise exception 'anti-cheat: loss must use 6 guesses';
    end if;
    if last_guess = answer then
      raise exception 'anti-cheat: loss but last guess is answer';
    end if;
    for i in 1..gcount loop
      if p_guesses[i] = answer then
        raise exception 'anti-cheat: loss but answer was guessed';
      end if;
    end loop;
  end if;

  -- one verified result per day — no leaderboard double-count
  select * into result_row
  from public.game_results
  where user_id = uid and mode = 'daily' and date_key = today;
  if found then
    return result_row;
  end if;

  insert into public.game_results (
    user_id, mode, date_key, won, guesses, hard_mode, duration_ms
  ) values (
    uid, 'daily', today, p_won, gcount, coalesce(p_hard_mode, false), p_duration_ms
  )
  returning * into result_row;

  -- leaderboard
  select * into prev from public.leaderboard_scores where user_id = uid;
  if not found then
    insert into public.leaderboard_scores (user_id, wins, played, current_streak, max_streak, updated_at)
    values (
      uid,
      case when p_won then 1 else 0 end,
      1,
      case when p_won then 1 else 0 end,
      case when p_won then 1 else 0 end,
      now()
    );
  else
    new_streak := case
      when p_won then prev.current_streak + 1
      else 0
    end;
    update public.leaderboard_scores set
      played = prev.played + 1,
      wins = prev.wins + case when p_won then 1 else 0 end,
      current_streak = new_streak,
      max_streak = greatest(prev.max_streak, new_streak),
      updated_at = now()
    where user_id = uid;
  end if;

  return result_row;
end;
$$;

grant execute on function public.submit_daily_result(text[], boolean, boolean, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- create_friend_challenge
-- ---------------------------------------------------------------------------
create or replace function public.create_friend_challenge()
returns table (code text, word text)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  chosen record;
  new_code text;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select w.id, w.word into chosen
  from public.words w
  where w.is_answer
  order by random()
  limit 1;

  if chosen.id is null then
    raise exception 'no answer words seeded';
  end if;

  new_code := substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);

  insert into public.challenges (code, word_id, created_by)
  values (new_code, chosen.id, uid);

  code := new_code;
  word := chosen.word;
  return next;
end;
$$;

grant execute on function public.create_friend_challenge() to authenticated;

-- ---------------------------------------------------------------------------
-- get_leaderboard
-- ---------------------------------------------------------------------------
create or replace function public.get_leaderboard(p_limit integer default 20)
returns table (
  user_id uuid,
  display_name text,
  wins integer,
  played integer,
  current_streak integer,
  max_streak integer
)
language sql
security definer
set search_path = public
stable
as $$
  select
    ls.user_id,
    p.display_name,
    ls.wins,
    ls.played,
    ls.current_streak,
    ls.max_streak
  from public.leaderboard_scores ls
  left join public.profiles p on p.id = ls.user_id
  order by ls.wins desc, ls.max_streak desc, ls.played asc
  limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;

grant execute on function public.get_leaderboard(integer) to anon, authenticated;

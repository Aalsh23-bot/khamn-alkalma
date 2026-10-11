-- Best-of-5 friend challenges: first to 3 round wins, same code across rounds.

alter table public.challenges
  add column if not exists host_score integer not null default 0
    check (host_score >= 0 and host_score <= 5),
  add column if not exists guest_score integer not null default 0
    check (guest_score >= 0 and guest_score <= 5),
  add column if not exists round_number integer not null default 1
    check (round_number >= 1 and round_number <= 5),
  add column if not exists series_complete boolean not null default false,
  add column if not exists next_round_at timestamptz,
  add column if not exists round_scored boolean not null default false;

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------
create or replace function public._challenge_round_winner(c public.challenges)
returns text -- 'host' | 'guest' | 'draw'
language plpgsql
stable
as $$
begin
  if c.host_finished_at is null or c.guest_finished_at is null then
    return null;
  end if;
  if c.host_won and not coalesce(c.guest_won, false) then
    return 'host';
  end if;
  if c.guest_won and not coalesce(c.host_won, false) then
    return 'guest';
  end if;
  if c.host_won and c.guest_won then
    if c.host_guesses < c.guest_guesses then
      return 'host';
    end if;
    if c.guest_guesses < c.host_guesses then
      return 'guest';
    end if;
    return 'draw';
  end if;
  return 'draw';
end;
$$;

create or replace function public._challenge_lobby_json(c public.challenges, my_role text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  word_val text;
  opp_name text;
begin
  if c.status in ('active', 'done') then
    select w.word into word_val from public.words w where w.id = c.word_id;
  end if;

  if my_role = 'host' and c.guest_id is not null then
    select p.display_name into opp_name from public.profiles p where p.id = c.guest_id;
  elsif my_role = 'guest' then
    select p.display_name into opp_name from public.profiles p where p.id = c.created_by;
  end if;

  return jsonb_build_object(
    'code', c.code,
    'status', c.status,
    'role', my_role,
    'expires_at', c.expires_at,
    'started_at', c.started_at,
    'word', word_val,
    'opponent_name', opp_name,
    'host_finished', c.host_finished_at is not null,
    'guest_finished', c.guest_finished_at is not null,
    'host_guesses', c.host_guesses,
    'host_won', c.host_won,
    'guest_guesses', c.guest_guesses,
    'guest_won', c.guest_won,
    'host_score', c.host_score,
    'guest_score', c.guest_score,
    'round_number', c.round_number,
    'series_complete', c.series_complete,
    'next_round_at', c.next_round_at,
    'wins_needed', 3,
    'max_rounds', 5
  );
end;
$$;

create or replace function public._score_and_schedule_next_round(p_code text)
returns public.challenges
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.challenges%rowtype;
  winner text;
  hs int;
  gs int;
  complete boolean := false;
begin
  select * into c from public.challenges where code = p_code for update;
  if not found then
    raise exception 'challenge not found';
  end if;

  if c.host_finished_at is null or c.guest_finished_at is null then
    return c;
  end if;

  if not c.round_scored then
    winner := public._challenge_round_winner(c);
    hs := c.host_score;
    gs := c.guest_score;
    if winner = 'host' then
      hs := hs + 1;
    elsif winner = 'guest' then
      gs := gs + 1;
    end if;

    if hs >= 3 or gs >= 3 or c.round_number >= 5 then
      complete := true;
    end if;

    update public.challenges
    set
      host_score = hs,
      guest_score = gs,
      round_scored = true,
      series_complete = complete,
      status = 'done',
      next_round_at = case
        when complete then null
        else now() + interval '5 seconds'
      end,
      -- keep room alive across the series
      expires_at = greatest(expires_at, now() + interval '30 minutes')
    where code = p_code;

    select * into c from public.challenges where code = p_code;
    return c;
  end if;

  return c;
end;
$$;

create or replace function public._maybe_advance_challenge_round(p_code text)
returns public.challenges
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.challenges%rowtype;
  chosen_id bigint;
begin
  select * into c from public.challenges where code = p_code for update;
  if not found then
    raise exception 'challenge not found';
  end if;

  if c.series_complete then
    return c;
  end if;

  if c.host_finished_at is null or c.guest_finished_at is null then
    return c;
  end if;

  if not c.round_scored then
    c := public._score_and_schedule_next_round(p_code);
  end if;

  if c.series_complete then
    return c;
  end if;

  if c.next_round_at is null or c.next_round_at > now() then
    return c;
  end if;

  select w.id into chosen_id
  from public.words w
  where w.is_answer
    and (c.word_id is null or w.id <> c.word_id)
  order by random()
  limit 1;

  if chosen_id is null then
    select w.id into chosen_id
    from public.words w
    where w.is_answer
    order by random()
    limit 1;
  end if;

  if chosen_id is null then
    raise exception 'no answer words seeded';
  end if;

  update public.challenges
  set
    word_id = chosen_id,
    round_number = least(5, round_number + 1),
    status = 'active',
    started_at = now(),
    host_guesses = null,
    host_won = null,
    host_finished_at = null,
    guest_guesses = null,
    guest_won = null,
    guest_finished_at = null,
    round_scored = false,
    next_round_at = null,
    expires_at = greatest(expires_at, now() + interval '30 minutes')
  where code = p_code;

  select * into c from public.challenges where code = p_code;
  return c;
end;
$$;

-- ---------------------------------------------------------------------------
-- get_challenge_lobby (auto-advances when countdown elapsed)
-- ---------------------------------------------------------------------------
create or replace function public.get_challenge_lobby(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  c public.challenges%rowtype;
  normalized text := upper(trim(p_code));
  my_role text;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  perform public.expire_stale_challenges();

  select * into c from public.challenges where challenges.code = normalized;
  if not found then
    raise exception 'challenge not found';
  end if;

  if c.created_by = uid then
    my_role := 'host';
  elsif c.guest_id = uid then
    my_role := 'guest';
  else
    raise exception 'not a participant';
  end if;

  if c.status = 'waiting' and c.expires_at < now() then
    update public.challenges set status = 'expired' where challenges.code = c.code;
    c.status := 'expired';
  end if;

  if c.status = 'done'
     and not c.series_complete
     and c.host_finished_at is not null
     and c.guest_finished_at is not null then
    c := public._maybe_advance_challenge_round(c.code);
  end if;

  return public._challenge_lobby_json(c, my_role);
end;
$$;

grant execute on function public.get_challenge_lobby(text) to authenticated;

-- ---------------------------------------------------------------------------
-- submit_challenge_result — score round + schedule next when both done
-- ---------------------------------------------------------------------------
create or replace function public.submit_challenge_result(
  p_code text,
  p_guesses text[],
  p_won boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  c public.challenges%rowtype;
  normalized text := upper(trim(p_code));
  word_val text;
  guess_count int;
  last_guess text;
  my_role text;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select * into c from public.challenges where challenges.code = normalized for update;
  if not found then
    raise exception 'challenge not found';
  end if;
  if c.status not in ('active', 'done') then
    raise exception 'challenge not active';
  end if;
  if c.series_complete then
    raise exception 'series already complete';
  end if;

  if c.created_by = uid then
    my_role := 'host';
  elsif c.guest_id = uid then
    my_role := 'guest';
  else
    raise exception 'not a participant';
  end if;

  select w.word into word_val from public.words w where w.id = c.word_id;

  if p_guesses is null or array_length(p_guesses, 1) is null then
    raise exception 'guesses required';
  end if;
  guess_count := array_length(p_guesses, 1);
  if guess_count < 1 or guess_count > 6 then
    raise exception 'invalid guess count';
  end if;

  last_guess := p_guesses[guess_count];
  if p_won then
    if last_guess is distinct from word_val then
      raise exception 'win mismatch';
    end if;
  else
    if guess_count <> 6 then
      raise exception 'loss requires 6 guesses';
    end if;
    if last_guess = word_val then
      raise exception 'loss mismatch';
    end if;
  end if;

  if my_role = 'host' then
    if c.host_finished_at is null then
      update public.challenges
      set
        host_guesses = guess_count,
        host_won = p_won,
        host_finished_at = now(),
        status = case
          when guest_finished_at is not null then 'done'
          else status
        end
      where challenges.code = c.code;

      insert into public.game_results (
        user_id, mode, challenge_code, won, guesses, hard_mode
      ) values (
        uid, 'challenge', c.code, p_won, guess_count, false
      );
    end if;
  else
    if c.guest_finished_at is null then
      update public.challenges
      set
        guest_guesses = guess_count,
        guest_won = p_won,
        guest_finished_at = now(),
        status = case
          when host_finished_at is not null then 'done'
          else status
        end
      where challenges.code = c.code;

      insert into public.game_results (
        user_id, mode, challenge_code, won, guesses, hard_mode
      ) values (
        uid, 'challenge', c.code, p_won, guess_count, false
      );
    end if;
  end if;

  select * into c from public.challenges where code = normalized;
  if c.host_finished_at is not null and c.guest_finished_at is not null then
    c := public._score_and_schedule_next_round(c.code);
  end if;

  return public._challenge_lobby_json(c, my_role);
end;
$$;

grant execute on function public.submit_challenge_result(text, text[], boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- rematch_friend_challenge — same code, new series 0-0
-- ---------------------------------------------------------------------------
create or replace function public.rematch_friend_challenge(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  c public.challenges%rowtype;
  normalized text := upper(trim(p_code));
  my_role text;
  chosen_id bigint;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select * into c from public.challenges where code = normalized for update;
  if not found then
    raise exception 'challenge not found';
  end if;

  if c.created_by = uid then
    my_role := 'host';
  elsif c.guest_id = uid then
    my_role := 'guest';
  else
    raise exception 'not a participant';
  end if;

  if c.guest_id is null then
    raise exception 'waiting for opponent';
  end if;

  if not c.series_complete then
    raise exception 'series still in progress';
  end if;

  select w.id into chosen_id
  from public.words w
  where w.is_answer
    and (c.word_id is null or w.id <> c.word_id)
  order by random()
  limit 1;

  if chosen_id is null then
    select w.id into chosen_id
    from public.words w
    where w.is_answer
    order by random()
    limit 1;
  end if;

  if chosen_id is null then
    raise exception 'no answer words seeded';
  end if;

  update public.challenges
  set
    word_id = chosen_id,
    status = 'active',
    started_at = now(),
    host_guesses = null,
    host_won = null,
    host_finished_at = null,
    guest_guesses = null,
    guest_won = null,
    guest_finished_at = null,
    host_score = 0,
    guest_score = 0,
    round_number = 1,
    series_complete = false,
    round_scored = false,
    next_round_at = null,
    expires_at = now() + interval '30 minutes'
  where code = c.code;

  select * into c from public.challenges where code = normalized;
  return public._challenge_lobby_json(c, my_role);
end;
$$;

grant execute on function public.rematch_friend_challenge(text) to authenticated;

-- join may rejoin during an in-progress series (active / done between rounds)
create or replace function public.join_friend_challenge(p_code text)
returns table (
  code text,
  word text,
  role text,
  started_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  c public.challenges%rowtype;
  normalized text := upper(trim(p_code));
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if normalized is null or char_length(normalized) < 4 then
    raise exception 'invalid code';
  end if;

  perform public.expire_stale_challenges();

  select * into c from public.challenges where challenges.code = normalized for update;
  if not found then
    raise exception 'challenge not found';
  end if;

  if c.status = 'expired' or (c.status = 'waiting' and c.expires_at < now()) then
    update public.challenges set status = 'expired' where challenges.code = c.code;
    raise exception 'challenge expired';
  end if;

  -- Auto-advance if countdown already elapsed
  if c.status = 'done' and not c.series_complete then
    c := public._maybe_advance_challenge_round(c.code);
  end if;

  if c.created_by = uid then
    if c.status = 'waiting' then
      raise exception 'waiting for opponent';
    end if;
    if c.status not in ('active', 'done') then
      raise exception 'challenge not active';
    end if;
    return query
      select c.code, w.word, 'host'::text, c.started_at
      from public.words w where w.id = c.word_id;
    return;
  end if;

  if c.guest_id is not null and c.guest_id <> uid then
    raise exception 'challenge full';
  end if;

  if c.guest_id = uid then
    if c.status not in ('active', 'done') then
      raise exception 'challenge not active';
    end if;
    return query
      select c.code, w.word, 'guest'::text, c.started_at
      from public.words w where w.id = c.word_id;
    return;
  end if;

  if c.status <> 'waiting' then
    raise exception 'challenge not joinable';
  end if;

  update public.challenges
  set
    guest_id = uid,
    status = 'active',
    started_at = now()
  where challenges.code = c.code;

  return query
    select c.code, w.word, 'guest'::text, now()
    from public.words w where w.id = c.word_id;
end;
$$;

grant execute on function public.join_friend_challenge(text) to authenticated;

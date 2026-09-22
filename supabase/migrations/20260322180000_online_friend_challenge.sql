-- Online friend challenge: wait for opponent, start together, compare results.
-- Join window: 10 minutes. Auth required for create/join/submit.

alter table public.challenges
  add column if not exists status text not null default 'waiting'
    check (status in ('waiting', 'active', 'done', 'expired')),
  add column if not exists guest_id uuid references auth.users (id) on delete set null,
  add column if not exists expires_at timestamptz,
  add column if not exists started_at timestamptz,
  add column if not exists host_guesses integer check (host_guesses is null or (host_guesses >= 1 and host_guesses <= 6)),
  add column if not exists host_won boolean,
  add column if not exists host_finished_at timestamptz,
  add column if not exists guest_guesses integer check (guest_guesses is null or (guest_guesses >= 1 and guest_guesses <= 6)),
  add column if not exists guest_won boolean,
  add column if not exists guest_finished_at timestamptz;

update public.challenges
set expires_at = created_at + interval '10 minutes'
where expires_at is null;

alter table public.challenges
  alter column expires_at set default (now() + interval '10 minutes');

create index if not exists challenges_status_expires_idx
  on public.challenges (status, expires_at);

-- Expire stale waiting rooms
create or replace function public.expire_stale_challenges()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.challenges
  set status = 'expired'
  where status = 'waiting'
    and expires_at < now();
end;
$$;

-- ---------------------------------------------------------------------------
-- create_friend_challenge — code only (word revealed when match starts)
-- ---------------------------------------------------------------------------
create or replace function public.create_friend_challenge()
returns table (code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  chosen_id bigint;
  new_code text;
  exp timestamptz := now() + interval '10 minutes';
  i int;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  perform public.expire_stale_challenges();

  select w.id into chosen_id
  from public.words w
  where w.is_answer
  order by random()
  limit 1;

  if chosen_id is null then
    raise exception 'no answer words seeded';
  end if;

  for i in 1..8 loop
    new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    begin
      insert into public.challenges (
        code, word_id, created_by, status, expires_at
      ) values (
        new_code, chosen_id, uid, 'waiting', exp
      );
      code := new_code;
      expires_at := exp;
      return next;
      return;
    exception when unique_violation then
      -- retry new code
      null;
    end;
  end loop;

  raise exception 'could not allocate challenge code';
end;
$$;

grant execute on function public.create_friend_challenge() to authenticated;

-- ---------------------------------------------------------------------------
-- join_friend_challenge — guest enters code; match starts for both
-- ---------------------------------------------------------------------------
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

  -- Host rejoining an already-started match
  if c.created_by = uid then
    if c.status not in ('active', 'done') then
      raise exception 'waiting for opponent';
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

-- ---------------------------------------------------------------------------
-- get_challenge_lobby — host polls until guest joins; both poll results
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
  word_val text;
  opp_name text;
  result jsonb;
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

  if c.status in ('active', 'done') then
    select w.word into word_val from public.words w where w.id = c.word_id;
  end if;

  if my_role = 'host' and c.guest_id is not null then
    select p.display_name into opp_name from public.profiles p where p.id = c.guest_id;
  elsif my_role = 'guest' then
    select p.display_name into opp_name from public.profiles p where p.id = c.created_by;
  end if;

  result := jsonb_build_object(
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
    'guest_won', c.guest_won
  );
  return result;
end;
$$;

grant execute on function public.get_challenge_lobby(text) to authenticated;

-- ---------------------------------------------------------------------------
-- submit_challenge_result — verify guesses against secret word
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

  return public.get_challenge_lobby(c.code);
end;
$$;

grant execute on function public.submit_challenge_result(text, text[], boolean) to authenticated;

-- Replace open word lookup: only participants of active/done matches
create or replace function public.get_friend_challenge(p_code text)
returns table (code text, word text)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  normalized text := upper(trim(p_code));
begin
  if uid is null then
    return;
  end if;
  if normalized is null or char_length(normalized) < 4 then
    return;
  end if;

  perform public.expire_stale_challenges();

  return query
  select c.code, w.word
  from public.challenges c
  join public.words w on w.id = c.word_id
  where c.code = normalized
    and c.status in ('active', 'done')
    and (c.created_by = uid or c.guest_id = uid)
  limit 1;
end;
$$;

grant execute on function public.get_friend_challenge(text) to authenticated;
-- revoke anon open lookup (online-only)
revoke execute on function public.get_friend_challenge(text) from anon;

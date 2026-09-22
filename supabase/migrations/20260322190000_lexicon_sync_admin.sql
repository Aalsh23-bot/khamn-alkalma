-- Lexicon sync (client cache) + admin word quality panel

alter table public.words
  add column if not exists active boolean not null default true,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists notes text;

create index if not exists words_active_guessable_idx
  on public.words (word)
  where active and is_guessable;

create or replace function public.touch_words_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists words_touch_updated_at on public.words;
create trigger words_touch_updated_at
  before update on public.words
  for each row execute function public.touch_words_updated_at();

-- ---------------------------------------------------------------------------
-- Admins (bootstrapped for project owner)
-- ---------------------------------------------------------------------------
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

drop policy if exists "admins_select_own" on public.app_admins;
create policy "admins_select_own"
  on public.app_admins for select
  to authenticated
  using (auth.uid() = user_id);

insert into public.app_admins (user_id)
values ('4725bd39-ffbc-4c45-b973-7d149e6c2ab0')
on conflict (user_id) do nothing;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.app_admins a where a.user_id = auth.uid()
  );
$$;

grant execute on function public.is_app_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Lightweight Arabic normalize for inserts (mirror client basics)
-- ---------------------------------------------------------------------------
create or replace function public.normalize_ar_word(p_word text)
returns text
language plpgsql
immutable
as $$
declare
  raw text := coalesce(p_word, '');
  out text := '';
  ch text;
  i int;
begin
  raw := regexp_replace(raw, '[\u064B-\u0652\u0670\u0640]', '', 'g');
  for i in 1..char_length(raw) loop
    ch := substr(raw, i, 1);
    if ch in ('أ', 'إ', 'آ', 'ٱ') then
      ch := 'ا';
    elsif ch = 'گ' then
      ch := 'ك';
    elsif ch = 'پ' then
      ch := 'ب';
    end if;
    if ch ~ '[ابتثجحخدذرزسشصضطظعغفقكلمنهويىءةئؤ]' then
      out := out || ch;
    end if;
  end loop;
  return out;
end;
$$;

-- ---------------------------------------------------------------------------
-- Client lexicon snapshot (guessable + active only)
-- ---------------------------------------------------------------------------
create or replace function public.get_lexicon_snapshot()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'updated_at', coalesce(max(w.updated_at), now()),
    'count', count(*)::int,
    'words', coalesce(jsonb_agg(w.word order by w.word), '[]'::jsonb)
  )
  from public.words w
  where w.active and w.is_guessable;
$$;

grant execute on function public.get_lexicon_snapshot() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin list / upsert
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_words(
  p_search text default null,
  p_limit integer default 50,
  p_offset integer default 0,
  p_active_only boolean default null
)
returns table (
  id bigint,
  word text,
  tier text,
  is_answer boolean,
  is_guessable boolean,
  active boolean,
  notes text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  q text := nullif(trim(p_search), '');
  lim int := greatest(1, least(coalesce(p_limit, 50), 200));
  off int := greatest(0, coalesce(p_offset, 0));
begin
  if not public.is_app_admin() then
    raise exception 'not admin';
  end if;

  return query
  select
    w.id, w.word, w.tier, w.is_answer, w.is_guessable, w.active, w.notes, w.updated_at
  from public.words w
  where (q is null or w.word like '%' || public.normalize_ar_word(q) || '%')
    and (p_active_only is null or w.active = p_active_only)
  order by w.updated_at desc, w.word asc
  limit lim offset off;
end;
$$;

grant execute on function public.admin_list_words(text, integer, integer, boolean) to authenticated;

create or replace function public.admin_upsert_word(
  p_word text,
  p_tier text default 'familiar',
  p_is_answer boolean default false,
  p_is_guessable boolean default true,
  p_active boolean default true,
  p_notes text default null
)
returns public.words
language plpgsql
security definer
set search_path = public
as $$
declare
  norm text := public.normalize_ar_word(p_word);
  tier_val text := coalesce(nullif(p_tier, ''), 'familiar');
  row public.words;
begin
  if not public.is_app_admin() then
    raise exception 'not admin';
  end if;
  if char_length(norm) <> 5 then
    raise exception 'word must be 5 letters';
  end if;
  if tier_val not in ('common', 'familiar', 'rare') then
    raise exception 'invalid tier';
  end if;

  insert into public.words as w (word, tier, is_answer, is_guessable, active, notes)
  values (
    norm,
    tier_val,
    coalesce(p_is_answer, false),
    coalesce(p_is_guessable, true),
    coalesce(p_active, true),
    nullif(trim(coalesce(p_notes, '')), '')
  )
  on conflict (word) do update set
    tier = excluded.tier,
    is_answer = excluded.is_answer,
    is_guessable = excluded.is_guessable,
    active = excluded.active,
    notes = excluded.notes,
    updated_at = now()
  returning * into row;

  return row;
end;
$$;

grant execute on function public.admin_upsert_word(text, text, boolean, boolean, boolean, text) to authenticated;

create or replace function public.admin_set_word_flags(
  p_id bigint,
  p_is_answer boolean default null,
  p_is_guessable boolean default null,
  p_active boolean default null,
  p_tier text default null,
  p_notes text default null
)
returns public.words
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.words;
begin
  if not public.is_app_admin() then
    raise exception 'not admin';
  end if;

  update public.words w
  set
    is_answer = coalesce(p_is_answer, w.is_answer),
    is_guessable = coalesce(p_is_guessable, w.is_guessable),
    active = coalesce(p_active, w.active),
    tier = coalesce(nullif(p_tier, ''), w.tier),
    notes = case when p_notes is null then w.notes else nullif(trim(p_notes), '') end,
    updated_at = now()
  where w.id = p_id
  returning * into row;

  if row.id is null then
    raise exception 'word not found';
  end if;
  return row;
end;
$$;

grant execute on function public.admin_set_word_flags(bigint, boolean, boolean, boolean, text, text) to authenticated;

-- Keep select policy: only active guessable visible via direct table reads
drop policy if exists "words_select_guessable" on public.words;
create policy "words_select_guessable"
  on public.words for select
  to authenticated, anon
  using (is_guessable = true and active = true);

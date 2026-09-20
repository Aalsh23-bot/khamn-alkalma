-- خمن الكلمة — schema أولي (خطوة 2)
-- طبّقه من: SQL Editor → New query → Paste → Run

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- words (قاموس الإجابات والتخمينات)
-- ---------------------------------------------------------------------------
create table if not exists public.words (
  id bigint generated always as identity primary key,
  word text not null,
  tier text not null default 'familiar'
    check (tier in ('common', 'familiar', 'rare')),
  is_answer boolean not null default true,
  is_guessable boolean not null default true,
  created_at timestamptz not null default now(),
  constraint words_word_len check (char_length(word) = 5),
  constraint words_word_unique unique (word)
);

create index if not exists words_answer_tier_idx
  on public.words (tier)
  where is_answer;

-- ---------------------------------------------------------------------------
-- daily_puzzles (كلمة اليوم — الإجابة محمية بـ RLS)
-- ---------------------------------------------------------------------------
create table if not exists public.daily_puzzles (
  date_key date primary key,
  puzzle_number integer not null unique,
  word_id bigint not null references public.words (id),
  created_at timestamptz not null default now()
);

-- عرض عام بدون كشف الإجابة
create or replace view public.daily_puzzles_public
with (security_invoker = true)
as
select date_key, puzzle_number, created_at
from public.daily_puzzles;

-- ---------------------------------------------------------------------------
-- challenges (تحدي صديق)
-- ---------------------------------------------------------------------------
create table if not exists public.challenges (
  code text primary key,
  word_id bigint not null references public.words (id),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint challenges_code_len check (char_length(code) between 6 and 32)
);

-- ---------------------------------------------------------------------------
-- game_results
-- ---------------------------------------------------------------------------
create table if not exists public.game_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null check (mode in ('daily', 'stages', 'challenge')),
  date_key date,
  stage_level integer,
  challenge_code text references public.challenges (code) on delete set null,
  won boolean not null,
  guesses integer not null check (guesses >= 0 and guesses <= 6),
  hard_mode boolean not null default false,
  duration_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists game_results_user_created_idx
  on public.game_results (user_id, created_at desc);

create index if not exists game_results_daily_idx
  on public.game_results (date_key, mode)
  where mode = 'daily';

-- لاعب واحد = نتيجة واحدة لكل يوم في وضع اليومي
create unique index if not exists game_results_daily_unique
  on public.game_results (user_id, date_key)
  where mode = 'daily' and date_key is not null;

-- ---------------------------------------------------------------------------
-- leaderboard_scores
-- ---------------------------------------------------------------------------
create table if not exists public.leaderboard_scores (
  user_id uuid primary key references auth.users (id) on delete cascade,
  wins integer not null default 0 check (wins >= 0),
  played integer not null default 0 check (played >= 0),
  current_streak integer not null default 0 check (current_streak >= 0),
  max_streak integer not null default 0 check (max_streak >= 0),
  updated_at timestamptz not null default now()
);

create or replace view public.leaderboard_public
with (security_invoker = true)
as
select
  ls.user_id,
  p.display_name,
  ls.wins,
  ls.played,
  ls.current_streak,
  ls.max_streak,
  ls.updated_at
from public.leaderboard_scores ls
left join public.profiles p on p.id = ls.user_id;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.words enable row level security;
alter table public.daily_puzzles enable row level security;
alter table public.challenges enable row level security;
alter table public.game_results enable row level security;
alter table public.leaderboard_scores enable row level security;

-- profiles
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all"
  on public.profiles for select
  to authenticated, anon
  using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- words: العملاء يقدرون يشوفون إن الكلمة صالحة للتخمين، مو قائمة الإجابات الكاملة كـ answers pool
-- (قائمة الإجابات تُدار من Edge Functions لاحقاً)
drop policy if exists "words_select_guessable" on public.words;
create policy "words_select_guessable"
  on public.words for select
  to authenticated, anon
  using (is_guessable = true);

-- daily_puzzles: لا قراءة مباشرة من العميل (منع كشف الإجابة)
-- القراءة العامة عبر view daily_puzzles_public فقط بعد منح صلاحية
revoke all on public.daily_puzzles from anon, authenticated;
grant select on public.daily_puzzles_public to anon, authenticated;

-- challenges: إنشاء للمصادقين؛ القراءة محدودة (الكود فقط بدون word_id عبر دالة لاحقاً)
drop policy if exists "challenges_insert_auth" on public.challenges;
create policy "challenges_insert_auth"
  on public.challenges for insert
  to authenticated
  with check (auth.uid() = created_by);

drop policy if exists "challenges_select_own" on public.challenges;
create policy "challenges_select_own"
  on public.challenges for select
  to authenticated
  using (auth.uid() = created_by);

-- game_results
drop policy if exists "results_select_own" on public.game_results;
create policy "results_select_own"
  on public.game_results for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "results_insert_own" on public.game_results;
create policy "results_insert_own"
  on public.game_results for insert
  to authenticated
  with check (auth.uid() = user_id);

-- leaderboard
drop policy if exists "leaderboard_select_all" on public.leaderboard_scores;
create policy "leaderboard_select_all"
  on public.leaderboard_scores for select
  to authenticated, anon
  using (true);

drop policy if exists "leaderboard_upsert_own" on public.leaderboard_scores;
create policy "leaderboard_upsert_own"
  on public.leaderboard_scores for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "leaderboard_update_own" on public.leaderboard_scores;
create policy "leaderboard_update_own"
  on public.leaderboard_scores for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select on public.leaderboard_public to anon, authenticated;

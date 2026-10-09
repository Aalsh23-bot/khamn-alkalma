-- Store Apple refresh tokens so account deletion can call Apple's revoke API (TN3194).

create table if not exists public.apple_auth_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  refresh_token text not null,
  updated_at timestamptz not null default now()
);

alter table public.apple_auth_tokens enable row level security;

-- No direct client access — Edge Function uses service role.
drop policy if exists "apple_tokens_no_direct" on public.apple_auth_tokens;

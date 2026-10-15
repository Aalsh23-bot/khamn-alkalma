-- Anonymous product analytics + family-safe ad reports (insert-only from clients).

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  device_id text not null,
  name text not null,
  payload jsonb not null default '{}'::jsonb,
  app_version text,
  platform text
);

create index if not exists analytics_events_created_at_idx
  on public.analytics_events (created_at desc);
create index if not exists analytics_events_name_idx
  on public.analytics_events (name);

alter table public.analytics_events enable row level security;

drop policy if exists analytics_events_insert_anon on public.analytics_events;
create policy analytics_events_insert_anon
  on public.analytics_events
  for insert
  to anon, authenticated
  with check (
    char_length(device_id) between 8 and 80
    and char_length(name) between 1 and 64
  );

create table if not exists public.ad_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  device_id text not null,
  reason text not null,
  note text,
  app_version text,
  platform text
);

create index if not exists ad_reports_created_at_idx
  on public.ad_reports (created_at desc);

alter table public.ad_reports enable row level security;

drop policy if exists ad_reports_insert_anon on public.ad_reports;
create policy ad_reports_insert_anon
  on public.ad_reports
  for insert
  to anon, authenticated
  with check (
    char_length(device_id) between 8 and 80
    and char_length(reason) between 1 and 80
    and (note is null or char_length(note) <= 500)
  );

-- No select/update/delete policies for anon — reports are write-only from the app.
comment on table public.analytics_events is
  'Anonymous product events (device UUID only). No IDFA/email/account.';
comment on table public.ad_reports is
  'User reports of inappropriate ads. Insert-only from clients.';

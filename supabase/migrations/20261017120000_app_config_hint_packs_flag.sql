-- Feature flag: hide hint packs until operators enable them.

create table if not exists public.app_config (
  key text primary key,
  value jsonb not null default 'false'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;

drop policy if exists app_config_select_all on public.app_config;
create policy app_config_select_all
  on public.app_config
  for select
  to anon, authenticated
  using (true);

-- Default OFF so packs stay hidden until you flip the flag in SQL.
insert into public.app_config (key, value)
values ('hint_packs_enabled', 'false'::jsonb)
on conflict (key) do nothing;

create or replace function public.get_app_config_bool(p_key text, p_default boolean default false)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb;
begin
  select value into v from public.app_config where key = p_key;
  if v is null then
    return p_default;
  end if;
  if jsonb_typeof(v) = 'boolean' then
    return (v = 'true'::jsonb);
  end if;
  if jsonb_typeof(v) = 'string' then
    return lower(trim(both '"' from v::text)) in ('true', '1', 'yes');
  end if;
  return p_default;
end;
$$;

grant execute on function public.get_app_config_bool(text, boolean) to anon, authenticated;

comment on table public.app_config is 'Runtime feature flags (hint_packs_enabled defaults false).';

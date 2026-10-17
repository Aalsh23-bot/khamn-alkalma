-- Free daily hint (Asia/Kuwait midnight) credited to user balance.
-- Ad reports: rate-limit by auth.uid(); email only for persisted rows.

-- ---------------------------------------------------------------------------
-- Free daily hint claims (Kuwait calendar day)
-- ---------------------------------------------------------------------------
create table if not exists public.hint_free_claims (
  user_id uuid primary key references auth.users (id) on delete cascade,
  claim_date date not null,
  updated_at timestamptz not null default now()
);

alter table public.hint_free_claims enable row level security;

create or replace function public.kuwait_today()
returns date
language sql
stable
as $$
  select (timezone('Asia/Kuwait', now()))::date;
$$;

create or replace function public.kuwait_next_midnight_iso()
returns text
language sql
stable
as $$
  select to_char(
    ((timezone('Asia/Kuwait', now()))::date + 1)::timestamp
      at time zone 'Asia/Kuwait',
    'YYYY-MM-DD"T"HH24:MI:SS"Z"'
  );
$$;

create or replace function public.get_free_hint_status()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  today date := public.kuwait_today();
  claimed date;
begin
  if uid is null then
    return jsonb_build_object(
      'ok', false,
      'error', 'not_authenticated',
      'available', false,
      'kuwait_date', today,
      'next_at', public.kuwait_next_midnight_iso()
    );
  end if;

  select claim_date into claimed
  from public.hint_free_claims
  where user_id = uid;

  if claimed is not null and claimed = today then
    return jsonb_build_object(
      'ok', true,
      'available', false,
      'kuwait_date', today,
      'claimed_date', claimed,
      'next_at', public.kuwait_next_midnight_iso()
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'available', true,
    'kuwait_date', today,
    'claimed_date', claimed,
    'next_at', public.kuwait_next_midnight_iso()
  );
end;
$$;

create or replace function public.claim_free_daily_hint()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  today date := public.kuwait_today();
  claimed date;
  v integer;
  canonical_device text;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select claim_date into claimed
  from public.hint_free_claims
  where user_id = uid
  for update;

  if claimed is not null and claimed = today then
    select balance into v from public.hint_balances where user_id = uid;
    return jsonb_build_object(
      'ok', false,
      'error', 'already_claimed',
      'available', false,
      'balance', greatest(0, coalesce(v, 0)),
      'kuwait_date', today,
      'next_at', public.kuwait_next_midnight_iso()
    );
  end if;

  insert into public.hint_free_claims (user_id, claim_date, updated_at)
  values (uid, today, now())
  on conflict (user_id) do update
    set claim_date = excluded.claim_date,
        updated_at = now();

  canonical_device := 'user_' || uid::text;
  insert into public.hint_balances (device_id, user_id, balance, updated_at)
  values (canonical_device, uid, 1, now())
  on conflict (user_id) do update
    set balance = public.hint_balances.balance + 1,
        updated_at = now()
  returning balance into v;

  if v is null then
    select balance into v from public.hint_balances where user_id = uid;
  end if;

  return jsonb_build_object(
    'ok', true,
    'available', false,
    'balance', greatest(0, coalesce(v, 0)),
    'kuwait_date', today,
    'next_at', public.kuwait_next_midnight_iso()
  );
end;
$$;

grant execute on function public.get_free_hint_status() to authenticated;
grant execute on function public.claim_free_daily_hint() to authenticated;

comment on function public.claim_free_daily_hint() is
  'Adds 1 hint to auth.uid() balance once per Asia/Kuwait calendar day.';

-- ---------------------------------------------------------------------------
-- Ad reports: require auth.uid(); rate limit 5/hour per user; email tracking
-- ---------------------------------------------------------------------------
alter table public.ad_reports
  add column if not exists email_sent_at timestamptz;

create index if not exists ad_reports_user_created_idx
  on public.ad_reports (user_id, created_at desc);

create or replace function public.submit_ad_report(
  p_device_id text,
  p_reason text,
  p_note text default null,
  p_app_version text default null,
  p_platform text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  recent integer;
  new_id uuid;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if p_device_id is null or char_length(p_device_id) < 8 or char_length(p_device_id) > 80 then
    return jsonb_build_object('ok', false, 'error', 'invalid_device');
  end if;
  if p_reason is null or char_length(trim(p_reason)) < 1 or char_length(p_reason) > 80 then
    return jsonb_build_object('ok', false, 'error', 'invalid_reason');
  end if;
  if p_note is not null and char_length(p_note) > 500 then
    return jsonb_build_object('ok', false, 'error', 'note_too_long');
  end if;

  select count(*)::integer into recent
  from public.ad_reports
  where user_id = uid
    and created_at > now() - interval '1 hour';

  if recent >= 5 then
    return jsonb_build_object('ok', false, 'error', 'rate_limited', 'limit', 5);
  end if;

  insert into public.ad_reports (
    device_id, reason, note, app_version, platform, user_id
  ) values (
    p_device_id,
    trim(p_reason),
    nullif(trim(coalesce(p_note, '')), ''),
    p_app_version,
    p_platform,
    uid
  )
  returning id into new_id;

  return jsonb_build_object('ok', true, 'id', new_id);
end;
$$;

grant execute on function public.submit_ad_report(text, text, text, text, text)
  to authenticated;

revoke all on function public.submit_ad_report(text, text, text, text, text) from anon;

comment on function public.submit_ad_report(text, text, text, text, text) is
  'Inserts an ad report for auth.uid() with a 5/hour/user rate limit. Email via ad-report-notify using report id.';

-- Service-role helper to mark a report as emailed (idempotent).
create or replace function public.mark_ad_report_emailed(p_report_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated integer;
begin
  update public.ad_reports
  set email_sent_at = coalesce(email_sent_at, now())
  where id = p_report_id
    and email_sent_at is null;
  get diagnostics updated = row_count;
  return updated > 0;
end;
$$;

revoke all on function public.mark_ad_report_emailed(uuid) from public, anon, authenticated;
grant execute on function public.mark_ad_report_emailed(uuid) to service_role;

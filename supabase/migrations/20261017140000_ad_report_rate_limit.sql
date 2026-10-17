-- Rate-limited ad reports: max 5 per device_id per rolling hour.
-- Prefer authenticated users; anonymous device ids still work but are throttled.

alter table public.ad_reports
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create index if not exists ad_reports_device_created_idx
  on public.ad_reports (device_id, created_at desc);

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
  if p_device_id is null or char_length(p_device_id) < 8 or char_length(p_device_id) > 80 then
    return jsonb_build_object('ok', false, 'error', 'invalid_device');
  end if;
  if p_reason is null or char_length(trim(p_reason)) < 1 or char_length(p_reason) > 80 then
    return jsonb_build_object('ok', false, 'error', 'invalid_reason');
  end if;
  if p_note is not null and char_length(p_note) > 500 then
    return jsonb_build_object('ok', false, 'error', 'note_too_long');
  end if;

  -- Prefer signed-in users; still allow anonymous but throttle hard by device.
  select count(*)::integer into recent
  from public.ad_reports
  where device_id = p_device_id
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

grant execute on function public.submit_ad_report(text, text, text, text, text) to anon, authenticated;

-- Tighten direct inserts: keep insert policy but clients should use the RPC.
comment on function public.submit_ad_report(text, text, text, text, text) is
  'Inserts an ad report with a 5/hour/device rate limit. Uses auth.uid() when present.';

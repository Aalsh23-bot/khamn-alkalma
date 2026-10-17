-- Track purchased vs free hint balance; atomic merge of purchased-only;
-- free claim uses insert-on-conflict so a day is claimed at most once.

-- ---------------------------------------------------------------------------
-- Purchased balance column (IAP only; free claims do not increment this)
-- ---------------------------------------------------------------------------
alter table public.hint_balances
  add column if not exists purchased_balance integer not null default 0
    check (purchased_balance >= 0);

-- Backfill: treat historical balance as purchased (conservative for merge).
update public.hint_balances
set purchased_balance = balance
where purchased_balance = 0 and balance > 0;

-- Keep purchased_balance <= balance
update public.hint_balances
set purchased_balance = balance
where purchased_balance > balance;

-- ---------------------------------------------------------------------------
-- credit_hint_purchase_for_user: also bump purchased_balance
-- ---------------------------------------------------------------------------
create or replace function public.credit_hint_purchase_for_user(
  p_user_id uuid,
  p_transaction_id text,
  p_product_id text,
  p_store_product_id text,
  p_hints integer,
  p_device_id text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v integer;
  canonical_device text;
begin
  if p_user_id is null then
    raise exception 'invalid user';
  end if;
  if p_transaction_id is null or char_length(p_transaction_id) < 4 then
    raise exception 'invalid transaction_id';
  end if;
  if p_product_id is null or p_product_id not in ('hints_5', 'hints_20', 'hints_60') then
    raise exception 'invalid product_id';
  end if;
  if p_hints is null or p_hints <= 0 or p_hints > 500 then
    raise exception 'invalid hints';
  end if;
  if (p_product_id = 'hints_5' and p_hints <> 5)
     or (p_product_id = 'hints_20' and p_hints <> 20)
     or (p_product_id = 'hints_60' and p_hints <> 60) then
    raise exception 'hints_product_mismatch';
  end if;

  if exists (
    select 1 from public.hint_purchase_ledger where transaction_id = p_transaction_id
  ) then
    select balance into v from public.hint_balances where user_id = p_user_id;
    return greatest(0, coalesce(v, 0));
  end if;

  canonical_device := 'user_' || p_user_id::text;

  insert into public.hint_purchase_ledger (
    transaction_id, product_id, store_product_id, hints_added, device_id, user_id
  ) values (
    p_transaction_id,
    p_product_id,
    coalesce(nullif(p_store_product_id, ''), p_product_id),
    p_hints,
    coalesce(nullif(p_device_id, ''), canonical_device),
    p_user_id
  );

  insert into public.hint_balances (device_id, user_id, balance, purchased_balance, updated_at)
  values (canonical_device, p_user_id, p_hints, p_hints, now())
  on conflict (user_id) do update
    set balance = public.hint_balances.balance + excluded.balance,
        purchased_balance = public.hint_balances.purchased_balance + excluded.purchased_balance,
        updated_at = now()
  returning balance into v;

  if v is null then
    select balance into v from public.hint_balances where user_id = p_user_id;
  end if;

  return greatest(0, coalesce(v, 0));
end;
$$;

revoke all on function public.credit_hint_purchase_for_user(uuid, text, text, text, integer, text)
  from public, anon, authenticated;
grant execute on function public.credit_hint_purchase_for_user(uuid, text, text, text, integer, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- spend: consume free portion first so purchased_balance stays transferable
-- ---------------------------------------------------------------------------
create or replace function public.spend_hint_balance()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v integer;
  purchased integer;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  select balance, purchased_balance into v, purchased
  from public.hint_balances
  where user_id = uid
  for update;
  if v is null or v <= 0 then
    return public.get_hint_balance();
  end if;
  -- Free first: only decrement purchased when no free remainder.
  if coalesce(purchased, 0) >= v then
    purchased := greatest(0, coalesce(purchased, 0) - 1);
  end if;
  update public.hint_balances
  set balance = v - 1,
      purchased_balance = least(purchased, v - 1),
      updated_at = now()
  where user_id = uid
  returning balance into v;
  return greatest(0, coalesce(v, 0));
end;
$$;

-- ---------------------------------------------------------------------------
-- Free claim: insert … on conflict do update only when date advances
-- ---------------------------------------------------------------------------
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
      'server_now', to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
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
      'server_now', to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'next_at', public.kuwait_next_midnight_iso()
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'available', true,
    'kuwait_date', today,
    'claimed_date', claimed,
    'server_now', to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
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
  inserted_id uuid;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  -- Atomic day claim: only succeeds when claim_date changes (or first insert).
  insert into public.hint_free_claims (user_id, claim_date, updated_at)
  values (uid, today, now())
  on conflict (user_id) do update
    set claim_date = excluded.claim_date,
        updated_at = now()
    where public.hint_free_claims.claim_date is distinct from excluded.claim_date
  returning user_id into inserted_id;

  if inserted_id is null then
    select claim_date into claimed from public.hint_free_claims where user_id = uid;
    select balance into v from public.hint_balances where user_id = uid;
    return jsonb_build_object(
      'ok', false,
      'error', 'already_claimed',
      'available', false,
      'balance', greatest(0, coalesce(v, 0)),
      'kuwait_date', today,
      'server_now', to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'next_at', public.kuwait_next_midnight_iso()
    );
  end if;

  canonical_device := 'user_' || uid::text;
  insert into public.hint_balances (device_id, user_id, balance, purchased_balance, updated_at)
  values (canonical_device, uid, 1, 0, now())
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
    'server_now', to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'next_at', public.kuwait_next_midnight_iso()
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Atomic merge: purchased hints only; free claim once per final account
-- ---------------------------------------------------------------------------
create or replace function public.merge_anonymous_hint_balance(
  p_from_user_id uuid,
  p_to_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  from_purchased integer := 0;
  to_balance integer := 0;
  to_purchased integer := 0;
  from_claim date;
  to_claim date;
  today date := public.kuwait_today();
  canonical text;
begin
  if p_from_user_id is null or p_to_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_user');
  end if;
  if p_from_user_id = p_to_user_id then
    select balance into to_balance from public.hint_balances where user_id = p_to_user_id;
    return jsonb_build_object(
      'ok', true,
      'merged', false,
      'same_user', true,
      'balance', greatest(0, coalesce(to_balance, 0))
    );
  end if;

  -- Lock both balance rows in id order to avoid deadlocks.
  perform 1 from public.hint_balances
  where user_id in (p_from_user_id, p_to_user_id)
  order by user_id
  for update;

  select greatest(0, coalesce(purchased_balance, 0)) into from_purchased
  from public.hint_balances
  where user_id = p_from_user_id;

  from_purchased := coalesce(from_purchased, 0);

  -- Move ledger rows (skip tx already on target).
  update public.hint_purchase_ledger as hl
  set user_id = p_to_user_id
  where hl.user_id = p_from_user_id
    and not exists (
      select 1 from public.hint_purchase_ledger as t
      where t.transaction_id = hl.transaction_id
        and t.user_id = p_to_user_id
    );

  delete from public.hint_purchase_ledger
  where user_id = p_from_user_id;

  canonical := 'user_' || p_to_user_id::text;

  if from_purchased > 0 then
    insert into public.hint_balances (device_id, user_id, balance, purchased_balance, updated_at)
    values (canonical, p_to_user_id, from_purchased, from_purchased, now())
    on conflict (user_id) do update
      set balance = public.hint_balances.balance + excluded.purchased_balance,
          purchased_balance = public.hint_balances.purchased_balance + excluded.purchased_balance,
          updated_at = now();
  end if;

  -- Drop anonymous balance entirely (free portion is NOT transferred).
  delete from public.hint_balances where user_id = p_from_user_id;

  -- Free claim: once per final account per Kuwait day — keep claimed if either side claimed today.
  select claim_date into from_claim from public.hint_free_claims where user_id = p_from_user_id;
  select claim_date into to_claim from public.hint_free_claims where user_id = p_to_user_id;

  if from_claim is not null or to_claim is not null then
    insert into public.hint_free_claims (user_id, claim_date, updated_at)
    values (
      p_to_user_id,
      greatest(coalesce(from_claim, 'epoch'::date), coalesce(to_claim, 'epoch'::date)),
      now()
    )
    on conflict (user_id) do update
      set claim_date = greatest(public.hint_free_claims.claim_date, excluded.claim_date),
          updated_at = now();
  end if;
  delete from public.hint_free_claims where user_id = p_from_user_id;

  select balance, purchased_balance into to_balance, to_purchased
  from public.hint_balances
  where user_id = p_to_user_id;

  return jsonb_build_object(
    'ok', true,
    'merged', true,
    'transferred_purchased', from_purchased,
    'balance', greatest(0, coalesce(to_balance, 0)),
    'purchased_balance', greatest(0, coalesce(to_purchased, 0)),
    'kuwait_date', today
  );
end;
$$;

revoke all on function public.merge_anonymous_hint_balance(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.merge_anonymous_hint_balance(uuid, uuid)
  to service_role;

-- Claim email send slot before sending (prevents duplicate emails under concurrency).
create or replace function public.claim_ad_report_email(p_report_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated integer;
begin
  update public.ad_reports
  set email_sent_at = now()
  where id = p_report_id
    and email_sent_at is null;
  get diagnostics updated = row_count;
  return updated > 0;
end;
$$;

revoke all on function public.claim_ad_report_email(uuid) from public, anon, authenticated;
grant execute on function public.claim_ad_report_email(uuid) to service_role;

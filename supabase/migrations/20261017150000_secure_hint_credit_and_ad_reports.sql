-- Harden hint credit: clients must not self-credit; only service_role (edge) credits.
-- Fix balance upsert to conflict on user_id (not device_id).
-- Close ad_reports direct-insert bypass of the rate-limited RPC.

-- 1) Remove client-callable credit_hint_purchase (auth.uid self-credit up to 500).
revoke all on function public.credit_hint_purchase(text, text, text, integer, text)
  from public, anon, authenticated, service_role;
drop function if exists public.credit_hint_purchase(text, text, text, integer, text);

-- Also drop any leftover device-scoped signature from earlier migrations.
drop function if exists public.credit_hint_purchase(text, text, text, text, integer, uuid);

-- 2+5) Replace for_user: upsert on user_id; ledger unique handles double-credit.
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
  -- Hints must match the product; never trust mismatched client values.
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

  -- One balance row per user; device_id is a stable secondary key, not the conflict target.
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

  insert into public.hint_balances (device_id, user_id, balance, updated_at)
  values (canonical_device, p_user_id, p_hints, now())
  on conflict (user_id) do update
    set balance = public.hint_balances.balance + excluded.balance,
        updated_at = now()
  returning balance into v;

  if v is null then
    select balance into v from public.hint_balances where user_id = p_user_id;
  end if;

  return greatest(0, coalesce(v, 0));
end;
$$;

-- Explicit: only service_role may execute (edge functions).
revoke all on function public.credit_hint_purchase_for_user(uuid, text, text, text, integer, text)
  from public, anon, authenticated;
grant execute on function public.credit_hint_purchase_for_user(uuid, text, text, text, integer, text)
  to service_role;

comment on function public.credit_hint_purchase_for_user(uuid, text, text, text, integer, text) is
  'Service-role only. Credits hints after RevenueCat verification; upserts balance by user_id.';

-- 8) Remove direct client inserts so rate limit cannot be bypassed.
drop policy if exists ad_reports_insert_anon on public.ad_reports;

comment on table public.ad_reports is
  'Ad reports. Insert only via submit_ad_report RPC (rate-limited).';

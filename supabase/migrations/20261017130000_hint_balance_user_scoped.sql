-- Move hint inventory to authenticated user_id (localStorage becomes cache only).
-- Spend/get RPCs use auth.uid() and never accept a client-supplied device id.

alter table public.hint_balances
  add column if not exists balance_user uuid;

-- Prefer user_id as the durable key going forward.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'hint_balances_user_id_key'
  ) then
    -- Backfill: copy user_id into a unique slot where present.
    update public.hint_balances
    set balance_user = user_id
    where user_id is not null and balance_user is null;

    alter table public.hint_balances
      add constraint hint_balances_user_id_key unique (user_id);
  end if;
end $$;

create or replace function public.get_hint_balance()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v integer;
begin
  if uid is null then
    return 0;
  end if;
  select balance into v from public.hint_balances where user_id = uid;
  return greatest(0, coalesce(v, 0));
end;
$$;

create or replace function public.spend_hint_balance()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v integer;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  update public.hint_balances
  set balance = balance - 1,
      updated_at = now()
  where user_id = uid
    and balance > 0
  returning balance into v;
  if v is null then
    return public.get_hint_balance();
  end if;
  return greatest(0, v);
end;
$$;

create or replace function public.credit_hint_purchase(
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
  uid uuid := auth.uid();
  v integer;
begin
  -- Prefer auth.uid(); service_role callers must set request.jwt via edge (we pass uid in a trusted path).
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if p_transaction_id is null or char_length(p_transaction_id) < 4 then
    raise exception 'invalid transaction_id';
  end if;
  if p_hints is null or p_hints <= 0 or p_hints > 500 then
    raise exception 'invalid hints';
  end if;

  if exists (
    select 1 from public.hint_purchase_ledger where transaction_id = p_transaction_id
  ) then
    return public.get_hint_balance();
  end if;

  insert into public.hint_purchase_ledger (
    transaction_id, product_id, store_product_id, hints_added, device_id, user_id
  ) values (
    p_transaction_id,
    p_product_id,
    p_store_product_id,
    p_hints,
    coalesce(nullif(p_device_id, ''), 'user'),
    uid
  );

  insert into public.hint_balances (device_id, user_id, balance, updated_at)
  values (
    coalesce(nullif(p_device_id, ''), 'user_' || uid::text),
    uid,
    p_hints,
    now()
  )
  on conflict (user_id) do update
    set balance = public.hint_balances.balance + excluded.balance,
        updated_at = now()
  returning balance into v;

  -- Fallback if unique(user_id) is not yet available: upsert by device then attach user.
  if v is null then
    insert into public.hint_balances (device_id, user_id, balance, updated_at)
    values (
      coalesce(nullif(p_device_id, ''), 'user_' || uid::text),
      uid,
      p_hints,
      now()
    )
    on conflict (device_id) do update
      set balance = public.hint_balances.balance + excluded.balance,
          user_id = uid,
          updated_at = now()
    returning balance into v;
  end if;

  return greatest(0, coalesce(v, 0));
end;
$$;

-- Service-role credit used by the edge function (sets user explicitly).
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
begin
  if p_user_id is null then
    raise exception 'invalid user';
  end if;
  if p_transaction_id is null or char_length(p_transaction_id) < 4 then
    raise exception 'invalid transaction_id';
  end if;
  if p_hints is null or p_hints <= 0 or p_hints > 500 then
    raise exception 'invalid hints';
  end if;

  if exists (
    select 1 from public.hint_purchase_ledger where transaction_id = p_transaction_id
  ) then
    select balance into v from public.hint_balances where user_id = p_user_id;
    return greatest(0, coalesce(v, 0));
  end if;

  insert into public.hint_purchase_ledger (
    transaction_id, product_id, store_product_id, hints_added, device_id, user_id
  ) values (
    p_transaction_id,
    p_product_id,
    p_store_product_id,
    p_hints,
    coalesce(nullif(p_device_id, ''), 'user_' || p_user_id::text),
    p_user_id
  );

  insert into public.hint_balances (device_id, user_id, balance, updated_at)
  values (
    coalesce(nullif(p_device_id, ''), 'user_' || p_user_id::text),
    p_user_id,
    p_hints,
    now()
  )
  on conflict (device_id) do update
    set balance = public.hint_balances.balance + excluded.balance,
        user_id = p_user_id,
        updated_at = now()
  returning balance into v;

  -- Ensure row is keyed by user for subsequent lookups.
  update public.hint_balances
  set user_id = p_user_id
  where device_id = coalesce(nullif(p_device_id, ''), 'user_' || p_user_id::text);

  select balance into v from public.hint_balances where user_id = p_user_id;
  return greatest(0, coalesce(v, 0));
end;
$$;

-- Replace old device-id signatures: drop if present.
drop function if exists public.get_hint_balance(text);
drop function if exists public.spend_hint_balance(text);
drop function if exists public.credit_hint_purchase(text, text, text, text, integer, uuid);

grant execute on function public.get_hint_balance() to authenticated;
grant execute on function public.spend_hint_balance() to authenticated;
grant execute on function public.credit_hint_purchase(text, text, text, integer, text) to authenticated;
revoke all on function public.credit_hint_purchase_for_user(uuid, text, text, text, integer, text) from public;
grant execute on function public.credit_hint_purchase_for_user(uuid, text, text, text, integer, text) to service_role;

comment on function public.get_hint_balance() is 'Returns auth.uid() hint balance (never takes a client device id).';
comment on function public.spend_hint_balance() is 'Decrements auth.uid() balance by 1 if > 0.';

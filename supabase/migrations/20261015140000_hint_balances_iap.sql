-- Hint pack balances + idempotent purchase ledger (device-scoped).

create table if not exists public.hint_balances (
  device_id text primary key,
  user_id uuid references auth.users (id) on delete set null,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.hint_purchase_ledger (
  transaction_id text primary key,
  product_id text not null,
  store_product_id text,
  hints_added integer not null check (hints_added > 0),
  device_id text not null,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists hint_purchase_ledger_device_idx
  on public.hint_purchase_ledger (device_id, created_at desc);

alter table public.hint_balances enable row level security;
alter table public.hint_purchase_ledger enable row level security;

-- Clients may read their own device balance (device_id passed explicitly; no broad select).
-- Writes go through SECURITY DEFINER RPCs / Edge Function (service role).

drop policy if exists hint_balances_select_own on public.hint_balances;
-- No direct client writes. Edge Function uses service role.

create or replace function public.get_hint_balance(p_device_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v integer;
begin
  if p_device_id is null or char_length(p_device_id) < 8 or char_length(p_device_id) > 80 then
    return 0;
  end if;
  select balance into v from public.hint_balances where device_id = p_device_id;
  return coalesce(v, 0);
end;
$$;

create or replace function public.spend_hint_balance(p_device_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v integer;
begin
  if p_device_id is null or char_length(p_device_id) < 8 or char_length(p_device_id) > 80 then
    return 0;
  end if;
  update public.hint_balances
  set balance = balance - 1,
      updated_at = now()
  where device_id = p_device_id
    and balance > 0
  returning balance into v;
  return coalesce(v, public.get_hint_balance(p_device_id));
end;
$$;

create or replace function public.credit_hint_purchase(
  p_device_id text,
  p_transaction_id text,
  p_product_id text,
  p_store_product_id text,
  p_hints integer,
  p_user_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v integer;
begin
  if p_device_id is null or char_length(p_device_id) < 8 then
    raise exception 'invalid device_id';
  end if;
  if p_transaction_id is null or char_length(p_transaction_id) < 4 then
    raise exception 'invalid transaction_id';
  end if;
  if p_hints is null or p_hints <= 0 or p_hints > 500 then
    raise exception 'invalid hints';
  end if;

  -- Idempotent: existing transaction returns current balance without double-credit.
  if exists (
    select 1 from public.hint_purchase_ledger where transaction_id = p_transaction_id
  ) then
    return public.get_hint_balance(p_device_id);
  end if;

  insert into public.hint_purchase_ledger (
    transaction_id, product_id, store_product_id, hints_added, device_id, user_id
  ) values (
    p_transaction_id, p_product_id, p_store_product_id, p_hints, p_device_id, p_user_id
  );

  insert into public.hint_balances (device_id, user_id, balance, updated_at)
  values (p_device_id, p_user_id, p_hints, now())
  on conflict (device_id) do update
    set balance = public.hint_balances.balance + excluded.balance,
        user_id = coalesce(excluded.user_id, public.hint_balances.user_id),
        updated_at = now()
  returning balance into v;

  return v;
end;
$$;

grant execute on function public.get_hint_balance(text) to anon, authenticated;
grant execute on function public.spend_hint_balance(text) to anon, authenticated;
-- credit_hint_purchase only via service role / edge function
revoke all on function public.credit_hint_purchase(text, text, text, text, integer, uuid) from public;
grant execute on function public.credit_hint_purchase(text, text, text, text, integer, uuid) to service_role;

comment on table public.hint_balances is 'Purchased hint inventory keyed by anonymous device id.';
comment on table public.hint_purchase_ledger is 'Idempotent IAP ledger to prevent double-crediting.';

-- Allow signed-in users to permanently delete their own account (App Store 5.1.1(v)).

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  -- Dependent rows cascade / set null via existing FKs on auth.users.
  delete from auth.users where id = uid;

  if not found then
    raise exception 'account not found';
  end if;
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;

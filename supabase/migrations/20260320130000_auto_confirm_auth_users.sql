-- Auto-confirm emails so sign-up creates a session without dashboard Auth settings.
-- Useful when Confirm email is enabled and the Auth UI is hard to find on mobile.

create or replace function public.auto_confirm_auth_user()
returns trigger
language plpgsql
security definer
set search_path = auth, public
as $$
begin
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_auto_confirm on auth.users;
create trigger on_auth_user_auto_confirm
  before insert on auth.users
  for each row
  execute function public.auto_confirm_auth_user();

update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where email_confirmed_at is null;

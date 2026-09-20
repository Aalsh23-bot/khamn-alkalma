
-- Lookup friend challenge word by code (authenticated or anon with code)
create or replace function public.get_friend_challenge(p_code text)
returns table (code text, word text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_code is null or char_length(trim(p_code)) < 6 then
    return;
  end if;
  return query
  select c.code, w.word
  from public.challenges c
  join public.words w on w.id = c.word_id
  where c.code = lower(trim(p_code))
  limit 1;
end;
$$;

grant execute on function public.get_friend_challenge(text) to anon, authenticated;

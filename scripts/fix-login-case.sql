update public.staff
set email = lower(email)
where email <> lower(email);

update public.customers
set email = lower(email)
where email <> lower(email);

create or replace function public.current_staff_role()
returns text
language sql
security definer
set search_path = public
as $$
  select role from staff where lower(email) = lower(auth.jwt() ->> 'email') limit 1;
$$;

create or replace function public.get_staff_by_email_rpc(target_email text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
  caller_email text;
  target_lower text;
begin
  caller_email := lower(auth.jwt() ->> 'email');
  target_lower := lower(target_email);
  if caller_email is null or not (public.is_staff() or caller_email = target_lower) then
    return null;
  end if;

  select row_to_json(s)::json
  into result
  from staff s
  where lower(s.email) = target_lower
  limit 1;

  return result;
end;
$$;

-- Migration: enable direct customer signup
-- Generated from scripts/enable-direct-customer-signup.sql

create or replace function public.create_customer_auth_rpc(p_email text, p_password text)
returns json
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  user_id uuid;
  identity_id uuid;
  clean_email text;
  pw_hash text;
begin
  clean_email := lower(trim(p_email));
  if clean_email = '' or position('@' in clean_email) = 0 then
    raise exception 'Invalid email';
  end if;
  if p_password is null or length(p_password) < 6 then
    raise exception 'Password must be at least 6 characters';
  end if;

  select u.id into user_id from auth.users u where lower(u.email) = clean_email limit 1;
  if user_id is not null then
    raise exception 'User already registered';
  end if;

  pw_hash := extensions.crypt(p_password, extensions.gen_salt('bf'));
  user_id := extensions.gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_sent_at, confirmation_token,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000',
    user_id, 'authenticated', 'authenticated', clean_email, pw_hash,
    now(), now(), '', '{"provider":"email","providers":["email"]}', '{}',
    now(), now()
  );

  select i.id into identity_id
  from auth.identities i
  where i.user_id = user_id and i.provider = 'email'
  limit 1;

  if identity_id is null then
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    values (
      extensions.gen_random_uuid(),
      user_id,
      json_build_object('sub', user_id::text, 'email', clean_email),
      'email',
      clean_email,
      now(), now(), now()
    );
  end if;

  return json_build_object('id', user_id, 'email', clean_email);
end;
$$;

grant execute on function public.create_customer_auth_rpc to anon, authenticated;

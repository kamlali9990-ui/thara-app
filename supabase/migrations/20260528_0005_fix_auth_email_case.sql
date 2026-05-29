-- Migration: fix auth email case
-- Generated from scripts/fix-auth-email-case.sql

update auth.users
set email = lower(email),
    updated_at = now()
where email <> lower(email);

update auth.identities
set provider_id = lower(provider_id),
    identity_data = jsonb_set(
      identity_data,
      '{email}',
      to_jsonb(lower(coalesce(identity_data->>'email', provider_id)))
    )
where provider = 'email'
  and (
    provider_id <> lower(provider_id)
    or coalesce(identity_data->>'email', '') <> lower(coalesce(identity_data->>'email', ''))
  );

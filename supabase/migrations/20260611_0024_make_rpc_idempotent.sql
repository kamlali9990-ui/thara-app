-- Make create_customer_auth_rpc idempotent: if auth user already exists,
-- return existing user info instead of raising exception.
-- This fixes the 400 error when customer record was deleted but auth user remains.

CREATE OR REPLACE FUNCTION public.create_customer_auth_rpc(p_email TEXT, p_password TEXT, p_username TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id UUID;
  v_identity_id UUID;
  clean_email TEXT;
  pw_hash TEXT;
  meta JSONB;
BEGIN
  clean_email := lower(trim(p_email));
  IF clean_email = '' OR position('@' in clean_email) = 0 THEN
    RAISE EXCEPTION 'Invalid email';
  END IF;
  IF p_password IS NULL OR length(p_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters';
  END IF;

  -- Check if auth user already exists (idempotent)
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = clean_email LIMIT 1;
  IF v_user_id IS NOT NULL THEN
    -- User already exists, update password and return
    pw_hash := extensions.crypt(p_password, extensions.gen_salt('bf', 10));
    UPDATE auth.users SET encrypted_password = pw_hash, updated_at = now() WHERE id = v_user_id;
    RETURN json_build_object('id', v_user_id, 'email', clean_email, 'existing', true);
  END IF;

  pw_hash := extensions.crypt(p_password, extensions.gen_salt('bf', 10));
  v_user_id := extensions.gen_random_uuid();
  meta := jsonb_build_object(
    'sub', v_user_id::TEXT,
    'email', clean_email,
    'email_verified', true,
    'phone_verified', false,
    'username', p_username
  );

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_sent_at, confirmation_token,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id, 'authenticated', 'authenticated', clean_email, pw_hash,
    now(), now(), '',
    '{"provider":"email","providers":["email"]}', meta,
    now(), now(),
    '', '', ''
  );

  SELECT i.id INTO v_identity_id
  FROM auth.identities i
  WHERE i.user_id = v_user_id AND i.provider = 'email'
  LIMIT 1;

  IF v_identity_id IS NULL THEN
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
      extensions.gen_random_uuid(),
      v_user_id,
      jsonb_build_object(
        'sub', v_user_id::TEXT,
        'email', clean_email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      v_user_id::TEXT,
      now(), now(), now()
    );
  END IF;

  RETURN json_build_object('id', v_user_id, 'email', clean_email, 'existing', false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_customer_auth_rpc TO anon, authenticated;

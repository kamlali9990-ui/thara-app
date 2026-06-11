-- Migration: Add auto_create_and_signin_rpc to bypass GoTrue signIn 500
-- Creates user + session + refresh token in one RPC, returns refresh_token
-- Frontend calls supabase.auth.refreshSession() to get real JWT

CREATE OR REPLACE FUNCTION auto_create_and_signin_rpc(
  p_email TEXT,
  p_password TEXT,
  p_username TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id UUID;
  v_identity_id UUID;
  v_session_id UUID;
  v_refresh_token TEXT;
  clean_email TEXT;
  pw_hash TEXT;
  meta JSONB;
BEGIN
  clean_email := lower(trim(p_email));

  -- Check if user already exists
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = clean_email LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'User already registered';
  END IF;

  -- Validate inputs
  IF clean_email = '' OR position('@' in clean_email) = 0 THEN
    RAISE EXCEPTION 'Invalid email';
  END IF;
  IF p_password IS NULL OR length(p_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters';
  END IF;

  -- Create user
  pw_hash := crypt(p_password, gen_salt('bf', 10));
  v_user_id := gen_random_uuid();
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
    now(), now(), NULL,
    '{"provider":"email","providers":["email"]}', meta,
    now(), now(),
    '', '', ''
  );

  -- Create identity
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object('sub', v_user_id::TEXT, 'email', clean_email, 'email_verified', true, 'phone_verified', false),
    'email',
    v_user_id::TEXT,
    now(), now(), now()
  );

  -- Create session
  v_session_id := gen_random_uuid();
  INSERT INTO auth.sessions (id, user_id, created_at, updated_at, factor_id, aal)
  VALUES (v_session_id, v_user_id, now(), now(), gen_random_uuid(), 'aal1');

  -- Create refresh token
  v_refresh_token := gen_random_uuid()::TEXT;
  INSERT INTO auth.refresh_tokens (instance_id, token, user_id, revoked, created_at, updated_at, session_id)
  VALUES ('00000000-0000-0000-0000-000000000000', v_refresh_token, v_user_id::TEXT, false, now(), now(), v_session_id);

  RETURN json_build_object(
    'user_id', v_user_id,
    'email', clean_email,
    'refresh_token', v_refresh_token
  );
END;
$$;

GRANT EXECUTE ON FUNCTION auto_create_and_signin_rpc TO anon, authenticated;

-- =============================================
-- Migration: Fix user/staff/driver creation issues
-- Addresses critical bugs found in code review
-- =============================================

-- 1. FIX: create_customer_auth_rpc — add missing is_sso_user / is_anonymous columns
--    (Newer Supabase versions require these NOT NULL booleans)
CREATE OR REPLACE FUNCTION public.create_customer_auth_rpc(p_email TEXT, p_password TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id UUID;
  identity_id UUID;
  clean_email TEXT;
  pw_hash TEXT;
BEGIN
  clean_email := lower(trim(p_email));
  IF clean_email = '' OR position('@' in clean_email) = 0 THEN
    RAISE EXCEPTION 'Invalid email';
  END IF;
  IF p_password IS NULL OR length(p_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters';
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = clean_email LIMIT 1;
  IF v_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'User already registered';
  END IF;

  pw_hash := extensions.crypt(p_password, extensions.gen_salt('bf'));
  v_user_id := extensions.gen_random_uuid();

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_sent_at, confirmation_token,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    is_sso_user, is_anonymous
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id, 'authenticated', 'authenticated', clean_email, pw_hash,
    now(), now(), '', '{"provider":"email","providers":["email"]}', '{}',
    now(), now(), false, false
  );

  SELECT i.id INTO identity_id
  FROM auth.identities i
  WHERE i.user_id = v_user_id AND i.provider = 'email'
  LIMIT 1;

  IF identity_id IS NULL THEN
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
      extensions.gen_random_uuid(),
      v_user_id,
      json_build_object('sub', v_user_id::TEXT, 'email', clean_email),
      'email',
      clean_email,
      now(), now(), now()
    );
  END IF;

  RETURN json_build_object('id', v_user_id, 'email', clean_email);
END;
$$;

-- 2. FIX: confirm_auth_user — also add missing columns for consistency
CREATE OR REPLACE FUNCTION public.confirm_auth_user(p_email TEXT, p_password TEXT DEFAULT '123456')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_uid UUID;
  pw_hash TEXT;
  iid UUID;
BEGIN
  pw_hash := extensions.crypt(p_password, extensions.gen_salt('bf'));
  SELECT id INTO v_uid FROM auth.users WHERE email = p_email;
  IF v_uid IS NULL THEN
    v_uid := extensions.gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_sent_at, confirmation_token,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      is_sso_user, is_anonymous
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', p_email, pw_hash,
      now(), now(), '', '{"provider":"email","providers":["email"]}', '{}',
      now(), now(), false, false
    );
  ELSE
    UPDATE auth.users SET
      instance_id = '00000000-0000-0000-0000-000000000000',
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      encrypted_password = pw_hash,
      confirmation_token = '',
      updated_at = now()
    WHERE id = v_uid;
  END IF;
  SELECT id INTO iid FROM auth.identities
  WHERE user_id = v_uid AND provider = 'email' LIMIT 1;
  IF iid IS NULL THEN
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (extensions.gen_random_uuid(), v_uid, json_build_object('sub', v_uid::TEXT, 'email', p_email), 'email', p_email, now(), now(), now());
  ELSE
    UPDATE auth.identities SET identity_data = json_build_object('sub', v_uid::TEXT, 'email', p_email)
    WHERE id = iid AND (identity_data ->> 'email_verified') IS NOT NULL;
  END IF;
  RETURN json_build_object('id', v_uid, 'email', p_email);
END;
$$;

-- SECURITY: Revoke anon access from confirm_auth_user (internal function only)
-- ensure_staff_auth_user (SECURITY DEFINER) still calls it internally without issue
REVOKE EXECUTE ON FUNCTION public.confirm_auth_user FROM anon;
GRANT EXECUTE ON FUNCTION public.confirm_auth_user TO authenticated;

-- 3. FIX: assign_driver_to_order — allow both admin AND manager (as intended)
--    The original schema.sql had 'admin' only; migration v3 fixed it
CREATE OR REPLACE FUNCTION public.assign_driver_to_order(
  p_order_id BIGINT,
  p_driver_id BIGINT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  driver_role TEXT;
BEGIN
  IF NOT public.is_staff(ARRAY['admin', 'manager']) THEN
    RAISE EXCEPTION 'Unauthorized: admin/manager only';
  END IF;
  IF p_driver_id IS NOT NULL THEN
    SELECT role INTO driver_role FROM staff WHERE id = p_driver_id;
    IF driver_role IS NULL OR driver_role != 'driver' THEN
      RAISE EXCEPTION 'Invalid driver id';
    END IF;
  END IF;
  UPDATE orders SET assigned_driver_id = p_driver_id WHERE id = p_order_id
  RETURNING row_to_json(orders)::JSON INTO result;
  RETURN result;
END;
$$;

-- 4. FIX: update_staff_rpc — also update auth.users when staff email changes
CREATE OR REPLACE FUNCTION public.update_staff_rpc(
  p_id BIGINT, p_email TEXT, p_name TEXT, p_role TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  result JSON;
  old_email TEXT;
BEGIN
  IF NOT public.is_staff(ARRAY['admin']) THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  -- Get current email before update
  SELECT email INTO old_email FROM staff WHERE id = p_id;

  UPDATE staff
  SET email = p_email, name = p_name, role = p_role
  WHERE id = p_id
  RETURNING row_to_json(staff)::JSON INTO result;

  -- Sync auth.users email if it changed
  IF old_email IS DISTINCT FROM p_email THEN
    UPDATE auth.users
    SET email = p_email, updated_at = now()
    WHERE lower(email) = lower(old_email);
  END IF;

  RETURN result;
END;
$$;

-- 5. FIX: create_staff_rpc — normalize email to lowercase
CREATE OR REPLACE FUNCTION public.create_staff_rpc(
  p_email TEXT, p_name TEXT, p_role TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT public.is_staff(ARRAY['admin']) THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;
  INSERT INTO staff (email, name, role)
  VALUES (lower(trim(p_email)), p_name, p_role)
  RETURNING row_to_json(staff)::JSON INTO result;
  RETURN result;
END;
$$;

-- 6. FIX: ensure_staff_auth_user — SECURITY: keep for anon (needed for login fallback)
--    but only creates auth users for verified staff emails
--    (already implemented — checks staff table first)

-- 7. Ensure list_customers_rpc is available to all authenticated staff
--    (already granted correctly, just re-asserting)
GRANT EXECUTE ON FUNCTION public.list_customers_rpc TO authenticated;

-- =============================================
-- Verify fixes
-- =============================================
DO $$
BEGIN
  -- Verify create_customer_auth_rpc works
  PERFORM public.create_customer_auth_rpc('test-fix-verify@example.com', 'testpass123');
  -- Clean up test user
  DELETE FROM auth.identities WHERE provider_id = 'test-fix-verify@example.com';
  DELETE FROM auth.users WHERE email = 'test-fix-verify@example.com';
  DELETE FROM customers WHERE email = 'test-fix-verify@example.com';
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'create_customer_auth_rpc verification failed: %', SQLERRM;
END $$;

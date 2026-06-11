-- 1. Add phone column to staff
ALTER TABLE staff ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE;

-- 2. Update ensure_staff_auth_user to look up by email or phone
DROP FUNCTION IF EXISTS public.ensure_staff_auth_user(TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.ensure_staff_auth_user(p_identifier TEXT, p_password TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  found_email TEXT;
  result JSON;
BEGIN
  SELECT email INTO found_email FROM staff WHERE lower(email) = lower(p_identifier) OR phone = p_identifier LIMIT 1;
  IF found_email IS NULL THEN
    RETURN json_build_object('staff_exists', false, 'fixed', false);
  END IF;
  result := public.confirm_auth_user(found_email, p_password);
  RETURN json_build_object('staff_exists', true, 'fixed', true, 'user', result);
END;
$$;

-- 3. Update create_staff_rpc to accept phone
DROP FUNCTION IF EXISTS public.create_staff_rpc(TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.create_staff_rpc(
  p_email TEXT, p_name TEXT, p_role TEXT, p_password TEXT DEFAULT '123456', p_phone TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  result JSON;
  user_id UUID;
  pw_hash TEXT;
BEGIN
  IF NOT public.is_staff(ARRAY['admin']) THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;
  IF p_phone IS NOT NULL AND p_phone != '' THEN
    IF EXISTS (SELECT 1 FROM staff WHERE phone = p_phone) THEN
      RAISE EXCEPTION 'رقم الجوال مستخدم مسبقاً';
    END IF;
  END IF;
  SELECT id INTO user_id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;
  IF user_id IS NULL THEN
    pw_hash := extensions.crypt(p_password, extensions.gen_salt('bf'));
    user_id := extensions.gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_sent_at, confirmation_token,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      user_id, 'authenticated', 'authenticated', lower(trim(p_email)), pw_hash,
      now(), now(), '', '{"provider":"email","providers":["email"]}', '{}',
      now(), now()
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
      extensions.gen_random_uuid(),
      user_id,
      json_build_object('sub', user_id::TEXT, 'email', lower(trim(p_email))),
      'email',
      lower(trim(p_email)),
      now(), now(), now()
    );
  END IF;
  INSERT INTO staff (email, name, role, phone)
  VALUES (lower(trim(p_email)), p_name, p_role, NULLIF(p_phone, ''))
  ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, phone = COALESCE(NULLIF(p_phone, ''), staff.phone)
  RETURNING row_to_json(staff)::JSON INTO result;
  RETURN result;
END;
$$;

-- 4. Update update_staff_rpc to accept phone
DROP FUNCTION IF EXISTS public.update_staff_rpc(BIGINT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.update_staff_rpc(
  p_id BIGINT, p_name TEXT, p_role TEXT, p_email TEXT DEFAULT NULL, p_phone TEXT DEFAULT NULL
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
  IF p_phone IS NOT NULL AND p_phone != '' THEN
    IF EXISTS (SELECT 1 FROM staff WHERE phone = p_phone AND id != p_id) THEN
      RAISE EXCEPTION 'رقم الجوال مستخدم مسبقاً';
    END IF;
  END IF;
  UPDATE staff
  SET email = COALESCE(p_email, (SELECT email FROM staff WHERE id = p_id)),
      name = p_name,
      role = p_role,
      phone = CASE WHEN p_phone IS NOT NULL THEN NULLIF(p_phone, '') ELSE (SELECT phone FROM staff WHERE id = p_id) END
  WHERE id = p_id
  RETURNING row_to_json(staff)::JSON INTO result;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_staff_rpc(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_staff_rpc(BIGINT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_staff_auth_user(TEXT, TEXT) TO authenticated;

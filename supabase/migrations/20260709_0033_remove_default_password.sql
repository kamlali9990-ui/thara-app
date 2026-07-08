-- تغيير create_staff_rpc: إزالة p_password + توليد باسورد عشوائي
-- لمنع ظهور كلمة المرور الافتراضية في كود JS (VITE_ prefix)

DROP FUNCTION IF EXISTS public.create_staff_rpc(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_staff_rpc(TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.create_staff_rpc(
  p_email TEXT, p_name TEXT, p_role TEXT, p_phone TEXT DEFAULT NULL
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
  generated_pw TEXT;
BEGIN
  IF NOT public.is_staff(ARRAY['admin']) THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;
  IF p_phone IS NOT NULL AND p_phone != '' THEN
    IF EXISTS (SELECT 1 FROM staff WHERE phone = p_phone) THEN
      RAISE EXCEPTION 'رقم الجوال مستخدم مسبقاً';
    END IF;
  END IF;

  generated_pw := encode(extensions.gen_random_bytes(6), 'hex');

  SELECT id INTO user_id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;
  IF user_id IS NULL THEN
    pw_hash := extensions.crypt(generated_pw, extensions.gen_salt('bf'));
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
  RETURN json_build_object('staff', result, 'password', generated_pw);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_staff_rpc TO authenticated;

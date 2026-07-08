-- =============================================
-- تشديد الأمان: سد الثغرات الأمنية الحرجة
-- =============================================

-- 1. إزالة DEFAULT '123456' من confirm_auth_user
DROP FUNCTION IF EXISTS public.confirm_auth_user(TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.confirm_auth_user(p_email TEXT, p_password TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  user_id UUID;
  pw_hash TEXT;
BEGIN
  pw_hash := extensions.crypt(p_password, extensions.gen_salt('bf', 10));
  SELECT id INTO user_id FROM auth.users WHERE email = p_email;
  IF user_id IS NULL THEN
    user_id := extensions.gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_sent_at, confirmation_token,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      user_id, 'authenticated', 'authenticated', p_email,
      pw_hash,
      now(), now(), NULL, '{"provider":"email","providers":["email"]}',
      jsonb_build_object('sub', user_id::TEXT, 'email', p_email, 'email_verified', true, 'phone_verified', false),
      now(), now(),
      '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
      extensions.gen_random_uuid(),
      user_id,
      jsonb_build_object('sub', user_id::TEXT, 'email', p_email, 'email_verified', true, 'phone_verified', false),
      'email',
      user_id::TEXT,
      now(), now(), now()
    );
  ELSE
    UPDATE auth.users SET email_confirmed_at = COALESCE(email_confirmed_at, now()), encrypted_password = pw_hash WHERE id = user_id;
  END IF;
  RETURN json_build_object('id', user_id, 'email', p_email);
END;
$$;
GRANT EXECUTE ON FUNCTION public.confirm_auth_user TO authenticated;

-- 2. تشديد ensure_staff_auth_user: إنشاء فقط إن لم يوجد, لا يمكن تعديل كلمة مرور موجودة
CREATE OR REPLACE FUNCTION public.ensure_staff_auth_user(p_identifier TEXT, p_password TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  found_email TEXT;
  existing_user_id UUID;
BEGIN
  SELECT email INTO found_email FROM staff WHERE lower(email) = lower(p_identifier) OR phone = p_identifier LIMIT 1;
  IF found_email IS NULL THEN
    RETURN json_build_object('staff_exists', false, 'fixed', false);
  END IF;
  SELECT id INTO existing_user_id FROM auth.users WHERE email = found_email LIMIT 1;
  IF existing_user_id IS NOT NULL THEN
    RETURN json_build_object('staff_exists', true, 'fixed', false, 'reason', 'auth user already exists — use admin panel to reset password');
  END IF;
  RETURN json_build_object('staff_exists', true, 'fixed', true, 'user', public.confirm_auth_user(found_email, p_password));
END;
$$;
GRANT EXECUTE ON FUNCTION public.ensure_staff_auth_user TO anon, authenticated;

-- 3. تشديد create_customer_session_rpc: السماح بإنشاء جلسة فقط خلال 5 دقائق من تسجيل الحساب
CREATE OR REPLACE FUNCTION public.create_customer_session_rpc(p_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id UUID;
  v_created_at TIMESTAMPTZ;
  v_session_id UUID;
  v_refresh_token TEXT;
BEGIN
  SELECT id, created_at INTO v_user_id, v_created_at FROM auth.users WHERE lower(email) = lower(trim(p_email)) LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  IF now() - v_created_at > interval '5 minutes' THEN
    RAISE EXCEPTION 'Session can only be created within 5 minutes of signup — use normal login';
  END IF;
  v_session_id := extensions.gen_random_uuid();
  INSERT INTO auth.sessions (id, user_id, created_at, updated_at, factor_id, aal)
  VALUES (v_session_id, v_user_id, now(), now(), extensions.gen_random_uuid(), 'aal1');
  v_refresh_token := extensions.gen_random_uuid()::TEXT;
  INSERT INTO auth.refresh_tokens (instance_id, token, user_id, revoked, created_at, updated_at, session_id)
  VALUES ('00000000-0000-0000-0000-000000000000', v_refresh_token, v_user_id, false, now(), now(), v_session_id);
  RETURN json_build_object('refresh_token', v_refresh_token, 'user_id', v_user_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_customer_session_rpc TO anon, authenticated;

-- 4. تقييد صلاحيات ALL على الجداول إلى SELECT, INSERT, UPDATE, DELETE فقط
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

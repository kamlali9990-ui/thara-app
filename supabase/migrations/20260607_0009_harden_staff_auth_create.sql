-- =============================================
-- أمان: نقل إنشاء حساب الموظف إلى RPC + إزالة anon
-- =============================================

-- 0. حذف الدالة القديمة (3 باراميترات) لتجنب التضارب
DROP FUNCTION IF EXISTS public.create_staff_rpc(TEXT, TEXT, TEXT);

-- 1. تحديث create_staff_rpc ليشمل إنشاء auth user تلقائياً
-- لم يعد بحاجة لـ signUp + confirm_auth_user من الواجهة
CREATE OR REPLACE FUNCTION public.create_staff_rpc(
  p_email TEXT, p_name TEXT, p_role TEXT, p_password TEXT DEFAULT '123456'
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

  INSERT INTO staff (email, name, role)
  VALUES (lower(trim(p_email)), p_name, p_role)
  ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role
  RETURNING row_to_json(staff)::JSON INTO result;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_staff_rpc(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- 2. إزالة صلاحية anon + public عن ensure_staff_auth_user
-- هذه الدالة تعيد تعيين كلمة المرور لأي موظف — فقط الموظفون الذين سجلوا دخولاً يستخدمونها
REVOKE EXECUTE ON FUNCTION public.ensure_staff_auth_user FROM anon;
REVOKE EXECUTE ON FUNCTION public.ensure_staff_auth_user FROM public;

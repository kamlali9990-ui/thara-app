-- تصليح المشكلة: GoTrue 500 "Database error querying schema"
-- السبب: provider_id = email (يجب UUID) وقيم NULL لبعض الأعمدة
-- حل لمستخدمي RPC الحاليين لجعلهم متوافقين مع GoTrue

-- 1. تصليح المستخدمين الحاليين (قيم NULL → '')
UPDATE auth.users
SET email_change = COALESCE(email_change, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    recovery_token = COALESCE(recovery_token, ''),
    confirmation_token = COALESCE(confirmation_token, '')
WHERE email LIKE 'p%@thara.app';

-- 2. تصليح identities (provider_id = UUID بدل email)
UPDATE auth.identities i
SET provider_id = i.user_id::TEXT,
    identity_data = jsonb_build_object('sub', i.user_id::TEXT, 'email', i.identity_data->>'email', 'email_verified', true, 'phone_verified', false)
WHERE i.provider = 'email'
  AND i.provider_id != i.user_id::TEXT
  AND i.user_id IN (SELECT id FROM auth.users WHERE email LIKE 'p%@thara.app');

-- 3. تحديث create_customer_auth_rpc
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
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = clean_email LIMIT 1;
  IF v_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'User already registered';
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
    now(), now(), NULL, '{"provider":"email","providers":["email"]}', meta,
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
  RETURN json_build_object('id', v_user_id, 'email', clean_email);
END;
$$;

-- 4. تحديث confirm_auth_user (للموظفين)
CREATE OR REPLACE FUNCTION public.confirm_auth_user(p_email TEXT, p_password TEXT DEFAULT '123456')
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

GRANT EXECUTE ON FUNCTION public.create_customer_auth_rpc TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_auth_user TO authenticated;

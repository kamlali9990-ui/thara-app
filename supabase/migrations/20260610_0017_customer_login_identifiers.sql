-- =====================================================
-- إضافة اسم المستخدم (username) وجعله وفهم فريدين
-- السماح بتسجيل الدخول بـ: البريد / رقم الجوال / اسم المستخدم / رقم العميل
-- =====================================================

-- 1. إضافة عمود username إلى جدول العملاء
ALTER TABLE customers ADD COLUMN IF NOT EXISTS username TEXT;

-- 2. جعل phone فريداً على مستوى قاعدة البيانات
-- حذف التكرارات أولاً إن وجدت (الاحتفاظ بأحدث سجل لكل رقم)
DELETE FROM customers a USING (
  SELECT MIN(id) as id, phone FROM customers GROUP BY phone HAVING COUNT(*) > 1
) b WHERE a.phone = b.phone AND a.id != b.id;
CREATE UNIQUE INDEX IF NOT EXISTS customers_phone_unique ON customers(phone) WHERE phone IS NOT NULL AND phone != '';

-- 3. جعل username فريداً
CREATE UNIQUE INDEX IF NOT EXISTS customers_username_unique ON customers(lower(username)) WHERE username IS NOT NULL;

-- 4. تحديث create_customer_rpc لدعم username
CREATE OR REPLACE FUNCTION public.create_customer_rpc(p_email TEXT, p_name TEXT, p_phone TEXT, p_username TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- التحقق من تكرار رقم الجوال
  IF p_phone IS NOT NULL AND p_phone != '' THEN
    IF EXISTS (SELECT 1 FROM customers WHERE phone = p_phone AND email != p_email) THEN
      RAISE EXCEPTION 'رقم الجوال مستخدم مسبقاً';
    END IF;
  END IF;
  -- التحقق من تكرار اسم المستخدم
  IF p_username IS NOT NULL AND p_username != '' THEN
    IF EXISTS (SELECT 1 FROM customers WHERE lower(username) = lower(p_username) AND email != p_email) THEN
      RAISE EXCEPTION 'اسم المستخدم مستخدم مسبقاً';
    END IF;
  END IF;
  INSERT INTO customers (email, name, phone, username)
  VALUES (p_email, p_name, p_phone, p_username)
  ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone, username = COALESCE(EXCLUDED.username, customers.username)
  RETURNING row_to_json(customers)::JSON INTO result;
  RETURN result;
END;
$$;

-- 5. تحديث create_customer_auth_rpc لتخزين username في metadata
CREATE OR REPLACE FUNCTION public.create_customer_auth_rpc(p_email TEXT, p_password TEXT, p_username TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  user_id UUID;
  identity_id UUID;
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

  SELECT id INTO user_id FROM auth.users WHERE lower(email) = clean_email LIMIT 1;
  IF user_id IS NOT NULL THEN
    RAISE EXCEPTION 'User already registered';
  END IF;

  pw_hash := extensions.crypt(p_password, extensions.gen_salt('bf'));
  user_id := extensions.gen_random_uuid();
  meta := jsonb_build_object('username', p_username);

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_sent_at, confirmation_token,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    user_id, 'authenticated', 'authenticated', clean_email, pw_hash,
    now(), now(), '', '{"provider":"email","providers":["email"]}', meta,
    now(), now()
  );

  SELECT i.id INTO identity_id
  FROM auth.identities i
  WHERE i.user_id = user_id AND i.provider = 'email'
  LIMIT 1;

  IF identity_id IS NULL THEN
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
      extensions.gen_random_uuid(),
      user_id,
      json_build_object('sub', user_id::TEXT, 'email', clean_email),
      'email',
      clean_email,
      now(), now(), now()
    );
  END IF;

  RETURN json_build_object('id', user_id, 'email', clean_email);
END;
$$;

-- 6. تحديث get_customer_rpc ليشمل username
CREATE OR REPLACE FUNCTION public.get_customer_rpc(p_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  caller_email TEXT;
BEGIN
  caller_email := lower(auth.jwt() ->> 'email');
  IF caller_email != lower(p_email) AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  SELECT row_to_json(c)::JSON INTO result FROM customers c WHERE c.email = p_email;
  RETURN result;
END;
$$;

-- 7. تحديث update_customer_rpc ليشمل username
CREATE OR REPLACE FUNCTION public.update_customer_rpc(
  p_email TEXT,
  p_name TEXT,
  p_phone TEXT,
  p_delivery_address TEXT DEFAULT NULL,
  p_neighborhood TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_username TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  caller_email TEXT;
BEGIN
  caller_email := lower(auth.jwt() ->> 'email');
  IF caller_email != lower(p_email) AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_phone IS NOT NULL AND p_phone != '' THEN
    IF EXISTS (SELECT 1 FROM customers WHERE phone = p_phone AND email != p_email) THEN
      RAISE EXCEPTION 'رقم الجوال مستخدم مسبقاً';
    END IF;
  END IF;
  IF p_username IS NOT NULL AND p_username != '' THEN
    IF EXISTS (SELECT 1 FROM customers WHERE lower(username) = lower(p_username) AND email != p_email) THEN
      RAISE EXCEPTION 'اسم المستخدم مستخدم مسبقاً';
    END IF;
  END IF;
  UPDATE customers SET
    name = COALESCE(p_name, name),
    phone = COALESCE(p_phone, phone),
    delivery_address = COALESCE(p_delivery_address, delivery_address),
    neighborhood = COALESCE(p_neighborhood, neighborhood),
    location = COALESCE(p_location, location),
    username = COALESCE(p_username, username)
  WHERE email = p_email
  RETURNING row_to_json(customers)::JSON INTO result;
  RETURN result;
END;
$$;

-- 8. RPC: حل أي معرف إلى البريد الإلكتروني لتسجيل الدخول
-- يقبل: البريد / رقم الجوال / اسم المستخدم / رقم العميل
CREATE OR REPLACE FUNCTION public.resolve_customer_login(p_identifier TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_email TEXT;
  normalized_iden TEXT;
BEGIN
  normalized_iden := lower(trim(p_identifier));

  -- محاولة إيجاد العميل بأي من المعرّفات
  SELECT email INTO found_email FROM customers
  WHERE email = normalized_iden
     OR phone = p_identifier
     OR lower(username) = normalized_iden
     OR CAST(id AS TEXT) = normalized_iden
  LIMIT 1;

  RETURN found_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_customer_login TO anon, authenticated;

-- 9. إعادة إنشاء list_customers_rpc (المحذوفة سابقاً)
CREATE OR REPLACE FUNCTION public.list_customers_rpc()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Staff only';
  END IF;
  SELECT COALESCE(json_agg(row_to_json(c) ORDER BY c.created_at DESC), '[]'::JSON)
  INTO result FROM customers c;
  RETURN result;
END;
$$;

-- 10. منح الصلاحيات للـ RPCs المحدثة
GRANT EXECUTE ON FUNCTION public.create_customer_rpc TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_rpc TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_customer_rpc TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_customer_auth_rpc TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_customers_rpc TO authenticated;

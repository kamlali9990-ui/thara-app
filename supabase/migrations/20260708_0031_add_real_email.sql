-- =============================================
-- إضافة دعم البريد الإلكتروني الحقيقي لاستعادة كلمة المرور
-- =============================================

-- 1. إضافة عمود real_email لجدول customers (nullable للتوافق مع الحسابات القديمة)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS real_email TEXT;
CREATE INDEX IF NOT EXISTS idx_customers_real_email ON customers(real_email);

-- 2. تحديث دالة create_customer_rpc لدعم real_email (مع الإبقاء على p_username للتوافق)
DROP FUNCTION IF EXISTS public.create_customer_rpc(TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.create_customer_rpc(
  p_email TEXT,
  p_name TEXT,
  p_phone TEXT,
  p_username TEXT DEFAULT NULL,
  p_real_email TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  IF p_phone IS NOT NULL AND p_phone != '' THEN
    IF EXISTS (SELECT 1 FROM customers WHERE phone = p_phone AND email != p_email) THEN
      RAISE EXCEPTION 'رقم الجوال مستخدم مسبقاً';
    END IF;
  END IF;
  INSERT INTO customers (email, name, phone, username, real_email)
  VALUES (p_email, p_name, p_phone, NULLIF(TRIM(COALESCE(p_username, '')), ''), NULLIF(TRIM(COALESCE(p_real_email, '')), ''))
  ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    username = COALESCE(NULLIF(TRIM(COALESCE(EXCLUDED.username, '')), ''), customers.username),
    real_email = COALESCE(NULLIF(TRIM(COALESCE(EXCLUDED.real_email, '')), ''), customers.real_email)
  RETURNING row_to_json(customers)::JSON INTO result;
  RETURN result;
END;
$$;

-- 3. تحديث دالة update_customer_rpc لدعم real_email
DROP FUNCTION IF EXISTS public.update_customer_rpc(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.update_customer_rpc(
  p_email TEXT,
  p_name TEXT,
  p_phone TEXT,
  p_delivery_address TEXT DEFAULT NULL,
  p_neighborhood TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_username TEXT DEFAULT NULL,
  p_real_email TEXT DEFAULT NULL
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
  UPDATE customers SET
    name = COALESCE(p_name, name),
    phone = COALESCE(p_phone, phone),
    delivery_address = COALESCE(p_delivery_address, delivery_address),
    neighborhood = COALESCE(p_neighborhood, neighborhood),
    location = COALESCE(p_location, location),
    username = COALESCE(p_username, username),
    real_email = CASE
      WHEN p_real_email IS NOT NULL THEN NULLIF(TRIM(p_real_email), '')
      ELSE real_email
    END
  WHERE email = p_email
  RETURNING row_to_json(customers)::JSON INTO result;
  RETURN result;
END;
$$;

-- 4. تحديث دالة resolve_customer_login لدعم real_email
DROP FUNCTION IF EXISTS public.resolve_customer_login(TEXT);
CREATE OR REPLACE FUNCTION public.resolve_customer_login(p_identifier TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_auth_email TEXT;
  normalized_iden TEXT;
BEGIN
  normalized_iden := lower(trim(p_identifier));

  SELECT COALESCE(real_email, email) INTO found_auth_email FROM customers
  WHERE email = normalized_iden
     OR phone = p_identifier
     OR lower(username) = normalized_iden
     OR lower(real_email) = normalized_iden
     OR CAST(id AS TEXT) = normalized_iden
  LIMIT 1;

  RETURN found_auth_email;
END;
$$;

-- 5. إنشاء دالة للبحث عن العميل بواسطة البريد الإلكتروني الحقيقي (لصفحة نسيت كلمة المرور)
CREATE OR REPLACE FUNCTION public.find_customer_by_real_email_rpc(p_real_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_auth_email TEXT;
BEGIN
  SELECT COALESCE(real_email, email) INTO found_auth_email FROM customers
  WHERE lower(real_email) = lower(trim(p_real_email))
  LIMIT 1;
  RETURN found_auth_email;
END;
$$;

-- 6. إنشاء دالة لإعادة تعيين كلمة المرور مباشرة (للمسؤول)
CREATE OR REPLACE FUNCTION public.admin_reset_customer_password_rpc(p_customer_email TEXT, p_new_password TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id UUID;
  pw_hash TEXT;
BEGIN
  IF NOT public.is_staff(ARRAY['admin']) THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(trim(p_customer_email)) LIMIT 1;
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'المستخدم غير موجود');
  END IF;

  pw_hash := extensions.crypt(p_new_password, extensions.gen_salt('bf', 10));
  UPDATE auth.users SET encrypted_password = pw_hash, updated_at = now() WHERE id = v_user_id;

  RETURN json_build_object('success', true, 'email', lower(trim(p_customer_email)));
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_customer_rpc TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_customer_rpc TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_customer_login TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_customer_by_real_email_rpc TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_customer_password_rpc TO authenticated;

-- =============================================
-- Supabase Schema: ثراء الشرق ون
-- Run this in Supabase SQL Editor
-- =============================================

-- 0. Staff / Admin users table
CREATE TABLE IF NOT EXISTS staff (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'employee', 'driver')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO staff (email, name, role)
VALUES ('admin@example.com', 'Admin', 'admin')
ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO staff (email, name, role)
VALUES ('yaser.haroon79@gmail.com', 'مدير', 'admin')
ON CONFLICT (email) DO UPDATE SET role = 'admin';

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_staff_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM staff WHERE lower(email) = lower(auth.jwt() ->> 'email') LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_staff(allowed_roles TEXT[] DEFAULT ARRAY['admin', 'manager', 'employee'])
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.current_staff_role() = ANY(allowed_roles), FALSE);
$$;

GRANT EXECUTE ON FUNCTION public.current_staff_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff TO authenticated;

-- RPC bypass RLS لجلب بيانات الموظفين للواجهة
CREATE OR REPLACE FUNCTION public.get_staff_by_email_rpc(target_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  caller_email TEXT;
  target_lower TEXT;
BEGIN
  caller_email := lower(auth.jwt() ->> 'email');
  target_lower := lower(target_email);
  IF caller_email IS NULL OR NOT (public.is_staff() OR caller_email = target_lower) THEN
    RETURN NULL;
  END IF;
  SELECT row_to_json(s)::JSON INTO result FROM staff s WHERE lower(s.email) = target_lower LIMIT 1;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_staff_rpc()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN COALESCE(
    (SELECT json_agg(row_to_json(s) ORDER BY s.created_at DESC) FROM staff s),
    '[]'::JSON
  );
END;
$$;

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

CREATE OR REPLACE FUNCTION public.delete_staff_rpc(p_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff(ARRAY['admin']) THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;
  DELETE FROM staff WHERE id = p_id;
END;
$$;

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

GRANT EXECUTE ON FUNCTION public.confirm_auth_user TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_staff_by_email_rpc TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_staff_rpc TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_staff_rpc TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_staff_rpc TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_staff_rpc TO authenticated;

DROP POLICY IF EXISTS "staff_select_admin" ON staff;
DROP POLICY IF EXISTS "staff_insert_admin" ON staff;
DROP POLICY IF EXISTS "staff_update_admin" ON staff;
DROP POLICY IF EXISTS "staff_delete_admin" ON staff;
DROP POLICY IF EXISTS "staff_select_staff" ON staff;

CREATE POLICY "staff_select_staff" ON staff
  FOR SELECT USING (public.is_staff());

CREATE POLICY "staff_insert_admin" ON staff
  FOR INSERT WITH CHECK (public.is_staff(ARRAY['admin']));

CREATE POLICY "staff_update_admin" ON staff
  FOR UPDATE USING (public.is_staff(ARRAY['admin']));

CREATE POLICY "staff_delete_admin" ON staff
  FOR DELETE USING (public.is_staff(ARRAY['admin']));

-- 1. Customers
CREATE TABLE IF NOT EXISTS customers (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  delivery_address TEXT DEFAULT '',
  neighborhood TEXT DEFAULT '',
  location TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Customer can read/update own record
DROP POLICY IF EXISTS "customers_select_self" ON customers;
CREATE POLICY "customers_select_self" ON customers
  FOR SELECT USING (auth.jwt() ->> 'email' = email);

DROP POLICY IF EXISTS "customers_insert_self" ON customers;
CREATE POLICY "customers_insert_self" ON customers
  FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = email);

DROP POLICY IF EXISTS "customers_update_self" ON customers;
CREATE POLICY "customers_update_self" ON customers
  FOR UPDATE USING (auth.jwt() ->> 'email' = email);

-- Staff can read all customers
DROP POLICY IF EXISTS "customers_select_staff" ON customers;
CREATE POLICY "customers_select_staff" ON customers
  FOR SELECT USING (public.is_staff());

-- Explicitly deny all deletes
DROP POLICY IF EXISTS "customers_delete_deny" ON customers;
CREATE POLICY "customers_delete_deny" ON customers
  FOR DELETE USING (false);

-- RPC bypass RLS للتسجيل — ينشئ سجل عميل بعد الاشتراك
CREATE OR REPLACE FUNCTION public.create_customer_rpc(p_email TEXT, p_name TEXT, p_phone TEXT)
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
  INSERT INTO customers (email, name, phone)
  VALUES (p_email, p_name, p_phone)
  ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone
  RETURNING row_to_json(customers)::JSON INTO result;
  RETURN result;
END;
$$;

-- Direct signup without email confirmation (matches requested UX)
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
    now(), now(), '', '{"provider":"email","providers":["email"]}', meta,
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

-- Session RPC لتجنب GoTrue signInWithPassword (400 error)
CREATE OR REPLACE FUNCTION public.create_customer_session_rpc(p_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id UUID;
  v_session_id UUID;
  v_refresh_token TEXT;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(trim(p_email)) LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
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

CREATE OR REPLACE FUNCTION public.update_customer_rpc(
  p_email TEXT,
  p_name TEXT,
  p_phone TEXT,
  p_delivery_address TEXT DEFAULT NULL,
  p_neighborhood TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL
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
    location = COALESCE(p_location, location)
  WHERE email = p_email
  RETURNING row_to_json(customers)::JSON INTO result;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_customer_rpc TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_rpc TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_customer_rpc TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_customer_auth_rpc TO anon, authenticated;

-- RPC لتأكيد البريد الإلكتروني (حل مشكلة 500 في goTrue)
CREATE OR REPLACE FUNCTION public.confirm_email_rpc(p_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(trim(p_email)) LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  UPDATE auth.users SET email_confirmed_at = COALESCE(email_confirmed_at, now()) WHERE id = v_user_id;
  RETURN json_build_object('id', v_user_id, 'email', lower(trim(p_email)));
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_email_rpc TO authenticated;
REVOKE EXECUTE ON FUNCTION public.confirm_email_rpc FROM anon;
REVOKE EXECUTE ON FUNCTION public.confirm_email_rpc FROM public;

-- Customer address fields: add columns if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='delivery_address') THEN
    ALTER TABLE customers ADD COLUMN delivery_address TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='neighborhood') THEN
    ALTER TABLE customers ADD COLUMN neighborhood TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='location') THEN
    ALTER TABLE customers ADD COLUMN location TEXT DEFAULT '';
  END IF;
END $$;

-- Loyalty: add column if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='loyalty_points') THEN
    ALTER TABLE customers ADD COLUMN loyalty_points INTEGER DEFAULT 0;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.add_loyalty_points_rpc(p_email TEXT, p_points INTEGER)
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
  IF p_points IS NULL OR p_points <= 0 THEN
    RAISE EXCEPTION 'Invalid points value';
  END IF;
  UPDATE customers
  SET loyalty_points = COALESCE(loyalty_points, 0) + p_points
  WHERE email = p_email
  RETURNING row_to_json(customers)::JSON INTO result;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_loyalty_points_rpc TO authenticated;

-- List all customers (staff only)
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
GRANT EXECUTE ON FUNCTION public.list_customers_rpc TO authenticated;

-- 2. Categories
CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Public read access
DROP POLICY IF EXISTS "categories_select_public" ON categories;
CREATE POLICY "categories_select_public" ON categories
  FOR SELECT USING (true);

-- Staff write access
DROP POLICY IF EXISTS "categories_insert_admin" ON categories;
CREATE POLICY "categories_insert_admin" ON categories
  FOR INSERT WITH CHECK (public.is_staff(ARRAY['admin', 'manager']));

DROP POLICY IF EXISTS "categories_update_admin" ON categories;
CREATE POLICY "categories_update_admin" ON categories
  FOR UPDATE USING (public.is_staff(ARRAY['admin', 'manager']));

DROP POLICY IF EXISTS "categories_delete_admin" ON categories;
CREATE POLICY "categories_delete_admin" ON categories
  FOR DELETE USING (public.is_staff(ARRAY['admin']));

INSERT INTO categories (name) VALUES
  ('الكل'), ('العروض'),
  ('مواد غذائية'), ('منظفات'), ('إلكترونيات'), ('أواني'),
  ('مكسرات وبهارات'), ('خضروات وفواكه'), ('ألعاب'),
  ('مجموعة الأصناف'), ('ملابس'), ('مواد البناء'), ('العطور')
ON CONFLICT (name) DO NOTHING;

-- 3. Products
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  offer_price DECIMAL(10,2),
  is_offer BOOLEAN DEFAULT FALSE,
  image_url TEXT,
  stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
  unit TEXT DEFAULT 'حبة',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Public read access
DROP POLICY IF EXISTS "products_select_public" ON products;
CREATE POLICY "products_select_public" ON products
  FOR SELECT USING (true);

-- Staff write access
DROP POLICY IF EXISTS "products_insert_admin" ON products;
CREATE POLICY "products_insert_admin" ON products
  FOR INSERT WITH CHECK (public.is_staff(ARRAY['admin', 'manager']));

DROP POLICY IF EXISTS "products_update_admin" ON products;
CREATE POLICY "products_update_admin" ON products
  FOR UPDATE USING (public.is_staff(ARRAY['admin', 'manager']));

DROP POLICY IF EXISTS "products_delete_admin" ON products;
CREATE POLICY "products_delete_admin" ON products
  FOR DELETE USING (public.is_staff(ARRAY['admin']));

-- 4. Orders
CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  customer_email TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'جديد' CHECK (status IN ('جديد', 'قيد التحضير', 'جاهز للتوصيل', 'في الطريق', 'مكتمل', 'ملغي')),
  payment_method TEXT,
  phone TEXT,
  notes TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Anyone can insert an order (no auth required for customers)
-- but must provide required fields
DROP POLICY IF EXISTS "orders_insert_public" ON orders;
DROP POLICY IF EXISTS "orders_insert_authenticated" ON orders;
CREATE POLICY "orders_insert_authenticated" ON orders
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND phone IS NOT NULL AND phone != ''
    AND location IS NOT NULL AND location != ''
  );

-- Customers can read their own orders; staff can read/update all orders
DROP POLICY IF EXISTS "orders_select_admin" ON orders;
DROP POLICY IF EXISTS "orders_update_admin" ON orders;
DROP POLICY IF EXISTS "orders_select_staff_or_owner" ON orders;
DROP POLICY IF EXISTS "orders_update_staff" ON orders;

CREATE POLICY "orders_select_admin" ON orders
  FOR SELECT USING (
    public.is_staff()
    OR customer_email = auth.jwt() ->> 'email'
  );

CREATE POLICY "orders_update_admin" ON orders
  FOR UPDATE USING (public.is_staff());

ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;

-- Server-side price and fee validation: prices from DB, fee from location
-- Helper: radians
CREATE OR REPLACE FUNCTION public._radians(d NUMERIC)
RETURNS NUMERIC LANGUAGE sql IMMUTABLE AS $$ SELECT d * pi() / 180 $$;

-- Helper: haversine distance in KM
CREATE OR REPLACE FUNCTION public._haversine_km(
  lat1 NUMERIC, lng1 NUMERIC, lat2 NUMERIC, lng2 NUMERIC
)
RETURNS NUMERIC LANGUAGE sql IMMUTABLE AS $$
  SELECT 6371 * 2 * atan2(
    sqrt(sin((_radians(lat2)-_radians(lat1))/2)^2 + cos(_radians(lat1))*cos(_radians(lat2))*sin((_radians(lng2)-_radians(lng1))/2)^2),
    sqrt(1-(sin((_radians(lat2)-_radians(lat1))/2)^2 + cos(_radians(lat1))*cos(_radians(lat2))*sin((_radians(lng2)-_radians(lng1))/2)^2))
  );
$$;

-- Helper: parse location text (handles multiple formats)
DROP FUNCTION IF EXISTS public._parse_location(TEXT);
DROP FUNCTION IF EXISTS public._parse_location(TEXT);
CREATE OR REPLACE FUNCTION public._parse_location(loc TEXT)
RETURNS TABLE(lat NUMERIC, lng NUMERIC)
LANGUAGE sql IMMUTABLE AS $$
  WITH input AS (
    SELECT COALESCE(NULLIF(TRIM(loc), ''), '') AS s
  )
  SELECT
    CASE
      WHEN s ~* 'Lat:' THEN NULLIF(TRIM(SPLIT_PART(SPLIT_PART(s,'Lat:',2),',',1)),'')::NUMERIC
      WHEN s ~ '^[\(]?[\d\.\-]+[, ]+[\d\.\-]+[\)]?$' THEN
        NULLIF(TRIM(REPLACE(REPLACE(SPLIT_PART(s,',',1),'(',''),')','')),'')::NUMERIC
      WHEN s ~* '"lat"' OR s ~* '"lng"' OR s ~* '"latitude"' THEN (s::json ->> 'lat')::NUMERIC
      ELSE NULL
    END,
    CASE
      WHEN s ~* 'Lng:' THEN NULLIF(TRIM(SPLIT_PART(s,'Lng:',2)),'')::NUMERIC
      WHEN s ~ '^[\(]?[\d\.\-]+[, ]+[\d\.\-]+[\)]?$' THEN
        NULLIF(TRIM(REPLACE(REPLACE(SPLIT_PART(s,',',2),'(',''),')','')),'')::NUMERIC
      WHEN s ~* '"lng"' OR s ~* '"lon"' OR s ~* '"longitude"' THEN (s::json ->> 'lng')::NUMERIC
      ELSE NULL
    END
  FROM input WHERE s != '';
$$;

DROP FUNCTION IF EXISTS public.create_order_secure(JSONB, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT);

CREATE OR REPLACE FUNCTION public.create_order_secure(
  cart_items JSONB,
  payment_method TEXT,
  delivery_location TEXT,
  customer_phone TEXT DEFAULT NULL,
  order_notes TEXT DEFAULT NULL,
  delivery_fee NUMERIC DEFAULT NULL,
  delivery_address TEXT DEFAULT NULL
)
RETURNS orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_items JSONB;
  computed_total NUMERIC(10,2);
  final_fee NUMERIC(10,2);
  created_order orders;
  missing TEXT;
  clat NUMERIC; clng NUMERIC; dist_km NUMERIC; correct_fee NUMERIC;
BEGIN
  IF cart_items IS NULL OR jsonb_array_length(cart_items) = 0 THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;

  CREATE TEMP TABLE _requested ON COMMIT DROP AS
  SELECT (item->>'id')::BIGINT AS product_id,
         GREATEST(COALESCE((item->>'qty')::INT,1),1) AS qty
  FROM jsonb_array_elements(cart_items) AS item;

  WITH locked AS (
    SELECT p.id, p.stock_quantity, r.qty
    FROM _requested r JOIN products p ON p.id = r.product_id
    FOR UPDATE OF p
  )
  SELECT string_agg('المنتج رقم '||id::TEXT||' (الموجود: '||stock_quantity||', المطلوب: '||qty||')','; ')
  INTO missing FROM locked WHERE qty > stock_quantity;

  IF missing IS NOT NULL THEN
    DROP TABLE IF EXISTS _requested;
    RAISE EXCEPTION 'بعض المنتجات غير متوفرة بالكمية المطلوبة: %', missing;
  END IF;

  WITH priced AS (
    SELECT p.id, p.name, p.category, p.price, p.offer_price, p.is_offer,
           p.image_url, p.unit, r.qty,
           CASE WHEN p.is_offer AND p.offer_price IS NOT NULL THEN p.offer_price ELSE p.price END AS current_price
    FROM _requested r JOIN products p ON p.id = r.product_id
  )
  SELECT COALESCE(SUM(current_price * qty),0),
         COALESCE(jsonb_agg(jsonb_build_object(
           'id',id::TEXT,'name',name,'category',category,'price',price,
           'offerPrice',offer_price,'isOffer',is_offer,'imageUrl',image_url,
           'unit',unit,'qty',qty,'currentPrice',current_price)),'[]'::JSONB)
  INTO computed_total, clean_items FROM priced;

  IF jsonb_array_length(clean_items) = 0 THEN
    DROP TABLE IF EXISTS _requested;
    RAISE EXCEPTION 'No valid products in cart';
  END IF;

  -- Calculate delivery fee server-side from location
  SELECT lat, lng INTO clat, clng FROM _parse_location(delivery_location);
  IF clat IS NOT NULL AND clng IS NOT NULL THEN
    dist_km := _haversine_km(28.451345, 48.491709, clat, clng);
    correct_fee := CASE
      WHEN computed_total >= 100 THEN 0
      WHEN dist_km <= 3 THEN 5 WHEN dist_km <= 6 THEN 10
      WHEN dist_km <= 10 THEN 15 ELSE 20 END;
  ELSE
    correct_fee := CASE WHEN computed_total >= 100 THEN 0 ELSE 15 END;
  END IF;

  -- Ignore client fee, use server-calculated fee
  final_fee := correct_fee;

  INSERT INTO orders (customer_email, items, total, payment_method, phone, notes, location, delivery_address, delivery_fee)
  VALUES (auth.jwt() ->> 'email', clean_items, computed_total + final_fee,
          payment_method, customer_phone, order_notes, delivery_location, delivery_address, final_fee)
  RETURNING * INTO created_order;

  UPDATE products p SET stock_quantity = p.stock_quantity - r.qty
  FROM _requested r WHERE p.id = r.product_id;

  DROP TABLE IF EXISTS _requested;
  RETURN created_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order_secure(JSONB, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT) TO authenticated;

-- 5. Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  sender TEXT NOT NULL CHECK (sender IN ('customer', 'admin', 'driver')),
  text TEXT NOT NULL,
  order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  customer_email TEXT,
  sender_name TEXT,
  customer_phone TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read')),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS typing_events (
  id BIGSERIAL PRIMARY KEY,
  user_email TEXT NOT NULL,
  order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  is_typing BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_events ENABLE ROW LEVEL SECURITY;

-- Select policy: Staff can read all messages; Customers can only read messages belonging to their email, phone, or their orders
DROP POLICY IF EXISTS "chat_select_public" ON chat_messages;
DROP POLICY IF EXISTS "chat_select_policy" ON chat_messages;
CREATE POLICY "chat_select_policy" ON chat_messages
  FOR SELECT USING (
    public.is_staff(ARRAY['admin', 'manager', 'employee', 'driver'])
    OR lower(customer_email) = lower(auth.jwt() ->> 'email')
    OR (customer_phone IS NOT NULL AND customer_phone = (
      SELECT phone FROM customers WHERE lower(email) = lower(auth.jwt() ->> 'email') LIMIT 1
    ))
    OR (order_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM orders WHERE id = order_id AND (
        lower(orders.customer_email) = lower(auth.jwt() ->> 'email')
      )
    ))
  );

-- Insert policy: Staff can insert any message; Customers can insert if they are the sender and it matches their email or their orders
DROP POLICY IF EXISTS "chat_insert_public" ON chat_messages;
DROP POLICY IF EXISTS "chat_insert_policy" ON chat_messages;
CREATE POLICY "chat_insert_policy" ON chat_messages
  FOR INSERT WITH CHECK (
    public.is_staff(ARRAY['admin', 'manager', 'employee', 'driver'])
    OR (
      sender = 'customer' 
      AND (
        lower(customer_email) = lower(auth.jwt() ->> 'email')
        OR (order_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM orders WHERE id = order_id AND lower(orders.customer_email) = lower(auth.jwt() ->> 'email')
        ))
      )
    )
  );

-- Update policy: Staff can mark messages as read
DROP POLICY IF EXISTS "chat_update_policy" ON chat_messages;
CREATE POLICY "chat_update_policy" ON chat_messages
  FOR UPDATE USING (public.is_staff(ARRAY['admin', 'manager', 'employee', 'driver']))
  WITH CHECK (public.is_staff(ARRAY['admin', 'manager', 'employee', 'driver']));

-- Explicitly deny all deletes
DROP POLICY IF EXISTS "chat_messages_delete_deny" ON chat_messages;
CREATE POLICY "chat_messages_delete_deny" ON chat_messages
  FOR DELETE USING (false);

-- Typing events policies
DROP POLICY IF EXISTS "typing_select_policy" ON typing_events;
CREATE POLICY "typing_select_policy" ON typing_events
  FOR SELECT USING (
    public.is_staff(ARRAY['admin', 'manager', 'employee', 'driver'])
    OR lower(user_email) = lower(auth.jwt() ->> 'email')
  );

DROP POLICY IF EXISTS "typing_insert_policy" ON typing_events;
CREATE POLICY "typing_insert_policy" ON typing_events
  FOR INSERT WITH CHECK (
    public.is_staff(ARRAY['admin', 'manager', 'employee', 'driver'])
    OR lower(user_email) = lower(auth.jwt() ->> 'email')
  );

DROP POLICY IF EXISTS "typing_delete_policy" ON typing_events;
CREATE POLICY "typing_delete_policy" ON typing_events
  FOR DELETE USING (
    public.is_staff(ARRAY['admin', 'manager', 'employee', 'driver'])
    OR lower(user_email) = lower(auth.jwt() ->> 'email')
  );

-- =============================================
-- Driver assignment system + ETA + role-scoped order visibility
-- Mirrors scripts/driver-assignment-system.sql
-- =============================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_driver_id BIGINT REFERENCES staff(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.current_staff_id()
RETURNS BIGINT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM staff WHERE lower(email) = lower(auth.jwt() ->> 'email') LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.current_staff_id TO authenticated;

CREATE OR REPLACE FUNCTION public.list_drivers_rpc()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff(ARRAY['admin', 'manager', 'employee', 'driver']) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN COALESCE(
    (SELECT json_agg(row_to_json(s) ORDER BY s.name) FROM staff s WHERE s.role = 'driver'),
    '[]'::JSON
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.list_drivers_rpc TO authenticated;

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
GRANT EXECUTE ON FUNCTION public.assign_driver_to_order TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_order_rpc(p_order_id BIGINT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  driver_id BIGINT;
  driver_role TEXT;
  cur_status TEXT;
  cur_assigned BIGINT;
BEGIN
  SELECT id, role INTO driver_id, driver_role
  FROM staff WHERE lower(email) = lower(auth.jwt() ->> 'email') LIMIT 1;
  IF driver_role IS NULL OR driver_role != 'driver' THEN
    RAISE EXCEPTION 'Driver only';
  END IF;
  SELECT status, assigned_driver_id INTO cur_status, cur_assigned
  FROM orders WHERE id = p_order_id FOR UPDATE;
  IF cur_status IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  IF cur_assigned IS NOT NULL AND cur_assigned != driver_id THEN
    RAISE EXCEPTION 'Order is already assigned to another driver';
  END IF;
  IF cur_status NOT IN ('جديد', 'قيد التحضير', 'جاهز للتوصيل') THEN
    RAISE EXCEPTION 'Cannot claim this order in its current status';
  END IF;
  UPDATE orders
  SET assigned_driver_id = driver_id,
      status = CASE WHEN status = 'جاهز للتوصيل' THEN 'في الطريق' ELSE status END
  WHERE id = p_order_id
  RETURNING row_to_json(orders)::JSON INTO result;
  RETURN result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_order_rpc TO authenticated;

CREATE OR REPLACE FUNCTION public.update_order_status_rpc(
  p_order_id BIGINT,
  p_status TEXT,
  p_eta INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  caller_id BIGINT;
  caller_role TEXT;
  cur_assigned BIGINT;
  allowed BOOLEAN := FALSE;
BEGIN
  SELECT id, role INTO caller_id, caller_role
  FROM staff WHERE lower(email) = lower(auth.jwt() ->> 'email') LIMIT 1;
  IF caller_role IS NULL THEN
    RAISE EXCEPTION 'Staff only';
  END IF;
  SELECT assigned_driver_id INTO cur_assigned FROM orders WHERE id = p_order_id;
  IF caller_role IN ('admin', 'manager', 'employee') THEN
    allowed := TRUE;
  ELSIF caller_role = 'driver' AND cur_assigned = caller_id THEN
    allowed := TRUE;
  END IF;
  IF NOT allowed THEN
    RAISE EXCEPTION 'Unauthorized to update this order';
  END IF;
  UPDATE orders
  SET status = p_status,
      estimated_delivery = COALESCE(p_eta, estimated_delivery)
  WHERE id = p_order_id
  RETURNING row_to_json(orders)::JSON INTO result;
  RETURN result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.update_order_status_rpc TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_order_rpc(p_order_id BIGINT)
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
  DELETE FROM orders WHERE id = p_order_id RETURNING row_to_json(orders)::JSON INTO result;
  RETURN result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.delete_order_rpc TO authenticated;

DROP POLICY IF EXISTS "orders_select_admin" ON orders;
DROP POLICY IF EXISTS "orders_select_staff_or_owner" ON orders;
DROP POLICY IF EXISTS "orders_select_role_based" ON orders;
CREATE POLICY "orders_select_role_based" ON orders
  FOR SELECT USING (
    public.is_staff(ARRAY['admin', 'manager', 'employee'])
    OR (
      public.current_staff_role() = 'driver'
      AND (
        assigned_driver_id = public.current_staff_id()
        OR (assigned_driver_id IS NULL AND status IN ('جديد', 'قيد التحضير', 'جاهز للتوصيل'))
      )
    )
    OR customer_email = auth.jwt() ->> 'email'
  );

DROP POLICY IF EXISTS "orders_update_admin" ON orders;
DROP POLICY IF EXISTS "orders_update_staff" ON orders;
CREATE POLICY "orders_update_staff" ON orders
  FOR UPDATE USING (
    public.is_staff(ARRAY['admin', 'manager', 'employee'])
    OR (
      public.current_staff_role() = 'driver'
      AND assigned_driver_id = public.current_staff_id()
    )
  );

-- Explicitly deny all deletes
DROP POLICY IF EXISTS "orders_delete_deny" ON orders;
CREATE POLICY "orders_delete_deny" ON orders
  FOR DELETE USING (false);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE orders';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'typing_events'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE typing_events';
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- =============================================
-- Settings table (key-value store for app settings like banner_url)
-- =============================================
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "settings_select_all" ON settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "settings_insert_admin" ON settings;
DROP POLICY IF EXISTS "settings_update_admin" ON settings;
CREATE POLICY "settings_insert_admin" ON settings FOR INSERT WITH CHECK (public.is_staff(ARRAY['admin', 'manager']));
CREATE POLICY "settings_update_admin" ON settings FOR UPDATE USING (public.is_staff(ARRAY['admin', 'manager']));
CREATE POLICY IF NOT EXISTS "settings_delete_deny" ON settings FOR DELETE USING (false);
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS settings;

-- =============================================
-- Performance indexes
-- =============================================
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_driver_id ON orders(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_order_id ON chat_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_status ON chat_messages(status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_read_at ON chat_messages(read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_typing_events_user_email ON typing_events(user_email);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_staff_email_lower ON staff(lower(email));

-- =============================================
-- Auto-create customer profile on new auth user
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.staff WHERE lower(email) = lower(NEW.email)) THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.customers (email, name, phone)
  VALUES (
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  )
  ON CONFLICT (email) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Seed products — ⚠️ AUTO-GENERATED, DO NOT EDIT BY HAND
-- Source: src/data/products-data.json
-- To update: node scripts/generate-sql.js
-- @@SEED_START@@
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM products LIMIT 1) THEN
    INSERT INTO products (name, category, price, offer_price, is_offer, image_url, stock_quantity, unit) VALUES
  ('أرز مزة بسمتي أبو كاس (5 كجم)', 'مواد غذائية', 40, 32, TRUE, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80', 50, 'كيس'),
  ('سمن نباتي مازولا (2 لتر)', 'مواد غذائية', 25, NULL, FALSE, 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80', 30, 'علبة'),
  ('زيت ذرة عافية (1.5 لتر)', 'مواد غذائية', 18, NULL, FALSE, 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&q=80', 60, 'حبة'),
  ('زيت زيتون بكر عافية (500 مل)', 'مواد غذائية', 22, NULL, FALSE, 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=400&q=80', 25, 'زجاجة'),
  ('دقيق أبيض فاخر الوطنية (2 كجم)', 'مواد غذائية', 7.50, NULL, FALSE, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80', 70, 'كيس'),
  ('سكر أبيض ناعم السكر (2 كجم)', 'مواد غذائية', 6, NULL, FALSE, 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80', 80, 'كيس'),
  ('طحينة سمسم حلواني (500 جرام)', 'مواد غذائية', 12, NULL, FALSE, 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&q=80', 35, 'علبة'),
  ('عسل نحل جبلي شهي (500 جرام)', 'مواد غذائية', 45, 38, TRUE, 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=400&q=80', 20, 'علبة'),
  ('حليب نستله المكثف المحلى (397 جرام)', 'مواد غذائية', 8, NULL, FALSE, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80', 45, 'علبة'),
  ('زعتر فلسطيني خلطة (200 جرام)', 'مواد غذائية', 5, NULL, FALSE, 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80', 40, 'علبة'),
  ('بهارات مشكلة أبو جبل (150 جرام)', 'مواد غذائية', 6, NULL, FALSE, 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&q=80', 55, 'علبة'),
  ('معلقة هريسة سارينة (250 جرام)', 'مواد غذائية', 4, NULL, FALSE, 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=400&q=80', 30, 'علبة'),
  ('خل أبيض (1 لتر)', 'مواد غذائية', 3.50, NULL, FALSE, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80', 40, 'زجاجة'),
  ('مربى فراولة سارينة (350 جرام)', 'مواد غذائية', 7, NULL, FALSE, 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80', 30, 'علبة'),
  ('شوربة دجاج ماجي (24 مكعب)', 'مواد غذائية', 5.50, NULL, FALSE, 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&q=80', 50, 'علبة'),
  ('حليب المراعي طازج (2 لتر)', 'مواد غذائية', 11, NULL, FALSE, 'https://images.unsplash.com/photo-1550583724-b2692b85b4b7?w=400&q=80', 40, 'حبة'),
  ('حليب الصافي طازج (1 لتر)', 'مواد غذائية', 6.50, NULL, FALSE, 'https://images.unsplash.com/photo-1571212518306-3676b6b5f9f7?w=400&q=80', 50, 'حبة'),
  ('روب المراعي طازج (2 كجم)', 'مواد غذائية', 14, NULL, FALSE, 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&q=80', 30, 'علبة'),
  ('زبادي المراعي سادة (600 جرام)', 'مواد غذائية', 5.50, NULL, FALSE, 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&q=80', 45, 'علبة'),
  ('زبادي المراعي فراولة (600 جرام)', 'مواد غذائية', 6, NULL, FALSE, 'https://images.unsplash.com/photo-1550583724-b2692b85b4b7?w=400&q=80', 40, 'علبة'),
  ('جبنة بيضاء المراعي (500 جرام)', 'مواد غذائية', 10, NULL, FALSE, 'https://images.unsplash.com/photo-1571212518306-3676b6b5f9f7?w=400&q=80', 35, 'علبة'),
  ('جبنة كرافت تشيدر شرائح (200 جرام)', 'مواد غذائية', 8, NULL, FALSE, 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&q=80', 40, 'علبة'),
  ('جبنة كرافت تشيدر علب', 'مواد غذائية', 6.50, NULL, FALSE, 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&q=80', 50, 'علبة'),
  ('جبنة مثلثات المراعي (12 حبة)', 'مواد غذائية', 5, NULL, FALSE, 'https://images.unsplash.com/photo-1550583724-b2692b85b4b7?w=400&q=80', 60, 'علبة'),
  ('لبنة المراعي (500 جرام)', 'مواد غذائية', 10, NULL, FALSE, 'https://images.unsplash.com/photo-1571212518306-3676b6b5f9f7?w=400&q=80', 25, 'علبة'),
  ('بيض الوطنية (30 حبة)', 'مواد غذائية', 19, NULL, FALSE, 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&q=80', 25, 'طبق'),
  ('زبدة لورباك غير مملحة (200 جرام)', 'مواد غذائية', 14, 11, TRUE, 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&q=80', 20, 'علبة'),
  ('بيبسي كولا (6 × 330 مل)', 'مواد غذائية', 15, 12, TRUE, 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', 100, 'كرتون'),
  ('مياه نوفا (40 × 330 مل)', 'مواد غذائية', 18, NULL, FALSE, 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=400&q=80', 80, 'كرتون'),
  ('مياه بيرين (12 × 330 مل)', 'مواد غذائية', 8, NULL, FALSE, 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400&q=80', 60, 'كرتون'),
  ('مياه نوفا (12 × 1.5 لتر)', 'مواد غذائية', 14, NULL, FALSE, 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400&q=80', 50, 'كرتون'),
  ('كوكاكولا (6 × 330 مل)', 'مواد غذائية', 15, NULL, FALSE, 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', 90, 'كرتون'),
  ('سبرايت (6 × 330 مل)', 'مواد غذائية', 15, NULL, FALSE, 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=400&q=80', 70, 'كرتون'),
  ('عصير تانج برتقال (450 جرام)', 'مواد غذائية', 8.50, NULL, FALSE, 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400&q=80', 35, 'علبة'),
  ('عصير المراعي برتقال طازج (1 لتر)', 'مواد غذائية', 9, NULL, FALSE, 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400&q=80', 40, 'زجاجة'),
  ('عصير راني نكتار مانجو (1 لتر)', 'مواد غذائية', 9, NULL, FALSE, 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', 35, 'زجاجة'),
  ('شاي ليبتون العلامة الصفراء (100 كيس)', 'مواد غذائية', 16, NULL, FALSE, 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=400&q=80', 60, 'علبة'),
  ('شاي ربيع الذهبي (100 كيس)', 'مواد غذائية', 14, NULL, FALSE, 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400&q=80', 55, 'علبة'),
  ('قهوة نسكافيه كلاسيك (200 جرام)', 'مواد غذائية', 18, NULL, FALSE, 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400&q=80', 40, 'علبة'),
  ('قهوة عربية خولاني (250 جرام)', 'مواد غذائية', 12, NULL, FALSE, 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', 30, 'علبة'),
  ('هوت شوكلت نستله (300 جرام)', 'مواد غذائية', 12, NULL, FALSE, 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=400&q=80', 25, 'علبة'),
  ('حليب بودرة المراعي (2 كجم)', 'مواد غذائية', 32, NULL, FALSE, 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400&q=80', 20, 'علبة'),
  ('دجاج ساديا مجمد (1000 جرام)', 'مواد غذائية', 17.50, NULL, FALSE, 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&q=80', 45, 'حبة'),
  ('دجاج ساديا مجمد (1200 جرام)', 'مواد غذائية', 20, NULL, FALSE, 'https://images.unsplash.com/photo-1551028150-64b9f398f678?w=400&q=80', 40, 'حبة'),
  ('دجاج ساديا مجمد (900 جرام)', 'مواد غذائية', 15.50, NULL, FALSE, 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=400&q=80', 35, 'حبة'),
  ('أجنحة دجاج ساديا مجمدة (500 جرام)', 'مواد غذائية', 10, NULL, FALSE, 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400&q=80', 30, 'علبة'),
  ('كفتة لحم بقر طازجة (500 جرام)', 'مواد غذائية', 22, NULL, FALSE, 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&q=80', 20, 'علبة'),
  ('لحم مفروم بقر طازج (500 جرام)', 'مواد غذائية', 24, NULL, FALSE, 'https://images.unsplash.com/photo-1551028150-64b9f398f678?w=400&q=80', 25, 'علبة'),
  ('كباب لحم غنم طازج (500 جرام)', 'مواد غذائية', 38, 32, TRUE, 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=400&q=80', 15, 'علبة'),
  ('برجر بقر ساديا (6 حبات)', 'مواد غذائية', 18, NULL, FALSE, 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400&q=80', 35, 'علبة'),
  ('نقانق دجاج ساديا (500 جرام)', 'مواد غذائية', 12, NULL, FALSE, 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&q=80', 30, 'علبة'),
  ('خبز لوزين أبيض شرائح', 'مواد غذائية', 4, NULL, FALSE, 'https://images.unsplash.com/photo-1549937334-dbdb3b31c71d?w=400&q=80', 35, 'كيس'),
  ('خبز لوزين أسمر شرائح', 'مواد غذائية', 5, NULL, FALSE, 'https://images.unsplash.com/photo-1509365465985-25d11c17e812?w=400&q=80', 30, 'كيس'),
  ('خبز صامولي لوزين (8 حبات)', 'مواد غذائية', 4.50, NULL, FALSE, 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=400&q=80', 25, 'كيس'),
  ('خبز برجر لوزين (6 حبات)', 'مواد غذائية', 5, NULL, FALSE, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&q=80', 20, 'كيس'),
  ('خبز تورتيلا لوزين (10 حبات)', 'مواد غذائية', 7, NULL, FALSE, 'https://images.unsplash.com/photo-1549937334-dbdb3b31c71d?w=400&q=80', 25, 'كيس'),
  ('كروسان لوزين زبدة (4 حبات)', 'مواد غذائية', 6.50, NULL, FALSE, 'https://images.unsplash.com/photo-1509365465985-25d11c17e812?w=400&q=80', 20, 'كيس'),
  ('كيك يمني شهير (500 جرام)', 'مواد غذائية', 8, NULL, FALSE, 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=400&q=80', 15, 'علبة'),
  ('بسكويت شاي دايجستف (400 جرام)', 'مواد غذائية', 5, NULL, FALSE, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&q=80', 40, 'علبة'),
  ('بطاطس ليز بالملح (170 جرام)', 'مكسرات وبهارات', 7, NULL, FALSE, 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&q=80', 55, 'كيس'),
  ('بطاطس ليز جبنة (170 جرام)', 'مكسرات وبهارات', 7, NULL, FALSE, 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=400&q=80', 50, 'كيس'),
  ('بطاطس ليز كاتشب (170 جرام)', 'مكسرات وبهارات', 7, NULL, FALSE, 'https://images.unsplash.com/photo-1546955770-370040c0cc2a?w=400&q=80', 45, 'كيس'),
  ('بطاطس برينجلز أصلي (165 جرام)', 'مكسرات وبهارات', 10, NULL, FALSE, 'https://images.unsplash.com/photo-1590080875108-8872b6d4cdb9?w=400&q=80', 40, 'علبة'),
  ('شوكولاتة كيندر بونو (97 جرام)', 'مكسرات وبهارات', 6, NULL, FALSE, 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&q=80', 50, 'حبة'),
  ('شوكولاتة كيت كات (4 أصابع)', 'مكسرات وبهارات', 3.50, NULL, FALSE, 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=400&q=80', 60, 'حبة'),
  ('شوكولاتة سنيكرز (50 جرام)', 'مكسرات وبهارات', 3, NULL, FALSE, 'https://images.unsplash.com/photo-1546955770-370040c0cc2a?w=400&q=80', 70, 'حبة'),
  ('بسكويت أوريو (144 جرام)', 'مكسرات وبهارات', 5.50, NULL, FALSE, 'https://images.unsplash.com/photo-1590080875108-8872b6d4cdb9?w=400&q=80', 45, 'علبة'),
  ('مكسرات مشكلة وفرة (250 جرام)', 'مكسرات وبهارات', 15, 12, TRUE, 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&q=80', 30, 'علبة'),
  ('لوز ني (250 جرام)', 'مكسرات وبهارات', 18, NULL, FALSE, 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=400&q=80', 25, 'علبة'),
  ('فستق حلبي مملح (250 جرام)', 'مكسرات وبهارات', 22, NULL, FALSE, 'https://images.unsplash.com/photo-1546955770-370040c0cc2a?w=400&q=80', 20, 'علبة'),
  ('حمص شيبس (100 جرام)', 'مكسرات وبهارات', 3, NULL, FALSE, 'https://images.unsplash.com/photo-1590080875108-8872b6d4cdb9?w=400&q=80', 60, 'كيس'),
  ('فشار مايكرويف (100 جرام)', 'مكسرات وبهارات', 4, NULL, FALSE, 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&q=80', 35, 'كيس'),
  ('طماطم (1 كجم)', 'خضروات وفواكه', 4.50, NULL, FALSE, 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=400&q=80', 100, 'كجم'),
  ('بصل أبيض (1 كجم)', 'خضروات وفواكه', 3, NULL, FALSE, 'https://images.unsplash.com/photo-1582015728447-4735f2f18c3b?w=400&q=80', 100, 'كجم'),
  ('بطاطس (1 كجم)', 'خضروات وفواكه', 4, NULL, FALSE, 'https://images.unsplash.com/photo-1518977676601-b53f82c16c1b?w=400&q=80', 80, 'كجم'),
  ('خيار (1 كجم)', 'خضروات وفواكه', 3.50, NULL, FALSE, 'https://images.unsplash.com/photo-1582015728447-4735f2f18c3b?w=400&q=80', 60, 'كجم'),
  ('ليمون (1 كجم)', 'خضروات وفواكه', 5, NULL, FALSE, 'https://images.unsplash.com/photo-1595705510867-8cbf0e7cc1c6?w=400&q=80', 70, 'كجم'),
  ('تفاح أحمر فوجي (1 كجم)', 'خضروات وفواكه', 7, NULL, FALSE, 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&q=80', 50, 'كجم'),
  ('برتقال (1 كجم)', 'خضروات وفواكه', 5.50, NULL, FALSE, 'https://images.unsplash.com/photo-1547514701-42782101795e?w=400&q=80', 60, 'كجم'),
  ('موز (1 كجم)', 'خضروات وفواكه', 6, NULL, FALSE, 'https://images.unsplash.com/photo-1563822249366-3efb23b8e0c9?w=400&q=80', 55, 'كجم'),
  ('عنب أحمر (1 كجم)', 'خضروات وفواكه', 8, NULL, FALSE, 'https://images.unsplash.com/photo-1563185162-40c4a72edb95?w=400&q=80', 30, 'كجم'),
  ('باذنجان (1 كجم)', 'خضروات وفواكه', 4, NULL, FALSE, 'https://images.unsplash.com/photo-1615484477338-52c1e1d9c1c7?w=400&q=80', 40, 'كجم'),
  ('كوسا (1 كجم)', 'خضروات وفواكه', 4.50, NULL, FALSE, 'https://images.unsplash.com/photo-1590164891793-92badd4e88c1?w=400&q=80', 35, 'كجم'),
  ('جزر (1 كجم)', 'خضروات وفواكه', 3.50, NULL, FALSE, 'https://images.unsplash.com/photo-1590164891803-77f1c4b0e245?w=400&q=80', 50, 'كجم'),
  ('خس روماني (حبة)', 'خضروات وفواكه', 3, NULL, FALSE, 'https://images.unsplash.com/photo-1556801712-76c8eb07c8b9?w=400&q=80', 30, 'حبة'),
  ('فراولة (500 جرام)', 'خضروات وفواكه', 8, 6, TRUE, 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&q=80', 25, 'علبة'),
  ('سائل جلي بريل (500 مل)', 'منظفات', 6, NULL, FALSE, 'https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=400&q=80', 40, 'زجاجة'),
  ('مسحوق غسيل اريال (3 كجم)', 'منظفات', 28, NULL, FALSE, 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&q=80', 30, 'علبة'),
  ('مبيض كلوركس عادي (1 لتر)', 'منظفات', 4.50, NULL, FALSE, 'https://images.unsplash.com/photo-1585652077825-d5f65b159a3a?w=400&q=80', 45, 'زجاجة'),
  ('منعم أقمشة كومفورت (1 لتر)', 'منظفات', 14, NULL, FALSE, 'https://images.unsplash.com/photo-1604335399109-a2e7db1db7f7?w=400&q=80', 25, 'زجاجة'),
  ('سائل تنظيف زجاج ويندكس (500 مل)', 'منظفات', 8, NULL, FALSE, 'https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=400&q=80', 20, 'زجاجة'),
  ('اسفنج جلي سكوتش برايت (3 حبات)', 'منظفات', 5, NULL, FALSE, 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&q=80', 50, 'علبة'),
  ('قفازات مطاطية للتنظيف (زوج)', 'منظفات', 6, NULL, FALSE, 'https://images.unsplash.com/photo-1585652077825-d5f65b159a3a?w=400&q=80', 30, 'زوج'),
  ('صابون لوكس (125 جرام × 3)', 'مجموعة الأصناف', 7, NULL, FALSE, 'https://images.unsplash.com/photo-1608571424878-e338ecb1e5d4?w=400&q=80', 50, 'علبة'),
  ('شامبو كلير (400 مل)', 'مجموعة الأصناف', 16, NULL, FALSE, 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&q=80', 35, 'زجاجة'),
  ('معجون أسنان كولجيت (75 مل)', 'مجموعة الأصناف', 7, NULL, FALSE, 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=400&q=80', 60, 'حبة'),
  ('فرشاة أسنان أورال بي (حبة)', 'مجموعة الأصناف', 9, NULL, FALSE, 'https://images.unsplash.com/photo-1578496480248-2ed8f6e71b35?w=400&q=80', 40, 'حبة'),
  ('مزيل عرق فجر السعودي (50 مل)', 'مجموعة الأصناف', 10, NULL, FALSE, 'https://images.unsplash.com/photo-1608571424878-e338ecb1e5d4?w=400&q=80', 35, 'زجاجة'),
  ('مناديل ورقية كلينكس (200 حبة)', 'مجموعة الأصناف', 6, NULL, FALSE, 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&q=80', 70, 'علبة'),
  ('حفاظات بامبرز مقاس 4 (44 حبة)', 'مجموعة الأصناف', 45, 38, TRUE, 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=400&q=80', 25, 'كرتون');
  END IF;
END $$;

-- إضافة عمود الجوال إلى جدول الموظفين
ALTER TABLE staff ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE;

-- أمان: دالة إصلاح تسجيل دخول الموظفين (للاستخدام من قبل الموظفين فقط)
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
GRANT EXECUTE ON FUNCTION public.ensure_staff_auth_user TO anon, authenticated;

-- =============================================
-- صلاحيات الأدوار (Roles & Grants)
-- تمنح authenticated صلاحية استخدام العدّادات والجداول
-- =============================================
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO authenticated;
/* @@SEED_END@@ */

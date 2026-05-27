-- =============================================
-- Supabase Schema: أسواق ثرا الشرق ون
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
VALUES ('yaser.haroon79@gmail.com', 'ياسر', 'admin')
ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role;

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
  VALUES (p_email, p_name, p_role)
  RETURNING row_to_json(staff)::JSON INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_staff_rpc(
  p_id BIGINT, p_email TEXT, p_name TEXT, p_role TEXT
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
  UPDATE staff
  SET email = p_email, name = p_name, role = p_role
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
  pw_hash := extensions.crypt(p_password, extensions.gen_salt('bf'));
  SELECT id INTO user_id FROM auth.users WHERE email = p_email;
  IF user_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_sent_at, confirmation_token,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      extensions.gen_random_uuid(), 'authenticated', 'authenticated', p_email,
      pw_hash,
      now(), now(), '', '{"provider":"email","providers":["email"]}', '{}',
      now(), now()
    ) RETURNING id INTO user_id;
  ELSE
    UPDATE auth.users SET email_confirmed_at = COALESCE(email_confirmed_at, now()), encrypted_password = pw_hash WHERE id = user_id;
  END IF;
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (extensions.gen_random_uuid(), user_id, json_build_object('sub', user_id::TEXT, 'email', p_email), 'email', p_email, now(), now(), now())
  ON CONFLICT DO NOTHING;
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
  INSERT INTO customers (email, name, phone)
  VALUES (p_email, p_name, p_phone)
  ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone
  RETURNING row_to_json(customers)::JSON INTO result;
  RETURN result;
END;
$$;

-- Direct signup without email confirmation (matches requested UX)
CREATE OR REPLACE FUNCTION public.create_customer_auth_rpc(p_email TEXT, p_password TEXT)
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

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_sent_at, confirmation_token,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    user_id, 'authenticated', 'authenticated', clean_email, pw_hash,
    now(), now(), '', '{"provider":"email","providers":["email"]}', '{}',
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

CREATE OR REPLACE FUNCTION public.get_customer_rpc(p_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT row_to_json(c)::JSON INTO result FROM customers c WHERE c.email = p_email;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_customer_rpc(p_email TEXT, p_name TEXT, p_phone TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  UPDATE customers SET name = p_name, phone = p_phone WHERE email = p_email
  RETURNING row_to_json(customers)::JSON INTO result;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_customer_rpc TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_rpc TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_customer_rpc TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_customer_auth_rpc TO anon, authenticated;

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
BEGIN
  UPDATE customers
  SET loyalty_points = COALESCE(loyalty_points, 0) + p_points
  WHERE email = p_email
  RETURNING row_to_json(customers)::JSON INTO result;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_loyalty_points_rpc TO anon, authenticated;

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

INSERT INTO categories (name) VALUES
  ('الكل'), ('العروض'), ('المؤن'), ('الألبان'),
  ('المشروبات'), ('اللحوم والدواجن'), ('المخبوزات'), ('التسالي')
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
  stock_quantity INTEGER DEFAULT 0,
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
  status TEXT DEFAULT 'جديد',
  payment_method TEXT,
  phone TEXT,
  notes TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Anyone can insert an order (no auth required for customers)
DROP POLICY IF EXISTS "orders_insert_public" ON orders;
CREATE POLICY "orders_insert_public" ON orders
  FOR INSERT WITH CHECK (true);

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

CREATE OR REPLACE FUNCTION public.create_order_secure(
  cart_items JSONB,
  payment_method TEXT,
  delivery_location TEXT,
  customer_phone TEXT DEFAULT NULL,
  order_notes TEXT DEFAULT NULL
)
RETURNS orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_items JSONB;
  computed_total NUMERIC(10,2);
  delivery_fee NUMERIC(10,2);
  created_order orders;
  missing TEXT;
BEGIN
  IF cart_items IS NULL OR jsonb_array_length(cart_items) = 0 THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;

  CREATE TEMP TABLE _requested ON COMMIT DROP AS
  SELECT
    (item ->> 'id')::BIGINT AS product_id,
    GREATEST(COALESCE((item ->> 'qty')::INT, 1), 1) AS qty
  FROM jsonb_array_elements(cart_items) AS item;

  SELECT string_agg('المنتج رقم ' || p.id::TEXT || ' (الموجود: ' || p.stock_quantity || ', المطلوب: ' || r.qty || ')', '; ')
  INTO missing
  FROM _requested r
  JOIN products p ON p.id = r.product_id
  WHERE r.qty > p.stock_quantity;

  IF missing IS NOT NULL THEN
    DROP TABLE _requested;
    RAISE EXCEPTION 'بعض المنتجات غير متوفرة بالكمية المطلوبة: %', missing;
  END IF;

  WITH priced AS (
    SELECT
      p.id,
      p.name,
      p.category,
      p.price,
      p.offer_price,
      p.is_offer,
      p.image_url,
      p.unit,
      r.qty,
      CASE
        WHEN p.is_offer AND p.offer_price IS NOT NULL THEN p.offer_price
        ELSE p.price
      END AS current_price
    FROM _requested r
    JOIN products p ON p.id = r.product_id
  )
  SELECT
    COALESCE(SUM(current_price * qty), 0),
    COALESCE(jsonb_agg(jsonb_build_object(
      'id', id::TEXT,
      'name', name,
      'category', category,
      'price', price,
      'offerPrice', offer_price,
      'isOffer', is_offer,
      'imageUrl', image_url,
      'unit', unit,
      'qty', qty,
      'currentPrice', current_price
    )), '[]'::JSONB)
  INTO computed_total, clean_items
  FROM priced;

  IF jsonb_array_length(clean_items) = 0 THEN
    DROP TABLE _requested;
    RAISE EXCEPTION 'No valid products in cart';
  END IF;

  delivery_fee := CASE WHEN computed_total >= 100 THEN 0 ELSE 15 END;

  INSERT INTO orders (
    customer_email,
    items,
    total,
    payment_method,
    phone,
    notes,
    location
  )
  VALUES (
    auth.jwt() ->> 'email',
    clean_items,
    computed_total + delivery_fee,
    payment_method,
    customer_phone,
    order_notes,
    delivery_location
  )
  RETURNING * INTO created_order;

  UPDATE products p
  SET stock_quantity = p.stock_quantity - r.qty
  FROM _requested r
  WHERE p.id = r.product_id;

  DROP TABLE _requested;
  RETURN created_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order_secure(JSONB, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- 5. Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  sender TEXT NOT NULL CHECK (sender IN ('customer', 'admin', 'driver')),
  text TEXT NOT NULL,
  order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (customers can send messages)
DROP POLICY IF EXISTS "chat_insert_public" ON chat_messages;
CREATE POLICY "chat_insert_public" ON chat_messages
  FOR INSERT WITH CHECK (true);

-- Anyone can read chat messages (both admin and customer)
DROP POLICY IF EXISTS "chat_select_public" ON chat_messages;
CREATE POLICY "chat_select_public" ON chat_messages
  FOR SELECT USING (true);

-- 6. Seed products — ⚠️ AUTO-GENERATED, DO NOT EDIT BY HAND
-- Source: src/data/products-data.json
-- To update: node scripts/generate-sql.js
-- @@SEED_START@@
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM products LIMIT 1) THEN
    INSERT INTO products (name, category, price, offer_price, is_offer, image_url, stock_quantity, unit) VALUES
  ('أرز مزة بسمتي أبو كاس (5 كجم)', 'المؤن', 40, 32, TRUE, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80', 50, 'كيس'),
  ('سمن نباتي مازولا (2 لتر)', 'المؤن', 25, NULL, FALSE, 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80', 30, 'علبة'),
  ('زيت ذرة عافية (1.5 لتر)', 'المؤن', 18, NULL, FALSE, 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&q=80', 60, 'حبة'),
  ('زيت زيتون بكر عافية (500 مل)', 'المؤن', 22, NULL, FALSE, 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=400&q=80', 25, 'زجاجة'),
  ('دقيق أبيض فاخر الوطنية (2 كجم)', 'المؤن', 7.50, NULL, FALSE, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80', 70, 'كيس'),
  ('سكر أبيض ناعم السكر (2 كجم)', 'المؤن', 6, NULL, FALSE, 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80', 80, 'كيس'),
  ('طحينة سمسم حلواني (500 جرام)', 'المؤن', 12, NULL, FALSE, 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&q=80', 35, 'علبة'),
  ('عسل نحل جبلي شهي (500 جرام)', 'المؤن', 45, 38, TRUE, 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=400&q=80', 20, 'علبة'),
  ('حليب نستله المكثف المحلى (397 جرام)', 'المؤن', 8, NULL, FALSE, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80', 45, 'علبة'),
  ('زعتر فلسطيني خلطة (200 جرام)', 'المؤن', 5, NULL, FALSE, 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80', 40, 'علبة'),
  ('بهارات مشكلة أبو جبل (150 جرام)', 'المؤن', 6, NULL, FALSE, 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&q=80', 55, 'علبة'),
  ('معلقة هريسة سارينة (250 جرام)', 'المؤن', 4, NULL, FALSE, 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=400&q=80', 30, 'علبة'),
  ('خل أبيض (1 لتر)', 'المؤن', 3.50, NULL, FALSE, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80', 40, 'زجاجة'),
  ('مربى فراولة سارينة (350 جرام)', 'المؤن', 7, NULL, FALSE, 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80', 30, 'علبة'),
  ('شوربة دجاج ماجي (24 مكعب)', 'المؤن', 5.50, NULL, FALSE, 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&q=80', 50, 'علبة'),
  ('حليب المراعي طازج (2 لتر)', 'الألبان', 11, NULL, FALSE, 'https://images.unsplash.com/photo-1550583724-b2692b85b4b7?w=400&q=80', 40, 'حبة'),
  ('حليب الصافي طازج (1 لتر)', 'الألبان', 6.50, NULL, FALSE, 'https://images.unsplash.com/photo-1571212518306-3676b6b5f9f7?w=400&q=80', 50, 'حبة'),
  ('روب المراعي طازج (2 كجم)', 'الألبان', 14, NULL, FALSE, 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&q=80', 30, 'علبة'),
  ('زبادي المراعي سادة (600 جرام)', 'الألبان', 5.50, NULL, FALSE, 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&q=80', 45, 'علبة'),
  ('زبادي المراعي فراولة (600 جرام)', 'الألبان', 6, NULL, FALSE, 'https://images.unsplash.com/photo-1550583724-b2692b85b4b7?w=400&q=80', 40, 'علبة'),
  ('جبنة بيضاء المراعي (500 جرام)', 'الألبان', 10, NULL, FALSE, 'https://images.unsplash.com/photo-1571212518306-3676b6b5f9f7?w=400&q=80', 35, 'علبة'),
  ('جبنة كرافت تشيدر شرائح (200 جرام)', 'الألبان', 8, NULL, FALSE, 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&q=80', 40, 'علبة'),
  ('جبنة كرافت تشيدر علب', 'الألبان', 6.50, NULL, FALSE, 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&q=80', 50, 'علبة'),
  ('جبنة مثلثات المراعي (12 حبة)', 'الألبان', 5, NULL, FALSE, 'https://images.unsplash.com/photo-1550583724-b2692b85b4b7?w=400&q=80', 60, 'علبة'),
  ('لبنة المراعي (500 جرام)', 'الألبان', 10, NULL, FALSE, 'https://images.unsplash.com/photo-1571212518306-3676b6b5f9f7?w=400&q=80', 25, 'علبة'),
  ('بيض الوطنية (30 حبة)', 'الألبان', 19, NULL, FALSE, 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&q=80', 25, 'طبق'),
  ('زبدة لورباك غير مملحة (200 جرام)', 'الألبان', 14, 11, TRUE, 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&q=80', 20, 'علبة'),
  ('بيبسي كولا (6 × 330 مل)', 'المشروبات', 15, 12, TRUE, 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', 100, 'كرتون'),
  ('مياه نوفا (40 × 330 مل)', 'المشروبات', 18, NULL, FALSE, 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=400&q=80', 80, 'كرتون'),
  ('مياه بيرين (12 × 330 مل)', 'المشروبات', 8, NULL, FALSE, 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400&q=80', 60, 'كرتون'),
  ('مياه نوفا (12 × 1.5 لتر)', 'المشروبات', 14, NULL, FALSE, 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400&q=80', 50, 'كرتون'),
  ('كوكاكولا (6 × 330 مل)', 'المشروبات', 15, NULL, FALSE, 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', 90, 'كرتون'),
  ('سبرايت (6 × 330 مل)', 'المشروبات', 15, NULL, FALSE, 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=400&q=80', 70, 'كرتون'),
  ('عصير تانج برتقال (450 جرام)', 'المشروبات', 8.50, NULL, FALSE, 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400&q=80', 35, 'علبة'),
  ('عصير المراعي برتقال طازج (1 لتر)', 'المشروبات', 9, NULL, FALSE, 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400&q=80', 40, 'زجاجة'),
  ('عصير راني نكتار مانجو (1 لتر)', 'المشروبات', 9, NULL, FALSE, 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', 35, 'زجاجة'),
  ('شاي ليبتون العلامة الصفراء (100 كيس)', 'المشروبات', 16, NULL, FALSE, 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=400&q=80', 60, 'علبة'),
  ('شاي ربيع الذهبي (100 كيس)', 'المشروبات', 14, NULL, FALSE, 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400&q=80', 55, 'علبة'),
  ('قهوة نسكافيه كلاسيك (200 جرام)', 'المشروبات', 18, NULL, FALSE, 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400&q=80', 40, 'علبة'),
  ('قهوة عربية خولاني (250 جرام)', 'المشروبات', 12, NULL, FALSE, 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80', 30, 'علبة'),
  ('هوت شوكلت نستله (300 جرام)', 'المشروبات', 12, NULL, FALSE, 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=400&q=80', 25, 'علبة'),
  ('حليب بودرة المراعي (2 كجم)', 'المشروبات', 32, NULL, FALSE, 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400&q=80', 20, 'علبة'),
  ('دجاج ساديا مجمد (1000 جرام)', 'اللحوم والدواجن', 17.50, NULL, FALSE, 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&q=80', 45, 'حبة'),
  ('دجاج ساديا مجمد (1200 جرام)', 'اللحوم والدواجن', 20, NULL, FALSE, 'https://images.unsplash.com/photo-1551028150-64b9f398f678?w=400&q=80', 40, 'حبة'),
  ('دجاج ساديا مجمد (900 جرام)', 'اللحوم والدواجن', 15.50, NULL, FALSE, 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=400&q=80', 35, 'حبة'),
  ('أجنحة دجاج ساديا مجمدة (500 جرام)', 'اللحوم والدواجن', 10, NULL, FALSE, 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400&q=80', 30, 'علبة'),
  ('كفتة لحم بقر طازجة (500 جرام)', 'اللحوم والدواجن', 22, NULL, FALSE, 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&q=80', 20, 'علبة'),
  ('لحم مفروم بقر طازج (500 جرام)', 'اللحوم والدواجن', 24, NULL, FALSE, 'https://images.unsplash.com/photo-1551028150-64b9f398f678?w=400&q=80', 25, 'علبة'),
  ('كباب لحم غنم طازج (500 جرام)', 'اللحوم والدواجن', 38, 32, TRUE, 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=400&q=80', 15, 'علبة'),
  ('برجر بقر ساديا (6 حبات)', 'اللحوم والدواجن', 18, NULL, FALSE, 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400&q=80', 35, 'علبة'),
  ('نقانق دجاج ساديا (500 جرام)', 'اللحوم والدواجن', 12, NULL, FALSE, 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&q=80', 30, 'علبة'),
  ('خبز لوزين أبيض شرائح', 'المخبوزات', 4, NULL, FALSE, 'https://images.unsplash.com/photo-1549937334-dbdb3b31c71d?w=400&q=80', 35, 'كيس'),
  ('خبز لوزين أسمر شرائح', 'المخبوزات', 5, NULL, FALSE, 'https://images.unsplash.com/photo-1509365465985-25d11c17e812?w=400&q=80', 30, 'كيس'),
  ('خبز صامولي لوزين (8 حبات)', 'المخبوزات', 4.50, NULL, FALSE, 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=400&q=80', 25, 'كيس'),
  ('خبز برجر لوزين (6 حبات)', 'المخبوزات', 5, NULL, FALSE, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&q=80', 20, 'كيس'),
  ('خبز تورتيلا لوزين (10 حبات)', 'المخبوزات', 7, NULL, FALSE, 'https://images.unsplash.com/photo-1549937334-dbdb3b31c71d?w=400&q=80', 25, 'كيس'),
  ('كروسان لوزين زبدة (4 حبات)', 'المخبوزات', 6.50, NULL, FALSE, 'https://images.unsplash.com/photo-1509365465985-25d11c17e812?w=400&q=80', 20, 'كيس'),
  ('كيك يمني شهير (500 جرام)', 'المخبوزات', 8, NULL, FALSE, 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=400&q=80', 15, 'علبة'),
  ('بسكويت شاي دايجستف (400 جرام)', 'المخبوزات', 5, NULL, FALSE, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&q=80', 40, 'علبة'),
  ('بطاطس ليز بالملح (170 جرام)', 'التسالي', 7, NULL, FALSE, 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&q=80', 55, 'كيس'),
  ('بطاطس ليز جبنة (170 جرام)', 'التسالي', 7, NULL, FALSE, 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=400&q=80', 50, 'كيس'),
  ('بطاطس ليز كاتشب (170 جرام)', 'التسالي', 7, NULL, FALSE, 'https://images.unsplash.com/photo-1546955770-370040c0cc2a?w=400&q=80', 45, 'كيس'),
  ('بطاطس برينجلز أصلي (165 جرام)', 'التسالي', 10, NULL, FALSE, 'https://images.unsplash.com/photo-1590080875108-8872b6d4cdb9?w=400&q=80', 40, 'علبة'),
  ('شوكولاتة كيندر بونو (97 جرام)', 'التسالي', 6, NULL, FALSE, 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&q=80', 50, 'حبة'),
  ('شوكولاتة كيت كات (4 أصابع)', 'التسالي', 3.50, NULL, FALSE, 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=400&q=80', 60, 'حبة'),
  ('شوكولاتة سنيكرز (50 جرام)', 'التسالي', 3, NULL, FALSE, 'https://images.unsplash.com/photo-1546955770-370040c0cc2a?w=400&q=80', 70, 'حبة'),
  ('بسكويت أوريو (144 جرام)', 'التسالي', 5.50, NULL, FALSE, 'https://images.unsplash.com/photo-1590080875108-8872b6d4cdb9?w=400&q=80', 45, 'علبة'),
  ('مكسرات مشكلة وفرة (250 جرام)', 'التسالي', 15, 12, TRUE, 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&q=80', 30, 'علبة'),
  ('لوز ني (250 جرام)', 'التسالي', 18, NULL, FALSE, 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=400&q=80', 25, 'علبة'),
  ('فستق حلبي مملح (250 جرام)', 'التسالي', 22, NULL, FALSE, 'https://images.unsplash.com/photo-1546955770-370040c0cc2a?w=400&q=80', 20, 'علبة'),
  ('حمص شيبس (100 جرام)', 'التسالي', 3, NULL, FALSE, 'https://images.unsplash.com/photo-1590080875108-8872b6d4cdb9?w=400&q=80', 60, 'كيس'),
  ('فشار مايكرويف (100 جرام)', 'التسالي', 4, NULL, FALSE, 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&q=80', 35, 'كيس'),
  ('طماطم (1 كجم)', 'الخضروات والفواكه', 4.50, NULL, FALSE, 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=400&q=80', 100, 'كجم'),
  ('بصل أبيض (1 كجم)', 'الخضروات والفواكه', 3, NULL, FALSE, 'https://images.unsplash.com/photo-1582015728447-4735f2f18c3b?w=400&q=80', 100, 'كجم'),
  ('بطاطس (1 كجم)', 'الخضروات والفواكه', 4, NULL, FALSE, 'https://images.unsplash.com/photo-1518977676601-b53f82c16c1b?w=400&q=80', 80, 'كجم'),
  ('خيار (1 كجم)', 'الخضروات والفواكه', 3.50, NULL, FALSE, 'https://images.unsplash.com/photo-1582015728447-4735f2f18c3b?w=400&q=80', 60, 'كجم'),
  ('ليمون (1 كجم)', 'الخضروات والفواكه', 5, NULL, FALSE, 'https://images.unsplash.com/photo-1595705510867-8cbf0e7cc1c6?w=400&q=80', 70, 'كجم'),
  ('تفاح أحمر فوجي (1 كجم)', 'الخضروات والفواكه', 7, NULL, FALSE, 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&q=80', 50, 'كجم'),
  ('برتقال (1 كجم)', 'الخضروات والفواكه', 5.50, NULL, FALSE, 'https://images.unsplash.com/photo-1547514701-42782101795e?w=400&q=80', 60, 'كجم'),
  ('موز (1 كجم)', 'الخضروات والفواكه', 6, NULL, FALSE, 'https://images.unsplash.com/photo-1563822249366-3efb23b8e0c9?w=400&q=80', 55, 'كجم'),
  ('عنب أحمر (1 كجم)', 'الخضروات والفواكه', 8, NULL, FALSE, 'https://images.unsplash.com/photo-1563185162-40c4a72edb95?w=400&q=80', 30, 'كجم'),
  ('باذنجان (1 كجم)', 'الخضروات والفواكه', 4, NULL, FALSE, 'https://images.unsplash.com/photo-1615484477338-52c1e1d9c1c7?w=400&q=80', 40, 'كجم'),
  ('كوسا (1 كجم)', 'الخضروات والفواكه', 4.50, NULL, FALSE, 'https://images.unsplash.com/photo-1590164891793-92badd4e88c1?w=400&q=80', 35, 'كجم'),
  ('جزر (1 كجم)', 'الخضروات والفواكه', 3.50, NULL, FALSE, 'https://images.unsplash.com/photo-1590164891803-77f1c4b0e245?w=400&q=80', 50, 'كجم'),
  ('خس روماني (حبة)', 'الخضروات والفواكه', 3, NULL, FALSE, 'https://images.unsplash.com/photo-1556801712-76c8eb07c8b9?w=400&q=80', 30, 'حبة'),
  ('فراولة (500 جرام)', 'الخضروات والفواكه', 8, 6, TRUE, 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&q=80', 25, 'علبة'),
  ('سائل جلي بريل (500 مل)', 'المنظفات', 6, NULL, FALSE, 'https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=400&q=80', 40, 'زجاجة'),
  ('مسحوق غسيل اريال (3 كجم)', 'المنظفات', 28, NULL, FALSE, 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&q=80', 30, 'علبة'),
  ('مبيض كلوركس عادي (1 لتر)', 'المنظفات', 4.50, NULL, FALSE, 'https://images.unsplash.com/photo-1585652077825-d5f65b159a3a?w=400&q=80', 45, 'زجاجة'),
  ('منعم أقمشة كومفورت (1 لتر)', 'المنظفات', 14, NULL, FALSE, 'https://images.unsplash.com/photo-1604335399109-a2e7db1db7f7?w=400&q=80', 25, 'زجاجة'),
  ('سائل تنظيف زجاج ويندكس (500 مل)', 'المنظفات', 8, NULL, FALSE, 'https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=400&q=80', 20, 'زجاجة'),
  ('اسفنج جلي سكوتش برايت (3 حبات)', 'المنظفات', 5, NULL, FALSE, 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&q=80', 50, 'علبة'),
  ('قفازات مطاطية للتنظيف (زوج)', 'المنظفات', 6, NULL, FALSE, 'https://images.unsplash.com/photo-1585652077825-d5f65b159a3a?w=400&q=80', 30, 'زوج'),
  ('صابون لوكس (125 جرام × 3)', 'العناية الشخصية', 7, NULL, FALSE, 'https://images.unsplash.com/photo-1608571424878-e338ecb1e5d4?w=400&q=80', 50, 'علبة'),
  ('شامبو كلير (400 مل)', 'العناية الشخصية', 16, NULL, FALSE, 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&q=80', 35, 'زجاجة'),
  ('معجون أسنان كولجيت (75 مل)', 'العناية الشخصية', 7, NULL, FALSE, 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=400&q=80', 60, 'حبة'),
  ('فرشاة أسنان أورال بي (حبة)', 'العناية الشخصية', 9, NULL, FALSE, 'https://images.unsplash.com/photo-1578496480248-2ed8f6e71b35?w=400&q=80', 40, 'حبة'),
  ('مزيل عرق فجر السعودي (50 مل)', 'العناية الشخصية', 10, NULL, FALSE, 'https://images.unsplash.com/photo-1608571424878-e338ecb1e5d4?w=400&q=80', 35, 'زجاجة'),
  ('مناديل ورقية كلينكس (200 حبة)', 'العناية الشخصية', 6, NULL, FALSE, 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&q=80', 70, 'علبة'),
  ('حفاظات بامبرز مقاس 4 (44 حبة)', 'العناية الشخصية', 45, 38, TRUE, 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=400&q=80', 25, 'كرتون');
  END IF;
END $$;
/* @@SEED_END@@ */

-- =============================================
-- Security Migration — 2026-06-07
-- 1. Orders INSERT RLS: require auth
-- 2. Settings RLS: restrict to admin/manager
-- 3. Ensure admin user in staff table
-- =============================================

-- 1. Orders INSERT — require authentication
DROP POLICY IF EXISTS "orders_insert_public" ON orders;
DROP POLICY IF EXISTS "orders_insert_authenticated" ON orders;
CREATE POLICY "orders_insert_authenticated" ON orders
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND phone IS NOT NULL AND phone != ''
    AND location IS NOT NULL AND location != ''
  );

-- 2. Settings — restrict write to admin/manager
DROP POLICY IF EXISTS "settings_insert_admin" ON settings;
DROP POLICY IF EXISTS "settings_update_admin" ON settings;
CREATE POLICY "settings_insert_admin" ON settings FOR INSERT WITH CHECK (public.is_staff(ARRAY['admin', 'manager']));
CREATE POLICY "settings_update_admin" ON settings FOR UPDATE USING (public.is_staff(ARRAY['admin', 'manager']));

-- 3. Ensure admin user exists in staff table
INSERT INTO staff (email, name, role)
VALUES ('yaser.haroon79@gmail.com', 'مدير', 'admin')
ON CONFLICT (email) DO UPDATE SET role = 'admin';

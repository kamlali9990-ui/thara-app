-- =============================================
-- Fix: RLS hardening (categories, missing policies)
-- =============================================

-- 1. Enable RLS on categories (was missing — CRITICAL)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Public read access for categories
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

-- 2. Add explicit DELETE policies that deny all
-- Makes the deny explicit rather than relying on RLS default-deny
DROP POLICY IF EXISTS "customers_delete_deny" ON customers;
CREATE POLICY "customers_delete_deny" ON customers
  FOR DELETE USING (false);

DROP POLICY IF EXISTS "orders_delete_deny" ON orders;
CREATE POLICY "orders_delete_deny" ON orders
  FOR DELETE USING (false);

DROP POLICY IF EXISTS "chat_messages_delete_deny" ON chat_messages;
CREATE POLICY "chat_messages_delete_deny" ON chat_messages
  FOR DELETE USING (false);

-- 3. Restrict ALTER DEFAULT PRIVILEGES to SELECT + USAGE only
-- Any new table won't auto-get full access to authenticated
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO authenticated;

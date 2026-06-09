-- ============================================================
-- Targeted migration: only missing pieces, no destructive ops
-- Run in: https://supabase.com/dashboard/project/oqwphazzuxmrxwbnothk/sql/new
-- ============================================================

BEGIN;

-- 1. Create handle_new_user trigger (migration 0002)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.customers (email, name, phone)
  VALUES (
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'عميل جديد'),
    COALESCE(NEW.raw_user_meta_data ->> 'phone', '')
  )
  ON CONFLICT (email) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2. Create driver_assignments table (migration 0003)
CREATE TABLE IF NOT EXISTS driver_assignments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  driver_id BIGINT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(order_id, driver_id)
);

ALTER TABLE driver_assignments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_driver_assignments_order ON driver_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_driver_assignments_driver ON driver_assignments(driver_id);

-- 3. Add is_available column if missing (migration 0003)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='staff' AND column_name='is_available') THEN
    ALTER TABLE staff ADD COLUMN is_available BOOLEAN DEFAULT true;
  END IF;
END $$;

-- 4. Customer RLS policies (migration 0004)
DROP POLICY IF EXISTS "Customers can insert their own profile" ON customers;
CREATE POLICY "Customers can insert their own profile"
  ON customers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 5. Fix: update_staff_rpc — make p_email optional (migration 0014)
DROP FUNCTION IF EXISTS public.update_staff_rpc(BIGINT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.update_staff_rpc(
  p_id BIGINT, p_name TEXT, p_role TEXT, p_email TEXT DEFAULT NULL
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
  SET email = COALESCE(p_email, (SELECT email FROM staff WHERE id = p_id)),
      name = p_name,
      role = p_role
  WHERE id = p_id
  RETURNING row_to_json(staff)::JSON INTO result;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_staff_rpc(BIGINT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- 6. Fix: list_staff_rpc — allow drivers to see staff (migration 0007)
CREATE OR REPLACE FUNCTION public.list_staff_rpc()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT public.is_staff(ARRAY['admin','manager','driver']) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  SELECT COALESCE(json_agg(row_to_json(s)), '[]'::JSON) INTO result
  FROM staff s;
  RETURN result;
END;
$$;

-- 7. Sync categories (migration 0008) — only for empty categories table
DO $$
DECLARE
  cat_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO cat_count FROM categories;
  IF cat_count = 0 THEN
    INSERT INTO categories (name, slug, image_url, "order") VALUES
      ('مياه ومشروبات', 'water-drinks', '', 1),
      ('ألبان وأجبان', 'dairy-cheese', '', 2),
      ('خضروات وفواكه', 'vegetables-fruits', '', 3),
      ('لحوم ودواجن', 'meat-poultry', '', 4),
      ('مواد غذائية', 'food-groceries', '', 5),
      ('معلبات', 'canned-food', '', 6),
      ('زيوت وسمن', 'oils-ghee', '', 7),
      ('بهارات وتوابل', 'spices-seasonings', '', 8),
      ('حلويات وبسكويت', 'sweets-biscuits', '', 9),
      ('مقرمشات', 'chips-snacks', '', 10),
      ('عناية شخصية', 'personal-care', '', 11),
      ('منظفات', 'cleaning-products', '', 12),
      ('أطفال', 'baby', '', 13),
      ('مستلزمات منزلية', 'home-supplies', '', 14),
      ('أدوات مطبخ', 'kitchen-tools', '', 15),
      ('أعلاف حيوانات', 'pet-food', '', 16);
  END IF;
END $$;

-- 8. RLS for driver_assignments
DROP POLICY IF EXISTS "Driver assignments admin access" ON driver_assignments;
CREATE POLICY "Driver assignments admin access"
  ON driver_assignments FOR ALL
  TO authenticated
  USING (public.is_staff(ARRAY['admin','manager']))
  WITH CHECK (public.is_staff(ARRAY['admin','manager']));

DROP POLICY IF EXISTS "Driver assignments driver read" ON driver_assignments;
CREATE POLICY "Driver assignments driver read"
  ON driver_assignments FOR SELECT
  TO authenticated
  USING (public.is_staff(ARRAY['driver']));

-- 9. Drivers can update order status (migration 0011)
DROP POLICY IF EXISTS "Drivers can update order status" ON orders;
CREATE POLICY "Drivers can update order status"
  ON orders FOR UPDATE
  TO authenticated
  USING (public.is_staff(ARRAY['driver']) AND assigned_driver_id IN (SELECT id FROM staff WHERE LOWER(email) = LOWER(auth.email())))
  WITH CHECK (public.is_staff(ARRAY['driver']) AND assigned_driver_id IN (SELECT id FROM staff WHERE LOWER(email) = LOWER(auth.email())));

-- 10. Add delivery_address column if missing (migration 0013)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='delivery_address') THEN
    ALTER TABLE orders ADD COLUMN delivery_address TEXT;
  END IF;
END $$;

COMMIT;

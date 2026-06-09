-- Migration: تقييد صلاحيات المدير (manager) إلى قراءة فقط
-- =========================================================

-- 1. Products: منع المدير من إضافة أو تعديل المنتجات
DROP POLICY IF EXISTS "products_insert_admin" ON products;
CREATE POLICY "products_insert_admin" ON products
  FOR INSERT WITH CHECK (public.is_staff(ARRAY['admin']));

DROP POLICY IF EXISTS "products_update_admin" ON products;
CREATE POLICY "products_update_admin" ON products
  FOR UPDATE USING (public.is_staff(ARRAY['admin']));

-- 2. Orders: منع المدير من تحديث حالة الطلبات أو تعيين الكباتن
DROP POLICY IF EXISTS "orders_update_staff" ON orders;
DROP POLICY IF EXISTS "orders_update_admin" ON orders;
CREATE POLICY "orders_update_staff" ON orders
  FOR UPDATE USING (
    public.is_staff(ARRAY['admin', 'employee'])
    OR (
      public.current_staff_role() = 'driver'
      AND assigned_driver_id = public.current_staff_id()
    )
  );

-- 3. assign_driver_to_order RPC: المدير فقط
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
  IF NOT public.is_staff(ARRAY['admin']) THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
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

-- 4. update_order_status_rpc: إزالة المدير من الأدوار المسموحة
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
  IF caller_role IN ('admin', 'employee') THEN
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

-- 5. إنشاء دالة ensure_staff_auth_user (للإصلاح التلقائي لتسجيل الدخول)
CREATE OR REPLACE FUNCTION public.ensure_staff_auth_user(p_email TEXT, p_password TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  staff_exists BOOLEAN;
  result JSON;
BEGIN
  SELECT EXISTS(SELECT 1 FROM staff WHERE lower(email) = lower(p_email)) INTO staff_exists;
  IF NOT staff_exists THEN
    RETURN json_build_object('staff_exists', false, 'fixed', false);
  END IF;
  result := public.confirm_auth_user(p_email, p_password);
  RETURN json_build_object('staff_exists', true, 'fixed', true, 'user', result);
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_staff_auth_user TO authenticated;

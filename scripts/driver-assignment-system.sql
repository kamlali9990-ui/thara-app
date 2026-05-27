-- =============================================
-- Driver Assignment System + ETA + Order Status Workflow
-- Safe to re-run (idempotent).
-- Run in Supabase SQL Editor OR:
--   Get-Content scripts\driver-assignment-system.sql | npx supabase db query
-- =============================================

-- 1. Add new columns to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_driver_id BIGINT REFERENCES staff(id) ON DELETE SET NULL;

-- 2. Helper: current staff id (companion to current_staff_role)
CREATE OR REPLACE FUNCTION public.current_staff_id()
RETURNS BIGINT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM staff WHERE lower(email) = lower(auth.jwt() ->> 'email') LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.current_staff_id TO authenticated;

-- 3. List drivers RPC (staff only)
CREATE OR REPLACE FUNCTION public.list_drivers_rpc()
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
    (SELECT json_agg(row_to_json(s) ORDER BY s.name) FROM staff s WHERE s.role = 'driver'),
    '[]'::JSON
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.list_drivers_rpc TO authenticated;

-- 4. Assign driver to order (admin/manager only, p_driver_id NULL = unassign)
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

-- 5. Driver claims an order (self-assign + advance status)
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
  FROM orders WHERE id = p_order_id;
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

-- 6. Update order status (staff or assigned driver) with optional ETA
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

-- 7. Update SELECT policy: drivers see only their assigned + unassigned available orders
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

-- 8. Update UPDATE policy
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

-- 9. Enable Realtime on orders (safe if already enabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE orders';
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

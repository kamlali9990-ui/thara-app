-- Driver live location tracking for real-time order tracking
-- Adds columns to orders table and creates RPC for driver location updates

-- 1. Add driver location columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_lat NUMERIC;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_lng NUMERIC;

-- 2. RPC for driver to update their location on an assigned order
CREATE OR REPLACE FUNCTION public.update_driver_location_rpc(
  p_order_id BIGINT,
  p_lat NUMERIC,
  p_lng NUMERIC
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
BEGIN
  -- Only authenticated staff can call
  SELECT id, role INTO caller_id, caller_role
  FROM staff WHERE lower(email) = lower(auth.jwt() ->> 'email') LIMIT 1;
  IF caller_role IS NULL THEN
    RAISE EXCEPTION 'Staff only';
  END IF;

  -- Only drivers can update location (admin/manager shouldn't need this)
  IF caller_role != 'driver' THEN
    RAISE EXCEPTION 'Driver only';
  END IF;

  -- Driver must be assigned to the order
  SELECT assigned_driver_id INTO cur_assigned FROM orders WHERE id = p_order_id;
  IF cur_assigned IS NULL OR cur_assigned != caller_id THEN
    RAISE EXCEPTION 'You are not assigned to this order';
  END IF;

  -- Update location
  UPDATE orders
  SET driver_lat = p_lat, driver_lng = p_lng
  WHERE id = p_order_id
  RETURNING row_to_json(orders)::JSON INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_driver_location_rpc TO authenticated;

-- 3. Allow customers to read driver_lat/driver_lng (they can already see orders via RLS)
-- No policy changes needed — customers already SELECT their own orders via the existing RLS

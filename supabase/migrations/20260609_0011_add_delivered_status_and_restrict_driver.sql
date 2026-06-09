-- إضافة حالة "تم التوصيل" بين "في الطريق" و "مكتمل"
-- الكابتن يضغط "تم التوصيل" ثم الأدمن/المدير يؤكد "مكتمل"
-- وتقييد صلاحيات الكابتن في الخادم

-- 1. تحديث CHECK constraint لجدول orders
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('جديد', 'قيد التحضير', 'جاهز للتوصيل', 'في الطريق', 'تم التوصيل', 'مكتمل', 'ملغي'));

-- 2. تحديث update_order_status_rpc لتقييد الكابتن
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
  cur_status TEXT;
  cur_assigned BIGINT;
  allowed BOOLEAN := FALSE;
BEGIN
  SELECT id, role INTO caller_id, caller_role
  FROM staff WHERE lower(email) = lower(auth.jwt() ->> 'email') LIMIT 1;
  IF caller_role IS NULL THEN
    RAISE EXCEPTION 'Staff only';
  END IF;
  SELECT status, assigned_driver_id INTO cur_status, cur_assigned
  FROM orders WHERE id = p_order_id;
  IF caller_role IN ('admin', 'manager', 'employee') THEN
    allowed := TRUE;
  ELSIF caller_role = 'driver' AND cur_assigned = caller_id THEN
    -- الكابتن مسموح له فقط: التوصيل → تم التوصيل
    IF cur_status = 'في الطريق' AND p_status = 'تم التوصيل' THEN
      allowed := TRUE;
    END IF;
    -- السماح للحركات العادية الأخرى (تجهيز الطلب، بدء التوصيل)
    IF cur_status = 'جديد' AND p_status = 'قيد التحضير' THEN
      allowed := TRUE;
    END IF;
    IF cur_status = 'قيد التحضير' AND p_status = 'في الطريق' THEN
      allowed := TRUE;
    END IF;
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

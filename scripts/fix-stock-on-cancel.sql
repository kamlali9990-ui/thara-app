-- =============================================
-- إصلاح شامل: رسوم التوصيل + المخزون + تسلسل الحالة
-- شغّل هذا في: https://supabase.com/dashboard/project/oqwphazzuxmrxwbnothk/sql/new
-- =============================================

-- 1. RPC لحساب رسوم التوصيل من الخادم (مصدر واحد للحقيقة بين العميل والخادم)
CREATE OR REPLACE FUNCTION public.get_delivery_fee_rpc(
  p_lat NUMERIC,
  p_lng NUMERIC,
  p_cart_total NUMERIC
)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_cart_total >= 100 THEN 0
    WHEN _haversine_km(28.451345, 48.491709, p_lat, p_lng) <= 3 THEN 5
    WHEN _haversine_km(28.451345, 48.491709, p_lat, p_lng) <= 6 THEN 10
    WHEN _haversine_km(28.451345, 48.491709, p_lat, p_lng) <= 10 THEN 15
    ELSE 20
  END;
$$;
GRANT EXECUTE ON FUNCTION public.get_delivery_fee_rpc TO anon;
GRANT EXECUTE ON FUNCTION public.get_delivery_fee_rpc TO authenticated;
SELECT '✅ تم إنشاء RPC رسوم التوصيل' AS result;

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
  cur_status TEXT;
  ci INT;
  ni INT;
  order_items JSONB;
  item RECORD;
  status_arr TEXT[] := ARRAY['جديد', 'قيد التحضير', 'جاهز للتوصيل', 'في الطريق', 'تم التوصيل', 'مكتمل'];
BEGIN
  -- صلاحية المتصل
  SELECT id, role INTO caller_id, caller_role
  FROM staff WHERE lower(email) = lower(auth.jwt() ->> 'email') LIMIT 1;
  IF caller_role IS NULL THEN
    RAISE EXCEPTION 'Staff only';
  END IF;

  SELECT assigned_driver_id, status, items INTO cur_assigned, cur_status, order_items
  FROM orders WHERE id = p_order_id;
  IF cur_status IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF caller_role IN ('admin', 'manager', 'employee') THEN
    allowed := TRUE;
  ELSIF caller_role = 'driver' AND cur_assigned = caller_id THEN
    allowed := TRUE;
  END IF;
  IF NOT allowed THEN
    RAISE EXCEPTION 'Unauthorized to update this order';
  END IF;

  -- التحقق من تسلسل الحالة
  IF p_status != 'ملغي' THEN
    ci := array_position(status_arr, cur_status);
    ni := array_position(status_arr, p_status);
    IF ci IS NULL OR ni IS NULL THEN
      RAISE EXCEPTION 'Invalid status value';
    END IF;
    IF ni < ci - 1 THEN
      RAISE EXCEPTION 'لا يمكن إرجاع الطلب أكثر من خطوة واحدة';
    END IF;
  END IF;

  -- عند الإلغاء: إعادة المخزون
  IF p_status = 'ملغي' AND cur_status != 'ملغي' THEN
    FOR item IN SELECT * FROM jsonb_to_recordset(order_items) AS x(id BIGINT, qty INT)
    LOOP
      UPDATE products
      SET stock_quantity = stock_quantity + item.qty
      WHERE id = item.id;
    END LOOP;
  END IF;

  -- تحديث الطلب
  UPDATE orders
  SET status = p_status,
      estimated_delivery = COALESCE(p_eta, estimated_delivery)
  WHERE id = p_order_id
  RETURNING row_to_json(orders)::JSON INTO result;
  RETURN result;
END;
$$;

-- إعادة منح الصلاحية
GRANT EXECUTE ON FUNCTION public.update_order_status_rpc TO authenticated;

-- تأكيد
SELECT '✅ تم تطبيق التحديث بنجاح' AS result;

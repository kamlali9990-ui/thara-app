-- Migration: Add invoice-related fields to orders table
-- 1. accepted_by_id: tracks which staff accepted/processed the order
-- 2. delivery_fee: stores the delivery fee separately from total

ALTER TABLE orders ADD COLUMN IF NOT EXISTS accepted_by_id BIGINT REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Update create_order_secure to store delivery_fee separately
CREATE OR REPLACE FUNCTION public.create_order_secure(
  cart_items JSONB,
  payment_method TEXT,
  delivery_location TEXT,
  customer_phone TEXT DEFAULT NULL,
  order_notes TEXT DEFAULT NULL,
  p_delivery_fee NUMERIC DEFAULT NULL
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
BEGIN
  IF cart_items IS NULL OR jsonb_array_length(cart_items) = 0 THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;

  CREATE TEMP TABLE _requested ON COMMIT DROP AS
  SELECT
    (item ->> 'id')::BIGINT AS product_id,
    GREATEST(COALESCE((item ->> 'qty')::INT, 1), 1) AS qty
  FROM jsonb_array_elements(cart_items) AS item;

  WITH locked AS (
    SELECT p.id, p.stock_quantity, r.qty
    FROM _requested r
    JOIN products p ON p.id = r.product_id
    FOR UPDATE OF p
  )
  SELECT string_agg('المنتج رقم ' || id::TEXT || ' (الموجود: ' || stock_quantity || ', المطلوب: ' || qty || ')', '; ')
  INTO missing
  FROM locked
  WHERE qty > stock_quantity;

  IF missing IS NOT NULL THEN
    DROP TABLE IF EXISTS _requested;
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
    DROP TABLE IF EXISTS _requested;
    RAISE EXCEPTION 'No valid products in cart';
  END IF;

  IF p_delivery_fee IS NULL THEN
    final_fee := CASE WHEN computed_total >= 100 THEN 0 ELSE 15 END;
  ELSE
    final_fee := p_delivery_fee;
  END IF;

  IF final_fee NOT IN (0, 5, 10, 15, 20) THEN
    final_fee := CASE WHEN computed_total >= 100 THEN 0 ELSE 15 END;
  END IF;

  INSERT INTO orders (
    customer_email,
    items,
    total,
    delivery_fee,
    payment_method,
    phone,
    notes,
    location
  )
  VALUES (
    auth.jwt() ->> 'email',
    clean_items,
    computed_total + final_fee,
    final_fee,
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

  DROP TABLE IF EXISTS _requested;
  RETURN created_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order_secure(JSONB, TEXT, TEXT, TEXT, TEXT, NUMERIC) TO authenticated;

-- Update update_order_status_rpc to auto-record accepted_by on "جديد" → "قيد التحضير"
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
  cur_status TEXT;
  allowed BOOLEAN := FALSE;
BEGIN
  SELECT id, role INTO caller_id, caller_role
  FROM staff WHERE lower(email) = lower(auth.jwt() ->> 'email') LIMIT 1;
  IF caller_role IS NULL THEN
    RAISE EXCEPTION 'Staff only';
  END IF;
  SELECT assigned_driver_id, status INTO cur_assigned, cur_status FROM orders WHERE id = p_order_id;
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
      estimated_delivery = COALESCE(p_eta, estimated_delivery),
      accepted_by_id = CASE
        WHEN cur_status = 'جديد' AND p_status = 'قيد التحضير' AND caller_role IN ('admin', 'manager', 'employee')
        THEN COALESCE(accepted_by_id, caller_id)
        ELSE accepted_by_id
      END
  WHERE id = p_order_id
  RETURNING row_to_json(orders)::JSON INTO result;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_order_status_rpc TO authenticated;

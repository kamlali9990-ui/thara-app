-- إضافة حقل عنوان التوصيل النصي لجدول orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;

-- تحديث create_order_secure لاستقبال عنوان التوصيل
CREATE OR REPLACE FUNCTION public.create_order_secure(
  cart_items JSONB,
  payment_method TEXT,
  delivery_location TEXT,
  customer_phone TEXT DEFAULT NULL,
  order_notes TEXT DEFAULT NULL,
  delivery_fee NUMERIC DEFAULT NULL,
  delivery_address TEXT DEFAULT NULL
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

  IF delivery_fee IS NULL THEN
    delivery_fee := CASE WHEN computed_total >= 100 THEN 0 ELSE 15 END;
  END IF;

  IF delivery_fee NOT IN (0, 5, 10, 15, 20) THEN
    delivery_fee := CASE WHEN computed_total >= 100 THEN 0 ELSE 15 END;
  END IF;

  INSERT INTO orders (
    customer_email,
    items,
    total,
    payment_method,
    phone,
    notes,
    location,
    delivery_address
  )
  VALUES (
    auth.jwt() ->> 'email',
    clean_items,
    computed_total + delivery_fee,
    payment_method,
    customer_phone,
    order_notes,
    delivery_location,
    delivery_address
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

GRANT EXECUTE ON FUNCTION public.create_order_secure(JSONB, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT) TO authenticated;

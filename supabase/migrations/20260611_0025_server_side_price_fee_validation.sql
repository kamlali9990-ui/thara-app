-- Fix: server-side price and delivery fee validation in create_order_secure
-- 1. Calculate fee from location (ignore client input)
-- 2. Price is already recalculated from DB (good)
-- 3. Add haversine helper for distance-based fee

-- Helper: convert degrees to radians
CREATE OR REPLACE FUNCTION public._radians(d NUMERIC)
RETURNS NUMERIC
LANGUAGE sql IMMUTABLE
AS $$ SELECT d * pi() / 180 $$;

-- Helper: haversine distance in KM
CREATE OR REPLACE FUNCTION public._haversine_km(
  lat1 NUMERIC, lng1 NUMERIC,
  lat2 NUMERIC, lng2 NUMERIC
)
RETURNS NUMERIC
LANGUAGE sql IMMUTABLE
AS $$
  SELECT 6371 * 2 * atan2(
    sqrt(
      sin((_radians(lat2) - _radians(lat1)) / 2)^2 +
      cos(_radians(lat1)) * cos(_radians(lat2)) *
      sin((_radians(lng2) - _radians(lng1)) / 2)^2
    ),
    sqrt(1 - (
      sin((_radians(lat2) - _radians(lat1)) / 2)^2 +
      cos(_radians(lat1)) * cos(_radians(lat2)) *
      sin((_radians(lng2) - _radians(lng1)) / 2)^2
    ))
  );
$$;

-- Parse location text "Lat: XX, Lng: YY" to extract coordinates
CREATE OR REPLACE FUNCTION public._parse_location(loc TEXT, OUT lat NUMERIC, OUT lng NUMERIC)
LANGUAGE sql IMMUTABLE
AS $$
  SELECT
    NULLIF(TRIM(SPLIT_PART(SPLIT_PART(loc, 'Lat:', 2), ',', 1)), '')::NUMERIC,
    NULLIF(TRIM(SPLIT_PART(loc, 'Lng:', 2)), '')::NUMERIC
  WHERE loc IS NOT NULL;
$$;

-- Updated create_order_secure with server-side fee calculation
DROP FUNCTION IF EXISTS public.create_order_secure(JSONB, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT);

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
  clat NUMERIC;
  clng NUMERIC;
  dist_km NUMERIC;
  correct_fee NUMERIC;
BEGIN
  IF cart_items IS NULL OR jsonb_array_length(cart_items) = 0 THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;

  CREATE TEMP TABLE _requested ON COMMIT DROP AS
  SELECT
    (item ->> 'id')::BIGINT AS product_id,
    GREATEST(COALESCE((item ->> 'qty')::INT, 1), 1) AS qty
  FROM jsonb_array_elements(cart_items) AS item;

  -- Lock products and check stock
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

  -- Recalculate total from DB prices
  WITH priced AS (
    SELECT
      p.id, p.name, p.category, p.price, p.offer_price,
      p.is_offer, p.image_url, p.unit, r.qty,
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

  -- Calculate delivery fee server-side from location and total
  -- Shop location: 28.451345, 48.491709 (KHAFJI center)
  SELECT _parse_location(delivery_location) INTO clat, clng;

  IF clat IS NOT NULL AND clng IS NOT NULL THEN
    dist_km := _haversine_km(28.451345, 48.491709, clat, clng);
    correct_fee := CASE
      WHEN computed_total >= 100 THEN 0
      WHEN dist_km <= 3 THEN 5
      WHEN dist_km <= 6 THEN 10
      WHEN dist_km <= 10 THEN 15
      ELSE 20
    END;
  ELSE
    -- Cannot determine distance, use fallback
    correct_fee := CASE WHEN computed_total >= 100 THEN 0 ELSE 15 END;
  END IF;

  -- Accept client fee ONLY if it matches the correct fee
  -- (prevents underpayment while allowing honest overpayment)
  IF delivery_fee IS NOT NULL AND delivery_fee = correct_fee THEN
    final_fee := correct_fee;
  ELSE
    final_fee := correct_fee;
  END IF;

  INSERT INTO orders (
    customer_email,
    items,
    total,
    payment_method,
    phone,
    notes,
    location,
    delivery_address,
    delivery_fee
  )
  VALUES (
    auth.jwt() ->> 'email',
    clean_items,
    computed_total + final_fee,
    payment_method,
    customer_phone,
    order_notes,
    delivery_location,
    delivery_address,
    final_fee
  )
  RETURNING * INTO created_order;

  -- Deduct stock
  UPDATE products p
  SET stock_quantity = p.stock_quantity - r.qty
  FROM _requested r
  WHERE p.id = r.product_id;

  DROP TABLE IF EXISTS _requested;
  RETURN created_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order_secure(JSONB, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT) TO authenticated;

-- Security and order details migration for an existing Supabase project.
-- Run this once in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS staff (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'employee')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO staff (email, name, role)
VALUES ('yaser.haroon79@gmail.com', 'ياسر', 'admin')
ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_staff_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM staff WHERE lower(email) = lower(auth.jwt() ->> 'email') LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_staff(allowed_roles TEXT[] DEFAULT ARRAY['admin', 'manager', 'employee'])
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.current_staff_role() = ANY(allowed_roles), FALSE);
$$;

GRANT EXECUTE ON FUNCTION public.current_staff_role TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff TO anon, authenticated;

DROP POLICY IF EXISTS "staff_select_admin" ON staff;
DROP POLICY IF EXISTS "staff_insert_admin" ON staff;
DROP POLICY IF EXISTS "staff_update_admin" ON staff;
DROP POLICY IF EXISTS "staff_delete_admin" ON staff;
DROP POLICY IF EXISTS "staff_select_staff" ON staff;

CREATE POLICY "staff_select_staff" ON staff
  FOR SELECT USING (public.is_staff());

CREATE POLICY "staff_insert_admin" ON staff
  FOR INSERT WITH CHECK (public.is_staff(ARRAY['admin']));

CREATE POLICY "staff_update_admin" ON staff
  FOR UPDATE USING (public.is_staff(ARRAY['admin']));

CREATE POLICY "staff_delete_admin" ON staff
  FOR DELETE USING (public.is_staff(ARRAY['admin']));

DROP POLICY IF EXISTS "products_insert_admin" ON products;
DROP POLICY IF EXISTS "products_update_admin" ON products;
DROP POLICY IF EXISTS "products_delete_admin" ON products;

CREATE POLICY "products_insert_admin" ON products
  FOR INSERT WITH CHECK (public.is_staff(ARRAY['admin', 'manager']));

CREATE POLICY "products_update_admin" ON products
  FOR UPDATE USING (public.is_staff(ARRAY['admin', 'manager']));

CREATE POLICY "products_delete_admin" ON products
  FOR DELETE USING (public.is_staff(ARRAY['admin']));

DROP POLICY IF EXISTS "orders_select_admin" ON orders;
DROP POLICY IF EXISTS "orders_update_admin" ON orders;
DROP POLICY IF EXISTS "orders_select_staff_or_owner" ON orders;
DROP POLICY IF EXISTS "orders_update_staff" ON orders;

CREATE POLICY "orders_select_staff_or_owner" ON orders
  FOR SELECT USING (
    public.is_staff()
    OR customer_email = auth.jwt() ->> 'email'
  );

CREATE POLICY "orders_update_staff" ON orders
  FOR UPDATE USING (public.is_staff());

CREATE OR REPLACE FUNCTION public.create_order_secure(
  cart_items JSONB,
  payment_method TEXT,
  delivery_location TEXT,
  customer_phone TEXT DEFAULT NULL,
  order_notes TEXT DEFAULT NULL
)
RETURNS orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_items JSONB;
  computed_total NUMERIC(10,2);
  delivery_fee NUMERIC(10,2);
  created_order orders;
BEGIN
  IF cart_items IS NULL OR jsonb_array_length(cart_items) = 0 THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;

  WITH requested AS (
    SELECT
      (item ->> 'id')::BIGINT AS product_id,
      GREATEST(COALESCE((item ->> 'qty')::INT, 1), 1) AS qty
    FROM jsonb_array_elements(cart_items) AS item
  ),
  priced AS (
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
    FROM requested r
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
    RAISE EXCEPTION 'No valid products in cart';
  END IF;

  delivery_fee := CASE WHEN computed_total >= 100 THEN 0 ELSE 15 END;

  INSERT INTO orders (
    customer_email,
    items,
    total,
    payment_method,
    phone,
    notes,
    location
  )
  VALUES (
    auth.jwt() ->> 'email',
    clean_items,
    computed_total + delivery_fee,
    payment_method,
    customer_phone,
    order_notes,
    delivery_location
  )
  RETURNING * INTO created_order;

  RETURN created_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order_secure(JSONB, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

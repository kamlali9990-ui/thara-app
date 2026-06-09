-- منع استخدام رقم الجوال لأكثر من حساب

CREATE OR REPLACE FUNCTION public.create_customer_rpc(p_email TEXT, p_name TEXT, p_phone TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  IF p_phone IS NOT NULL AND p_phone != '' THEN
    IF EXISTS (SELECT 1 FROM customers WHERE phone = p_phone AND email != p_email) THEN
      RAISE EXCEPTION 'رقم الجوال مستخدم مسبقاً';
    END IF;
  END IF;
  INSERT INTO customers (email, name, phone)
  VALUES (p_email, p_name, p_phone)
  ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone
  RETURNING row_to_json(customers)::JSON INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_customer_rpc(
  p_email TEXT,
  p_name TEXT,
  p_phone TEXT,
  p_delivery_address TEXT DEFAULT NULL,
  p_neighborhood TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  caller_email TEXT;
BEGIN
  caller_email := lower(auth.jwt() ->> 'email');
  IF caller_email != lower(p_email) AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_phone IS NOT NULL AND p_phone != '' THEN
    IF EXISTS (SELECT 1 FROM customers WHERE phone = p_phone AND email != p_email) THEN
      RAISE EXCEPTION 'رقم الجوال مستخدم مسبقاً';
    END IF;
  END IF;
  UPDATE customers SET
    name = COALESCE(p_name, name),
    phone = COALESCE(p_phone, phone),
    delivery_address = COALESCE(p_delivery_address, delivery_address),
    neighborhood = COALESCE(p_neighborhood, neighborhood),
    location = COALESCE(p_location, location)
  WHERE email = p_email
  RETURNING row_to_json(customers)::JSON INTO result;
  RETURN result;
END;
$$;

ALTER TABLE customers ADD COLUMN IF NOT EXISTS delivery_address TEXT DEFAULT '';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS neighborhood TEXT DEFAULT '';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS location TEXT DEFAULT '';

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

-- The existing GRANT (without params) already covers this overload with defaults

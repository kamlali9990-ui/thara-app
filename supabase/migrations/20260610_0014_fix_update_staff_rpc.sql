-- Fix update_staff_rpc: make p_email optional, keep existing if not provided
DROP FUNCTION IF EXISTS public.update_staff_rpc(BIGINT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.update_staff_rpc(
  p_id BIGINT, p_name TEXT, p_role TEXT, p_email TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT public.is_staff(ARRAY['admin']) THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;
  UPDATE staff
  SET email = COALESCE(p_email, (SELECT email FROM staff WHERE id = p_id)),
      name = p_name,
      role = p_role
  WHERE id = p_id
  RETURNING row_to_json(staff)::JSON INTO result;
  RETURN result;
END;
$$;

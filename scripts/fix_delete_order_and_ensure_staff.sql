CREATE OR REPLACE FUNCTION public.delete_order_rpc(p_order_id BIGINT)
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
  DELETE FROM orders WHERE id = p_order_id RETURNING row_to_json(orders)::JSON INTO result;
  RETURN result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.delete_order_rpc TO authenticated;

CREATE OR REPLACE FUNCTION public.ensure_staff_auth_user(p_email TEXT, p_password TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  staff_exists BOOLEAN;
  result JSON;
BEGIN
  SELECT EXISTS(SELECT 1 FROM staff WHERE lower(email) = lower(p_email)) INTO staff_exists;
  IF NOT staff_exists THEN
    RETURN json_build_object('staff_exists', false, 'fixed', false);
  END IF;
  result := public.confirm_auth_user(p_email, p_password);
  RETURN json_build_object('staff_exists', true, 'fixed', true, 'user', result);
END;
$$;
GRANT EXECUTE ON FUNCTION public.ensure_staff_auth_user TO authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_staff_auth_user FROM anon;
REVOKE EXECUTE ON FUNCTION public.ensure_staff_auth_user FROM public;

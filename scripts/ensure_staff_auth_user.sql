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

GRANT EXECUTE ON FUNCTION public.ensure_staff_auth_user TO anon, authenticated;

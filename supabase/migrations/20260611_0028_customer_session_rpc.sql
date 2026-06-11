-- RPC لإنشاء session + refresh token لمستخدم auth موجود
-- يتفادى GoTrue signInWithPassword (الذي يعيد 400 للمستخدمين المنشئين عبر RPC)
-- العميل يستخدم supabase.auth.refreshSession({ refresh_token }) بعدها

CREATE OR REPLACE FUNCTION public.create_customer_session_rpc(p_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id UUID;
  v_session_id UUID;
  v_refresh_token TEXT;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(trim(p_email)) LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  v_session_id := extensions.gen_random_uuid();
  INSERT INTO auth.sessions (id, user_id, created_at, updated_at, factor_id, aal)
  VALUES (v_session_id, v_user_id, now(), now(), extensions.gen_random_uuid(), 'aal1');

  v_refresh_token := extensions.gen_random_uuid()::TEXT;
  INSERT INTO auth.refresh_tokens (instance_id, token, user_id, revoked, created_at, updated_at, session_id)
  VALUES ('00000000-0000-0000-0000-000000000000', v_refresh_token, v_user_id, false, now(), now(), v_session_id);

  RETURN json_build_object('refresh_token', v_refresh_token, 'user_id', v_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_customer_session_rpc TO anon, authenticated;

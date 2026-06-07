-- Migration: إصلاح دالة confirm_auth_user لمشكلة 500 عند تسجيل الدخول
-- =========================================================

-- 1. تحديث دالة confirm_auth_user لتتوافق مع GoTrue الحديث
CREATE OR REPLACE FUNCTION public.confirm_auth_user(p_email TEXT, p_password TEXT DEFAULT '123456')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_uid UUID;
  pw_hash TEXT;
  iid UUID;
BEGIN
  pw_hash := extensions.crypt(p_password, extensions.gen_salt('bf'));
  SELECT id INTO v_uid FROM auth.users WHERE email = p_email;
  IF v_uid IS NULL THEN
    v_uid := extensions.gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_sent_at, confirmation_token,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      is_sso_user, is_anonymous
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', p_email, pw_hash,
      now(), now(), '', '{"provider":"email","providers":["email"]}', '{}',
      now(), now(), false, false
    );
  ELSE
    UPDATE auth.users SET
      instance_id = '00000000-0000-0000-0000-000000000000',
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      encrypted_password = pw_hash,
      confirmation_token = '',
      updated_at = now()
    WHERE id = v_uid;
  END IF;
  SELECT id INTO iid FROM auth.identities
  WHERE user_id = v_uid AND provider = 'email' LIMIT 1;
  IF iid IS NULL THEN
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (extensions.gen_random_uuid(), v_uid, json_build_object('sub', v_uid::TEXT, 'email', p_email), 'email', p_email, now(), now(), now());
  ELSE
    UPDATE auth.identities SET identity_data = json_build_object('sub', v_uid::TEXT, 'email', p_email)
    WHERE id = iid AND (identity_data ->> 'email_verified') IS NOT NULL;
  END IF;
  RETURN json_build_object('id', v_uid, 'email', p_email);
END;
$$;

-- 2. تحديث دالة ensure_staff_auth_user
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

GRANT EXECUTE ON FUNCTION public.confirm_auth_user TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_staff_auth_user TO authenticated;

-- 3. تقييد صلاحيات المدير (manager) إلى قراءة فقط

-- 3a. Products: منع المدير من إضافة أو تعديل المنتجات
DROP POLICY IF EXISTS "products_insert_admin" ON products;
CREATE POLICY "products_insert_admin" ON products
  FOR INSERT WITH CHECK (public.is_staff(ARRAY['admin']));

DROP POLICY IF EXISTS "products_update_admin" ON products;
CREATE POLICY "products_update_admin" ON products
  FOR UPDATE USING (public.is_staff(ARRAY['admin']));

-- 3b. Orders: منع المدير من تحديث حالة الطلبات أو تعيين السائقين
DROP POLICY IF EXISTS "orders_update_staff" ON orders;
DROP POLICY IF EXISTS "orders_update_admin" ON orders;
CREATE POLICY "orders_update_staff" ON orders
  FOR UPDATE USING (
    public.is_staff(ARRAY['admin', 'employee'])
    OR (
      public.current_staff_role() = 'driver'
      AND assigned_driver_id = public.current_staff_id()
    )
  );

-- 3c. assign_driver_to_order RPC: admin فقط
CREATE OR REPLACE FUNCTION public.assign_driver_to_order(
  p_order_id BIGINT,
  p_driver_id BIGINT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  driver_role TEXT;
BEGIN
  IF NOT public.is_staff(ARRAY['admin']) THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;
  IF p_driver_id IS NOT NULL THEN
    SELECT role INTO driver_role FROM staff WHERE id = p_driver_id;
    IF driver_role IS NULL OR driver_role != 'driver' THEN
      RAISE EXCEPTION 'Invalid driver id';
    END IF;
  END IF;
  UPDATE orders SET assigned_driver_id = p_driver_id WHERE id = p_order_id
  RETURNING row_to_json(orders)::JSON INTO result;
  RETURN result;
END;
$$;

-- 3d. update_order_status_rpc: إزالة المدير من الأدوار المسموحة
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
  allowed BOOLEAN := FALSE;
BEGIN
  SELECT id, role INTO caller_id, caller_role
  FROM staff WHERE lower(email) = lower(auth.jwt() ->> 'email') LIMIT 1;
  IF caller_role IS NULL THEN
    RAISE EXCEPTION 'Staff only';
  END IF;
  SELECT assigned_driver_id INTO cur_assigned FROM orders WHERE id = p_order_id;
  IF caller_role IN ('admin', 'employee') THEN
    allowed := TRUE;
  ELSIF caller_role = 'driver' AND cur_assigned = caller_id THEN
    allowed := TRUE;
  END IF;
  IF NOT allowed THEN
    RAISE EXCEPTION 'Unauthorized to update this order';
  END IF;
  UPDATE orders
  SET status = p_status,
      estimated_delivery = COALESCE(p_eta, estimated_delivery)
  WHERE id = p_order_id
  RETURNING row_to_json(orders)::JSON INTO result;
  RETURN result;
END;
$$;

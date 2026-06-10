-- =====================================================
-- Staff Permissions System
-- =====================================================
-- Each permission is stored as a separate row.
-- Admin role bypasses all permission checks.
-- =====================================================

CREATE TABLE IF NOT EXISTS staff_permissions (
  id BIGSERIAL PRIMARY KEY,
  staff_id BIGINT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, permission)
);

CREATE INDEX IF NOT EXISTS idx_staff_permissions_staff_id ON staff_permissions(staff_id);

ALTER TABLE staff_permissions ENABLE ROW LEVEL SECURITY;

-- Admins can manage all permissions
CREATE POLICY "staff_permissions_admin_all" ON staff_permissions
  USING (public.is_staff(ARRAY['admin']));

-- Staff can view permissions (needed for the app to check permissions)
CREATE POLICY "staff_permissions_select_staff" ON staff_permissions
  FOR SELECT USING (public.is_staff());

-- =====================================================
-- RPC: Get all permissions for a staff member
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_staff_permissions(p_staff_id BIGINT)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff() THEN
    RETURN ARRAY[]::TEXT[];
  END IF;
  RETURN ARRAY(
    SELECT permission FROM staff_permissions WHERE staff_id = p_staff_id
  );
END;
$$;

-- =====================================================
-- RPC: Get all permissions for the current user
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_my_permissions()
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id BIGINT;
  v_role TEXT;
BEGIN
  SELECT id, role INTO v_staff_id, v_role FROM staff WHERE lower(email) = lower(auth.jwt() ->> 'email');
  IF v_staff_id IS NULL THEN
    RETURN ARRAY[]::TEXT[];
  END IF;
  -- Admin gets all permissions
  IF v_role = 'admin' THEN
    RETURN ARRAY[
      'manage_orders', 'manage_products', 'manage_offers',
      'manage_chat', 'manage_staff', 'manage_settings',
      'view_stats', 'manage_users'
    ]::TEXT[];
  END IF;
  RETURN ARRAY(
    SELECT permission FROM staff_permissions WHERE staff_id = v_staff_id
  );
END;
$$;

-- =====================================================
-- RPC: Set permissions for a staff member (admin only)
-- =====================================================
CREATE OR REPLACE FUNCTION public.set_staff_permissions(p_staff_id BIGINT, p_permissions TEXT[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff(ARRAY['admin']) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  -- Delete existing permissions
  DELETE FROM staff_permissions WHERE staff_id = p_staff_id;
  -- Insert new permissions
  IF array_length(p_permissions, 1) > 0 THEN
    INSERT INTO staff_permissions (staff_id, permission)
    SELECT p_staff_id, unnest(p_permissions);
  END IF;
END;
$$;

-- =====================================================
-- RPC: Get all staff with their permissions (admin only)
-- =====================================================
CREATE OR REPLACE FUNCTION public.list_staff_permissions()
RETURNS TABLE (
  staff_id BIGINT,
  email TEXT,
  name TEXT,
  role TEXT,
  permissions TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff(ARRAY['admin']) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
  SELECT
    s.id,
    s.email,
    s.name,
    s.role,
    COALESCE(ARRAY(SELECT sp.permission FROM staff_permissions sp WHERE sp.staff_id = s.id), ARRAY[]::TEXT[]) AS permissions
  FROM staff s
  ORDER BY s.created_at DESC;
END;
$$;

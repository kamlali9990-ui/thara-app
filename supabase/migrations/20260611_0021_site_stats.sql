-- Migration: Add site stats RPCs for visitor/member counter
-- Creates: get_site_stats(), increment_visit_count()

-- RPC to get member count and visit count
CREATE OR REPLACE FUNCTION get_site_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_count INTEGER;
  visit_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO member_count FROM customers;
  SELECT COALESCE((SELECT value::INTEGER FROM settings WHERE key = 'visit_count'), 0) INTO visit_count;
  RETURN json_build_object('member_count', member_count, 'visit_count', visit_count);
END;
$$;

-- RPC to increment visit count
CREATE OR REPLACE FUNCTION increment_visit_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_val INTEGER;
  new_count INTEGER;
BEGIN
  SELECT COALESCE((SELECT value::INTEGER FROM settings WHERE key = 'visit_count'), 0) INTO current_val;
  new_count := current_val + 1;
  INSERT INTO settings (key, value) VALUES ('visit_count', new_count::TEXT)
  ON CONFLICT (key) DO UPDATE SET value = new_count::TEXT;
  RETURN new_count;
END;
$$;

-- Grant execute to anon and authenticated roles
GRANT EXECUTE ON FUNCTION get_site_stats TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_visit_count TO anon, authenticated;

-- Initialize visit_count if not exists
INSERT INTO settings (key, value) VALUES ('visit_count', '0')
ON CONFLICT (key) DO NOTHING;

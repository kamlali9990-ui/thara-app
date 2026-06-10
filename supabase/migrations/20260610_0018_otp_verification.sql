-- =====================================================
-- OTP / SMS verification system
-- =====================================================

CREATE TABLE IF NOT EXISTS otp_codes (
  phone TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- Only the Edge Function (service_role) can manage OTPs
CREATE POLICY "otp_codes_service_role_all" ON otp_codes
  USING (auth.role() = 'service_role');

-- RPC: Verify OTP code
CREATE OR REPLACE FUNCTION public.verify_otp(p_phone TEXT, p_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_expires TIMESTAMPTZ;
  v_verified BOOLEAN;
BEGIN
  SELECT code, expires_at, verified INTO v_code, v_expires, v_verified
  FROM otp_codes WHERE phone = p_phone;
  IF v_code IS NULL THEN
    RETURN FALSE;
  END IF;
  IF v_verified THEN
    RETURN FALSE;
  END IF;
  IF now() > v_expires THEN
    DELETE FROM otp_codes WHERE phone = p_phone;
    RETURN FALSE;
  END IF;
  IF v_code = p_code THEN
    UPDATE otp_codes SET verified = TRUE WHERE phone = p_phone;
    RETURN TRUE;
  END IF;
  RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_otp TO anon, authenticated;

-- Migration: auto-create customer trigger
-- Generated from scripts/auto-create-customer-trigger.sql

-- =============================================
-- Auto-create customer profile when a new auth user signs up.
-- Skips if user is already staff (drivers/admins shouldn't appear as customers).
-- Safe to re-run (idempotent).
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.staff WHERE lower(email) = lower(NEW.email)) THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.customers (email, name, phone)
  VALUES (
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  )
  ON CONFLICT (email) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
